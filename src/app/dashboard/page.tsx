"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ArrowPathIcon,
  BoltIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  SparklesIcon,
  TrophyIcon,
  XMarkIcon,
  PlayIcon,
  PauseIcon,
  MapIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { nanoid } from "nanoid";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import dynamic from "next/dynamic";
import {
  locationService,
  type Location,
  type LocationServiceCallbacks
} from "../../lib/locationService";
import { useAuth } from "@/contexts/AuthContext";
import {
  airQualityService,
  type AreaAirQualitySummary,
  type AirQualityStation
} from "../../lib/airQualityService";
import type {
  AirQualityStation as StationType
} from "../../types/airQuality";
import { getRadiusFromZoom, formatRadius, getZoomFromRadius } from '@/lib/radiusUtils';

// Dynamically import the map to avoid SSR issues
const AirQualityMap = dynamic(() => import("../../components/map/AirQualityMap"), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-2xl"></div>,
});

type AirData = {
  location: string;
  city?: string;
  country?: string;
  pm25: number | null;
  no2: number | null;
  co: number | null;
  o3?: number | null;
  so2?: number | null;
  pm10?: number | null;
  aqi?: number;
  unit?: string;
  lastUpdated?: string | null;
  source?: "waqi" | "openaq" | "doe" | "error";
};

type RiskLevel = "low" | "moderate" | "high" | "loading";

type ExposureEntry = {
  _id: string;
  locationName: string;
  timestamp: number;
  mode?: string;
  score: number;
  pm25?: number | null;
  no2?: number | null;
  riskLevel: "low" | "moderate" | "high" | string;
};

type TrendPoint = { day: string; average: number; samples: number };

const fallback = {
  lat: 3.139,
  lon: 101.6869,
  label: "Kuala Lumpur (fallback)",
};

const scoreAir = (air: AirData | null): {
  score: number;
  level: RiskLevel;
  narrative: string;
} => {
  if (!air) return { score: 0, level: "loading", narrative: "Pulling data" };
  const pm = air.pm25 ?? 30;
  const no2 = air.no2 ?? 20;
  const co = air.co ?? 0.5;
  const pmPenalty = Math.min(pm / 2, 60);
  const noPenalty = Math.min(no2 / 2.5, 30);
  const coPenalty = Math.min(co * 8, 10);
  const score = Math.max(0, Math.round(100 - pmPenalty - noPenalty - coPenalty));
  let level: "low" | "moderate" | "high";
  let narrative = "Air is stable. Keep an eye on rush hours.";
  if (score >= 75) {
    level = "low";
    narrative = "Clean window now—perfect for outdoor errands.";
  } else if (score >= 45) {
    level = "moderate";
    narrative = "Quality is mixed. Prefer shaded or transit routes.";
  } else {
    level = "high";
    narrative = "Exposure risk is high. Shift plans indoors if you can.";
  }
  return { score, level, narrative };
};

const formatValue = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : v.toFixed(1);

const formatTime = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString()} • ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

export default function Home() {
  const { isAuthenticated, user, sessionToken, setSessionToken } = useAuth();
  const [userKey, setUserKey] = useState<string | null>(null);
  const [guestKey, setGuestKey] = useState<string | null>(null);
  const [coords, setCoords] = useState(fallback);
  const [air, setAir] = useState<AirData | null>(null);
  const [loadingAir, setLoadingAir] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"walk" | "metro" | "drive">("metro");
  const [status, setStatus] = useState("Waiting for GPS…");
  const [profileReady, setProfileReady] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const passportRef = useRef<HTMLDivElement | null>(null);
  
  // GPS tracking states
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(false);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<Date | null>(null);
  const [trackingFrequency, setTrackingFrequency] = useState(5000); // 5 seconds
  const [locationHistory, setLocationHistory] = useState<Location[]>([]);
  const [showRadius, setShowRadius] = useState(true);
  const [radiusKm, setRadiusKm] = useState(100); // 100km radius
  const [currentZoom, setCurrentZoom] = useState(10);
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const zoomChangeTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  
  // Area air quality states
  const [areaAirQuality, setAreaAirQuality] = useState<AreaAirQualitySummary | null>(null);
  const [nearbyStations, setNearbyStations] = useState<StationType[]>([]);
  const [isScanningArea, setIsScanningArea] = useState(false);
  // Pollutant selection state
  const [selectedPollutant, setSelectedPollutant] = useState<'aqi' | 'pm25' | 'no2' | 'co' | 'o3' | 'so2'>('aqi');

  const login = useMutation(api.auth.login);
  const logout = useMutation(api.auth.logout);
  const ensureProfile = useMutation(api.passport.ensureProfile);
  const logExposure = useMutation(api.passport.logExposure);

  // Session is now managed by AuthContext
  const session = user ? { user } : null;

  const passport = useQuery(
    api.passport.getPassport,
    userKey ? { userKey, limit: 6 } : "skip",
  );
  const insight = useQuery(
    api.passport.insights,
    userKey ? { userKey } : "skip",
  );

  const risk = useMemo(() => scoreAir(air), [air]);

  useEffect(() => {
    const existing = localStorage.getItem("air-passport-key");
    if (existing) {
      setGuestKey(existing);
    } else {
      const newKey = `guest-${nanoid(10)}`;
      localStorage.setItem("air-passport-key", newKey);
      setGuestKey(newKey);
    }
  }, []);

  useEffect(() => {
    // Set userKey from localStorage if it exists, otherwise use guestKey
    const storedKey = localStorage.getItem("air-passport-key");
    if (storedKey) {
      setUserKey(storedKey);
    } else if (guestKey) {
      setUserKey(guestKey);
    }
  }, [guestKey]);

  useEffect(() => {
    setProfileReady(false);
  }, [userKey]);

  useEffect(() => {
    if (!userKey || profileReady) return;
    ensureProfile({ userKey, nickname: session?.user?.name ?? undefined }).finally(
      () => setProfileReady(true),
    );
  }, [userKey, ensureProfile, profileReady, session?.user?.name]);

  // GPS tracking callbacks
  const handleLocationUpdate = useCallback((location: Location) => {
    setCoords({
      lat: location.lat,
      lon: location.lng,
      label: "Your location (tracking)",
    });
    setLastLocationUpdate(new Date());
    setLocationHistory(locationService.getLocationHistory());
    
    // Fetch air data for new location
    fetchAir(location.lat, location.lng);
    
    // If radius mode is enabled, fetch area air quality
    if (showRadius) {
      fetchAreaAirQuality(location.lat, location.lng);
    }
    
    setStatus(`Tracking active • Last update: ${new Date().toLocaleTimeString()}`);
  }, [showRadius]);

  const handleLocationError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = "Location error";
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = "Location permission denied";
        setIsTrackingEnabled(false);
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = "Location unavailable";
        break;
      case error.TIMEOUT:
        errorMessage = "Location request timeout";
        break;
    }
    setStatus(errorMessage);
  }, []);

  const handlePermissionDenied = useCallback(() => {
    setStatus("Location permission denied. Enable in browser settings.");
    setIsTrackingEnabled(false);
  }, []);

  // Start/stop GPS tracking
  const toggleGPSTracking = useCallback(() => {
    if (isTrackingEnabled) {
      locationService.stopLocationTracking();
      setIsTrackingEnabled(false);
      setStatus("GPS tracking stopped");
    } else {
      locationService.startLocationTracking(
        {
          updateInterval: trackingFrequency,
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        },
        {
          onLocationUpdate: handleLocationUpdate,
          onError: handleLocationError,
          onPermissionDenied: handlePermissionDenied,
        }
      );
      setIsTrackingEnabled(true);
      setStatus("Starting GPS tracking…");
    }
  }, [
    isTrackingEnabled,
    trackingFrequency,
    handleLocationUpdate,
    handleLocationError,
    handlePermissionDenied,
  ]);

  // Center map on current location
  const centerMapOnLocation = useCallback(() => {
    if (coords.lat && coords.lon) {
      setStatus("Centering map on your location");
      // The map component will handle centering via props
    }
  }, [coords]);

  // Initial location fetch
  useEffect(() => {
    if (!userKey) return;
    if (!locationService.isSupported()) {
      setStatus("GPS unavailable, using fallback city");
      setCoords(fallback);
      fetchAir(fallback.lat, fallback.lon);
      return;
    }
    setStatus("Grabbing your air station…");
    locationService.getCurrentLocation({
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 60000,
    }).then(
      (pos) => {
        const c = {
          lat: pos.lat,
          lon: pos.lng,
          label: "Your location",
        };
        setCoords(c);
        fetchAir(c.lat, c.lon);
        setStatus("Live location locked");
      },
      () => {
        setStatus("Using fallback city");
        setCoords(fallback);
        fetchAir(fallback.lat, fallback.lon);
      }
    );
  }, [userKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      locationService.stopLocationTracking();
    };
  }, []);

  const fetchAir = async (lat: number, lon: number) => {
    setLoadingAir(true);
    try {
      // Use the combined API that prioritizes DOE data
      const res = await fetch("/api/air-quality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lon }),
      });
      const data = await res.json();

      if (res.ok && data.location) {
        setAir({
          location: data.location,
          city: data.city,
          country: data.country,
          pm25: data.pm25,
          no2: data.no2,
          co: data.co,
          o3: data.o3,
          so2: data.so2,
          unit: data.unit || "µg/m³",
          lastUpdated: data.lastUpdated,
          source: data.source || "doe",
          aqi: data.aqi
        });

        // Update status based on data source
        if (data.source === 'doe') {
          setStatus(`Live data from DOE Malaysia`);
        } else if (data.source === 'waqi') {
          setStatus(`Live data from WAQI (DOE unavailable)`);
        } else {
          setStatus(`Live air quality data`);
        }
      } else {
        setStatus("Air data unavailable — retry or move to better signal");
        setAir({
          location: "Unknown Location",
          pm25: null,
          no2: null,
          co: null,
          unit: "µg/m³",
          lastUpdated: null,
          source: "error",
          aqi: 0
        });
      }
    } catch (error) {
      console.error("Air quality API error", error);
      setStatus("Air quality API error — retry or change network");
      setAir({
        location: "Unknown Location",
        pm25: null,
        no2: null,
        co: null,
        unit: "µg/m³",
        lastUpdated: null,
        source: "error",
        aqi: 0
      });
    } finally {
      setLoadingAir(false);
    }
  };

  // Handle zoom changes from map
  const handleZoomChange = useCallback((newZoom: number) => {
    setCurrentZoom(newZoom);
    const newRadius = getRadiusFromZoom(newZoom);
    setRadiusKm(newRadius);
    
    // Debounce area data refresh
    if (zoomChangeTimeout.current) {
      clearTimeout(zoomChangeTimeout.current);
    }
    
    setIsRefreshingData(true);
    zoomChangeTimeout.current = setTimeout(() => {
      if (coords.lat && coords.lon) {
        fetchAreaAirQuality(coords.lat, coords.lon, newRadius);
      }
      setIsRefreshingData(false);
    }, 500);
  }, [coords]);

  // Fetch air quality data for a radius area
  const fetchAreaAirQuality = async (lat: number, lon: number, customRadius?: number) => {
    setIsScanningArea(true);
    const radius = customRadius || radiusKm;
    try {
      const response = await airQualityService.fetchAirQualityByRadius(lat, lon, radius);
      setAreaAirQuality(response.summary || null);
      setNearbyStations(response.data);
      setStatus(`Scanned area: ${response.data.length} stations found within ${formatRadius(radius)}`);
    } catch (error) {
      console.error('Error fetching area air quality:', error);
      setStatus('Failed to scan area for air quality data');
    } finally {
      setIsScanningArea(false);
    }
  };

  // Toggle radius mode
  const toggleRadiusMode = useCallback(() => {
    const newShowRadius = !showRadius;
    setShowRadius(newShowRadius);
    
    if (newShowRadius && coords.lat && coords.lon) {
      fetchAreaAirQuality(coords.lat, coords.lon);
    } else if (!newShowRadius) {
      setAreaAirQuality(null);
      setNearbyStations([]);
    }
  }, [showRadius, coords]);

  const handleLog = async () => {
    if (!userKey || !air) return;
    setSaving(true);
    try {
      await logExposure({
        userKey,
        lat: coords.lat,
        lon: coords.lon,
        locationName: air.city
          ? `${air.location} · ${air.city}`
          : air.location ?? "Unknown",
        pm25: air.pm25 ?? undefined,
        no2: air.no2 ?? undefined,
        co: air.co ?? undefined,
        mode,
      });
      setStatus("Saved commute, streak updated");
      // Refresh air data for freshness
      fetchAir(coords.lat, coords.lon);
    } finally {
      setSaving(false);
    }
  };

  const handleLogin = async () => {
    if (!authEmail || !authPassword) {
      setAuthMessage("Email and password required");
      return;
    }
    setAuthLoading(true);
    setAuthMessage("");
    try {
      const res = await login({ email: authEmail, password: authPassword });
      setSessionToken(res.token);
      setAuthMessage("Signed in and synced ✅");
      setStatus("Signed in via Convex auth");
      setAuthPassword("");
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Login failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    setAuthMessage("");
    try {
      if (sessionToken) await logout({ token: sessionToken });
    } finally {
      setSessionToken(null);
      if (guestKey) {
        setUserKey(guestKey);
      } else {
        const fallbackKey = `guest-${nanoid(8)}`;
        localStorage.setItem("air-passport-key", fallbackKey);
        setGuestKey(fallbackKey);
        setUserKey(fallbackKey);
      }
      setStatus("Signed out — guest mode");
      setAuthLoading(false);
    }
  };

  const recommendationDeck = useMemo(() => {
    const list = [
      {
        title: "Avoid 7–9am & 5–7pm peaks",
        detail: "Traffic NO₂ spikes then. Shift errands to shoulder hours.",
        icon: <ClockIcon className="h-5 w-5" />,
      },
      {
        title: "Metro over car for crosstown trips",
        detail: "Subway/metro cars cut exposure vs. bumper-to-bumper driving.",
        icon: <BoltIcon className="h-5 w-5" />,
      },
      {
        title: "Indoor workouts if PM₂.₅ > 35",
        detail: "Switch to bodyweight or gym on hazy days to protect lungs.",
        icon: <ExclamationTriangleIcon className="h-5 w-5" />,
      },
      {
        title: "Green corridor routing",
        detail:
          "Pick park or waterfront paths; vegetation buffers trim fine dust by ~20%.",
        icon: <SparklesIcon className="h-5 w-5" />,
      },
    ];
    if (risk.level === "high") {
      list.unshift({
        title: "Mask up (N95/FFP2) outdoors",
        detail: "Short errands only; keep windows closed on rideshares.",
        icon: <ExclamationTriangleIcon className="h-5 w-5" />,
      });
    }
    return list.slice(0, 4);
  }, [risk.level]);

  const badges = useMemo(() => {
    const pts = passport?.profile?.points ?? 0;
    const streak = passport?.profile?.streak ?? 0;
    return [
      streak >= 7
        ? "Clean Week Hero"
        : streak >= 3
          ? "Consistency Starter"
          : "Daily Check-in",
      pts >= 200 ? "Urban Shield Gold" : pts >= 120 ? "Silver Lung" : "Bronze Breeze",
      risk.level === "low" ? "Fresh Air Moment" : "Guardian Mode",
    ];
  }, [passport?.profile?.points, passport?.profile?.streak, risk.level]);

  // isSignedIn is now replaced with isAuthenticated from AuthContext

  const scrollToPassport = () => {
    if (passportRef.current) {
      passportRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-10 md:px-10 lg:px-14">
      <header className="initial-hidden animate-slide-down flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="pill inline-flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-slate-600">
            <SparklesIcon className="h-4 w-4 animate-pulse" />
            Personalized Air Exposure Passport
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-slate-900 md:text-4xl">
            Breathe smarter. Move healthier.
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Real-time PM2.5 & NO₂ near you, with commute tips and streak-based rewards.
          </p>
          <p className="mt-2 text-xs text-slate-500 transition-colors duration-300 hover:text-slate-700">
            Status: {status}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-slate-700">
          <span className="pill inline-flex items-center gap-2 transition-all duration-300 hover:scale-105">
            <MapPinIcon className="h-4 w-4" />
            {coords.label} {coords.lat.toFixed(3)}, {coords.lon.toFixed(3)}
          </span>
          <span className="pill inline-flex items-center gap-2 transition-all duration-300 hover:scale-105">
            <ArrowPathIcon className="h-4 w-4" />
            Updated: {formatTime(air?.lastUpdated)}
          </span>
          <span className="pill inline-flex items-center gap-2 transition-all duration-300 hover:scale-105">
            <SparklesIcon className="h-4 w-4" />
            Source: {air?.source === "doe" ? "DOE Malaysia" : air?.source === "waqi" ? "WAQI" : "OpenAQ"}
          </span>
          {isTrackingEnabled && (
            <span className="pill inline-flex items-center gap-2 bg-emerald-50 text-emerald-700">
              <MapPinIcon className="h-4 w-4 animate-pulse" />
              Tracking
            </span>
          )}
        </div>
      </header>

      <section className="card initial-hidden animate-slide-up delay-100 flex flex-col gap-5 rounded-2xl p-5 transition-all duration-300 hover:shadow-xl md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Account</p>
          <h2 className="text-lg font-semibold text-slate-900">
            {isAuthenticated ? "You're synced. Keep exploring." : "Sign in to keep your passport synced"}
          </h2>
          <p className="text-sm text-slate-700">
            {isAuthenticated
              ? `Signed in as ${user?.email}. Your streaks and badges stay backed up.`
              : "Guest mode is active. Sign in to save streaks and rewards across devices."}
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="pill">Convex-auth sessions</span>
            <span className="pill">Guest fallback</span>
            <span className="pill">No marketing spam</span>
          </div>
          {authMessage && (
            <p
              className={`text-xs ${/fail|error|invalid/i.test(authMessage) ? "text-rose-700" : "text-emerald-700"}`}
            >
              {authMessage}
            </p>
          )}
        </div>

        {isAuthenticated ? (
          <div className="flex w-full flex-wrap items-center gap-2 text-sm md:max-w-[480px]">
            <button
              onClick={scrollToPassport}
              className="rounded-full bg-slate-900 px-4 py-2 font-semibold text-white shadow-sm transition-all duration-300 hover:scale-105 hover:bg-slate-800 hover:shadow-md"
            >
              Open dashboard
            </button>
            <button
              onClick={handleLogout}
              className="rounded-full border border-rose-200 px-4 py-2 font-semibold text-rose-600 transition-all duration-300 hover:scale-105 hover:bg-rose-50 hover:shadow-sm"
              disabled={authLoading}
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-3 md:max-w-[480px]">
            <div className="grid w-full gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                Email
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@email.com"
                  value={authEmail}
                  onChange={(e) => {
                    setAuthEmail(e.target.value);
                    setAuthMessage("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm shadow-sm outline-none transition-all duration-300 focus:border-slate-400 focus:ring-1 focus:ring-slate-200 focus:scale-[1.02]"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                Password
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => {
                    setAuthPassword(e.target.value);
                    setAuthMessage("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm shadow-sm outline-none transition-all duration-300 focus:border-slate-400 focus:ring-1 focus:ring-slate-200 focus:scale-[1.02]"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <button
                onClick={handleLogin}
                className="rounded-full bg-slate-900 px-4 py-2 font-semibold text-white shadow-sm transition-all duration-300 hover:scale-105 hover:bg-slate-800 hover:shadow-md disabled:opacity-60"
                disabled={authLoading}
              >
                {authLoading ? "Working…" : "Sign in"}
              </button>
              <Link
                href="/register"
                className="rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition-all duration-300 hover:scale-105 hover:bg-white hover:shadow-sm"
              >
                Create account
              </Link>
            </div>
            <p className="text-[11px] text-slate-500">
              Registration now lives on its own page so you can focus on a calm, single-task flow.
            </p>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3" ref={passportRef} id="passport">
        <div className="card initial-hidden animate-slide-up delay-200 hover-lift col-span-1 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.15em] text-slate-500">
              Exposure Score
            </span>
            <span
              className={`badge transition-all duration-300 ${
                risk.level === "low"
                  ? "bg-green-50 text-green-700"
                  : risk.level === "moderate"
                    ? "bg-amber-50 text-amber-800"
                    : "bg-rose-50 text-rose-700"
              }`}
            >
              {risk.level === "loading"
                ? "Loading"
                : risk.level === "low"
                  ? "Low"
                  : risk.level === "moderate"
                    ? "Moderate"
                    : "High"}
            </span>
          </div>
          <div className="mt-6 flex items-end gap-3">
            <span className="font-display text-6xl text-slate-900 transition-all duration-500">
              {loadingAir ? "…" : risk.score}
            </span>
            <span className="pb-2 text-sm text-slate-500">/100</span>
          </div>
          <p className="mt-3 text-sm text-slate-600">{risk.narrative}</p>
          <div className="mt-6">
            {/* Data Source Indicator */}
            <div className="flex items-center justify-center mb-3 gap-2">
              <div className={`h-2 w-2 rounded-full ${air?.source === 'doe' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <p className="text-xs text-slate-600">
                Data Source: <span className="font-semibold uppercase">{air?.source === 'doe' ? 'DOE Malaysia' : 'Alternative'}</span>
              </p>
              {air?.lastUpdated && (
                <span className="text-xs text-slate-400">• {formatTime(air?.lastUpdated)}</span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-600">
              <div className="rounded-xl bg-white/80 px-3 py-3 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">PM2.5</p>
                <p className="font-display text-2xl text-slate-900">
                  {formatValue(air?.pm25)}
                </p>
                <p className="text-[11px] text-slate-500">µg/m³</p>
              </div>
              <div className="rounded-xl bg-white/80 px-3 py-3 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">NO₂</p>
                <p className="font-display text-2xl text-slate-900">
                  {formatValue(air?.no2)}
                </p>
                <p className="text-[11px] text-slate-500">ppb</p>
              </div>
              <div className="rounded-xl bg-white/80 px-3 py-3 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">CO</p>
                <p className="font-display text-2xl text-slate-900">
                  {formatValue(air?.co)}
                </p>
                <p className="text-[11px] text-slate-500">ppm</p>
              </div>
              {air?.o3 !== undefined && (
                <div className="rounded-xl bg-white/80 px-3 py-3 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">O₃</p>
                  <p className="font-display text-2xl text-slate-900">
                    {formatValue(air?.o3)}
                  </p>
                  <p className="text-[11px] text-slate-500">ppb</p>
                </div>
              )}
              {air?.so2 !== undefined && (
                <div className="rounded-xl bg-white/80 px-3 py-3 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">SO₂</p>
                  <p className="font-display text-2xl text-slate-900">
                    {formatValue(air?.so2)}
                  </p>
                  <p className="text-[11px] text-slate-500">ppb</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card initial-hidden animate-slide-up delay-300 hover-lift col-span-1 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.15em] text-slate-500">
              Rewards & Streak
            </span>
            <TrophyIcon className="h-5 w-5 text-amber-500 transition-transform duration-300 hover:scale-110 hover:rotate-12" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/90 px-4 py-3 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Points
              </p>
              <p className="font-display text-3xl text-slate-900 transition-all duration-500">
                {passport?.profile?.points ?? 0}
              </p>
              <p className="text-xs text-slate-500">
                Low-exposure commutes boost rewards.
              </p>
            </div>
            <div className="rounded-xl bg-white/90 px-4 py-3 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Streak
              </p>
              <p className="font-display text-3xl text-slate-900 transition-all duration-500">
                {passport?.profile?.streak ?? 0}d
              </p>
              <p className="text-xs text-slate-500">
                Best: {passport?.profile?.bestStreak ?? 0}d
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-700">
            {badges.map((b) => (
              <span key={b} className="badge bg-white/70 text-slate-800 transition-all duration-300 hover:scale-110 hover:bg-amber-50">
                {b}
              </span>
            ))}
          </div>
        </div>

        <div className="card initial-hidden animate-slide-up delay-400 hover-lift col-span-1 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.15em] text-slate-500">
              Quick Recommendations
            </span>
            <SparklesIcon className="h-5 w-5 text-sky-500 animate-pulse" />
          </div>
          <div className="mt-4 space-y-3">
            {recommendationDeck.map((rec, index) => (
              <div
                key={rec.title}
                className={`initial-hidden animate-slide-left delay-${(index + 5) * 100} flex items-start gap-3 rounded-xl bg-white/90 p-3 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 transition-all duration-300 hover:bg-sky-100 hover:rotate-6">
                  {rec.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{rec.title}</p>
                  <p className="text-xs text-slate-600">{rec.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="card initial-hidden animate-slide-up delay-500 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
              Air Quality Map
            </p>
            <h2 className="font-display text-xl text-slate-900">
              Live pollution heatmap & stations
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleGPSTracking}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 ${
                isTrackingEnabled
                  ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {isTrackingEnabled ? (
                <>
                  <PauseIcon className="h-4 w-4" />
                  Stop Tracking
                </>
              ) : (
                <>
                  <PlayIcon className="h-4 w-4" />
                  Start Tracking
                </>
              )}
            </button>
            <button
              onClick={centerMapOnLocation}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 transition-all duration-300 hover:scale-105 hover:bg-slate-200"
            >
              <MapIcon className="h-4 w-4" />
              Center
            </button>
          </div>
        </div>

        {/* GPS Controls */}
        {isTrackingEnabled && (
          <div className="mb-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-900">GPS Tracking Active</p>
                <p className="text-xs text-emerald-700">
                  Last update: {lastLocationUpdate ? lastLocationUpdate.toLocaleTimeString() : "Never"}
                </p>
                <p className="text-xs text-emerald-700">
                  Location history: {locationHistory.length} points
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-slate-600">Show 100km radius</span>
                  <input
                    type="checkbox"
                    checked={showRadius}
                    onChange={toggleRadiusMode}
                    className="rounded text-emerald-600"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-slate-600">Update every</span>
                  <select
                    value={trackingFrequency}
                    onChange={(e) => setTrackingFrequency(Number(e.target.value))}
                    className="rounded border border-slate-300 px-2 py-1 text-sm"
                  >
                    <option value={2000}>2s</option>
                    <option value={5000}>5s</option>
                    <option value={10000}>10s</option>
                    <option value={30000}>30s</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="h-96 w-full rounded-xl overflow-hidden shadow-inner">
          <AirQualityMap
            center={{ lat: coords.lat, lng: coords.lon }}
            userLocation={{ lat: coords.lat, lng: coords.lon }}
            airQualityData={[
              {
                lat: coords.lat,
                lng: coords.lon,
                pm25: air?.pm25 ?? undefined,
                no2: air?.no2 ?? undefined,
                co: air?.co ?? undefined,
                o3: air?.o3 ?? undefined,
                so2: air?.so2 ?? undefined,
                aqi: risk.score,
                location: air?.location ?? "Current Location",
                source: air?.source ?? "doe"
              },
              ...nearbyStations.map(station => ({
                lat: station.lat,
                lng: station.lng,
                pm25: station.pm25 ?? undefined,
                no2: station.no2 ?? undefined,
                co: station.co ?? undefined,
                o3: station.o3 ?? undefined,
                so2: station.so2 ?? undefined,
                aqi: station.aqi,
                location: station.name ?? station.location ?? "Unknown Station",
                source: station.source
              }))
            ]}
            nearbyStations={[
              {
                lat: coords.lat,
                lng: coords.lon,
                name: air?.location ?? "Current Station",
                location: air?.city ?? "Kuala Lumpur",
                aqi: risk.score,
                pm25: air?.pm25,
                no2: air?.no2,
                co: air?.co
              },
              ...nearbyStations.map(station => ({
                lat: station.lat,
                lng: station.lng,
                name: station.name ?? station.location ?? "Unknown Station",
                location: station.city ?? station.country ?? "Unknown Location",
                aqi: station.aqi,
                pm25: station.pm25,
                no2: station.no2,
                co: station.co
              }))
            ]}
            locationHistory={locationHistory}
            showRadius={showRadius}
            radiusKm={radiusKm}
            isTracking={isTrackingEnabled}
            onZoomChange={handleZoomChange}
            selectedPollutant={selectedPollutant}
            onPollutantChange={setSelectedPollutant}
            className="w-full h-full"
          />
        </div>
        {isScanningArea && (
          <div className="mt-3 p-2 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-xs text-amber-700 flex items-center gap-2">
              <ArrowPathIcon className="h-3 w-3 animate-spin" />
              Scanning area for air quality stations...
            </p>
          </div>
        )}
        {areaAirQuality && (
          <div className="mt-3 p-3 bg-sky-50 rounded-lg border border-sky-200">
            <p className="text-xs text-slate-600 font-medium mb-1">
              Area Summary ({formatRadius(radiusKm)} radius) • Zoom: {currentZoom}
            </p>
            {isRefreshingData && (
              <div className="flex items-center gap-1 mb-2">
                <ArrowPathIcon className="h-3 w-3 animate-spin text-sky-600" />
                <span className="text-xs text-sky-600">Refreshing data...</span>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-slate-500">Stations:</span>
                <span className="ml-1 font-semibold">{areaAirQuality.totalStations}</span>
              </div>
              <div>
                <span className="text-slate-500">Avg AQI:</span>
                <span className="ml-1 font-semibold">{areaAirQuality.averageAQI}</span>
              </div>
              <div>
                <span className="text-slate-500">Highest AQI:</span>
                <span className="ml-1 font-semibold">{areaAirQuality.highestAQI}</span>
              </div>
              <div>
                <span className="text-slate-500">Lowest AQI:</span>
                <span className="ml-1 font-semibold">{areaAirQuality.lowestAQI}</span>
              </div>
            </div>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">
          🗺️ Toggle layers (Street/Satellite/Terrain) • 🔥 Heatmap shows pollution density
          {isTrackingEnabled && " • 📍 Location tracking enabled with history"}
          {showRadius && ` • 📡 Showing ${nearbyStations.length + 1} stations in ${formatRadius(radiusKm)}`}
          {showRadius && ` • Zoom Level: ${currentZoom}`}
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card initial-hidden animate-slide-right delay-100 hover-lift rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
                Exposure Passport
              </p>
              <h2 className="font-display text-xl text-slate-900">
                Latest trips & health score
              </h2>
            </div>
            <button
              className="group inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white transition-all duration-300 hover:scale-105 hover:bg-slate-800 hover:shadow-lg"
              onClick={() => fetchAir(coords.lat, coords.lon)}
            >
              <ArrowPathIcon className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
              Refresh AQ
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {(passport?.exposures ?? []).map((entry: ExposureEntry, index: number) => (
              <div
                key={entry._id}
                className={`initial-hidden animate-slide-up delay-${(index + 2) * 100} flex flex-col justify-between gap-3 rounded-xl bg-white/90 p-4 shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-md md:flex-row md:items-center`}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {entry.locationName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(entry.timestamp).toLocaleString()} • {entry.mode ?? "unknown mode"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="pill">Score {entry.score}</span>
                  <span className="pill">PM2.5 {formatValue(entry.pm25 ?? null)}</span>
                  <span className="pill">NO₂ {formatValue(entry.no2 ?? null)}</span>
                  <span
                    className={`pill ${
                      entry.riskLevel === "low"
                        ? "bg-green-50 text-green-700"
                        : entry.riskLevel === "moderate"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {entry.riskLevel} risk
                  </span>
                </div>
              </div>
            ))}
            {(passport?.exposures?.length ?? 0) === 0 && (
              <div className="rounded-xl bg-white/90 p-4 text-sm text-slate-600 shadow-sm">
                No trips logged yet. Capture your first commute to start streaks.
              </div>
            )}
          </div>
        </div>

        <div className="card initial-hidden animate-slide-left delay-200 hover-lift rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
            Log a commute
          </p>
          <h3 className="mt-1 font-display text-lg text-slate-900">
            Claim rewards for low exposure runs
          </h3>
          <div className="mt-4 flex gap-2">
            {(["walk", "metro", "drive"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-xl px-3 py-2 text-sm capitalize transition-all duration-300 hover:scale-105 ${
                  mode === m
                    ? "bg-slate-900 text-white shadow-md"
                    : "bg-white/90 text-slate-700 shadow-sm hover:bg-white hover:shadow-md"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p>Current station: {air?.location ?? "…"}</p>
            <p>PM2.5 {formatValue(air?.pm25)} · NO₂ {formatValue(air?.no2)}</p>
            <p className="text-xs text-slate-500">
              Logging adds points and extends your streak if today isn&apos;t logged yet.
            </p>
          </div>
          <button
            onClick={handleLog}
            disabled={!air || saving}
            className="group mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>Save this commute</>
            )}
          </button>
          <div className="mt-4 rounded-xl bg-white/90 p-4 text-xs text-slate-600 shadow-sm">
            <p className="font-semibold text-slate-900">SDG 3 - Health</p>
            <p>
              Aligns with Good Health & Well-Being: mapping pollution to health risk,
              spotting traffic stressors, and flagging clinic gaps for vulnerable areas.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
                Trend (last 7 days)
              </p>
              <h3 className="font-display text-lg text-slate-900">
                Average score: {insight?.trend?.length
                  ? insight.trend.slice(-7).reduce((acc: number, d: TrendPoint) => acc + d.average, 0) /
                    insight.trend.slice(-7).length
                  : "—"}
              </h3>
            </div>
            <span className="badge bg-white/80 text-slate-800">
              Samples: {insight?.sampleCount ?? 0}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {(insight?.trend ?? []).slice(-8).map((day: TrendPoint) => (
              <div
                key={day.day}
                className="rounded-xl bg-white/90 p-3 shadow-sm"
              >
                <p className="text-xs text-slate-500">{day.day}</p>
                <p className="font-display text-2xl text-slate-900">{day.average}</p>
                <p className="text-[11px] text-slate-500">{day.samples} samples</p>
              </div>
            ))}
            {(insight?.trend?.length ?? 0) === 0 && (
              <p className="text-sm text-slate-600">
                Log a few commutes to unlock personalized trendlines.
              </p>
            )}
          </div>
        </div>

        <div className="card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
            Health Playbook
          </p>
          <div className="mt-3 space-y-3 text-sm text-slate-700">
            <div className="rounded-xl bg-white/90 p-3 shadow-sm">
              <p className="font-semibold text-slate-900">Pollution-aware routing</p>
              <p>Future-ready: plug in OpenStreetMap traffic density to re-route automatically.</p>
            </div>
            <div className="rounded-xl bg-white/90 p-3 shadow-sm">
              <p className="font-semibold text-slate-900">Health risk alerts</p>
              <p>Pair WHO urban health stats to flag seniors, kids, or asthma-prone zones.</p>
            </div>
            <div className="rounded-xl bg-white/90 p-3 shadow-sm">
              <p className="font-semibold text-slate-900">Clinic access gaps</p>
              <p>Overlay DOE Malaysia AQI + OpenAQ with clinic distances to spot underserved areas.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

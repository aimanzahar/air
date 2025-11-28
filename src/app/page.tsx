"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowPathIcon,
  BoltIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  SparklesIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { nanoid } from "nanoid";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

type AirData = {
  location: string;
  city?: string;
  country?: string;
  pm25: number | null;
  no2: number | null;
  co: number | null;
  unit?: string;
  lastUpdated?: string | null;
  source?: "waqi" | "openaq";
};

type RiskLevel = "low" | "moderate" | "high" | "loading";

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
  const [userKey, setUserKey] = useState<string | null>(null);
  const [guestKey, setGuestKey] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
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

  const login = useMutation(api.auth.login);
  const logout = useMutation(api.auth.logout);
  const ensureProfile = useMutation(api.passport.ensureProfile);
  const logExposure = useMutation(api.passport.logExposure);

  const session = useQuery(
    api.auth.session,
    sessionToken ? { token: sessionToken } : undefined,
  );

  useEffect(() => {
    if (session === null && sessionToken) {
      localStorage.removeItem("air-session-token");
      setSessionToken(null);
      setStatus("Session expired, using guest profile");
    }
  }, [session, sessionToken]);

  const passport = useQuery(
    api.passport.getPassport,
    userKey ? { userKey, limit: 6 } : undefined,
  );
  const insight = useQuery(
    api.passport.insights,
    userKey ? { userKey } : undefined,
  );

  const risk = useMemo(() => scoreAir(air), [air]);

  useEffect(() => {
    const storedSession = localStorage.getItem("air-session-token");
    if (storedSession) setSessionToken(storedSession);

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
    if (session?.userKey) {
      setUserKey(session.userKey);
      localStorage.setItem("air-passport-key", session.userKey);
    } else if (guestKey) {
      setUserKey(guestKey);
    }
  }, [session?.userKey, guestKey]);

  useEffect(() => {
    setProfileReady(false);
  }, [userKey]);

  useEffect(() => {
    if (!userKey || profileReady) return;
    ensureProfile({ userKey, nickname: session?.user?.name ?? undefined }).finally(
      () => setProfileReady(true),
    );
  }, [userKey, ensureProfile, profileReady, session?.user?.name]);

  useEffect(() => {
    if (!userKey) return;
    if (!("geolocation" in navigator)) {
      setStatus("GPS unavailable, using fallback city");
      setCoords(fallback);
      fetchAir(fallback.lat, fallback.lon);
      return;
    }
    setStatus("Grabbing your air station…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = {
          lat: Number(pos.coords.latitude.toFixed(4)),
          lon: Number(pos.coords.longitude.toFixed(4)),
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
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, [userKey]);

  const fetchAir = async (lat: number, lon: number) => {
    setLoadingAir(true);
    try {
      let data: AirData | null = null;

      try {
        const waqiRes = await fetch("/api/waqi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lon }),
        });
        const waqiData = await waqiRes.json();
        if (waqiRes.ok && !waqiData?.error) {
          data = { ...waqiData, source: "waqi" };
        }
      } catch (err) {
        console.warn("WAQI fetch failed", err);
      }

      if (!data) {
        const res = await fetch("/api/openaq", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lon }),
        });
        const oaData = await res.json();
        if (res.ok && !oaData?.error) {
          data = { ...oaData, source: "openaq" };
        }
      }

      if (data) {
        setAir(data);
        setStatus(`Live data from ${data.source === "waqi" ? "WAQI" : "OpenAQ"}`);
      } else {
        setStatus("Air data unavailable — retry or move to better signal");
      }
    } catch (error) {
      console.error(error);
      setStatus("OpenAQ error — retry or change network");
    } finally {
      setLoadingAir(false);
    }
  };

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
      localStorage.setItem("air-session-token", res.token);
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
      localStorage.removeItem("air-session-token");
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

  const isSignedIn = Boolean(session?.user);

  const scrollToPassport = () => {
    if (passportRef.current) {
      passportRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-10 md:px-10 lg:px-14">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="pill inline-flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-slate-600">
            <SparklesIcon className="h-4 w-4" />
            Personalized Air Exposure Passport
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-slate-900 md:text-4xl">
            Breathe smarter. Move healthier.
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Real-time PM2.5 & NO₂ near you, with commute tips and streak-based rewards.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Status: {status}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-slate-700">
          <span className="pill inline-flex items-center gap-2">
            <MapPinIcon className="h-4 w-4" />
            {coords.label} {coords.lat.toFixed(3)}, {coords.lon.toFixed(3)}
          </span>
          <span className="pill inline-flex items-center gap-2">
            <ArrowPathIcon className="h-4 w-4" />
            Updated: {formatTime(air?.lastUpdated)}
          </span>
          <span className="pill inline-flex items-center gap-2">
            <SparklesIcon className="h-4 w-4" />
            Source: {air?.source === "waqi" ? "WAQI" : "OpenAQ"}
          </span>
        </div>
      </header>

      <section className="card flex flex-col gap-5 rounded-2xl p-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Account</p>
          <h2 className="text-lg font-semibold text-slate-900">
            {isSignedIn ? "You’re synced. Keep exploring." : "Sign in to keep your passport synced"}
          </h2>
          <p className="text-sm text-slate-700">
            {isSignedIn
              ? `Signed in as ${session?.user?.email}. Your streaks and badges stay backed up.`
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

        {isSignedIn ? (
          <div className="flex w-full flex-wrap items-center gap-2 text-sm md:max-w-[480px]">
            <button
              onClick={scrollToPassport}
              className="rounded-full bg-slate-900 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Open dashboard
            </button>
            <button
              onClick={handleLogout}
              className="rounded-full border border-rose-200 px-4 py-2 font-semibold text-rose-600 transition hover:bg-rose-50"
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
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
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
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <button
                onClick={handleLogin}
                className="rounded-full bg-slate-900 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
                disabled={authLoading}
              >
                {authLoading ? "Working…" : "Sign in"}
              </button>
              <Link
                href="/register"
                className="rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:bg-white"
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
        <div className="card col-span-1 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.15em] text-slate-500">
              Exposure Score
            </span>
            <span
              className={`badge ${
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
            <span className="font-display text-6xl text-slate-900">
              {loadingAir ? "…" : risk.score}
            </span>
            <span className="pb-2 text-sm text-slate-500">/100</span>
          </div>
          <p className="mt-3 text-sm text-slate-600">{risk.narrative}</p>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs text-slate-600">
            <div className="rounded-xl bg-white/80 px-3 py-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">PM2.5</p>
              <p className="font-display text-2xl text-slate-900">
                {formatValue(air?.pm25)}
              </p>
              <p className="text-[11px] text-slate-500">µg/m³</p>
            </div>
            <div className="rounded-xl bg-white/80 px-3 py-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">NO₂</p>
              <p className="font-display text-2xl text-slate-900">
                {formatValue(air?.no2)}
              </p>
              <p className="text-[11px] text-slate-500">ppb</p>
            </div>
            <div className="rounded-xl bg-white/80 px-3 py-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">CO</p>
              <p className="font-display text-2xl text-slate-900">
                {formatValue(air?.co)}
              </p>
              <p className="text-[11px] text-slate-500">ppm</p>
            </div>
          </div>
        </div>

        <div className="card col-span-1 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.15em] text-slate-500">
              Rewards & Streak
            </span>
            <TrophyIcon className="h-5 w-5 text-amber-500" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/90 px-4 py-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Points
              </p>
              <p className="font-display text-3xl text-slate-900">
                {passport?.profile?.points ?? 0}
              </p>
              <p className="text-xs text-slate-500">
                Low-exposure commutes boost rewards.
              </p>
            </div>
            <div className="rounded-xl bg-white/90 px-4 py-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Streak
              </p>
              <p className="font-display text-3xl text-slate-900">
                {passport?.profile?.streak ?? 0}d
              </p>
              <p className="text-xs text-slate-500">
                Best: {passport?.profile?.bestStreak ?? 0}d
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-700">
            {badges.map((b) => (
              <span key={b} className="badge bg-white/70 text-slate-800">
                {b}
              </span>
            ))}
          </div>
        </div>

        <div className="card col-span-1 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.15em] text-slate-500">
              Quick Recommendations
            </span>
            <SparklesIcon className="h-5 w-5 text-sky-500" />
          </div>
          <div className="mt-4 space-y-3">
            {recommendationDeck.map((rec) => (
              <div
                key={rec.title}
                className="flex items-start gap-3 rounded-xl bg-white/90 p-3 shadow-sm"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
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

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card rounded-2xl p-5 lg:col-span-2">
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
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800"
              onClick={() => fetchAir(coords.lat, coords.lon)}
            >
              <ArrowPathIcon className="h-4 w-4" />
              Refresh AQ
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {(passport?.exposures ?? []).map((entry) => (
              <div
                key={entry._id}
                className="flex flex-col justify-between gap-3 rounded-xl bg-white/90 p-4 shadow-sm md:flex-row md:items-center"
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

        <div className="card rounded-2xl p-5">
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
                className={`flex-1 rounded-xl px-3 py-2 text-sm capitalize transition ${
                  mode === m
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white/90 text-slate-700 shadow-sm hover:bg-white"
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
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save this commute"}
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
                Average score: {insight?.trend?.length ? insight.trend.slice(-7).reduce((acc, d) => acc + d.average, 0) / insight.trend.slice(-7).length : "—"}
              </h3>
            </div>
            <span className="badge bg-white/80 text-slate-800">
              Samples: {insight?.sampleCount ?? 0}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {(insight?.trend ?? []).slice(-8).map((day) => (
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

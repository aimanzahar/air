"use client";

import {
  ArrowLongRightIcon,
  BoltIcon,
  GlobeAsiaAustraliaIcon,
  HeartIcon,
  MapPinIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const pillars = [
  {
    title: "Cut exposure on KL commutes",
    body: "Live PM2.5 and NO₂ trends keep you out of the worst pockets between Bangsar, PJ, and the city core.",
    icon: <MapPinIcon className="h-6 w-6 text-sky-600" />,
  },
  {
    title: "Rewards for smart choices",
    body: "Earn streaks and badges when you swap to rail, pick shaded routes, or avoid peak smog hours.",
    icon: <TrophyIcon className="h-6 w-6 text-amber-600" />,
  },
  {
    title: "Health-first design",
    body: "Micro-coaching, indoor day nudges, and mask reminders tuned for haze season and heat alerts.",
    icon: <HeartIcon className="h-6 w-6 text-emerald-600" />,
  },
];

const steps = [
  {
    label: "01",
    title: "Check today’s air pulse",
    body: "We blend WAQI + OpenAQ for a Malaysian-centered AQ snapshot with risk scoring.",
  },
  {
    label: "02",
    title: "Plan the cleanest route",
    body: "Pick metro over car for crosstown, choose green corridors, or delay until peaks ease.",
  },
  {
    label: "03",
    title: "Log and keep a streak",
    body: "Save commutes, grow points, and watch your weekly averages drift cleaner.",
  },
];

export default function Landing() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const appName = "NafasLokal";

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-4 py-12 md:px-10 lg:px-14">
      {/* Hero */}
      <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="space-y-4">
          <p className="pill initial-hidden animate-slide-down inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-600">
            <SparklesIcon className="h-4 w-4" />
            Malaysia-first air wellness
          </p>
          <h1 className="initial-hidden animate-slide-up delay-100 font-display text-4xl font-semibold text-slate-900 md:text-5xl">
            {appName}: breathe smarter across the Klang Valley.
          </h1>
          <p className="initial-hidden animate-slide-up delay-200 text-lg text-slate-700">
            A calm home for commuters to track air quality, choose cleaner routes, and earn rewards
            for low-exposure days. Built for KL heat, haze, and rapid metro hops.
          </p>
          <div className="initial-hidden animate-slide-up delay-300 flex flex-wrap gap-3">
            {!isLoading && (
              <>
                {isAuthenticated ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-slate-800 hover:shadow-xl"
                    >
                      Continue to dashboard
                      <ArrowLongRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-5 py-3 text-sm font-semibold text-emerald-700">
                      Welcome back, {user?.name || user?.email?.split('@')[0]}!
                    </div>
                  </>
                ) : (
                  <>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-slate-800 hover:shadow-xl"
                    >
                      Launch live dashboard
                      <ArrowLongRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-800 transition-all duration-300 hover:scale-105 hover:bg-white hover:shadow-lg"
                    >
                      Create account
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
          <div className="initial-hidden animate-fade-in delay-400 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="pill transition-transform duration-300 hover:scale-110">WAQI + OpenAQ</span>
            <span className="pill transition-transform duration-300 hover:scale-110">Convex auth</span>
            <span className="pill transition-transform duration-300 hover:scale-110">Streaks & badges</span>
            <span className="pill transition-transform duration-300 hover:scale-110">Designed in MY</span>
          </div>
        </div>

        <div className="relative initial-hidden animate-slide-left delay-200">
          <div className="card hover-lift relative overflow-hidden rounded-3xl p-6">
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-sky-100 via-white to-emerald-50 transition-opacity duration-500" />
            <div className="absolute -left-6 -top-6 h-28 w-28 rounded-full bg-sky-200/40 blur-3xl animate-float" />
            <div className="absolute -right-8 -bottom-10 h-32 w-32 rounded-full bg-amber-200/50 blur-3xl animate-float delay-500" />

            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Snapshot</p>
            <h3 className="mt-2 font-display text-2xl text-slate-900">Today in KLCC</h3>
            <p className="text-sm text-slate-600">PM2.5 mild · shift errands to after 11am.</p>

            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-white/80 p-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.1em] text-slate-500">PM2.5</p>
                <p className="font-display text-3xl text-slate-900">28</p>
                <p className="text-[11px] text-slate-500">µg/m³</p>
              </div>
              <div className="rounded-2xl bg-white/80 p-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.1em] text-slate-500">NO₂</p>
                <p className="font-display text-3xl text-slate-900">19</p>
                <p className="text-[11px] text-slate-500">ppb</p>
              </div>
              <div className="rounded-2xl bg-white/80 p-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.1em] text-slate-500">Score</p>
                <p className="font-display text-3xl text-emerald-700">82</p>
                <p className="text-[11px] text-slate-500">Low risk</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-900 text-slate-100">
              <div className="flex items-center justify-between px-4 py-3 text-xs uppercase tracking-[0.12em]">
                <span className="flex items-center gap-2">
                  <BoltIcon className="h-4 w-4 text-amber-300" />
                  Smart tips
                </span>
                <span className="pill border-white/10 bg-white/10 text-[11px] text-slate-100">
                  KL commuter
                </span>
              </div>
              <div className="space-y-3 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 px-4 py-4">
                <div className="flex items-start gap-3 text-sm">
                  <ShieldCheckIcon className="h-5 w-5 text-emerald-300" />
                  <p>Take LRT for crosstown; cars add +12 NO₂ points in rush hour.</p>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <MapPinIcon className="h-5 w-5 text-sky-300" />
                  <p>Use park connectors near Lake Gardens; greenery trims fine dust.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="card initial-hidden animate-scale-in delay-100 rounded-3xl p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Our mission</p>
            <h2 className="font-display text-2xl text-slate-900">
              Keep Malaysians moving with cleaner air, one trip at a time.
            </h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <GlobeAsiaAustraliaIcon className="h-5 w-5" />
            Built for Klang Valley, ready for Penang & JB next.
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {pillars.map((item, index) => (
            <div
              key={item.title}
              className={`initial-hidden animate-slide-up delay-${(index + 1) * 100} hover-lift rounded-2xl bg-white/85 p-4 shadow-sm ring-1 ring-slate-100 transition-all duration-300 hover:ring-sky-200`}
            >
              <div className="flex items-center gap-2">
                {item.icon}
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              </div>
              <p className="mt-2 text-sm text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr] lg:items-start">
        <div className="card initial-hidden animate-slide-right delay-100 rounded-3xl p-6">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">How it works</p>
          <h3 className="mt-2 font-display text-xl text-slate-900">
            Three calm steps to cleaner daily air.
          </h3>
          <div className="mt-4 space-y-3">
            {steps.map((step, index) => (
              <div
                key={step.label}
                className={`initial-hidden animate-slide-up delay-${(index + 2) * 100} hover-lift flex items-start gap-3 rounded-2xl bg-white/85 p-4 shadow-sm ring-1 ring-slate-100 transition-all duration-300 hover:ring-2 hover:ring-sky-200`}
              >
                <span className="pill text-xs font-semibold transition-all duration-300 hover:bg-sky-100">{step.label}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                  <p className="text-sm text-slate-600">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            {!isLoading && (
              <>
                {isAuthenticated ? (
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 font-semibold text-white shadow-sm transition-all duration-300 hover:scale-105 hover:bg-slate-800 hover:shadow-lg"
                  >
                    Continue to dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 font-semibold text-white shadow-sm transition-all duration-300 hover:scale-105 hover:bg-slate-800 hover:shadow-lg"
                    >
                      Open dashboard
                    </Link>
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 font-semibold text-slate-700 transition-all duration-300 hover:scale-105 hover:bg-white hover:shadow-md"
                    >
                      Create account
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div className="card initial-hidden animate-slide-left delay-200 rounded-3xl p-6">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Impact</p>
          <h3 className="mt-2 font-display text-xl text-slate-900">
            Built for Malaysia’s rhythms.
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <BoltIcon className="mt-[2px] h-4 w-4 text-amber-500" />
              Rush-hour aware guidance that nudges you to shift errands outside 7–9am & 5–7pm.
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheckIcon className="mt-[2px] h-4 w-4 text-emerald-500" />
              Haze-season playbooks: mask reminders, indoor swaps, and notification-friendly layout.
            </li>
            <li className="flex items-start gap-2">
              <MapPinIcon className="mt-[2px] h-4 w-4 text-sky-500" />
              Park and waterfront routing suggestions to capture that 15–20% dust drop.
            </li>
          </ul>
          <div className="mt-5 grid grid-cols-2 gap-3 text-center text-sm">
            <div className="rounded-2xl bg-white/85 p-4 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.1em] text-slate-500">KL & PJ</p>
              <p className="font-display text-3xl text-slate-900">Live</p>
              <p className="text-[11px] text-slate-500">Metro & driving modes</p>
            </div>
            <div className="rounded-2xl bg-white/85 p-4 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.1em] text-slate-500">Penang beta</p>
              <p className="font-display text-3xl text-slate-900">Soon</p>
              <p className="text-[11px] text-slate-500">Green corridor focus</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="initial-hidden animate-scale-in delay-100 rounded-3xl bg-slate-900 p-6 text-slate-100 transition-all duration-300 hover:shadow-2xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="pill border-white/15 bg-white/10 text-[11px] uppercase tracking-[0.14em] text-slate-100">
              {appName}
            </p>
            <h4 className="mt-2 font-display text-2xl">Breathe better, move kinder.</h4>
            <p className="text-sm text-slate-200">
              Live air, nudges, and rewards for Malaysia's daily movers.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {!isLoading && (
              <>
                {isAuthenticated ? (
                  <Link
                    href="/dashboard"
                    className="rounded-full bg-white px-4 py-2 font-semibold text-slate-900 shadow-sm transition-all duration-300 hover:scale-105 hover:bg-slate-50 hover:shadow-md"
                  >
                    Continue to dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/dashboard"
                      className="rounded-full bg-white px-4 py-2 font-semibold text-slate-900 shadow-sm transition-all duration-300 hover:scale-105 hover:bg-slate-50 hover:shadow-md"
                    >
                      Open dashboard
                    </Link>
                    <Link
                      href="/register"
                      className="rounded-full border border-white/30 px-4 py-2 font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-white/10"
                    >
                      Create account
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

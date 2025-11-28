"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  LockClosedIcon,
  SparklesIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../../convex/_generated/api";

export default function RegisterPage() {
  const router = useRouter();
  const signup = useMutation(api.auth.signup);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage("Email and password are required");
      return;
    }
    if (password.length < 8) {
      setMessage("Use at least 8 characters for a stronger password");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await signup({
        email,
        password,
        name: name || email.split("@")[0],
      });
      localStorage.setItem("air-session-token", res.token);
      setMessage("Account created! Redirecting to your passport…");
      setTimeout(() => router.push("/"), 600);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-10 md:flex-row md:px-10 lg:px-14">
      <div className="card relative overflow-hidden rounded-2xl p-6 text-slate-50 md:w-1/2">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-900 via-slate-800 to-sky-800" />
        <div
          className="absolute inset-0 -z-10 opacity-30"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, rgba(14,165,233,0.25), transparent 45%), radial-gradient(circle at 80% 30%, rgba(14,165,233,0.2), transparent 40%)",
          }}
        />
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-sky-200">
          <SparklesIcon className="h-4 w-4" />
          Air Exposure Passport
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold leading-tight">
          Create your account in a calm, focused space.
        </h1>
        <p className="mt-3 text-sm text-slate-200">
          Keep your commute streaks, badges, and low-exposure points synced across every device. Registration now has its own screen to reduce friction.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-3 text-sm">
          <div className="flex items-start gap-3 rounded-xl bg-white/10 p-3">
            <LockClosedIcon className="h-5 w-5 text-sky-200" />
            <div>
              <p className="font-semibold text-slate-50">Privacy-first</p>
              <p className="text-slate-200/90">
                We keep auth in Convex. No third-party trackers or marketing blasts.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-white/10 p-3">
            <CheckCircleIcon className="h-5 w-5 text-emerald-200" />
            <div>
              <p className="font-semibold text-slate-50">Ready to roll</p>
              <p className="text-slate-200/90">
                Return to the dashboard instantly after signup—GPS and air data stay live.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-2 text-xs text-slate-200">
          <div className="h-2 w-2 rounded-full bg-emerald-300" />
          Sessions stay cached for 24 hours unless you sign out.
        </div>
      </div>

      <div className="card flex flex-1 flex-col gap-4 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Register</p>
            <h2 className="font-display text-2xl text-slate-900">Start a clean-air streak</h2>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
            Display name
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-200">
              <UserIcon className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="How should we call you?"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
            Email
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-200">
              <SparklesIcon className="h-4 w-4 text-slate-400" />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
            Password
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-200">
              <LockClosedIcon className="h-4 w-4 text-slate-400" />
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </label>

          <div className="flex flex-col gap-2 text-xs text-slate-500">
            <p>Good UX: short form, clear labels, and one primary action.</p>
            <p>We only store what&apos;s needed to sync your passport.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-slate-900 via-slate-800 to-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>

          {message && (
            <p
              className={`text-sm ${/fail|error|required|at least/i.test(message) ? "text-rose-700" : "text-emerald-700"}`}
            >
              {message}
            </p>
          )}
        </form>

        <div className="rounded-xl bg-white/80 p-4 text-xs text-slate-600 shadow-sm">
          Already have an account?{" "}
          <Link
            href="/dashboard"
            className="font-semibold text-slate-900 underline-offset-4 hover:underline"
          >
            Sign in on the dashboard
          </Link>
          .
        </div>
      </div>
    </main>
  );
}

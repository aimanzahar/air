"use client";

import { FormEvent, useState, useEffect } from "react";
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
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

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
      <div className={`card relative overflow-hidden rounded-2xl p-6 text-slate-50 md:w-1/2 transition-all duration-700 ease-out ${
        isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}>
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-900 via-slate-800 to-sky-800" />
        <div
          className="absolute inset-0 -z-10 opacity-30"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, rgba(14,165,233,0.25), transparent 45%), radial-gradient(circle at 80% 30%, rgba(14,165,233,0.2), transparent 40%)",
          }}
        />
        <div className={`flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-sky-200 transition-all duration-500 delay-300 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}>
          <SparklesIcon className="h-4 w-4 animate-pulse" />
          Air Exposure Passport
        </div>
        <h1 className={`mt-4 font-display text-3xl font-semibold leading-tight transition-all duration-500 delay-200 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}>
          Create your account in a calm, focused space.
        </h1>
        <p className={`mt-3 text-sm text-slate-200 transition-all duration-500 delay-400 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}>
          Keep your commute streaks, badges, and low-exposure points synced across every device. Registration now has its own screen to reduce friction.
        </p>
        <div className={`mt-6 grid grid-cols-1 gap-3 text-sm transition-all duration-500 delay-500 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}>
          <div className="flex items-start gap-3 rounded-xl bg-white/10 p-3 transition-all duration-300 hover:bg-white/15 hover:scale-105">
            <LockClosedIcon className="h-5 w-5 text-sky-200" />
            <div>
              <p className="font-semibold text-slate-50">Privacy-first</p>
              <p className="text-slate-200/90">
                We keep auth in Convex. No third-party trackers or marketing blasts.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-white/10 p-3 transition-all duration-300 hover:bg-white/15 hover:scale-105">
            <CheckCircleIcon className="h-5 w-5 text-emerald-200" />
            <div>
              <p className="font-semibold text-slate-50">Ready to roll</p>
              <p className="text-slate-200/90">
                Return to the dashboard instantly after signup—GPS and air data stay live.
              </p>
            </div>
          </div>
        </div>
        <div className={`mt-6 flex items-center gap-2 text-xs text-slate-200 transition-all duration-500 delay-700 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}>
          <div className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
          Sessions stay cached for 24 hours unless you sign out.
        </div>
      </div>

      <div className={`card flex flex-1 flex-col gap-4 rounded-2xl p-6 transition-all duration-700 ease-out delay-200 ${
        isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}>
        <div className={`flex items-center justify-between transition-all duration-500 delay-300 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}>
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Register</p>
            <h2 className="font-display text-2xl text-slate-900">Start a clean-air streak</h2>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 underline-offset-4 transition-all duration-200 hover:text-slate-900 hover:underline hover:scale-105"
          >
            <ArrowLeftIcon className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
            Back to dashboard
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className={`transition-all duration-500 delay-400 ${
            isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}>
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
              Display name
              <div className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm transition-all duration-300 focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-200 hover:border-slate-300 hover:shadow-md">
                <UserIcon className="h-4 w-4 text-slate-400 transition-colors duration-300 group-hover:text-slate-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="How should we call you?"
                  className="w-full bg-transparent text-sm outline-none transition-all duration-300 placeholder:text-slate-400"
                />
              </div>
            </label>
          </div>

          <div className={`transition-all duration-500 delay-500 ${
            isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}>
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
              Email
              <div className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm transition-all duration-300 focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-200 hover:border-slate-300 hover:shadow-md">
                <SparklesIcon className="h-4 w-4 text-slate-400 transition-all duration-300 group-hover:text-slate-500 group-hover:animate-pulse" />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full bg-transparent text-sm outline-none transition-all duration-300 placeholder:text-slate-400"
                />
              </div>
            </label>
          </div>

          <div className={`transition-all duration-500 delay-600 ${
            isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}>
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
              Password
              <div className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm transition-all duration-300 focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-200 hover:border-slate-300 hover:shadow-md">
                <LockClosedIcon className="h-4 w-4 text-slate-400 transition-colors duration-300 group-hover:text-slate-500" />
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-transparent text-sm outline-none transition-all duration-300 placeholder:text-slate-400"
                />
              </div>
            </label>
          </div>

          <div className={`flex flex-col gap-2 text-xs text-slate-500 transition-all duration-500 delay-700 ${
            isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}>
            <p>Good UX: short form, clear labels, and one primary action.</p>
            <p>We only store what&apos;s needed to sync your passport.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-slate-900 via-slate-800 to-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:brightness-110 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-70 ${
              isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            } transition-all duration-500 delay-800`}
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creating account…
              </>
            ) : (
              "Create account"
            )}
          </button>

          {message && (
            <p
              className={`text-sm transition-all duration-300 ${
                /fail|error|required|at least/i.test(message)
                  ? "text-rose-700 animate-pulse"
                  : "text-emerald-700"
              } ${
                isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
              }`}
            >
              {message}
            </p>
          )}
        </form>

        <div className={`rounded-xl bg-white/80 p-4 text-xs text-slate-600 shadow-sm transition-all duration-500 delay-900 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        } hover:bg-white/90 hover:shadow-md`}>
          Already have an account?{" "}
          <Link
            href="/dashboard"
            className="font-semibold text-slate-900 underline-offset-4 transition-all duration-200 hover:underline hover:text-sky-700"
          >
            Sign in on the dashboard
          </Link>
          .
        </div>
      </div>
    </main>
  );
}

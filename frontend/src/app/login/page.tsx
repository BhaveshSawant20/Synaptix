"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { API_BASE } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Invalid email or password.");
        return;
      }

      localStorage.setItem("synaptix_token", data.token);

      window.location.href = "/app/dashboard";
    } catch {
      setError(
        "Unable to connect to Synaptix server. Please make sure the backend is running.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden">
      <div className="relative flex min-h-screen items-center justify-center px-5 py-10">
        {/* Background decoration */}
        <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-orange-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />

        <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-orange-100/80 bg-white/60 shadow-2xl shadow-orange-100/50 backdrop-blur-xl lg:grid-cols-2">
          {/* Left side */}
          <section className="hidden bg-stone-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <Link href="/" className="inline-flex items-center gap-3">
                <img
                  src="/synaptix-logo.png"
                  alt="Synaptix"
                  className="h-10 w-auto object-contain"
                />

                <div>
                  <p className="text-lg font-bold tracking-tight">
                    SYNAPTIX
                  </p>

                  <p className="text-[9px] font-medium tracking-[0.18em] text-stone-400">
                    COACHING INTELLIGENCE
                  </p>
                </div>
              </Link>

              {/* Brand Banner Card */}
              <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-stone-950/60 shadow-xl shadow-black/40 transition-all duration-300 hover:border-orange-500/30">
                <img
                  src="/synaptix-banner-dark.jpg"
                  alt="Synaptix Coaching Intelligence Banner"
                  className="h-auto w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                />
              </div>
            </div>

            <div className="max-w-md">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1.5 text-xs font-semibold text-orange-300">
                <span>✳</span>
                Institute workspace
              </div>

              <h1 className="text-4xl font-semibold leading-tight tracking-tight">
                Your academics,
                <br />
                <span className="text-orange-400">in focus.</span>
              </h1>

              <p className="mt-5 text-sm leading-6 text-stone-400">
                Manage your institute&apos;s schools, students, batches,
                academics and performance from one connected workspace.
              </p>

              <div className="mt-8 space-y-3">
                {[
                  "Multi-school academic management",
                  "Centralized batch information",
                  "AI-ready academic intelligence",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 text-sm text-stone-300"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-400/10 text-xs text-orange-400">
                      ✓
                    </span>

                    {item}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-stone-500">
              © 2026 SYNAPTIX. All rights reserved.
            </p>
          </section>

          {/* Login form */}
          <section className="flex min-h-[650px] flex-col justify-center p-7 sm:p-10 lg:p-12">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8 lg:hidden">
                <Link href="/" className="inline-flex items-center gap-3">
                  <img
                    src="/synaptix-logo.png"
                    alt="Synaptix"
                    className="h-10 w-auto object-contain"
                  />

                  <div>
                    <p className="text-lg font-bold tracking-tight text-stone-900">
                      SYNAPTIX
                    </p>

                    <p className="text-[9px] font-medium tracking-[0.18em] text-stone-500">
                      COACHING INTELLIGENCE
                    </p>
                  </div>
                </Link>
              </div>

              <div className="mb-8">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">
                  Welcome back
                </p>

                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">
                  Sign in to Synaptix
                </h2>

                <p className="mt-2 text-sm leading-6 text-stone-500">
                  Access your coaching institute workspace.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-stone-700"
                  >
                    Email address
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@example.com"
                    autoComplete="email"
                    required
                    className="h-12 w-full rounded-xl border border-stone-200 bg-white/80 px-4 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-stone-700"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      className="h-12 w-full rounded-xl border border-stone-200 bg-white/80 px-4 pr-12 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((current) => !current)
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-stone-400 transition hover:bg-orange-50 hover:text-orange-600"
                    >
                      {showPassword ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="h-5 w-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.26 19.5 12 19.5c1.684 0 3.273-.38 4.686-1.057M6.228 6.228A10.45 10.45 0 0112 4.5c4.74 0 8.773 3.162 10.066 7.5a10.523 10.523 0 01-4.132 5.411M6.228 6.228L3 3m3.228 3.228l3.06 3.06m0 0a3 3 0 104.243 4.243m-4.243-4.243l4.243 4.243m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="h-5 w-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.062 12.348a1 1 0 010-.696C3.423 7.585 7.32 4.5 12 4.5s8.577 3.085 9.938 7.152a1 1 0 010 .696C20.577 16.415 16.68 19.5 12 19.5s-8.577-3.085-9.938-7.152z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="orange-gradient flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:shadow-orange-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Signing in..." : "Sign in"}
                  {!loading && <span>→</span>}
                </button>
              </form>

              <div className="my-7 flex items-center gap-4">
                <div className="h-px flex-1 bg-stone-200" />
                <span className="text-xs text-stone-400">SYNAPTIX</span>
                <div className="h-px flex-1 bg-stone-200" />
              </div>

              <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-orange-600 shadow-sm">
                    ✳
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-stone-800">
                      Coaching Institute Admin
                    </p>

                    <p className="mt-1 text-xs leading-5 text-stone-500">
                      This workspace is designed for authorized institute
                      administrators.
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-7 text-center text-sm text-stone-500">
                Don&apos;t have an institute account?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-orange-600 transition hover:text-orange-700"
                >
                  Register
                </Link>
              </p>

              <Link
                href="/"
                className="mt-4 flex items-center justify-center text-xs font-medium text-stone-400 transition hover:text-stone-600"
              >
                ← Back to home
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/api";

export default function AccountSettingsPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("synaptix_token");

    if (!token) {
      router.push("/login");
      return;
    }

    const loadAccount = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          localStorage.removeItem("synaptix_token");
          router.push("/login");
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load account information");
        }

        setName(data.admin?.name || "");
        setEmail(data.admin?.email || "");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load account information",
        );
      } finally {
        setLoading(false);
      }
    };

    loadAccount();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }

    const token = localStorage.getItem("synaptix_token");

    if (!token) {
      router.push("/login");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/account`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
        }),
      });

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        router.push("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update account");
      }

      setName(data.admin?.name || name.trim());
      setEmail(data.admin?.email || email.trim());

      setSuccess("Account information updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update account information",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="w-full px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="overflow-hidden rounded-3xl border border-stone-200/80 bg-white/80 p-8 shadow-sm backdrop-blur-xl">
            <div className="h-5 w-32 animate-pulse rounded-full bg-orange-100" />
            <div className="mt-4 h-9 w-72 animate-pulse rounded-xl bg-stone-100" />
            <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-stone-100" />
            <div className="mt-8 space-y-4">
              <div className="h-11 animate-pulse rounded-xl bg-stone-100" />
              <div className="h-11 animate-pulse rounded-xl bg-stone-100" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
      {/* Back Link */}
      <Link
        href="/app/settings"
        className="group inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition duration-200 hover:text-orange-600"
      >
        <span className="transition-transform duration-200 group-hover:-translate-x-0.5">
          ←
        </span>
        Back to Settings
      </Link>

      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-stone-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-8">
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-orange-100/50 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
            Account Preferences
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            Administrator Account
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
            Update the administrator full name and primary email address managing this Synaptix coaching workspace.
          </p>
        </div>
      </section>

      {/* Form Container */}
      <section className="glass overflow-hidden rounded-2xl border border-stone-200/70">
        <div className="border-b border-stone-200/80 bg-stone-50/50 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
            Profile Details
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="admin-name"
                className="mb-1.5 block text-xs font-semibold text-stone-700"
              >
                Administrator Name *
              </label>
              <input
                id="admin-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter administrator name"
                required
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
              <p className="mt-1.5 text-xs text-stone-400">
                Visible as institute admin in platform headers.
              </p>
            </div>

            <div>
              <label
                htmlFor="admin-email"
                className="mb-1.5 block text-xs font-semibold text-stone-700"
              >
                Email Address *
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                required
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
              <p className="mt-1.5 text-xs text-stone-400">
                Primary contact for login and administrative notices.
              </p>
            </div>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {success}
            </div>
          )}

          {/* Submit Action */}
          <div className="mt-8 flex flex-col gap-4 border-t border-stone-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-stone-400">
              Changes take effect immediately for this administrator session.
            </p>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </section>

      {/* Security Quick Link Card */}
      <section className="relative overflow-hidden rounded-2xl bg-stone-900 p-6 text-white shadow-md sm:p-7">
        <div className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-400" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-400">
                Credential Security
              </p>
            </div>
            <h3 className="mt-2 text-base font-semibold text-white">
              Need to update your admin password?
            </h3>
            <p className="mt-1 text-xs text-stone-300">
              Change your password and ensure your institute data remains confidential.
            </p>
          </div>

          <Link
            href="/app/settings/security"
            className="shrink-0 rounded-xl border border-orange-400/30 bg-orange-500/10 px-4 py-2.5 text-xs font-semibold text-orange-300 transition duration-200 hover:border-orange-500 hover:bg-orange-500 hover:text-white"
          >
            Security Settings →
          </Link>
        </div>
      </section>
      </div>
    </main>
  );
}
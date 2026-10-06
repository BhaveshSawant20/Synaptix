"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { API_BASE_URL } from "@/lib/api";
import { EyeIcon } from "@/components/EyeIcon";

export default function SecuritySettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation password do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from your current password.");
      return;
    }

    const token = localStorage.getItem("synaptix_token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (response.status === 401) {
        const data = await response.json();

        if (data.message === "Current password is incorrect") {
          throw new Error(data.message);
        }

        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to change password");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setSuccess("Password changed successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to change password.",
      );
    } finally {
      setSaving(false);
    }
  };

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
            Security Controls
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            Account Security
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
            Rotate your administrator password and protect sensitive coaching institute records.
          </p>
        </div>
      </section>

      {/* Password Change Form */}
      <section className="glass overflow-hidden rounded-2xl border border-stone-200/70">
        <div className="border-b border-stone-200/80 bg-stone-50/50 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
            Change Administrator Password
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Current Password */}
            <div className="lg:col-span-2">
              <label
                htmlFor="current-password"
                className="mb-1.5 block text-xs font-semibold text-stone-700"
              >
                Current Password *
              </label>

              <div className="relative">
                <input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  required
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 pr-11 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />

                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  aria-label={
                    showCurrentPassword
                      ? "Hide current password"
                      : "Show current password"
                  }
                  className="absolute right-2.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-white/90 text-stone-400 backdrop-blur-sm transition hover:bg-orange-50 hover:text-orange-600 focus:outline-none"
                >
                  <EyeIcon show={showCurrentPassword} />
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label
                htmlFor="new-password"
                className="mb-1.5 block text-xs font-semibold text-stone-700"
              >
                New Password *
              </label>

              <div className="relative">
                <input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 8 characters)"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  spellCheck={false}
                  required
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 pr-11 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />

                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  aria-label={
                    showNewPassword
                      ? "Hide new password"
                      : "Show new password"
                  }
                  className="absolute right-2.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-white/90 text-stone-400 backdrop-blur-sm transition hover:bg-orange-50 hover:text-orange-600 focus:outline-none"
                >
                  <EyeIcon show={showNewPassword} />
                </button>
              </div>

              <p className="mt-1.5 text-xs text-stone-400">
                Minimum 8 characters with a mix of letters and numbers recommended.
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirm-password"
                className="mb-1.5 block text-xs font-semibold text-stone-700"
              >
                Confirm New Password *
              </label>

              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  spellCheck={false}
                  required
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 pr-11 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirmation password"
                      : "Show confirmation password"
                  }
                  className="absolute right-2.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-white/90 text-stone-400 backdrop-blur-sm transition hover:bg-orange-50 hover:text-orange-600 focus:outline-none"
                >
                  <EyeIcon show={showConfirmPassword} />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
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

          {/* Action */}
          <div className="mt-8 flex flex-col gap-4 border-t border-stone-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-stone-400">
              Your password is encrypted using high-entropy bcrypt hashing.
            </p>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Updating..." : "Change Password"}
            </button>
          </div>
        </form>
      </section>
      </div>
    </main>
  );
}
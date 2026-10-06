"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { API_BASE } from "@/lib/api";

export default function AppHeader() {
  const [instituteName, setInstituteName] = useState("Institute");
  const [logoUrl, setLogoUrl] = useState("");
  const [initials, setInitials] = useState("IN");

  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [logoUpdating, setLogoUpdating] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadInstituteProfile() {
      try {
        const token = localStorage.getItem("synaptix_token");

        if (!token) return;

        const response = await fetch(
          `${API_BASE}/institute/profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (response.status === 401) {
          localStorage.removeItem("synaptix_token");
          window.location.href = "/login";
          return;
        }

        if (!response.ok) return;

        const data = await response.json();
        const name = data.institute?.name || "Institute";

        setInstituteName(name);
        setLogoUrl(data.institute?.logoSignedUrl || "");

        const words = name.trim().split(/\s+/).filter(Boolean);

        let generatedInitials = "IN";

        if (words.length >= 2) {
          generatedInitials =
            words[0][0].toUpperCase() + words[1][0].toUpperCase();
        } else if (words.length === 1) {
          generatedInitials = words[0].slice(0, 2).toUpperCase();
        }

        setInitials(generatedInitials);
      } catch (error) {
        console.error("Failed to load institute profile:", error);
      }
    }

    loadInstituteProfile();
  }, []);

  useEffect(() => {
    function handleInstituteUpdated(event: Event) {
      const customEvent = event as CustomEvent<{
        name?: string;
        logoSignedUrl?: string | null;
      }>;

      const updatedInstitute = customEvent.detail;

      if (!updatedInstitute) return;

      setLogoUpdating(true);

      if (typeof updatedInstitute.name === "string") {
        setInstituteName(updatedInstitute.name);

        const words = updatedInstitute.name.trim().split(/\s+/).filter(Boolean);

        let generatedInitials = "IN";

        if (words.length >= 2) {
          generatedInitials =
            words[0][0].toUpperCase() + words[1][0].toUpperCase();
        } else if (words.length === 1) {
          generatedInitials = words[0].slice(0, 2).toUpperCase();
        }

        setInitials(generatedInitials);
      }

      if ("logoSignedUrl" in updatedInstitute) {
        setLogoUrl(updatedInstitute.logoSignedUrl || "");
      }

      window.setTimeout(() => {
        setLogoUpdating(false);
      }, 220);
    }

    window.addEventListener(
      "synaptix:institute-updated",
      handleInstituteUpdated,
    );

    return () => {
      window.removeEventListener(
        "synaptix:institute-updated",
        handleInstituteUpdated,
      );
    };
  }, []);

  useEffect(() => {
    function updateClock() {
      const now = new Date();

      setCurrentDate(
        now.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
      );

      setCurrentTime(
        now.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    }

    updateClock();

    const interval = setInterval(updateClock, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function handleLogout() {
    localStorage.removeItem("synaptix_token");
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-white/70 backdrop-blur-xl">
      <div className="flex h-20 items-center justify-between px-5 sm:px-8">
        {/* Institute Info */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
            {instituteName}
          </p>

          <p className="mt-1 text-sm font-medium text-stone-500">
            Institute Admin
          </p>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Date */}
          <div className="hidden items-center rounded-xl border border-stone-200 bg-white px-3.5 py-2 shadow-sm sm:flex">
            <span className="font-mono text-sm font-semibold tracking-wide text-stone-700">
              {currentDate}
            </span>
          </div>

          {/* Time */}
          <div className="hidden items-center rounded-xl border border-stone-200 bg-white px-3.5 py-2 shadow-sm sm:flex">
            <span className="font-mono text-sm font-semibold tracking-wide text-stone-700">
              {currentTime}
            </span>
          </div>

          {/* Desktop Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="hidden rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-600 transition hover:border-orange-200 hover:text-orange-600 sm:block"
          >
            Logout
          </button>

          {/* Institute Logo / Menu */}
          <div ref={profileMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((previous) => !previous)}
              aria-label="Open institute menu"
              aria-expanded={profileMenuOpen}
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-orange-100 text-sm font-bold text-orange-700 ring-4 ring-orange-50 transition duration-200 hover:scale-105 hover:ring-orange-100"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={`${instituteName} logo`}
                  className={`h-full w-full object-cover transition-opacity duration-200 ${logoUpdating ? "opacity-40" : "opacity-100"}`}
                />
              ) : (
                initials
              )}
            </button>

            <div
              className={`absolute right-0 top-12 z-50 w-64 origin-top-right overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl shadow-stone-200/50 transition-all duration-200 ease-out ${
                profileMenuOpen
                  ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                  : "pointer-events-none -translate-y-1 scale-95 opacity-0"
              }`}
              aria-hidden={!profileMenuOpen}
            >
              {/* Profile Header */}
              <div className="border-b border-stone-100 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-100 text-sm font-bold text-orange-700">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={`${instituteName} logo`}
                        className={`h-full w-full object-cover transition-opacity duration-200 ${logoUpdating ? "opacity-40" : "opacity-100"}`}
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-900">
                      {instituteName}
                    </p>

                    <p className="mt-0.5 text-xs text-stone-500">
                      Institute Admin
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu */}
              <div className="p-2">
                {/* Dashboard */}
                <Link
                  href="/app/dashboard"
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 transition-all duration-200 hover:bg-orange-50 hover:text-orange-700 active:scale-[0.98]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-4 w-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-5v-6h-5v6h-5A1.5 1.5 0 0 1 3 19.5v-9Z"
                      />
                    </svg>
                  </span>

                  <span>Dashboard</span>
                </Link>

                {/* Institute Settings */}
                <Link
                  href="/app/settings"
                  onClick={() => setProfileMenuOpen(false)}
                  className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-orange-50 hover:text-orange-700"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-4 w-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .8v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.8l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.8-3h-.2a1.8 1.8 0 0 1 0-3.6H4a1.8 1.8 0 0 0 .8-3l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.8v-.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3 .8l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .8 3h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-.8 3Z"
                      />
                    </svg>
                  </span>

                  <span>Institute Settings</span>
                </Link>

                {/* Logout */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 transition-all duration-200 hover:bg-red-50 hover:text-red-600 active:scale-[0.98]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-4 w-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10 17l5-5-5-5"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12H3"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 5V4a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-1"
                      />
                    </svg>
                  </span>

                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

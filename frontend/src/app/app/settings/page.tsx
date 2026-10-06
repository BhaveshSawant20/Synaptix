"use client";

import Link from "next/link";

const settingsItems = [
  {
    title: "Institute Profile",
    description:
      "Manage your institute branding, logo, banner, contact details and physical address.",
    icon: "🏫",
    href: "/app/settings/institute",
    badge: "Branding",
  },
  {
    title: "Admin Account",
    description:
      "Update your administrator name, email address and administrative contact details.",
    icon: "👤",
    href: "/app/settings/account",
    badge: "Profile",
  },
  {
    title: "Account Security",
    description:
      "Update your password and review authentication and account protection controls.",
    icon: "🛡️",
    href: "/app/settings/security",
    badge: "Security",
  },
];

export default function SettingsPage() {
  return (
    <main className="w-full px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-stone-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-8">
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-orange-100/50 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-amber-100/30 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
            Workspace Configuration
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            Settings & Preferences
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
            Configure institute profile assets, manage administrator credentials, and maintain account security.
          </p>
        </div>
      </section>

      {/* Settings Grid Cards */}
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {settingsItems.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="group relative overflow-hidden rounded-2xl border border-stone-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:border-orange-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-2xl transition duration-200 group-hover:bg-orange-100/80">
                {item.icon}
              </div>

              <span className="rounded-full border border-stone-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-stone-500 transition group-hover:border-orange-200 group-hover:text-orange-600">
                {item.badge}
              </span>
            </div>

            <h2 className="mt-5 text-lg font-semibold tracking-tight text-stone-900 transition group-hover:text-orange-600">
              {item.title}
            </h2>

            <p className="mt-2 min-h-[44px] text-sm leading-relaxed text-stone-500">
              {item.description}
            </p>

            <div className="mt-6 flex items-center text-xs font-semibold text-orange-600">
              <span>Manage settings</span>
              <span className="ml-1.5 transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </div>
          </Link>
        ))}
      </section>
      </div>
    </main>
  );
}
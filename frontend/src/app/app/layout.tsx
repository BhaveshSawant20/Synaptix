"use client";

import Link from "next/link";
import { ReactNode, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import AppHeader from "./components/AppHeader";

import { API_BASE_URL } from "@/lib/api";

const navigation = [
  {
    section: null,
    items: [{ label: "Dashboard", href: "/app/dashboard", icon: "⌂" }],
  },
  {
    section: "Institute",
    items: [
      { label: "Schools", href: "/app/schools", icon: "▣" },
      { label: "Standards", href: "/app/standards", icon: "◇" },
      { label: "Students", href: "/app/students", icon: "♙" },
      { label: "Teachers", href: "/app/teachers", icon: "♧" },
      { label: "Batches", href: "/app/batches", icon: "◫" },
    ],
  },
  {
    section: "Academics",
    items: [
      {
        label: "Subjects",
        href: "/app/academics/subjects",
        icon: "◇",
      },
      {
        label: "School-Subject Mapping",
        href: "/app/academics/standard-subjects",
        icon: "⇄",
      },
      {
        label: "Topics",
        href: "/app/academics/topics",
        icon: "◈",
      },
      {
        label: "Exams",
        href: "/app/academics/exams",
        icon: "▤",
      },
      {
        label: "Exam Schedules",
        href: "/app/academics/exam-schedules",
        icon: "◷",
      },
      {
        label: "Syllabus",
        href: "/app/academics/syllabus",
        icon: "▥",
      },
      {
        label: "Teaching Progress",
        href: "/app/academics/teaching-progress",
        icon: "↗",
      },
    ],
  },
  {
    section: "Tracking",
    items: [
      {
        label: "Attendance",
        href: "/app/attendance",
        icon: "✓",
      },
      {
        label: "Assessments",
        href: "/app/assessments",
        icon: "▤",
      },
      {
        label: "Performance",
        href: "/app/performance",
        icon: "⌁",
      },
    ],
  },
  {
    section: "Question Intelligence",
    items: [
      {
        label: "Previous Papers",
        href: "/app/question-intelligence/previous-papers",
        icon: "▧",
      },
      {
        label: "Important Questions",
        href: "/app/question-intelligence/important-questions",
        icon: "★",
      },
      {
        label: "File Assets",
        href: "/app/question-intelligence/file-assets",
        icon: "□",
      },
    ],
  },
  {
    section: "System",
    items: [
      {
        label: "Settings",
        href: "/app/settings",
        icon: "⚙",
      },
    ],
  },
];

function isNavigationItemActive(pathname: string, href: string) {
  if (pathname === href) {
    return true;
  }

  return pathname.startsWith(`${href}/`);
}

type InstituteProfile = {
  name: string;
  logoSignedUrl: string | null;
};

export default function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  const [institute, setInstitute] =
    useState<InstituteProfile | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [brandingUpdating, setBrandingUpdating] =
    useState(false);

  const [pageTransitioning, setPageTransitioning] =
    useState(false);

  const transitionTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const previousPathRef = useRef(pathname);

  /*
   * Load institute branding.
   *
   * The pathname dependency is intentionally preserved so that
   * the sidebar/header branding stays synchronized when navigating
   * between application pages.
   */
  useEffect(() => {
    async function loadInstitute() {
      try {
        const token = localStorage.getItem("synaptix_token");

        if (!token) {
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/api/institute/profile`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (data.success && data.institute) {
          setInstitute({
            name: data.institute.name || "",
            logoSignedUrl:
              data.institute.logoSignedUrl || null,
          });
        }
      } catch (error) {
        console.error(
          "Failed to load institute branding:",
          error,
        );
      }
    }

    loadInstitute();
  }, [pathname]);

  /*
   * Listen for live institute branding updates coming from
   * Institute Settings.
   */
  useEffect(() => {
    function handleInstituteUpdated(event: Event) {
      const customEvent =
        event as CustomEvent<{
          name?: string;
          logoSignedUrl?: string | null;
        }>;

      const updatedInstitute = customEvent.detail;

      if (!updatedInstitute) {
        return;
      }

      setBrandingUpdating(true);

      setInstitute((current) => {
        if (!current) {
          return current;
        }

        return {
          name:
            updatedInstitute.name ??
            current.name,

          logoSignedUrl:
            "logoSignedUrl" in updatedInstitute
              ? updatedInstitute.logoSignedUrl || null
              : current.logoSignedUrl,
        };
      });

      window.setTimeout(() => {
        setBrandingUpdating(false);
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

  /*
   * Close sidebar automatically after navigation.
   */
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  /*
   * Prevent background scrolling while the mobile/tablet
   * sidebar is open.
   */
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  /*
   * Smooth page transition.
   *
   * The children are NOT remounted with a pathname key, which
   * avoids unnecessarily resetting page-level state.
   */
  useEffect(() => {
    if (previousPathRef.current === pathname) {
      return;
    }

    previousPathRef.current = pathname;

    setPageTransitioning(true);

    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }

    transitionTimerRef.current = setTimeout(() => {
      setPageTransitioning(false);
    }, 220);

    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, [pathname]);

  /*
   * Cleanup transition timer on unmount.
   */
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  const instituteInitials = institute?.name
    ? institute.name
        .split(" ")
        .filter(Boolean)
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "IN";

  function handleNavigationStart(href: string) {
    if (href === pathname) {
      return;
    }

    setPageTransitioning(true);
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#fffaf5] text-stone-900">
      <div className="flex min-h-screen">
        {/* Mobile / Tablet Overlay */}
        <button
          type="button"
          aria-label="Close sidebar"
          aria-hidden={!sidebarOpen}
          tabIndex={sidebarOpen ? 0 : -1}
          onClick={() => setSidebarOpen(false)}
          className={`
            fixed inset-0 z-40 bg-stone-950/40
            backdrop-blur-[2px]
            transition-opacity duration-300
            lg:hidden
            ${
              sidebarOpen
                ? "pointer-events-auto opacity-100"
                : "pointer-events-none opacity-0"
            }
          `}
        />

        {/* Institute Sidebar */}
        <aside
          aria-label="Main navigation"
          className={`
            fixed inset-y-0 left-0 z-50
            flex w-72 flex-col
            border-r border-stone-200/80
            bg-white/95 backdrop-blur-xl
            shadow-2xl shadow-stone-900/10
            transition-transform duration-300 ease-out
            lg:translate-x-0 lg:shadow-none
            ${
              sidebarOpen
                ? "translate-x-0"
                : "-translate-x-full"
            }
          `}
        >
          {/* Institute Branding */}
          <div className="border-b border-stone-200/80 px-6 py-5">
            <div className="flex items-center justify-between gap-3">
              <Link
                href="/app/dashboard"
                onClick={() =>
                  handleNavigationStart("/app/dashboard")
                }
                className="group flex min-w-0 items-center gap-3"
              >
                <div
                  className={`
                    flex h-11 w-11 shrink-0 items-center
                    justify-center overflow-hidden rounded-2xl
                    border border-orange-100 bg-orange-50
                    shadow-sm
                    transition-all duration-300
                    group-hover:scale-[1.03]
                    group-hover:border-orange-200
                    group-hover:shadow-md
                    ${
                      brandingUpdating
                        ? "opacity-60"
                        : "opacity-100"
                    }
                  `}
                >
                  {institute?.logoSignedUrl ? (
                    <img
                      src={institute.logoSignedUrl}
                      alt={`${institute.name} logo`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-orange-600">
                      {instituteInitials}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-base font-bold tracking-tight text-stone-900">
                    {institute?.name || "Synaptix"}
                  </p>

                  <p className="text-[9px] font-medium tracking-[0.18em] text-stone-400">
                    COACHING INTELLIGENCE
                  </p>
                </div>
              </Link>

              {/* Close button - Mobile / Tablet */}
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
                className="
                  flex h-9 w-9 shrink-0 items-center
                  justify-center rounded-xl
                  border border-stone-200 bg-white
                  text-lg text-stone-500
                  transition-all duration-200
                  hover:border-orange-200
                  hover:bg-orange-50
                  hover:text-orange-600
                  active:scale-95
                  lg:hidden
                "
              >
                ×
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-5">
            {navigation.map((group, groupIndex) => (
              <div
                key={`${group.section ?? "main"}-${groupIndex}`}
                className="mb-5 last:mb-2"
              >
                {group.section && (
                  <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
                    {group.section}
                  </p>
                )}

                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive =
                      isNavigationItemActive(
                        pathname,
                        item.href,
                      );

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() =>
                          handleNavigationStart(
                            item.href,
                          )
                        }
                        aria-current={
                          isActive
                            ? "page"
                            : undefined
                        }
                        className={`
                          group relative flex items-center
                          gap-3 overflow-hidden rounded-xl
                          px-3 py-2.5 text-sm
                          transition-all duration-200
                          ease-out
                          ${
                            isActive
                              ? "bg-orange-50 text-orange-700 shadow-sm"
                              : "bg-transparent text-stone-600 hover:bg-orange-50/80 hover:text-orange-700 hover:shadow-sm"
                          }
                          ${
                            isActive
                              ? ""
                              : "hover:translate-x-0.5"
                          }
                          active:scale-[0.99]
                        `}
                      >
                        {/* Active indicator */}
                        <span
                          className={`
                            absolute left-0 top-1/2
                            h-5 -translate-y-1/2
                            rounded-r-full bg-orange-500
                            transition-all duration-200 ease-out
                            ${
                              isActive
                                ? "w-1 opacity-100"
                                : "w-0 opacity-0"
                            }
                          `}
                        />

                        {/* Icon */}
                        <span
                          className={`
                            flex h-7 w-7 shrink-0
                            items-center justify-center
                            rounded-lg text-sm
                            transition-all duration-200 ease-out
                            ${
                              isActive
                                ? "bg-orange-500 text-white shadow-sm shadow-orange-200"
                                : "bg-stone-100 text-stone-500 group-hover:bg-orange-500 group-hover:text-white group-hover:shadow-sm group-hover:shadow-orange-200"
                            }
                          `}
                        >
                          {item.icon}
                        </span>

                        {/* Label */}
                        <span
                          className={`
                            transition-colors duration-200
                            ${
                              isActive
                                ? "font-semibold text-orange-700"
                                : "font-medium text-stone-600 group-hover:text-orange-700"
                            }
                          `}
                        >
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="w-full lg:pl-72">
          {/* Mobile / Tablet Top Bar */}
          <div className="sticky top-0 z-30 flex h-16 items-center border-b border-stone-200/80 bg-white/90 px-4 shadow-sm backdrop-blur-xl lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              aria-expanded={sidebarOpen}
              className="
                flex h-10 w-10 items-center
                justify-center rounded-xl
                border border-stone-200 bg-white
                text-xl text-stone-700 shadow-sm
                transition-all duration-200
                hover:border-orange-200
                hover:bg-orange-50
                hover:text-orange-600
                active:scale-95
              "
            >
              ☰
            </button>

            <Link
              href="/app/dashboard"
              onClick={() =>
                handleNavigationStart("/app/dashboard")
              }
              className="group ml-3 flex min-w-0 items-center gap-2"
            >
              <div
                className={`
                  flex h-9 w-9 shrink-0
                  items-center justify-center
                  overflow-hidden rounded-xl
                  border border-orange-100 bg-orange-50
                  transition-all duration-200
                  ${
                    brandingUpdating
                      ? "opacity-60"
                      : "opacity-100"
                  }
                `}
              >
                {institute?.logoSignedUrl ? (
                  <img
                    src={institute.logoSignedUrl}
                    alt={`${institute.name} logo`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-orange-600">
                    {instituteInitials}
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-stone-900">
                  {institute?.name || "Synaptix"}
                </p>

                <p className="truncate text-[8px] font-medium tracking-[0.14em] text-stone-400">
                  COACHING INTELLIGENCE
                </p>
              </div>
            </Link>
          </div>

          <AppHeader />

          {/* Route transition indicator */}
          <div
            aria-hidden="true"
            className={`
              pointer-events-none fixed left-0 right-0
              top-0 z-[100] h-0.5
              origin-left bg-orange-500
              transition-all duration-200
              lg:left-72
              ${
                pageTransitioning
                  ? "scale-x-100 opacity-100"
                  : "scale-x-0 opacity-0"
              }
            `}
          />

          {/* Page Content */}
          <main
            className={`
              min-h-[calc(100vh-4rem)]
              transition-opacity duration-200 ease-out
              motion-reduce:transition-none
              ${
                pageTransitioning
                  ? "opacity-[0.72]"
                  : "opacity-100"
              }
            `}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
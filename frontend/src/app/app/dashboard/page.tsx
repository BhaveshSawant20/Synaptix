"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { API_BASE_URL } from "@/lib/api";

type DashboardResponse<T> = {
  success: boolean;
  data: T;
};

type DashboardOverview = {
  students: number;
  schools: number;
  teachers: number;
  batches: number;
  subjects: number;
  upcomingExams: number;
  activeAcademicPlans: number;
  unreadRecommendations: number;
};

type Exam = {
  id: string;
  examDate: string;
  startTime?: string | null;
  endTime?: string | null;
  totalMarks: number;
  syllabusNote?: string | null;
  exam: {
    id: string;
    name: string;
    school: {
      id: string;
      name: string;
    };
  };
  subject: {
    id: string;
    name: string;
  };
};

type AttendanceSummary = {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
};

type PerformanceSummary = {
  totalRecords: number;
  recordsWithPercentage: number;
  averagePercentage: number;
};

type InstituteProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  logoSignedUrl?: string | null;
  bannerSignedUrl?: string | null;
};

type StatCardProps = {
  label: string;
  value: number | string;
  description: string;
  icon: React.ReactNode;
  href: string;
};

function getToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem("synaptix_token") || "";
}

function formatExamDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDaysUntil(dateString: string) {
  const today = new Date();
  const examDate = new Date(dateString);

  today.setHours(0, 0, 0, 0);
  examDate.setHours(0, 0, 0, 0);

  const difference = examDate.getTime() - today.getTime();

  return Math.ceil(difference / (1000 * 60 * 60 * 24));
}

function getGreeting(name: string) {
  const hour = new Date().getHours();
  const trimmed = name?.trim();
  const suffix = trimmed ? `, ${trimmed}` : "";

  if (hour < 12) {
    return `Good morning${suffix}`;
  }

  if (hour < 17) {
    return `Good afternoon${suffix}`;
  }

  return `Good evening${suffix}`;
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return words[0][0].toUpperCase() + words[1][0].toUpperCase();
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return "IN";
}

function StatCard({ label, value, description, icon, href }: StatCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md active:translate-y-0"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-stone-400 transition-colors duration-200 group-hover:text-orange-600">
            {label}
          </p>

          <p className="mt-3 text-3xl font-bold tracking-tight text-stone-900">
            {value}
          </p>

          <p className="mt-1 truncate text-xs font-medium text-stone-500">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 transition-all duration-200 ease-out group-hover:scale-105 group-hover:bg-orange-100">
          {icon}
        </div>
      </div>
    </Link>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
        {title}
      </h2>

      <p className="mt-1 text-sm text-stone-500">{description}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [performance, setPerformance] = useState<PerformanceSummary | null>(
    null,
  );
  const [institute, setInstitute] = useState<InstituteProfile | null>(null);
  const [adminName, setAdminName] = useState("Admin");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      const token = getToken();

      if (!token) {
        window.location.href = "/login";
        return;
      }

      try {
        setLoading(true);
        setError("");

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [
          overviewResponse,
          examsResponse,
          attendanceResponse,
          performanceResponse,
          instituteResponse,
          meResponse,
        ] = await Promise.all([
          fetch(`${API_BASE_URL}/api/dashboard/overview`, {
            headers,
          }),

          fetch(`${API_BASE_URL}/api/dashboard/upcoming-exams?limit=5`, {
            headers,
          }),

          fetch(`${API_BASE_URL}/api/dashboard/attendance`, {
            headers,
          }),

          fetch(`${API_BASE_URL}/api/dashboard/performance`, {
            headers,
          }),

          fetch(`${API_BASE_URL}/api/institute/profile`, {
            headers,
          }),

          fetch(`${API_BASE_URL}/api/auth/me`, {
            headers,
          }),
        ]);

        const responses = [
          overviewResponse,
          examsResponse,
          attendanceResponse,
          performanceResponse,
          instituteResponse,
          meResponse,
        ];

        if (responses.some((response) => response.status === 401)) {
          localStorage.removeItem("synaptix_token");
          window.location.href = "/login";
          return;
        }

        if (
          !overviewResponse.ok ||
          !examsResponse.ok ||
          !attendanceResponse.ok ||
          !performanceResponse.ok
        ) {
          throw new Error("Failed to load dashboard data.");
        }

        const overviewData =
          (await overviewResponse.json()) as DashboardResponse<DashboardOverview>;

        const examsData = (await examsResponse.json()) as DashboardResponse<
          Exam[]
        >;

        const attendanceData =
          (await attendanceResponse.json()) as DashboardResponse<AttendanceSummary>;

        const performanceData =
          (await performanceResponse.json()) as DashboardResponse<PerformanceSummary>;

        if (instituteResponse.ok) {
          const instituteData = await instituteResponse.json();
          setInstitute(instituteData.institute || null);
        }

        if (meResponse.ok) {
          const meData = await meResponse.json();
          setAdminName(meData.admin?.name || "Admin");
        }

        setOverview(overviewData.data);
        setExams(examsData.data || []);
        setAttendance(attendanceData.data);
        setPerformance(performanceData.data);
      } catch (dashboardError) {
        console.error("Dashboard loading error:", dashboardError);
        setError("Unable to load dashboard information. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const attendancePercentage = useMemo(() => {
    if (!attendance) {
      return 0;
    }

    return Math.round(Number(attendance.percentage || 0));
  }, [attendance]);

  const performancePercentage = useMemo(() => {
    if (!performance) {
      return 0;
    }

    return Math.round(Number(performance.averagePercentage || 0));
  }, [performance]);

  const instituteInitials = getInitials(institute?.name || "Institute");

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-stone-50 px-5 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl animate-pulse space-y-6">
          <div className="h-64 rounded-3xl bg-stone-200" />

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-32 rounded-2xl bg-stone-200" />
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="h-64 rounded-2xl bg-stone-200 lg:col-span-2" />
            <div className="h-64 rounded-2xl bg-stone-200" />
          </div>

          <div className="h-72 rounded-2xl bg-stone-200" />
        </div>
      </main>
    );
  }

  if (error || !overview) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-stone-50 px-5 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto flex min-h-[420px] max-w-3xl items-center justify-center">
          <div className="w-full rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              !
            </div>

            <h1 className="mt-5 text-xl font-semibold text-stone-900">
              Dashboard unavailable
            </h1>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
              {error || "Dashboard information could not be loaded."}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-stone-50 px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-7">
        {/* Hero */}
        <section
          className={`relative mb-8 overflow-hidden rounded-3xl border shadow-sm ${
            institute?.bannerSignedUrl
              ? "min-h-[320px] border-stone-800/20"
              : "border-orange-100 bg-white/75 backdrop-blur-xl"
          }`}
        >
          {/* Banner */}
          {institute?.bannerSignedUrl ? (
            <>
              <img
                src={institute.bannerSignedUrl}
                alt={`${institute.name} banner`}
                className="absolute inset-0 h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/20" />

              <div className="absolute inset-0 bg-orange-950/10" />
            </>
          ) : (
            <>
              <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-orange-100/60 blur-3xl" />

              <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-amber-100/50 blur-3xl" />
            </>
          )}

          <div
            className={`relative z-10 flex min-h-[320px] flex-col justify-between gap-8 p-7 sm:p-8 lg:p-9 md:items-start`}
          >
            <div className="max-w-4xl">
              {/* Institute identity */}
              <div className="mb-7 flex items-center gap-4">
                <div
                  className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border shadow-xl ${
                    institute?.bannerSignedUrl
                      ? "border-white/30 bg-white/15 backdrop-blur-md"
                      : "border-orange-100 bg-orange-50"
                  }`}
                >
                  {institute?.logoSignedUrl ? (
                    <img
                      src={institute.logoSignedUrl}
                      alt={`${institute.name} logo`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span
                      className={`text-lg font-bold ${
                        institute?.bannerSignedUrl
                          ? "text-white"
                          : "text-orange-600"
                      }`}
                    >
                      {instituteInitials}
                    </span>
                  )}
                </div>

                <div>
                  <p
                    className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                      institute?.bannerSignedUrl
                        ? "text-orange-300"
                        : "text-orange-600"
                    }`}
                  >
                    Institute Dashboard
                  </p>

                  <p
                    className={`mt-1 text-lg font-semibold ${
                      institute?.bannerSignedUrl
                        ? "text-white"
                        : "text-stone-900"
                    }`}
                  >
                    {institute?.name || "Your Institute"}
                  </p>
                </div>
              </div>

              {/* Greeting */}
              <h1
                className={`text-3xl font-bold tracking-tight sm:text-4xl ${
                  institute?.bannerSignedUrl ? "text-white" : "text-stone-900"
                }`}
              >
                {getGreeting(adminName)}.
              </h1>

              <p
                className={`mt-4 max-w-2xl text-sm leading-6 ${
                  institute?.bannerSignedUrl
                    ? "text-white/80"
                    : "text-stone-500"
                }`}
              >
                Manage your institute&apos;s academic operations and keep every
                batch aligned with upcoming examinations.
              </p>
            </div>

            {/* Hero status */}
            <div
              className={`inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold backdrop-blur-md ${
                institute?.bannerSignedUrl
                  ? "border-white/15 bg-black/25 text-white/80"
                  : "border-orange-100 bg-orange-50/80 text-orange-700"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-green-400" />
              Institute workspace active
            </div>
          </div>
        </section>

        {/* Overview */}
        <section>
          <SectionHeader
            eyebrow="Institute overview"
            title="Academic snapshot"
            description="A live overview of the institute data currently managed in Synaptix."
          />

          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <StatCard
              label="Students"
              value={overview.students}
              description="Student records"
              href="/app/students"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                    strokeLinecap="round"
                  />
                  <circle cx="9" cy="7" r="4" />
                  <path
                    d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                    strokeLinecap="round"
                  />
                </svg>
              }
            />

            <StatCard
              label="Schools"
              value={overview.schools}
              description="School records"
              href="/app/schools"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M3 21h18" />
                  <path d="M5 21V7l7-4 7 4v14" />
                  <path d="M9 21v-5h6v5" />
                  <path d="M9 9h.01M15 9h.01M9 12h.01M15 12h.01" />
                </svg>
              }
            />

            <StatCard
              label="Batches"
              value={overview.batches}
              description="Active batch records"
              href="/app/batches"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M8 2v4M16 2v4M3 10h18" />
                </svg>
              }
            />

            <StatCard
              label="Teachers"
              value={overview.teachers}
              description="Teacher records"
              href="/app/teachers"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M5 21a7 7 0 0 1 14 0" strokeLinecap="round" />
                </svg>
              }
            />

            <StatCard
              label="Subjects"
              value={overview.subjects}
              description="Institute subjects"
              href="/app/academics/subjects"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
                  <path d="M4 5.5v16M8 7h8M8 11h8" />
                </svg>
              }
            />

            <StatCard
              label="Upcoming exams"
              value={overview.upcomingExams}
              description="Scheduled examinations"
              href="/app/academics/exams"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <rect x="3" y="4" width="18" height="17" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                  <path d="M8 14h2M14 14h2M8 17h2" />
                </svg>
              }
            />
          </div>
        </section>

        {/* Academic health */}
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm lg:col-span-2">
            <SectionHeader
              eyebrow="Academic health"
              title="Attendance & performance"
              description="Current institute-level academic indicators from recorded data."
            />

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">
                      Attendance
                    </p>

                    <p className="mt-1 text-xs leading-5 text-stone-500">
                      Based on recorded attendance entries across students.
                    </p>
                  </div>

                  <div className="rounded-xl bg-orange-50 px-3 py-1.5 text-sm font-bold text-orange-700">
                    {attendancePercentage}%
                  </div>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="h-full rounded-full bg-orange-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(attendancePercentage, 100)}%`,
                    }}
                  />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-lg font-bold text-stone-900">
                      {attendance?.present || 0}
                    </p>
                    <p className="text-xs text-stone-500">Present</p>
                  </div>

                  <div>
                    <p className="text-lg font-bold text-stone-900">
                      {attendance?.absent || 0}
                    </p>
                    <p className="text-xs text-stone-500">Absent</p>
                  </div>

                  <div>
                    <p className="text-lg font-bold text-stone-900">
                      {attendance?.late || 0}
                    </p>
                    <p className="text-xs text-stone-500">Late</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">
                      Performance
                    </p>

                    <p className="mt-1 text-xs leading-5 text-stone-500">
                      Average percentage across recorded performance results.
                    </p>
                  </div>

                  <div className="rounded-xl bg-orange-50 px-3 py-1.5 text-sm font-bold text-orange-700">
                    {performancePercentage}%
                  </div>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="h-full rounded-full bg-orange-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(performancePercentage, 100)}%`,
                    }}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-lg font-bold text-stone-900">
                      {performance?.totalRecords || 0}
                    </p>
                    <p className="text-xs text-stone-500">
                      Performance records
                    </p>
                  </div>

                  <div>
                    <p className="text-lg font-bold text-stone-900">
                      {performance?.recordsWithPercentage || 0}
                    </p>
                    <p className="text-xs text-stone-500">
                      With percentage
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Intelligence layer */}
          <div className="relative overflow-hidden rounded-3xl bg-stone-950 p-6 text-white shadow-lg">
            <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-orange-500/20 blur-3xl" />

            <div className="relative">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-300">
                    Intelligence layer
                  </p>

                  <h2 className="mt-2 text-lg font-semibold text-white">AI foundation</h2>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-orange-300">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M12 3v4M12 17v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M3 12h4M17 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-stone-300">
                Synaptix is building its intelligence layer from your academic
                data, plans and recommendations.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-2xl font-bold">
                    {overview.activeAcademicPlans}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">Active plans</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-2xl font-bold">
                    {overview.unreadRecommendations}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">
                    Unread recommendations
                  </p>
                </div>
              </div>

              <Link
                href="/app/question-intelligence/previous-papers"
                className="group mt-6 inline-flex w-full items-center justify-center rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-950/20 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
              >
                Explore Question Intelligence
                <span className="ml-2 transition-transform duration-200 group-hover:translate-x-0.5">→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Upcoming examinations */}
        <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeader
              eyebrow="Exam readiness"
              title="Upcoming examinations"
              description="The next scheduled examinations across your institute."
            />

            <Link
              href="/app/academics/exams"
              className="inline-flex w-fit items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-xs font-semibold text-orange-700 transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 active:translate-y-0"
            >
              View all exams →
            </Link>
          </div>

          <div className="mt-6">
            {exams.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 px-6 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <rect x="3" y="4" width="18" height="17" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                </div>

                <h3 className="mt-4 text-sm font-semibold text-stone-900">
                  No upcoming examinations
                </h3>

                <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-stone-500">
                  Once exam schedules are added, the next examinations will
                  appear here automatically.
                </p>

                <div className="mt-5">
                  <Link
                    href="/app/academics/exams"
                    className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
                  >
                    Schedule examination →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {exams.map((exam) => {
                  const daysUntil = getDaysUntil(exam.examDate);

                  return (
                    <div
                      key={exam.id}
                      className="group flex flex-col gap-4 rounded-2xl border border-stone-100 bg-stone-50/60 p-4 transition-all duration-200 ease-out hover:border-orange-100 hover:bg-orange-50/30 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-white text-orange-600 shadow-sm ring-1 ring-stone-100 transition-transform duration-200 group-hover:scale-105">
                          <span className="text-[10px] font-semibold uppercase">
                            {new Date(exam.examDate).toLocaleDateString(
                              "en-IN",
                              {
                                month: "short",
                              },
                            )}
                          </span>

                          <span className="text-lg font-bold leading-none">
                            {new Date(exam.examDate).getDate()}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-stone-900 transition-colors duration-200 group-hover:text-orange-700">
                            {exam.exam.name}
                          </p>

                          <p className="mt-1 truncate text-xs text-stone-500">
                            {exam.subject.name}
                            {" · "}
                            {exam.exam.school.name}
                          </p>

                          <p className="mt-1 text-xs text-stone-400">
                            {formatExamDate(exam.examDate)}
                            {exam.totalMarks
                              ? ` · ${exam.totalMarks} marks`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                        <div className="text-right">
                          <p className="text-xs font-semibold text-stone-700">
                            {daysUntil < 0
                              ? "Passed"
                              : daysUntil === 0
                                ? "Today"
                                : daysUntil === 1
                                  ? "Tomorrow"
                                  : `${daysUntil} days`}
                          </p>

                          <p className="mt-1 text-xs text-stone-400">
                            Until exam
                          </p>
                        </div>

                        <Link
                          href={`/app/academics/exams/${exam.exam.id}`}
                          className="inline-flex items-center justify-center rounded-xl border border-orange-100 bg-orange-50 px-4 py-2.5 text-xs font-semibold text-orange-600 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-100 active:translate-y-0"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Quick management */}
        <section>
          <SectionHeader
            eyebrow="Management shortcuts"
            title="Continue managing academics"
            description="Jump directly into the areas most commonly used from the dashboard."
          />

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Link
              href="/app/academics/exams"
              className="group rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md active:translate-y-0"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600 transition-transform duration-200 ease-out group-hover:scale-105">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <rect x="3" y="4" width="18" height="17" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                  <path d="M8 14h2M14 14h2M8 17h2" />
                </svg>
              </div>

              <h3 className="mt-4 text-sm font-semibold text-stone-900">
                Exam management
              </h3>

              <p className="mt-1 text-xs leading-5 text-stone-500">
                Manage examinations, subjects, schedules and syllabus notes.
              </p>

              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-orange-600 transition duration-200 group-hover:translate-x-0.5">
                Manage exams →
              </span>
            </Link>

            <Link
              href="/app/academics/syllabus"
              className="group rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md active:translate-y-0"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600 transition-transform duration-200 ease-out group-hover:scale-105">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
                  <path d="M4 5.5v16M8 7h8M8 11h8M8 15h5" />
                </svg>
              </div>

              <h3 className="mt-4 text-sm font-semibold text-stone-900">
                Syllabus tracking
              </h3>

              <p className="mt-1 text-xs leading-5 text-stone-500">
                Track school, standard, subject and topic-level syllabus
                requirements.
              </p>

              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-orange-600 transition duration-200 group-hover:translate-x-0.5">
                Track syllabus →
              </span>
            </Link>

            <Link
              href="/app/question-intelligence/previous-papers"
              className="group rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md active:translate-y-0"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600 transition-transform duration-200 ease-out group-hover:scale-105">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path
                    d="M9.5 9a2.5 2.5 0 1 1 4.35 1.7c-.9.93-1.85 1.35-1.85 2.8"
                    strokeLinecap="round"
                  />
                  <path d="M12 17h.01" strokeLinecap="round" />
                </svg>
              </div>

              <h3 className="mt-4 text-sm font-semibold text-stone-900">
                Question intelligence
              </h3>

              <p className="mt-1 text-xs leading-5 text-stone-500">
                Organize previous papers, important questions and uploaded
                academic files.
              </p>

              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-orange-600 transition duration-200 group-hover:translate-x-0.5">
                Open intelligence →
              </span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

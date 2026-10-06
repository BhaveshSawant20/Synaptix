"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { API_BASE } from "@/lib/api";

type School = {
  id: string;
  name: string;
};

type Standard = {
  id: string;
  name: string;
  schoolId: string;
};

type Student = {
  id: string;
  name: string;
  studentCode?: string | null;
  email?: string | null;
  phone?: string | null;
  schoolId: string;
  standardId: string;
};

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  standards?: T[];
  schools?: T[];
  students?: T[];
};

function getToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem("synaptix_token") || "";
}

function getInitials(name: string) {
  if (!name.trim()) {
    return "ST";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function StandardDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const standardId = params.id;

  const [standard, setStandard] = useState<Standard | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [students, setStudents] = useState<Student[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
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

      const [standardsResponse, schoolsResponse, studentsResponse] =
        await Promise.all([
          fetch(`${API_BASE}/standards`, {
            method: "GET",
            headers,
          }),
          fetch(`${API_BASE}/schools`, {
            method: "GET",
            headers,
          }),
          fetch(`${API_BASE}/students`, {
            method: "GET",
            headers,
          }),
        ]);

      if (
        standardsResponse.status === 401 ||
        schoolsResponse.status === 401 ||
        studentsResponse.status === 401
      ) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      const standardsData: ApiResponse<Standard> =
        await standardsResponse.json();
      const schoolsData: ApiResponse<School> = await schoolsResponse.json();
      const studentsData: ApiResponse<Student> =
        await studentsResponse.json();

      if (!standardsResponse.ok || !standardsData.success) {
        throw new Error(
          standardsData.message || "Failed to load standard."
        );
      }

      if (!schoolsResponse.ok || !schoolsData.success) {
        throw new Error(schoolsData.message || "Failed to load school.");
      }

      if (!studentsResponse.ok || !studentsData.success) {
        throw new Error(
          studentsData.message || "Failed to load students."
        );
      }

      const allStandards = Array.isArray(standardsData.standards)
        ? standardsData.standards
        : [];

      const allSchools = Array.isArray(schoolsData.schools)
        ? schoolsData.schools
        : [];

      const allStudents = Array.isArray(studentsData.students)
        ? studentsData.students
        : [];

      const currentStandard =
        allStandards.find((item) => item.id === standardId) || null;

      if (!currentStandard) {
        throw new Error("Standard could not be found.");
      }

      const currentSchool =
        allSchools.find(
          (item) => item.id === currentStandard.schoolId,
        ) || null;

      setStandard(currentStandard);
      setSchool(currentSchool);

      setStudents(
        allStudents.filter(
          (student) => student.standardId === standardId,
        ),
      );
    } catch (err) {
      console.error("Failed to load standard:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load standard."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (standardId) {
      loadData();
    }
  }, [standardId]);

  const studentCount = useMemo(
    () => students.length,
    [students],
  );

  if (loading) {
    return (
      <main className="w-full px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl animate-pulse space-y-6">
          <div className="h-5 w-20 rounded bg-stone-200" />

          <section className="glass rounded-3xl p-7 sm:p-9">
            <div className="h-4 w-24 rounded bg-stone-200" />
            <div className="mt-4 h-10 w-72 rounded bg-stone-200" />
            <div className="mt-3 h-4 w-96 max-w-full rounded bg-stone-100" />
          </section>

          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="glass h-28 rounded-3xl p-6"
              />
            ))}
          </section>

          <section className="grid gap-7 lg:grid-cols-3">
            <div className="glass h-64 rounded-3xl p-7" />
            <div className="glass h-64 rounded-3xl p-7 lg:col-span-2" />
          </section>
        </div>
      </main>
    );
  }

  if (error || !standard) {
    return (
      <main className="w-full px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <button
            type="button"
            onClick={() => router.back()}
            className="group mb-6 inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition duration-200 hover:text-orange-600"
          >
            <span className="transition-transform duration-200 group-hover:-translate-x-0.5">
              ←
            </span>
            Back
          </button>

          <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-8 text-red-700">
            <p className="text-lg font-bold">Unable to load standard</p>

            <p className="mt-2 text-sm">
              {error || "Standard details could not be found."}
            </p>

            <button
              type="button"
              onClick={loadData}
              className="mt-5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition duration-200 hover:bg-red-700 active:scale-95"
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => router.back()}
          className="group mb-6 inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition duration-200 hover:text-orange-600"
        >
          <span className="transition-transform duration-200 group-hover:-translate-x-0.5">
            ←
          </span>
          Back
        </button>

        {/* Header Section */}
        <section className="glass rounded-3xl p-7 sm:p-9">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                Standard
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
                {standard.name}
              </h1>

              <p className="mt-2 text-sm leading-6 text-stone-500">
                Part of{" "}
                <span className="font-semibold text-stone-700">
                  {school?.name || "Unknown School"}
                </span>
              </p>
            </div>

            {school && (
              <Link
                href={`/app/schools/${school.id}`}
                className="inline-flex items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-orange-700 transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 active:translate-y-0"
              >
                View School →
              </Link>
            )}
          </div>
        </section>

        {/* Summary Metric Cards */}
        <section className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="glass rounded-3xl p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Students
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
              {studentCount}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Enrolled students
            </p>
          </div>

          <div className="glass rounded-3xl p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              School
            </p>

            <p className="mt-2 truncate text-lg font-semibold tracking-tight text-stone-900">
              {school?.name || "—"}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Associated school
            </p>
          </div>

          <div className="glass rounded-3xl p-6 sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Academic Level
            </p>

            <p className="mt-2 text-lg font-semibold text-orange-600">
              {standard.name}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Standard hierarchy
            </p>
          </div>
        </section>

        {/* Students Section */}
        <section className="glass mt-7 rounded-3xl p-6 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                Student Records
              </p>

              <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
                Students in {standard.name}
              </h2>
            </div>

            <Link
              href="/app/students"
              className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 transition duration-200 hover:translate-x-0.5 hover:text-orange-700"
            >
              All Students →
            </Link>
          </div>

          {students.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-stone-200 bg-white/60 px-5 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-xl text-orange-500">
                +
              </div>

              <h3 className="mt-5 text-sm font-semibold text-stone-900">
                No students yet
              </h3>

              <p className="mt-2 text-sm leading-6 text-stone-500">
                Students assigned to this standard will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {students.map((student) => (
                <Link
                  key={student.id}
                  href={`/app/students/${student.id}`}
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-stone-100 bg-white/70 p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-orange-100 hover:bg-orange-50/50 hover:shadow-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-xs font-bold text-orange-700 transition-transform duration-200 ease-out group-hover:scale-105">
                      {getInitials(student.name)}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-stone-900 transition-colors duration-200 group-hover:text-orange-700">
                        {student.name}
                      </p>

                      <p className="mt-1 truncate text-xs text-stone-400">
                        {student.studentCode ||
                          student.email ||
                          "Student record"}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-xl border border-orange-100 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-600 transition duration-200 hover:border-orange-200 hover:bg-orange-100">
                    View Details →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Relationship Shortcuts */}
        <section className="mt-7 grid gap-5 md:grid-cols-2">
          <Link
            href={
              school ? `/app/schools/${school.id}` : "/app/schools"
            }
            className="glass group rounded-3xl p-6 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md active:translate-y-0"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              School
            </p>

            <div className="mt-3 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-stone-900 transition-colors duration-200 group-hover:text-orange-700">
                {school?.name || "View School"}
              </p>

              <span className="text-sm font-semibold text-orange-600 transition-transform duration-200 group-hover:translate-x-0.5">
                →
              </span>
            </div>
          </Link>

          <Link
            href="/app/students"
            className="glass group rounded-3xl p-6 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md active:translate-y-0"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Students
            </p>

            <div className="mt-3 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-stone-900 transition-colors duration-200 group-hover:text-orange-700">
                {studentCount}{" "}
                {studentCount === 1 ? "student" : "students"}
              </p>

              <span className="text-sm font-semibold text-orange-600 transition-transform duration-200 group-hover:translate-x-0.5">
                →
              </span>
            </div>
          </Link>
        </section>
      </div>
    </main>
  );
}
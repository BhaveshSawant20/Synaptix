"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { API_BASE } from "@/lib/api";

type School = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
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
  standard?: {
    id: string;
    name: string;
  } | null;
};

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  school?: T;
  schools?: T[];
  standards?: Standard[];
  students?: Student[];
};

function getToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem("synaptix_token") || "";
}

function getInitials(name: string) {
  if (!name.trim()) {
    return "SC";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function SchoolDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const schoolId = params.id;

  const [school, setSchool] = useState<School | null>(null);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [editForm, setEditForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
  });

  async function loadData(isInitial = false) {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    try {
      if (!isInitial) {
        setLoading(true);
        setError("");
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [schoolResponse, standardsResponse, studentsResponse] =
        await Promise.all([
          fetch(`${API_BASE}/schools/${schoolId}`, {
            method: "GET",
            headers,
          }),
          fetch(`${API_BASE}/standards`, {
            method: "GET",
            headers,
          }),
          fetch(`${API_BASE}/students`, {
            method: "GET",
            headers,
          }),
        ]);

      if (
        schoolResponse.status === 401 ||
        standardsResponse.status === 401 ||
        studentsResponse.status === 401
      ) {
        localStorage.removeItem("synaptix_token");
        router.push("/login");
        return;
      }

      const schoolData: ApiResponse<School> = await schoolResponse.json();
      const standardsData: ApiResponse<Standard> =
        await standardsResponse.json();
      const studentsData: ApiResponse<Student> = await studentsResponse.json();

      if (!schoolResponse.ok || !schoolData.success) {
        throw new Error(schoolData.message || "Failed to load school.");
      }

      if (!standardsResponse.ok || !standardsData.success) {
        throw new Error(standardsData.message || "Failed to load standards.");
      }

      if (!studentsResponse.ok || !studentsData.success) {
        throw new Error(studentsData.message || "Failed to load students.");
      }

      setSchool(schoolData.school || null);

      const allStandards = Array.isArray(standardsData.standards)
        ? standardsData.standards
        : [];

      const allStudents = Array.isArray(studentsData.students)
        ? studentsData.students
        : [];

      setStandards(
        allStandards.filter((standard) => standard.schoolId === schoolId),
      );

      setStudents(
        allStudents.filter((student) => student.schoolId === schoolId),
      );
    } catch (err) {
      console.error("Failed to load school:", err);
      setError(err instanceof Error ? err.message : "Failed to load school.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    async function init() {
      if (!ignore && schoolId) {
        await loadData(true);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [schoolId]);

  function openEditModal() {
    if (!school) {
      return;
    }

    setEditForm({
      name: school.name || "",
      address: school.address || "",
      city: school.city || "",
      state: school.state || "",
    });

    setEditError("");
    setShowEditModal(true);
  }

  function closeEditModal() {
    if (saving) {
      return;
    }

    setShowEditModal(false);
    setEditError("");
  }

  async function handleUpdateSchool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    if (!editForm.name.trim()) {
      setEditError("School name is required.");
      return;
    }

    try {
      setSaving(true);
      setEditError("");

      const response = await fetch(`${API_BASE}/schools/${schoolId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editForm.name.trim(),
          address: editForm.address.trim() || null,
          city: editForm.city.trim() || null,
          state: editForm.state.trim() || null,
        }),
      });

      const data: ApiResponse<School> = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        router.push("/login");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update school.");
      }

      if (data.school) {
        setSchool(data.school);
      } else {
        await loadData();
      }

      setShowEditModal(false);
      setEditError("");
    } catch (err) {
      console.error("Failed to update school:", err);
      setEditError(
        err instanceof Error ? err.message : "Failed to update school.",
      );
    } finally {
      setSaving(false);
    }
  }

  const studentsByStandard = useMemo(() => {
    const grouped: Record<string, Student[]> = {};

    for (const student of students) {
      if (!grouped[student.standardId]) {
        grouped[student.standardId] = [];
      }

      grouped[student.standardId].push(student);
    }

    return grouped;
  }, [students]);

  if (loading) {
    return (
      <main className="w-full px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl animate-pulse space-y-6">
          <div className="h-5 w-20 rounded bg-stone-200" />

          <section className="rounded-3xl border border-stone-200/80 bg-white/75 p-7 sm:p-9">
            <div className="h-4 w-24 rounded bg-stone-200" />
            <div className="mt-4 h-10 w-72 rounded bg-stone-200" />
            <div className="mt-3 h-4 w-96 max-w-full rounded bg-stone-100" />
          </section>

          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-28 rounded-3xl border border-stone-200/80 bg-white/75 p-6"
              />
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="h-64 rounded-3xl border border-stone-200/80 bg-white/75 p-7" />
            <div className="h-64 rounded-3xl border border-stone-200/80 bg-white/75 p-7" />
          </section>
        </div>
      </main>
    );
  }

  if (error || !school) {
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
            <p className="text-lg font-bold">Unable to load school</p>

            <p className="mt-2 text-sm">
              {error || "School details could not be found."}
            </p>

            <button
              type="button"
              onClick={() => loadData()}
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
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-xl font-bold text-orange-700">
                {getInitials(school.name)}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  School
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
                  {school.name}
                </h1>

                {(school.address || school.city || school.state) && (
                  <p className="mt-2 text-sm leading-6 text-stone-500">
                    {[school.address, school.city, school.state]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* View All Schools */}
              <Link
                href="/app/schools"
                className="rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-orange-700 transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 active:translate-y-0"
              >
                View Schools
              </Link>

              {/* Edit */}
              <button
                type="button"
                onClick={openEditModal}
                className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
              >
                Edit
              </button>
            </div>
          </div>
        </section>

        {/* Summary Metric Cards */}
        <section className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="glass rounded-3xl p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Standards
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
              {standards.length}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Classes under this school
            </p>
          </div>

          <div className="glass rounded-3xl p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Students
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
              {students.length}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Enrolled students
            </p>
          </div>

          <div className="glass rounded-3xl p-6 sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Academic Structure
            </p>

            <p className="mt-2 text-sm font-semibold text-stone-800">
              School → Standard → Student
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Multi-school model active
            </p>
          </div>
        </section>

        {/* Standards + Students */}
        <section className="mt-7 grid gap-7 lg:grid-cols-2">
          {/* Standards Column */}
          <div className="glass rounded-3xl p-6 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Academic Structure
                </p>

                <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
                  Standards
                </h2>
              </div>

              <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-600">
                {standards.length}
              </span>
            </div>

            {standards.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-stone-200 bg-white/60 px-5 py-10 text-center">
                <p className="text-sm font-semibold text-stone-700">
                  No standards found
                </p>

                <p className="mt-1 text-xs text-stone-400">
                  Standards assigned to this school will appear here.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {standards.map((standard) => {
                  const count = studentsByStandard[standard.id]?.length || 0;

                  return (
                    <Link
                      key={standard.id}
                      href={`/app/standards/${standard.id}`}
                      className="group flex items-center justify-between gap-4 rounded-2xl border border-stone-100 bg-white/70 p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-orange-100 hover:bg-orange-50/50 hover:shadow-sm"
                    >
                      <div>
                        <p className="text-sm font-semibold text-stone-900 transition-colors duration-200 group-hover:text-orange-700">
                          {standard.name}
                        </p>

                        <p className="mt-1 text-xs text-stone-400">
                          {count} {count === 1 ? "student" : "students"}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-xl border border-orange-100 bg-orange-50 px-4 py-2.5 text-xs font-semibold text-orange-600 transition duration-200 hover:border-orange-200 hover:bg-orange-100">
                        View Details →
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Students Column */}
          <div className="glass rounded-3xl p-6 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Student Records
                </p>

                <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
                  Students
                </h2>
              </div>

              <Link
                href="/app/students"
                className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 transition duration-200 hover:translate-x-0.5 hover:text-orange-700"
              >
                View All →
              </Link>
            </div>

            {students.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-stone-200 bg-white/60 px-5 py-10 text-center">
                <p className="text-sm font-semibold text-stone-700">
                  No students found
                </p>

                <p className="mt-1 text-xs text-stone-400">
                  Students assigned to this school will appear here.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {students.map((student) => (
                  <Link
                    key={student.id}
                    href={`/app/students/${student.id}`}
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-stone-100 bg-white/70 p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-orange-100 hover:bg-orange-50/50 hover:shadow-sm"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-xs font-bold text-orange-700 transition-transform duration-200 group-hover:scale-105">
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

                    <span className="shrink-0 rounded-xl border border-orange-100 bg-orange-50 px-4 py-2.5 text-xs font-semibold text-orange-600 transition duration-200 hover:border-orange-200 hover:bg-orange-100">
                      View Details →
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Edit School Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 px-5 py-8 backdrop-blur-sm lg:pl-72">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/60 bg-white p-6 shadow-2xl transition-all duration-200 sm:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  School Management
                </p>

                <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
                  Edit School
                </h2>

                <p className="mt-1 text-sm text-stone-500">
                  Update the school information below.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-lg text-stone-500 transition duration-200 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateSchool} className="mt-7 space-y-5">
              {/* School Name */}
              <div>
                <label
                  htmlFor="school-name"
                  className="mb-2 block text-xs font-semibold text-stone-700"
                >
                  School Name *
                </label>

                <input
                  id="school-name"
                  type="text"
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Enter school name"
                  required
                  className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition duration-200 placeholder:text-stone-300 hover:border-stone-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              {/* Address */}
              <div>
                <label
                  htmlFor="school-address"
                  className="mb-2 block text-xs font-semibold text-stone-700"
                >
                  Address
                </label>

                <textarea
                  id="school-address"
                  value={editForm.address}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                  placeholder="Enter school address"
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition duration-200 placeholder:text-stone-300 hover:border-stone-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              {/* City + State */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="school-city"
                    className="mb-2 block text-xs font-semibold text-stone-700"
                  >
                    City
                  </label>

                  <input
                    id="school-city"
                    type="text"
                    value={editForm.city}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        city: event.target.value,
                      }))
                    }
                    placeholder="Enter city"
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition duration-200 placeholder:text-stone-300 hover:border-stone-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="school-state"
                    className="mb-2 block text-xs font-semibold text-stone-700"
                  >
                    State
                  </label>

                  <input
                    id="school-state"
                    type="text"
                    value={editForm.state}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        state: event.target.value,
                      }))
                    }
                    placeholder="Enter state"
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition duration-200 placeholder:text-stone-300 hover:border-stone-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>
              </div>

              {/* Error Banner */}
              {editError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
                  {editError}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={saving}
                  className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-600 transition duration-200 hover:border-stone-300 hover:bg-stone-50 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

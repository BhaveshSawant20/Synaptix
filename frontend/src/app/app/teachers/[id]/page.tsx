"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { API_BASE } from "@/lib/api";

type Teacher = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  specialization?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type Batch = {
  id: string;
  name: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  teachers?: Array<{
    id: string;
    teacherId: string;
    batchId: string;
    teacher?: Teacher | null;
  }>;
};

type TeachingProgress = {
  id: string;
  batchId: string;
  topicId: string;
  teacherId?: string | null;
  status: string;
  startedAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  batch?: {
    id: string;
    name: string;
  } | null;
  topic?: {
    id: string;
    name: string;
    subject?: {
      id: string;
      name: string;
    } | null;
  } | null;
};

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  teachers?: T[];
  batches?: Batch[];
  teachingProgress?: TeachingProgress[];
};

function getToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem("synaptix_token") || "";
}

function getInitials(name: string) {
  if (!name.trim()) {
    return "TC";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDate(date?: string | null) {
  if (!date) {
    return "Not available";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Not available";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusClasses(status: string) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "IN_PROGRESS":
      return "bg-orange-50 text-orange-700 border-orange-200";

    default:
      return "bg-stone-50 text-stone-600 border-stone-200";
  }
}

export default function TeacherDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const teacherId = params.id;

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [teachingProgress, setTeachingProgress] = useState<
    TeachingProgress[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    specialization: "",
  });

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

      const [
        teachersResponse,
        batchesResponse,
        progressResponse,
      ] = await Promise.all([
        fetch(`${API_BASE}/teachers`, {
          method: "GET",
          headers,
        }),

        fetch(`${API_BASE}/batches`, {
          method: "GET",
          headers,
        }),

        fetch(`${API_BASE}/teaching-progress`, {
          method: "GET",
          headers,
        }),
      ]);

      if (
        teachersResponse.status === 401 ||
        batchesResponse.status === 401 ||
        progressResponse.status === 401
      ) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      const teachersData: ApiResponse<Teacher> =
        await teachersResponse.json();

      const batchesData: ApiResponse<Batch> =
        await batchesResponse.json();

      const progressData: ApiResponse<TeachingProgress> =
        await progressResponse.json();

      if (!teachersResponse.ok || !teachersData.success) {
        throw new Error(
          teachersData.message || "Failed to load teacher.",
        );
      }

      if (!batchesResponse.ok || !batchesData.success) {
        throw new Error(
          batchesData.message || "Failed to load batches.",
        );
      }

      if (!progressResponse.ok || !progressData.success) {
        throw new Error(
          progressData.message ||
            "Failed to load teaching progress.",
        );
      }

      const allTeachers = Array.isArray(teachersData.teachers)
        ? teachersData.teachers
        : [];

      const selectedTeacher =
        allTeachers.find((item) => item.id === teacherId) || null;

      if (!selectedTeacher) {
        throw new Error("Teacher details could not be found.");
      }

      setTeacher(selectedTeacher);

      const allBatches = Array.isArray(batchesData.batches)
        ? batchesData.batches
        : [];

      const assignedBatches = allBatches.filter((batch) =>
        Array.isArray(batch.teachers)
          ? batch.teachers.some(
              (assignment) =>
                assignment.teacherId === teacherId ||
                assignment.teacher?.id === teacherId,
            )
          : false,
      );

      setBatches(assignedBatches);

      const allProgress = Array.isArray(
        progressData.teachingProgress,
      )
        ? progressData.teachingProgress
        : [];

      setTeachingProgress(
        allProgress.filter(
          (progress) => progress.teacherId === teacherId,
        ),
      );
    } catch (err) {
      console.error("Failed to load teacher:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load teacher.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (teacherId) {
      loadData();
    }
  }, [teacherId]);

  function openEditModal() {
    if (!teacher) {
      return;
    }

    setEditForm({
      name: teacher.name || "",
      email: teacher.email || "",
      phone: teacher.phone || "",
      specialization: teacher.specialization || "",
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

  async function handleUpdateTeacher(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const token = getToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (!editForm.name.trim()) {
      setEditError("Teacher name is required.");
      return;
    }

    try {
      setSaving(true);
      setEditError("");

      const response = await fetch(
        `${API_BASE}/teachers/${teacherId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: editForm.name.trim(),
            email: editForm.email.trim() || null,
            phone: editForm.phone.trim() || null,
            specialization:
              editForm.specialization.trim() || null,
          }),
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to update teacher.",
        );
      }

      if (data.teacher) {
        setTeacher(data.teacher);
      } else {
        await loadData();
      }

      setShowEditModal(false);
      setEditError("");
    } catch (err) {
      console.error("Failed to update teacher:", err);

      setEditError(
        err instanceof Error
          ? err.message
          : "Failed to update teacher.",
      );
    } finally {
      setSaving(false);
    }
  }

  const completedProgress = useMemo(() => {
    return teachingProgress.filter(
      (item) => item.status === "COMPLETED",
    ).length;
  }, [teachingProgress]);

  if (loading) {
    return (
      <main className="w-full px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl animate-pulse space-y-6">
          <div className="h-5 w-24 rounded-lg bg-stone-200" />
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-stone-200" />
            <div className="space-y-2">
              <div className="h-8 w-64 rounded-xl bg-stone-200" />
              <div className="h-4 w-40 rounded-lg bg-stone-100" />
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <div className="h-40 rounded-3xl bg-stone-200" />
            <div className="h-40 rounded-3xl bg-stone-200" />
            <div className="h-40 rounded-3xl bg-stone-200" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !teacher) {
    return (
      <main className="w-full px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={() => router.back()}
            className="group inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition duration-200 hover:text-orange-600"
          >
            <span className="transition-transform duration-200 group-hover:-translate-x-0.5">
              ←
            </span>
            <span>Back</span>
          </button>

          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-lg font-semibold tracking-tight text-red-800">
              Unable to load teacher
            </h1>
            <p className="mt-2 text-sm text-red-700">
              {error || "Teacher details could not be found."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Back */}
        <button
          type="button"
          onClick={() => router.back()}
          className="group mb-6 inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition duration-200 hover:text-orange-600"
        >
          <span className="transition-transform duration-200 group-hover:-translate-x-0.5">
            ←
          </span>
          <span>Back to Teachers</span>
        </button>

        {/* Header */}
        <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-xl font-bold text-orange-700 shadow-sm">
              {getInitials(teacher.name)}
            </div>

            <div>
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                <span>👨‍🏫</span>
                Faculty Profile
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
                {teacher.name}
              </h1>

              {teacher.specialization ? (
                <p className="mt-1 text-sm text-stone-500">
                  Specialization: {teacher.specialization}
                </p>
              ) : (
                <p className="mt-1 text-sm text-stone-500">
                  No specialization recorded
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/app/teachers"
              className="rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-xs font-semibold text-orange-700 transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 active:translate-y-0"
            >
              View All Teachers
            </Link>

            <button
              type="button"
              onClick={openEditModal}
              className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
            >
              Edit Teacher
            </button>
          </div>
        </section>

        {/* Summary */}
        <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="glass rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
              Assigned Batches
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
              {batches.length}
            </p>
          </div>

          <div className="glass rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
              Topics Tracked
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
              {teachingProgress.length}
            </p>
          </div>

          <div className="glass rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
              Completed Topics
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
              {completedProgress}
            </p>
          </div>
        </section>

        {/* Teacher Information */}
        <section className="mt-8 rounded-3xl border border-orange-100/80 bg-white/90 p-6 shadow-sm backdrop-blur-md sm:p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Contact & Subject Information
            </p>

            <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
              Faculty Profile Details
            </h2>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
              <p className="text-xs font-medium text-stone-400">
                Full Name
              </p>

              <p className="mt-1 text-sm font-semibold text-stone-900">
                {teacher.name}
              </p>
            </div>

            <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
              <p className="text-xs font-medium text-stone-400">
                Email Address
              </p>

              <p className="mt-1 break-all text-sm font-semibold text-stone-900">
                {teacher.email || "Not provided"}
              </p>
            </div>

            <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
              <p className="text-xs font-medium text-stone-400">
                Phone Number
              </p>

              <p className="mt-1 text-sm font-semibold text-stone-900">
                {teacher.phone || "Not provided"}
              </p>
            </div>

            <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
              <p className="text-xs font-medium text-stone-400">
                Specialization
              </p>

              <p className="mt-1 text-sm font-semibold text-stone-900">
                {teacher.specialization || "Not specified"}
              </p>
            </div>
          </div>
        </section>

        {/* Batches + Teaching Progress */}
        <section className="mt-8 grid gap-7 lg:grid-cols-2">
          {/* Assigned Batches */}
          <div className="rounded-3xl border border-orange-100/80 bg-white/90 p-6 shadow-sm backdrop-blur-md sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Batch Allocations
                </p>

                <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
                  Assigned Batches
                </h2>
              </div>

              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                {batches.length} batch{batches.length === 1 ? "" : "es"}
              </span>
            </div>

            {batches.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 px-5 py-10 text-center">
                <p className="text-sm font-semibold text-stone-700">
                  No batches assigned
                </p>

                <p className="mt-1 text-xs text-stone-500">
                  Batches assigned to this teacher will appear here.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {batches.map((batch) => (
                  <div
                    key={batch.id}
                    className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4 transition duration-200 hover:border-orange-100 hover:bg-orange-50/30"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-stone-900">
                          {batch.name}
                        </p>

                        <p className="mt-1 text-xs text-stone-500">
                          {batch.startDate
                            ? formatDate(batch.startDate)
                            : "Start date not set"}
                          {" → "}
                          {batch.endDate
                            ? formatDate(batch.endDate)
                            : "End date not set"}
                        </p>
                      </div>

                      <Link
                        href={`/app/batches/${batch.id}`}
                        className="inline-flex shrink-0 items-center justify-center rounded-xl border border-orange-200 bg-white px-3.5 py-2 text-xs font-semibold text-orange-700 transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 active:translate-y-0"
                      >
                        View Batch →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Teaching Progress */}
          <div className="rounded-3xl border border-orange-100/80 bg-white/90 p-6 shadow-sm backdrop-blur-md sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Curriculum Coverage
                </p>

                <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
                  Teaching Progress
                </h2>
              </div>

              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                {teachingProgress.length} topic{teachingProgress.length === 1 ? "" : "s"}
              </span>
            </div>

            {teachingProgress.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 px-5 py-10 text-center">
                <p className="text-sm font-semibold text-stone-700">
                  No teaching progress found
                </p>

                <p className="mt-1 text-xs text-stone-500">
                  Teaching progress assigned to this instructor will appear here.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {teachingProgress.map((progress) => (
                  <div
                    key={progress.id}
                    className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4 transition duration-150 hover:bg-orange-50/30"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-stone-900">
                          {progress.topic?.name ||
                            "Topic not available"}
                        </p>

                        <p className="mt-1 text-xs text-stone-500">
                          {progress.topic?.subject?.name ||
                            "Subject not available"}
                        </p>

                        <p className="mt-1 text-xs text-stone-400">
                          Batch:{" "}
                          {progress.batch?.name ||
                            "Batch not available"}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusClasses(
                          progress.status,
                        )}`}
                      >
                        {formatStatus(progress.status)}
                      </span>
                    </div>

                    {progress.completedAt && (
                      <p className="mt-3 text-xs text-stone-400">
                        Completed:{" "}
                        {formatDate(progress.completedAt)}
                      </p>
                    )}

                    {progress.notes && (
                      <div className="mt-3 rounded-xl bg-white/80 p-3">
                        <p className="text-xs leading-5 text-stone-600">
                          {progress.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Teacher Metadata */}
        <section className="mt-8 rounded-3xl border border-orange-100/80 bg-white/90 p-6 shadow-sm backdrop-blur-md sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
            System Records
          </p>

          <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
            Metadata & Audit Information
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
              <p className="text-xs font-medium text-stone-400">
                Teacher UUID
              </p>

              <p className="mt-1 break-all font-mono text-xs text-stone-600">
                {teacher.id}
              </p>
            </div>

            <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
              <p className="text-xs font-medium text-stone-400">
                Joined Date
              </p>

              <p className="mt-1 text-sm font-semibold text-stone-900">
                {formatDate(teacher.createdAt)}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Edit Teacher Modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) {
              closeEditModal();
            }
          }}
        >
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-orange-100 bg-[#fffdf9] shadow-2xl">
            <div className="flex items-start justify-between border-b border-stone-100 p-6 sm:px-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Faculty Management
                </p>

                <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
                  Edit Teacher
                </h2>

                <p className="mt-1 text-sm text-stone-500">
                  Update the teacher&apos;s personal and contact details.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleUpdateTeacher}
              className="p-6 sm:px-7"
            >
              {editError && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {editError}
                </div>
              )}

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label
                    htmlFor="teacher-name"
                    className="text-xs font-semibold text-stone-700"
                  >
                    Teacher Name *
                  </label>

                  <input
                    id="teacher-name"
                    type="text"
                    value={editForm.name}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Enter teacher name"
                    className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                {/* Email + Phone */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="teacher-email"
                      className="text-xs font-semibold text-stone-700"
                    >
                      Email Address
                    </label>

                    <input
                      id="teacher-email"
                      type="email"
                      value={editForm.email}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="teacher@example.com"
                      className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="teacher-phone"
                      className="text-xs font-semibold text-stone-700"
                    >
                      Phone Number
                    </label>

                    <input
                      id="teacher-phone"
                      type="text"
                      value={editForm.phone}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      placeholder="e.g. 9876543210"
                      className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>
                </div>

                {/* Specialization */}
                <div>
                  <label
                    htmlFor="teacher-specialization"
                    className="text-xs font-semibold text-stone-700"
                  >
                    Specialization / Subjects
                  </label>

                  <input
                    id="teacher-specialization"
                    type="text"
                    value={editForm.specialization}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        specialization: event.target.value,
                      }))
                    }
                    placeholder="e.g. Mathematics, Physics, Chemistry"
                    className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={saving}
                  className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-150 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 disabled:opacity-60"
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
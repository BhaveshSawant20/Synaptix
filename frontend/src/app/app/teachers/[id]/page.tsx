"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Modal from "@/app/app/components/Modal";
import WeeklyTimetable, {
  TimetableSchedule,
} from "@/app/app/components/WeeklyTimetable";
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
  schedules?: TimetableSchedule[];
};

function getToken() {
  if (typeof window === "undefined") {
    return "";
  }
  return localStorage.getItem("synaptix_token") || "";
}

function getInitials(name: string) {
  if (!name.trim()) return "TC";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDate(date?: string | null) {
  if (!date) return "Not available";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Not available";
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
  const [schedules, setSchedules] = useState<TimetableSchedule[]>([]);

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

      const [
        teachersResponse,
        batchesResponse,
        progressResponse,
        schedulesResponse,
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
        fetch(`${API_BASE}/batch-schedules/teacher/${teacherId}`, {
          method: "GET",
          headers,
        }),
      ]);

      if (
        teachersResponse.status === 401 ||
        batchesResponse.status === 401 ||
        progressResponse.status === 401 ||
        schedulesResponse.status === 401
      ) {
        localStorage.removeItem("synaptix_token");
        router.push("/login");
        return;
      }

      const teachersData: ApiResponse<Teacher> =
        await teachersResponse.json();
      const batchesData: ApiResponse<Batch> =
        await batchesResponse.json();
      const progressData: ApiResponse<TeachingProgress> =
        await progressResponse.json();
      const schedulesData: ApiResponse<TimetableSchedule> =
        await schedulesResponse.json();

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
          progressData.message || "Failed to load teaching progress.",
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

      const allProgress = Array.isArray(progressData.teachingProgress)
        ? progressData.teachingProgress
        : [];

      setTeachingProgress(
        allProgress.filter((progress) => progress.teacherId === teacherId),
      );

      if (schedulesData.success && Array.isArray(schedulesData.schedules)) {
        setSchedules(schedulesData.schedules);
      }
    } catch (err) {
      console.error("Failed to load teacher:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load teacher.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    async function init() {
      if (!ignore && teacherId) {
        await loadData(true);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [teacherId]);

  function openEditModal() {
    if (!teacher) return;

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
    if (saving) return;
    setShowEditModal(false);
    setEditError("");
  }

  async function handleUpdateTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    if (!editForm.name.trim()) {
      setEditError("Teacher name is required.");
      return;
    }

    try {
      setSaving(true);
      setEditError("");

      const response = await fetch(`${API_BASE}/teachers/${teacherId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editForm.name.trim(),
          email: editForm.email.trim() || null,
          phone: editForm.phone.trim() || null,
          specialization: editForm.specialization.trim() || null,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        router.push("/login");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update teacher.");
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
        err instanceof Error ? err.message : "Failed to update teacher.",
      );
    } finally {
      setSaving(false);
    }
  }

  const completedProgress = useMemo(() => {
    return teachingProgress.filter((item) => item.status === "COMPLETED")
      .length;
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

        {/* Hero Card */}
        <section className="relative overflow-hidden rounded-3xl border border-orange-100/80 bg-white/90 p-6 shadow-sm backdrop-blur-md sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-orange-100 text-2xl font-bold text-orange-700 shadow-inner">
                {getInitials(teacher.name)}
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                  <span>◈</span>
                  <span>Faculty Profile</span>
                </div>

                <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                  {teacher.name}
                </h1>

                <p className="mt-1 text-sm font-medium text-stone-500">
                  {teacher.specialization || "Faculty Instructor"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openEditModal}
              className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0"
            >
              Edit Profile
            </button>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
              Assigned Batches
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
              {batches.length}
            </p>
            <p className="mt-1 text-xs text-stone-400">Active teaching cohorts</p>
          </div>

          <div className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
              Weekly Classes
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-orange-600">
              {schedules.length}
            </p>
            <p className="mt-1 text-xs text-stone-400">Scheduled class periods</p>
          </div>

          <div className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
              Topics Covered
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-600">
              {completedProgress}
            </p>
            <p className="mt-1 text-xs text-stone-400">Syllabus modules completed</p>
          </div>

          <div className="rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
              Active Topics
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
              {teachingProgress.length - completedProgress}
            </p>
            <p className="mt-1 text-xs text-stone-400">In-progress curriculum topics</p>
          </div>
        </section>

        {/* ============================================================
            CHANGE 1: TEACHER'S WEEKLY TIMETABLE
        ============================================================ */}
        <section className="mt-8 rounded-3xl border border-orange-100/80 bg-white/90 p-6 shadow-sm backdrop-blur-md sm:p-7">
          <div className="mb-5 border-b border-stone-100 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Faculty Timetable
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-stone-900">
              Weekly Class Schedule
            </h2>
            <p className="mt-0.5 text-xs text-stone-500">
              All scheduled classes across assigned cohorts for {teacher.name}.
            </p>
          </div>

          <WeeklyTimetable
            schedules={schedules}
            showBatchName={true}
            showTeacherName={false}
            readOnly={true}
            emptyMessage={`${teacher.name} has no weekly classes scheduled yet.`}
          />
        </section>

        {/* Assigned Batches & Teaching Progress Grid */}
        <section className="mt-8 grid gap-8 lg:grid-cols-2">
          {/* Assigned Batches */}
          <div className="rounded-3xl border border-orange-100/80 bg-white/90 p-6 shadow-sm backdrop-blur-md sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Cohort Roster
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
                          {progress.topic?.name || "Topic not available"}
                        </p>
                        <p className="mt-1 text-xs text-stone-500">
                          {progress.topic?.subject?.name || "Subject not available"}
                        </p>
                        <p className="mt-1 text-xs text-stone-400">
                          Batch: {progress.batch?.name || "Batch not available"}
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
                        Completed: {formatDate(progress.completedAt)}
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
            Metadata & Contact Information
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
              <p className="text-xs font-medium text-stone-400">Email Address</p>
              <p className="mt-1 text-sm font-semibold text-stone-800">
                {teacher.email || "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
              <p className="text-xs font-medium text-stone-400">Phone Number</p>
              <p className="mt-1 text-sm font-semibold text-stone-800">
                {teacher.phone || "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
              <p className="text-xs font-medium text-stone-400">Joined Institute</p>
              <p className="mt-1 text-sm font-semibold text-stone-800">
                {formatDate(teacher.createdAt)}
              </p>
            </div>
          </div>
        </section>

        {/* ======================================================
            EDIT TEACHER MODAL (CHANGE 2 FIXED MODAL)
        ====================================================== */}
        <Modal
          isOpen={showEditModal}
          onClose={closeEditModal}
          title="Update Faculty Profile"
          badge="Faculty Operations"
          description="Update contact information, credentials, and subject specializations."
          footer={
            <>
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
                form="edit-teacher-form"
                disabled={saving}
                className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-150 hover:bg-orange-600 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          }
        >
          <form id="edit-teacher-form" onSubmit={handleUpdateTeacher}>
            {editError && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {editError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-stone-700">
                  Teacher Name *
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((cur) => ({ ...cur, name: e.target.value }))
                  }
                  placeholder="Enter teacher name"
                  className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-stone-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm((cur) => ({ ...cur, email: e.target.value }))
                    }
                    placeholder="teacher@example.com"
                    className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm((cur) => ({ ...cur, phone: e.target.value }))
                    }
                    placeholder="e.g. 9876543210"
                    className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700">
                  Specialization / Subjects
                </label>
                <input
                  type="text"
                  value={editForm.specialization}
                  onChange={(e) =>
                    setEditForm((cur) => ({
                      ...cur,
                      specialization: e.target.value,
                    }))
                  }
                  placeholder="e.g. Mathematics, Physics, Chemistry"
                  className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>
            </div>
          </form>
        </Modal>
      </div>
    </main>
  );
}
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

type School = {
  id: string;
  name: string;
};

type Standard = {
  id: string;
  name: string;
};

type Student = {
  id: string;
  name: string;
  studentCode?: string | null;
  email?: string | null;
  phone?: string | null;
  school?: School | null;
  standard?: Standard | null;
};

type Teacher = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  specialization?: string | null;
};

type BatchStudentAssignment = {
  id: string;
  studentId: string;
  batchId: string;
  joinedAt?: string;
  student: Student;
};

type BatchTeacherAssignment = {
  id: string;
  teacherId: string;
  batchId: string;
  teacher: Teacher;
};

type Batch = {
  id: string;
  name: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  students?: BatchStudentAssignment[];
  teachers?: BatchTeacherAssignment[];
};

type TeachingProgress = {
  id: string;
  batchId: string;
  topicId: string;
  teacherId?: string | null;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  startedAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  topic?: {
    id: string;
    name: string;
    description?: string | null;
    subject?: {
      id: string;
      name: string;
    } | null;
  } | null;
  teacher?: Teacher | null;
};

type Assessment = {
  id: string;
  batchId?: string | null;
  name: string;
  subject?: string | null;
  totalMarks?: number | null;
  assessmentDate?: string | null;
};

type Subject = {
  id: string;
  name: string;
  code?: string | null;
};

type BatchSchedule = {
  id: string;
  batchId: string;
  teacherId?: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectId?: string | null;
  room?: string | null;
  createdAt?: string;
  batch?: {
    id: string;
    name: string;
  } | null;
  teacher?: Teacher | null;
  subject?: Subject | null;
};

type ScheduleConflict = {
  type: "student" | "teacher" | "batch";
  personName?: string;
  teacherId?: string;
  studentId?: string;
  existingBatchId?: string;
  existingBatchName?: string;
  existingDay?: string;
  existingDayOfWeek?: number;
  existingStartTime?: string;
  existingEndTime?: string;
  newBatchId?: string;
  newBatchName?: string;
  newDay?: string;
  newDayOfWeek?: number;
  newStartTime?: string;
  newEndTime?: string;
};

type ConflictModalData = {
  code:
    | "STUDENT_SCHEDULE_CONFLICT"
    | "TEACHER_SCHEDULE_CONFLICT"
    | "BATCH_SCHEDULE_CONFLICT";
  message: string;
  conflicts: ScheduleConflict[];
};

type ScheduleForm = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  teacherId: string;
  subjectId: string;
  room: string;
};

import { API_BASE } from "@/lib/api";

const DAYS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

function getToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem("synaptix_token") || "";
}

async function parseJsonResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();

    throw new Error(
      text || `Request failed with status ${response.status}.`,
    );
  }

  return response.json();
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatStatus(status: TeachingProgress["status"]) {
  if (status === "COMPLETED") {
    return "Completed";
  }

  if (status === "IN_PROGRESS") {
    return "In Progress";
  }

  return "Not Started";
}

function statusClasses(status: TeachingProgress["status"]) {
  if (status === "COMPLETED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "IN_PROGRESS") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  return "border-stone-200 bg-stone-50 text-stone-600";
}

function getDayName(dayOfWeek?: number | null) {
  if (dayOfWeek == null) {
    return "—";
  }

  return DAYS.find((day) => Number(day.value) === dayOfWeek)?.label || "Unknown";
}

function formatTime(value?: string | null) {
  if (!value) {
    return "—";
  }

  const parts = value.split(":");

  if (parts.length < 2) {
    return value;
  }

  const hour = Number(parts[0]);
  const minute = Number(parts[1]);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return value;
  }

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function formatTimeRange(
  startTime?: string | null,
  endTime?: string | null,
) {
  return `${formatTime(startTime)} – ${formatTime(endTime)}`;
}

function normalizeScheduleList(data: any): BatchSchedule[] {
  if (Array.isArray(data?.schedules)) {
    return data.schedules;
  }

  if (Array.isArray(data?.batchSchedules)) {
    return data.batchSchedules;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

function normalizeSubjectList(data: any): Subject[] {
  if (Array.isArray(data?.subjects)) {
    return data.subjects;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

function conflictTitle(code: ConflictModalData["code"]) {
  if (code === "TEACHER_SCHEDULE_CONFLICT") {
    return "Teacher Schedule Conflict";
  }

  if (code === "STUDENT_SCHEDULE_CONFLICT") {
    return "Student Schedule Conflict";
  }

  return "Batch Schedule Conflict";
}

function conflictDescription(code: ConflictModalData["code"]) {
  if (code === "TEACHER_SCHEDULE_CONFLICT") {
    return "This teacher is already assigned to another batch during the selected time.";
  }

  if (code === "STUDENT_SCHEDULE_CONFLICT") {
    return "One or more students in this batch are already attending another batch during the selected time.";
  }

  return "This batch already has another class during the selected time.";
}

function getConflictExistingLabel(conflict: ScheduleConflict) {
  if (conflict.existingBatchName) {
    return conflict.existingBatchName;
  }

  if (conflict.existingBatchId) {
    return conflict.existingBatchId;
  }

  return "Existing schedule";
}

function getConflictRequestedLabel(conflict: ScheduleConflict) {
  if (conflict.newBatchName) {
    return conflict.newBatchName;
  }

  return "This batch";
}

export default function BatchDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const batchId = typeof params?.id === "string" ? params.id : "";

  const [batch, setBatch] = useState<Batch | null>(null);
  const [teachingProgress, setTeachingProgress] = useState<
    TeachingProgress[]
  >([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [schedules, setSchedules] = useState<BatchSchedule[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [loading, setLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [error, setError] = useState("");
  const [scheduleError, setScheduleError] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleDeletingId, setScheduleDeletingId] = useState<string | null>(
    null,
  );

  const [editingSchedule, setEditingSchedule] =
    useState<BatchSchedule | null>(null);

  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    dayOfWeek: "1",
    startTime: "",
    endTime: "",
    teacherId: "",
    subjectId: "",
    room: "",
  });

  const [conflictModal, setConflictModal] =
    useState<ConflictModalData | null>(null);

  const [deleteScheduleTarget, setDeleteScheduleTarget] =
    useState<BatchSchedule | null>(null);

  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
  });

  function openEditModal() {
    if (!batch) return;

    setEditForm({
      name: batch.name || "",
      description: batch.description || "",
      startDate: batch.startDate
        ? new Date(batch.startDate).toISOString().split("T")[0]
        : "",
      endDate: batch.endDate
        ? new Date(batch.endDate).toISOString().split("T")[0]
        : "",
    });

    setShowEditModal(true);
  }

  async function handleUpdateBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (!batchId) {
      setError("Invalid batch ID.");
      return;
    }

    if (!editForm.name.trim()) {
      setError("Batch name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(`${API_BASE}/batches/${batchId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
          startDate: editForm.startDate || null,
          endDate: editForm.endDate || null,
        }),
      });

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      const data = await parseJsonResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update batch.");
      }

      setBatch(data.batch);
      setShowEditModal(false);
    } catch (err) {
      console.error("Failed to update batch:", err);

      setError(
        err instanceof Error ? err.message : "Failed to update batch.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function loadSchedules() {
    const token = getToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (!batchId) {
      setScheduleError("Invalid batch ID.");
      setScheduleLoading(false);
      return;
    }

    try {
      setScheduleLoading(true);
      setScheduleError("");

      const response = await fetch(
        `${API_BASE}/batch-schedules/batch/${batchId}`,
        {
          method: "GET",
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

      const data = await parseJsonResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to load batch schedule.",
        );
      }

      const scheduleList = normalizeScheduleList(data);

      setSchedules(
        scheduleList.sort((a, b) => {
          if (a.dayOfWeek !== b.dayOfWeek) {
            return a.dayOfWeek - b.dayOfWeek;
          }

          return a.startTime.localeCompare(b.startTime);
        }),
      );
    } catch (err) {
      console.error("Failed to load schedules:", err);

      setScheduleError(
        err instanceof Error
          ? err.message
          : "Failed to load batch schedule.",
      );
    } finally {
      setScheduleLoading(false);
    }
  }

  async function loadSubjects() {
    const token = getToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/subjects`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        return;
      }

      const data = await parseJsonResponse(response);

      if (data.success) {
        setSubjects(normalizeSubjectList(data));
      }
    } catch (err) {
      console.error("Failed to load subjects:", err);
    }
  }

  async function loadBatchDetails() {
    const token = getToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (!batchId) {
      setError("Invalid batch ID.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [
        batchResponse,
        teachingProgressResponse,
        assessmentsResponse,
      ] = await Promise.all([
        fetch(`${API_BASE}/batches/${batchId}`, {
          method: "GET",
          headers,
        }),
        fetch(`${API_BASE}/teaching-progress/batch/${batchId}`, {
          method: "GET",
          headers,
        }),
        fetch(`${API_BASE}/assessments`, {
          method: "GET",
          headers,
        }),
      ]);

      if (
        batchResponse.status === 401 ||
        teachingProgressResponse.status === 401 ||
        assessmentsResponse.status === 401
      ) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      const batchData = await parseJsonResponse(batchResponse);
      const teachingProgressData = await parseJsonResponse(
        teachingProgressResponse,
      );
      const assessmentsData = await parseJsonResponse(
        assessmentsResponse,
      );

      if (!batchResponse.ok || !batchData.success) {
        throw new Error(
          batchData.message || "Failed to load batch.",
        );
      }

      if (
        !teachingProgressResponse.ok ||
        !teachingProgressData.success
      ) {
        throw new Error(
          teachingProgressData.message ||
            "Failed to load teaching progress.",
        );
      }

      if (
        !assessmentsResponse.ok ||
        !assessmentsData.success
      ) {
        throw new Error(
          assessmentsData.message ||
            "Failed to load assessments.",
        );
      }

      setBatch(batchData.batch);

      setTeachingProgress(
        Array.isArray(teachingProgressData.teachingProgress)
          ? teachingProgressData.teachingProgress
          : [],
      );

      const allAssessments = Array.isArray(assessmentsData.data)
        ? assessmentsData.data
        : [];

      setAssessments(
        allAssessments.filter(
          (assessment: Assessment) =>
            assessment.batchId === batchId,
        ),
      );
    } catch (err) {
      console.error("Failed to load batch details:", err);

      setError(
        err instanceof Error ? err.message : "Failed to load batch.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBatchDetails();
    loadSchedules();
    loadSubjects();
  }, [batchId]);

  const students = batch?.students || [];
  const teachers = batch?.teachers || [];

  const completedTopics = useMemo(
    () =>
      teachingProgress.filter(
        (item) => item.status === "COMPLETED",
      ).length,
    [teachingProgress],
  );

  const inProgressTopics = useMemo(
    () =>
      teachingProgress.filter(
        (item) => item.status === "IN_PROGRESS",
      ).length,
    [teachingProgress],
  );

  const notStartedTopics = useMemo(
    () =>
      teachingProgress.filter(
        (item) => item.status === "NOT_STARTED",
      ).length,
    [teachingProgress],
  );

  const sortedSchedules = useMemo(() => {
    return [...schedules].sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) {
        return a.dayOfWeek - b.dayOfWeek;
      }

      return a.startTime.localeCompare(b.startTime);
    });
  }, [schedules]);

  function resetScheduleForm() {
    setScheduleForm({
      dayOfWeek: "1",
      startTime: "",
      endTime: "",
      teacherId: "",
      subjectId: "",
      room: "",
    });

    setEditingSchedule(null);
  }

  function openAddScheduleModal() {
    resetScheduleForm();
    setScheduleError("");
    setShowScheduleModal(true);
  }

  function openEditScheduleModal(schedule: BatchSchedule) {
    setEditingSchedule(schedule);
    setScheduleForm({
      dayOfWeek: String(schedule.dayOfWeek),
      startTime: schedule.startTime || "",
      endTime: schedule.endTime || "",
      teacherId: schedule.teacherId || "",
      subjectId: schedule.subjectId || "",
      room: schedule.room || "",
    });
    setScheduleError("");
    setShowScheduleModal(true);
  }

  function closeScheduleModal() {
    if (scheduleSaving) {
      return;
    }

    setShowScheduleModal(false);
    resetScheduleForm();
  }

  function showConflictModal(data: {
    code?: string;
    message?: string;
    conflicts?: ScheduleConflict[];
  }) {
    if (
      data.code !== "STUDENT_SCHEDULE_CONFLICT" &&
      data.code !== "TEACHER_SCHEDULE_CONFLICT" &&
      data.code !== "BATCH_SCHEDULE_CONFLICT"
    ) {
      return false;
    }

    setConflictModal({
      code: data.code,
      message:
        data.message ||
        "This schedule cannot be created because it conflicts with an existing schedule.",
      conflicts: Array.isArray(data.conflicts)
        ? data.conflicts
        : [],
    });

    return true;
  }

  async function handleSaveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (!batchId) {
      setScheduleError("Invalid batch ID.");
      return;
    }

    if (!scheduleForm.startTime || !scheduleForm.endTime) {
      setScheduleError("Start time and end time are required.");
      return;
    }

    if (scheduleForm.startTime >= scheduleForm.endTime) {
      setScheduleError("End time must be later than start time.");
      return;
    }

    if (!scheduleForm.teacherId) {
      setScheduleError("Please select a teacher.");
      return;
    }

    try {
      setScheduleSaving(true);
      setScheduleError("");

      const payload = {
        batchId,
        teacherId: scheduleForm.teacherId,
        dayOfWeek: Number(scheduleForm.dayOfWeek),
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
        subjectId: scheduleForm.subjectId || null,
        room: scheduleForm.room.trim() || null,
      };

      const endpoint = editingSchedule
        ? `${API_BASE}/batch-schedules/${editingSchedule.id}`
        : `${API_BASE}/batch-schedules`;

      const response = await fetch(endpoint, {
        method: editingSchedule ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      const data = await parseJsonResponse(response);

      if (!response.ok || !data.success) {
        if (response.status === 409 && showConflictModal(data)) {
          return;
        }

        throw new Error(
          data.message ||
            `Failed to ${
              editingSchedule ? "update" : "create"
            } schedule.`,
        );
      }

      setShowScheduleModal(false);
      resetScheduleForm();

      await loadSchedules();
    } catch (err) {
      console.error("Failed to save schedule:", err);

      setScheduleError(
        err instanceof Error
          ? err.message
          : "Failed to save schedule.",
      );
    } finally {
      setScheduleSaving(false);
    }
  }

  async function handleDeleteSchedule() {
    if (!deleteScheduleTarget) {
      return;
    }

    const token = getToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      setScheduleDeletingId(deleteScheduleTarget.id);
      setScheduleError("");

      const response = await fetch(
        `${API_BASE}/batch-schedules/${deleteScheduleTarget.id}`,
        {
          method: "DELETE",
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

      const data = await parseJsonResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to delete schedule.",
        );
      }

      setDeleteScheduleTarget(null);

      await loadSchedules();
    } catch (err) {
      console.error("Failed to delete schedule:", err);

      setScheduleError(
        err instanceof Error
          ? err.message
          : "Failed to delete schedule.",
      );
    } finally {
      setScheduleDeletingId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" />
            <p className="mt-4 text-sm font-medium text-stone-500">
              Loading batch details...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !batch) {
    return (
      <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <button
            type="button"
            onClick={() => router.back()}
            className="group mb-6 inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition duration-200 hover:text-orange-600"
          >
            <span className="transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
            Back to Batches
          </button>

          <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-8">
            <h1 className="text-lg font-bold text-red-800">
              Unable to load batch
            </h1>

            <p className="mt-2 text-sm text-red-700">
              {error || "Batch not found."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* BACK BUTTON */}
        <button
          type="button"
          onClick={() => router.back()}
          className="group mb-6 inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition duration-200 hover:text-orange-600"
        >
          <span className="transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
          Back to Batches
        </button>

        {/* HEADER */}
        <section className="relative overflow-hidden rounded-3xl border border-orange-100/70 bg-white/80 p-7 shadow-sm backdrop-blur-xl sm:p-8">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-orange-100/60 blur-3xl" />

          <div className="relative z-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Coaching Batch
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
                  {batch.name}
                </h1>

                <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-stone-500">
                  {batch.description ||
                    "Manage students, teachers, academic progress and assessments for this batch."}
                </p>

                <div className="mt-5">
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
                  >
                    Edit Batch
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-orange-100 bg-orange-50/70 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Batch Duration
                </p>

                <p className="mt-2 text-sm font-semibold text-stone-800">
                  {formatDate(batch.startDate)} →{" "}
                  {formatDate(batch.endDate)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SUMMARY STATS */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-3xl border border-orange-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Students
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-stone-900">
              {students.length}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Assigned to batch
            </p>
          </div>

          <div className="rounded-3xl border border-orange-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Teachers
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-stone-900">
              {teachers.length}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Assigned to batch
            </p>
          </div>

          <div className="rounded-3xl border border-orange-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Completed
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-emerald-600">
              {completedTopics}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Teaching topics
            </p>
          </div>

          <div className="rounded-3xl border border-orange-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              In Progress
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-orange-600">
              {inProgressTopics}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Teaching topics
            </p>
          </div>

          <div className="rounded-3xl border border-orange-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Assessments
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-stone-900">
              {assessments.length}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              For this batch
            </p>
          </div>
        </section>

        {/* ASSIGNED STUDENTS */}
        <section className="mt-6 overflow-hidden rounded-3xl border border-orange-100/70 bg-white/80 shadow-sm backdrop-blur-xl">
          <div className="flex flex-col gap-3 border-b border-stone-200/70 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                Batch Students
              </p>

              <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-stone-900">
                Assigned Students
              </h2>

              <p className="mt-1 text-sm text-stone-500">
                Students currently assigned to this coaching batch.
              </p>
            </div>

            <Link
              href="/app/students"
              className="inline-flex items-center justify-center rounded-xl border border-orange-100 bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-600 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-100 active:translate-y-0"
            >
              View Students Directory →
            </Link>
          </div>

          <div className="p-6 sm:p-7">
            {students.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 p-8 text-center">
                <p className="text-sm font-semibold text-stone-800">
                  No students assigned
                </p>

                <p className="mt-1 text-xs text-stone-500">
                  Students assigned to this batch will appear here.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {students.map((assignment) => {
                  const student = assignment.student;

                  return (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-sm"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-sm font-bold text-orange-700">
                          {student.name
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <Link
                            href={`/app/students/${student.id}`}
                            className="truncate text-sm font-semibold text-stone-900 transition hover:text-orange-600"
                          >
                            {student.name}
                          </Link>

                          <p className="mt-0.5 truncate text-xs text-stone-500">
                            {[
                              student.studentCode,
                              student.school?.name,
                              student.standard?.name,
                            ]
                              .filter(Boolean)
                              .join(" • ") || "Student"}
                          </p>
                        </div>
                      </div>

                      <Link
                        href={`/app/students/${student.id}`}
                        className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-orange-600 transition hover:text-orange-700"
                      >
                        View Details →
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ASSIGNED TEACHERS */}
        <section className="mt-6 overflow-hidden rounded-3xl border border-orange-100/70 bg-white/80 shadow-sm backdrop-blur-xl">
          <div className="border-b border-stone-200/70 p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Batch Teachers
            </p>

            <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-stone-900">
              Assigned Teachers
            </h2>

            <p className="mt-1 text-sm text-stone-500">
              Teachers responsible for this coaching batch.
            </p>
          </div>

          <div className="p-6 sm:p-7">
            {teachers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 p-8 text-center">
                <p className="text-sm font-semibold text-stone-800">
                  No teachers assigned
                </p>

                <p className="mt-1 text-xs text-stone-500">
                  Assigned teachers will appear here.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {teachers.map((assignment) => {
                  const teacher = assignment.teacher;

                  return (
                    <div
                      key={assignment.id}
                      className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-sm"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-sm font-bold text-orange-700">
                        {teacher.name
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-stone-900">
                          {teacher.name}
                        </p>

                        <p className="mt-0.5 truncate text-xs text-stone-500">
                          {[
                            teacher.specialization,
                            teacher.email,
                          ]
                            .filter(Boolean)
                            .join(" • ") || "Teacher"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* CLASS SCHEDULE */}
        <section className="mt-6 overflow-hidden rounded-3xl border border-orange-100/70 bg-white/80 shadow-sm backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-stone-200/70 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                Batch Schedule
              </p>

              <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-stone-900">
                Weekly Class Schedule
              </h2>

              <p className="mt-1 max-w-2xl text-sm text-stone-500">
                Manage the weekly class timetable for this batch. Conflict
                detection automatically prevents overlapping periods.
              </p>
            </div>

            <button
              type="button"
              onClick={openAddScheduleModal}
              className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-orange-100 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
            >
              + Add Schedule
            </button>
          </div>

          <div className="p-6 sm:p-7">
            {scheduleError && !showScheduleModal && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-700">
                  !
                </div>

                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Unable to load schedule
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-700">
                    {scheduleError}
                  </p>
                </div>
              </div>
            )}

            {scheduleLoading ? (
              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-10 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" />

                <p className="mt-4 text-sm font-medium text-stone-500">
                  Loading class schedule...
                </p>
              </div>
            ) : sortedSchedules.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 p-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-2xl">
                  🗓
                </div>

                <p className="mt-4 text-sm font-semibold text-stone-800">
                  No class schedule added
                </p>

                <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-stone-500">
                  Add the weekly class timings for this batch. Schedule
                  conflicts with teachers, students, or this batch will be
                  prevented automatically.
                </p>

                <button
                  type="button"
                  onClick={openAddScheduleModal}
                  className="mt-5 inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-orange-100 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0"
                >
                  Add First Schedule
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-stone-200">
                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Day
                      </th>

                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Time
                      </th>

                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Subject
                      </th>

                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Teacher
                      </th>

                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Room
                      </th>

                      <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedSchedules.map((schedule) => (
                      <tr
                        key={schedule.id}
                        className="border-b border-stone-100 transition duration-150 last:border-0 hover:bg-orange-50/30"
                      >
                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-xl border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                            {getDayName(schedule.dayOfWeek)}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-stone-800">
                            {formatTimeRange(
                              schedule.startTime,
                              schedule.endTime,
                            )}
                          </p>

                          <p className="mt-0.5 text-xs text-stone-400">
                            Weekly class
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-stone-800">
                            {schedule.subject?.name || "Subject not specified"}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-stone-800">
                            {schedule.teacher?.name || "Teacher not specified"}
                          </p>

                          {schedule.teacher?.specialization && (
                            <p className="mt-0.5 text-xs text-stone-400">
                              {schedule.teacher.specialization}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4 text-sm text-stone-600">
                          {schedule.room || "—"}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEditScheduleModal(schedule)
                              }
                              className="rounded-xl border border-orange-200 bg-white px-3.5 py-2 text-xs font-semibold text-orange-700 transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 active:translate-y-0"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setDeleteScheduleTarget(schedule)
                              }
                              disabled={
                                scheduleDeletingId === schedule.id
                              }
                              className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 transition duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-100 disabled:opacity-60 active:translate-y-0"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!scheduleLoading && sortedSchedules.length > 0 && (
              <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">
                    i
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-orange-800">
                      Scheduling rule
                    </p>

                    <p className="mt-1 text-xs leading-5 text-orange-700">
                      Overlapping schedules are blocked automatically.
                      Back-to-back classes are allowed, so 4:00–5:00 PM and
                      5:00–6:00 PM can be scheduled without conflict.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* TEACHING PROGRESS */}
        <section className="mt-6 overflow-hidden rounded-3xl border border-orange-100/70 bg-white/80 shadow-sm backdrop-blur-xl">
          <div className="border-b border-stone-200/70 p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Academic Progress
            </p>

            <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-stone-900">
              Teaching Progress
            </h2>

            <p className="mt-1 text-sm text-stone-500">
              Topic-level syllabus progress recorded for this batch.
            </p>
          </div>

          <div className="p-6 sm:p-7">
            {teachingProgress.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 p-8 text-center">
                <p className="text-sm font-semibold text-stone-800">
                  No teaching progress recorded
                </p>

                <p className="mt-1 text-xs text-stone-500">
                  Teaching progress for this batch will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px]">
                  <thead>
                    <tr className="border-b border-stone-200">
                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Subject
                      </th>

                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Topic
                      </th>

                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Teacher
                      </th>

                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Status
                      </th>

                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Completed Date
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {teachingProgress.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-stone-100 transition duration-150 last:border-0 hover:bg-orange-50/30"
                      >
                        <td className="px-4 py-4 text-sm font-semibold text-stone-700">
                          {item.topic?.subject?.name || "—"}
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-stone-900">
                            {item.topic?.name || "—"}
                          </p>

                          {item.notes && (
                            <p className="mt-0.5 max-w-sm truncate text-xs text-stone-400">
                              {item.notes}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4 text-sm text-stone-600">
                          {item.teacher?.name || "Not assigned"}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClasses(
                              item.status,
                            )}`}
                          >
                            {formatStatus(item.status)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-stone-600">
                          {formatDate(item.completedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ASSESSMENTS */}
        <section className="mt-6 overflow-hidden rounded-3xl border border-orange-100/70 bg-white/80 shadow-sm backdrop-blur-xl">
          <div className="border-b border-stone-200/70 p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Assessments
            </p>

            <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-stone-900">
              Batch Assessments
            </h2>

            <p className="mt-1 text-sm text-stone-500">
              Assessments associated with this coaching batch.
            </p>
          </div>

          <div className="p-6 sm:p-7">
            {assessments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 p-8 text-center">
                <p className="text-sm font-semibold text-stone-800">
                  No assessments found
                </p>

                <p className="mt-1 text-xs text-stone-500">
                  Assessments created for this batch will appear here.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {assessments.map((assessment) => (
                  <div
                    key={assessment.id}
                    className="rounded-2xl border border-stone-200 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">
                          {assessment.name}
                        </p>

                        <p className="mt-0.5 text-xs text-stone-500">
                          {assessment.subject ||
                            "Subject not specified"}
                        </p>
                      </div>

                      {assessment.totalMarks != null && (
                        <span className="rounded-xl border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                          {assessment.totalMarks} marks
                        </span>
                      )}
                    </div>

                    <div className="mt-4 border-t border-stone-100 pt-3">
                      <p className="text-xs text-stone-400">
                        Assessment Date
                      </p>

                      <p className="mt-1 text-sm font-medium text-stone-700">
                        {formatDate(assessment.assessmentDate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* BATCH INFORMATION */}
        <section className="mt-6 mb-8 rounded-3xl border border-orange-100/70 bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
            Batch Information
          </p>

          <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-stone-900">
            Cohort Details
          </h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Batch ID
              </p>

              <p className="mt-2 break-all text-sm font-medium text-stone-700">
                {batch.id}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Start Date
              </p>

              <p className="mt-2 text-sm font-medium text-stone-700">
                {formatDate(batch.startDate)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                End Date
              </p>

              <p className="mt-2 text-sm font-medium text-stone-700">
                {formatDate(batch.endDate)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Created
              </p>

              <p className="mt-2 text-sm font-medium text-stone-700">
                {formatDate(batch.createdAt)}
              </p>
            </div>
          </div>
        </section>

        {/* EDIT BATCH MODAL */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 px-5 py-8 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-orange-100 bg-white shadow-2xl">
              <div className="border-b border-stone-200/70 px-6 py-5 sm:px-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                      Edit Batch
                    </p>

                    <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-stone-900">
                      Update Batch Details
                    </h2>

                    <p className="mt-1 text-sm text-stone-500">
                      Update the general cohort parameters for this batch.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    disabled={saving}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-lg text-stone-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    ×
                  </button>
                </div>
              </div>

              <form
                onSubmit={handleUpdateBatch}
                className="p-6 sm:p-7"
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      Batch Name
                    </label>

                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      placeholder="Enter batch name"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      Description
                    </label>

                    <textarea
                      value={editForm.description}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      rows={3}
                      className="mt-2 w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      placeholder="Enter batch description"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      Start Date
                    </label>

                    <input
                      type="date"
                      value={editForm.startDate}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          startDate: event.target.value,
                        }))
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      End Date
                    </label>

                    <input
                      type="date"
                      value={editForm.endDate}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          endDate: event.target.value,
                        }))
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>
                </div>

                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-xs font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-orange-100 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Saving Changes..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ADD / EDIT SCHEDULE MODAL */}
        {showScheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/45 px-5 py-8 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-orange-100 bg-white shadow-2xl">
              <div className="border-b border-stone-200/70 px-6 py-5 sm:px-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                      Batch Schedule
                    </p>

                    <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-stone-900">
                      {editingSchedule
                        ? "Edit Class Schedule"
                        : "Add Class Schedule"}
                    </h2>

                    <p className="mt-1 text-sm leading-5 text-stone-500">
                      Set the weekly class timing for this batch.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeScheduleModal}
                    disabled={scheduleSaving}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-lg text-stone-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    ×
                  </button>
                </div>
              </div>

              <form
                onSubmit={handleSaveSchedule}
                className="p-6 sm:p-7"
              >
                {scheduleError && (
                  <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-700">
                        !
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-red-800">
                          Unable to save schedule
                        </p>

                        <p className="mt-1 text-xs leading-5 text-red-700">
                          {scheduleError}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      Day
                    </label>

                    <select
                      value={scheduleForm.dayOfWeek}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          dayOfWeek: event.target.value,
                        }))
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      required
                    >
                      {DAYS.map((day) => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      Start Time
                    </label>

                    <input
                      type="time"
                      value={scheduleForm.startTime}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          startTime: event.target.value,
                        }))
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      End Time
                    </label>

                    <input
                      type="time"
                      value={scheduleForm.endTime}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          endTime: event.target.value,
                        }))
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      Teacher
                    </label>

                    <select
                      value={scheduleForm.teacherId}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          teacherId: event.target.value,
                        }))
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      required
                    >
                      <option value="">Select teacher</option>

                      {teachers.map((assignment) => (
                        <option
                          key={assignment.teacherId}
                          value={assignment.teacherId}
                        >
                          {assignment.teacher.name}
                        </option>
                      ))}
                    </select>

                    {teachers.length === 0 && (
                      <p className="mt-2 text-xs text-red-600">
                        Assign a teacher to this batch before creating a
                        schedule.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      Subject
                    </label>

                    <select
                      value={scheduleForm.subjectId}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          subjectId: event.target.value,
                        }))
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="">Select subject</option>

                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                          {subject.code ? ` (${subject.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      Room
                    </label>

                    <input
                      type="text"
                      value={scheduleForm.room}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          room: event.target.value,
                        }))
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      placeholder="e.g. Room 1"
                    />
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
                  <p className="text-xs font-semibold text-orange-800">
                    Schedule validation
                  </p>

                  <p className="mt-1 text-xs leading-5 text-orange-700">
                    A teacher or student cannot have overlapping classes.
                    Back-to-back classes are allowed. For example,
                    4:00–5:00 PM followed by 5:00–6:00 PM is valid.
                  </p>
                </div>

                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeScheduleModal}
                    disabled={scheduleSaving}
                    className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-xs font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      scheduleSaving ||
                      teachers.length === 0
                    }
                    className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-orange-100 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {scheduleSaving
                      ? "Saving..."
                      : editingSchedule
                        ? "Update Schedule"
                        : "Add Schedule"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE SCHEDULE MODAL */}
        {deleteScheduleTarget && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/45 px-5 py-8 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-6 shadow-2xl sm:p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl font-bold text-red-600">
                !
              </div>

              <h2 className="mt-5 text-lg font-semibold tracking-tight text-stone-900">
                Delete this schedule?
              </h2>

              <p className="mt-2 text-sm leading-6 text-stone-500">
                This will remove the weekly class timing from the batch schedule.
                This action cannot be undone.
              </p>

              <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
                <p className="text-sm font-semibold text-stone-800">
                  {getDayName(deleteScheduleTarget.dayOfWeek)}
                </p>

                <p className="mt-0.5 text-xs text-stone-500">
                  {formatTimeRange(
                    deleteScheduleTarget.startTime,
                    deleteScheduleTarget.endTime,
                  )}
                </p>

                <p className="mt-2 text-xs font-medium text-stone-600">
                  {deleteScheduleTarget.subject?.name ||
                    "Subject not specified"}
                  {" • "}
                  {deleteScheduleTarget.teacher?.name ||
                    "Teacher not specified"}
                </p>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteScheduleTarget(null)}
                  disabled={Boolean(scheduleDeletingId)}
                  className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-xs font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDeleteSchedule}
                  disabled={Boolean(scheduleDeletingId)}
                  className="inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {scheduleDeletingId ? "Deleting..." : "Delete Schedule"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SCHEDULE CONFLICT MODAL */}
        {conflictModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-900/50 px-5 py-8 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-red-100 bg-white shadow-2xl">
              <div className="border-b border-stone-200/70 px-6 py-6 sm:px-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-xl font-bold text-red-600">
                    !
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-600">
                      Schedule Conflict
                    </p>

                    <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-stone-900">
                      {conflictTitle(conflictModal.code)}
                    </h2>

                    <p className="mt-1.5 text-sm leading-6 text-stone-500">
                      {conflictDescription(conflictModal.code)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-7">
                <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4">
                  <p className="text-sm font-semibold leading-6 text-red-800">
                    {conflictModal.message}
                  </p>
                </div>

                {conflictModal.conflicts.length > 0 && (
                  <div className="mt-5 space-y-4">
                    {conflictModal.conflicts.map((conflict, index) => (
                      <div
                        key={`${conflict.existingBatchId || "conflict"}-${index}`}
                        className="rounded-2xl border border-stone-200 bg-white p-5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                            Conflict #{index + 1}
                          </p>

                          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                            Overlapping Period
                          </span>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <div className="rounded-xl border border-stone-100 bg-stone-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                              Existing Schedule
                            </p>

                            <p className="mt-2 text-sm font-semibold text-stone-800">
                              {getConflictExistingLabel(conflict)}
                            </p>

                            <p className="mt-0.5 text-xs text-stone-500">
                              {conflict.existingDay ||
                                getDayName(
                                  conflict.existingDayOfWeek,
                                )}
                            </p>

                            <p className="mt-1 text-sm font-semibold text-red-600">
                              {formatTimeRange(
                                conflict.existingStartTime,
                                conflict.existingEndTime,
                              )}
                            </p>
                          </div>

                          <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-500">
                              Requested Schedule
                            </p>

                            <p className="mt-2 text-sm font-semibold text-stone-800">
                              {getConflictRequestedLabel(conflict)}
                            </p>

                            <p className="mt-0.5 text-xs text-stone-500">
                              {conflict.newDay ||
                                getDayName(conflict.newDayOfWeek)}
                            </p>

                            <p className="mt-1 text-sm font-semibold text-orange-700">
                              {formatTimeRange(
                                conflict.newStartTime,
                                conflict.newEndTime,
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
                  <p className="text-xs font-semibold text-orange-800">
                    Scheduling rule
                  </p>

                  <p className="mt-1 text-xs leading-5 text-orange-700">
                    Overlapping classes are not allowed. Back-to-back classes
                    are permitted, so 4:00–5:00 PM followed by 5:00–6:00 PM do not
                    conflict.
                  </p>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setConflictModal(null)}
                    className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-orange-100 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
                  >
                    Got it
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
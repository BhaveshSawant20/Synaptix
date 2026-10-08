"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Modal from "@/app/app/components/Modal";
import WeeklyTimetable, {
  TimetableSchedule,
  formatTimeRange,
} from "@/app/app/components/WeeklyTimetable";
import { API_BASE } from "@/lib/api";

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

const DAYS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 22; h++) {
  for (const m of [0, 15, 30, 45]) {
    if (h === 22 && m > 0) break;
    const hh = h.toString().padStart(2, "0");
    const mm = m.toString().padStart(2, "0");
    TIME_OPTIONS.push(`${hh}:${mm}`);
  }
}

function formatTimeOption(value: string): string {
  if (!value) return "";
  const parts = value.split(":");
  if (parts.length < 2) return value;
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix} (${value})`;
}

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
  if (status === "COMPLETED") return "Completed";
  if (status === "IN_PROGRESS") return "In Progress";
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
  if (dayOfWeek == null) return "—";
  return DAYS.find((day) => Number(day.value) === dayOfWeek)?.label || "Unknown";
}

function normalizeScheduleList(data: unknown): TimetableSchedule[] {
  const record = data as { schedules?: TimetableSchedule[]; batchSchedules?: TimetableSchedule[]; data?: TimetableSchedule[] } | null | undefined;
  if (Array.isArray(record?.schedules)) return record.schedules;
  if (Array.isArray(record?.batchSchedules)) return record.batchSchedules;
  if (Array.isArray(record?.data)) return record.data;
  return [];
}

function normalizeSubjectList(data: unknown): Subject[] {
  const record = data as { subjects?: Subject[]; data?: Subject[] } | null | undefined;
  if (Array.isArray(record?.subjects)) return record.subjects;
  if (Array.isArray(record?.data)) return record.data;
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
  if (conflict.existingBatchName) return conflict.existingBatchName;
  if (conflict.existingBatchId) return conflict.existingBatchId;
  return "Existing schedule";
}

function getConflictRequestedLabel(conflict: ScheduleConflict) {
  if (conflict.newBatchName) return conflict.newBatchName;
  return "This batch";
}

export default function BatchDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const batchId = typeof params?.id === "string" ? params.id : "";

  const [batch, setBatch] = useState<Batch | null>(null);
  const [teachingProgress, setTeachingProgress] = useState<TeachingProgress[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [schedules, setSchedules] = useState<TimetableSchedule[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [loading, setLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [error, setError] = useState("");
  const [scheduleError, setScheduleError] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleDeletingId, setScheduleDeletingId] = useState<string | null>(null);

  const [editingSchedule, setEditingSchedule] = useState<TimetableSchedule | null>(null);

  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    dayOfWeek: "",
    startTime: "",
    endTime: "",
    teacherId: "",
    subjectId: "",
    room: "",
  });

  const [conflictModal, setConflictModal] = useState<ConflictModalData | null>(null);
  const [deleteScheduleTarget, setDeleteScheduleTarget] = useState<TimetableSchedule | null>(null);

  // Student removal state
  const [removingStudentTarget, setRemovingStudentTarget] = useState<{
    studentId: string;
    studentName: string;
  } | null>(null);
  const [isRemovingStudent, setIsRemovingStudent] = useState(false);

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
      router.push("/login");
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
        router.push("/login");
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
      router.push("/login");
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
        router.push("/login");
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
      router.push("/login");
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
        router.push("/login");
        return;
      }

      if (!response.ok) return;

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
      router.push("/login");
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
        router.push("/login");
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

      if (!assessmentsResponse.ok || !assessmentsData.success) {
        throw new Error(
          assessmentsData.message || "Failed to load assessments.",
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
    let ignore = false;

    async function init() {
      if (!ignore) {
        await Promise.all([
          loadBatchDetails(),
          loadSchedules(),
          loadSubjects(),
        ]);
      }
    }

    init();

    return () => {
      ignore = true;
    };
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

  function resetScheduleForm() {
    setScheduleForm({
      dayOfWeek: "",
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

  function openEditScheduleModal(schedule: TimetableSchedule) {
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
    if (scheduleSaving) return;
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
      conflicts: Array.isArray(data.conflicts) ? data.conflicts : [],
    });

    return true;
  }

  async function handleSaveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    if (!batchId) {
      setScheduleError("Invalid batch ID.");
      return;
    }

    if (!scheduleForm.dayOfWeek) {
      setScheduleError("Please select a day.");
      return;
    }

    if (!scheduleForm.teacherId) {
      setScheduleError("Please select a teacher.");
      return;
    }

    if (!scheduleForm.startTime) {
      setScheduleError("Please select a start time.");
      return;
    }

    if (!scheduleForm.endTime) {
      setScheduleError("Please select an end time.");
      return;
    }

    if (scheduleForm.startTime >= scheduleForm.endTime) {
      setScheduleError("End time must be later than start time.");
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
        router.push("/login");
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
    if (!deleteScheduleTarget) return;

    const token = getToken();

    if (!token) {
      router.push("/login");
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
        router.push("/login");
        return;
      }

      const data = await parseJsonResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete schedule.");
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

  async function handleRemoveStudentConfirmed() {
    if (!removingStudentTarget) return;

    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      setIsRemovingStudent(true);
      const response = await fetch(
        `${API_BASE}/batches/${batchId}/students/${removingStudentTarget.studentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        router.push("/login");
        return;
      }

      const data = await parseJsonResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to remove student.");
      }

      setRemovingStudentTarget(null);
      await loadBatchDetails();
    } catch (err) {
      console.error("Failed to remove student:", err);
      alert(err instanceof Error ? err.message : "Failed to remove student.");
    } finally {
      setIsRemovingStudent(false);
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
                  {formatDate(batch.startDate)} → {formatDate(batch.endDate)}
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
              Weekly Classes
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-orange-600">
              {schedules.length}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Scheduled periods
            </p>
          </div>

          <div className="rounded-3xl border border-orange-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Completed Topics
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

        {/* ============================================================
            CHANGE 1: POLISHED WEEKLY CLASS TIMETABLE GRID
        ============================================================ */}
        <section className="mt-6 overflow-hidden rounded-3xl border border-orange-100/70 bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-7">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                Weekly Class Timetable
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-stone-900">
                {batch.name} — Schedule
              </h2>
              <p className="mt-0.5 text-xs text-stone-500">
                Day, time, subject, and instructor schedule. Multi-batch and teacher conflicts are blocked automatically.
              </p>
            </div>

            <button
              type="button"
              onClick={openAddScheduleModal}
              className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-600 active:scale-95"
            >
              <span>+</span>
              <span>Add Schedule</span>
            </button>
          </div>

          {scheduleError && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
              {scheduleError}
            </div>
          )}

          {scheduleLoading ? (
            <div className="py-12 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" />
              <p className="mt-3 text-xs text-stone-500">Loading timetable...</p>
            </div>
          ) : (
            <WeeklyTimetable
              schedules={schedules}
              onAddSchedule={openAddScheduleModal}
              onEditSchedule={openEditScheduleModal}
              onDeleteSchedule={(sched) => setDeleteScheduleTarget(sched)}
              showTeacherName={true}
              emptyMessage="No weekly classes scheduled for this cohort yet."
            />
          )}
        </section>

        {/* ============================================================
            CHANGE 3: ENROLLED STUDENTS TABLE
        ============================================================ */}
        <section className="mt-6 overflow-hidden rounded-3xl border border-orange-100/70 bg-white/80 shadow-sm backdrop-blur-xl">
          <div className="flex flex-col gap-3 border-b border-stone-200/70 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                Cohort Roster
              </p>

              <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-stone-900">
                Assigned Students ({students.length})
              </h2>

              <p className="mt-1 text-sm text-stone-500">
                Students actively enrolled in this batch, with their verified standard and student code.
              </p>
            </div>

            <Link
              href="/app/batches"
              className="inline-flex items-center justify-center rounded-xl border border-orange-100 bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-600 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-100 active:translate-y-0"
            >
              Manage Cohort Rosters →
            </Link>
          </div>

          <div className="p-6 sm:p-7">
            {students.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 p-8 text-center">
                <p className="text-sm font-semibold text-stone-800">
                  No students assigned
                </p>

                <p className="mt-1 text-xs text-stone-500">
                  Students enrolled in this cohort will appear in the table below.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-50/70 text-stone-500">
                      <th className="px-5 py-3.5 font-semibold uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">
                        Student ID
                      </th>
                      <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">
                        Assigned Standard
                      </th>
                      <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">
                        School
                      </th>
                      <th className="px-5 py-3.5 text-right font-semibold uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {students.map((assignment) => {
                      const student = assignment.student;

                      return (
                        <tr
                          key={assignment.id}
                          className="transition hover:bg-orange-50/30"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-xs font-bold text-orange-700">
                                {student.name
                                  .split(" ")
                                  .map((p) => p[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()}
                              </div>
                              <Link
                                href={`/app/students/${student.id}`}
                                className="font-bold text-stone-900 transition hover:text-orange-600"
                              >
                                {student.name}
                              </Link>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 font-mono text-stone-600">
                            {student.studentCode || `STU-${student.id.slice(0, 5)}`}
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="inline-flex rounded-lg bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                              {student.standard?.name || "Unassigned"}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-stone-600">
                            {student.school?.name || "—"}
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/app/students/${student.id}`}
                                className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
                              >
                                View
                              </Link>
                              <button
                                type="button"
                                onClick={() =>
                                  setRemovingStudentTarget({
                                    studentId: student.id,
                                    studentName: student.name,
                                  })
                                }
                                className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
              Assigned Teachers ({teachers.length})
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
                        <Link
                          href={`/app/teachers/${teacher.id}`}
                          className="truncate text-sm font-semibold text-stone-900 transition hover:text-orange-600"
                        >
                          {teacher.name}
                        </Link>

                        <p className="mt-0.5 truncate text-xs text-stone-500">
                          {[teacher.specialization, teacher.email]
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
                          {assessment.subject || "Subject not specified"}
                        </p>
                      </div>

                      {assessment.totalMarks != null && (
                        <span className="rounded-xl border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                          {assessment.totalMarks} marks
                        </span>
                      )}
                    </div>

                    <div className="mt-4 border-t border-stone-100 pt-3">
                      <p className="text-xs text-stone-400">Assessment Date</p>
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

        {/* ======================================================
            MODAL 1: EDIT BATCH (CHANGE 2)
        ====================================================== */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Update Batch Details"
          badge="Edit Batch"
          description="Update the general cohort parameters for this batch."
          footer={
            <>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                disabled={saving}
                className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-xs font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-batch-form"
                disabled={saving}
                className="rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-orange-100 transition hover:bg-orange-600 disabled:opacity-60"
              >
                {saving ? "Saving Changes..." : "Save Changes"}
              </button>
            </>
          }
        >
          <form id="edit-batch-form" onSubmit={handleUpdateBatch}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Batch Name *
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((cur) => ({ ...cur, name: e.target.value }))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((cur) => ({
                      ...cur,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  className="mt-2 w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Start Date
                </label>
                <input
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) =>
                    setEditForm((cur) => ({
                      ...cur,
                      startDate: e.target.value,
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
                  onChange={(e) =>
                    setEditForm((cur) => ({
                      ...cur,
                      endDate: e.target.value,
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>
            </div>
          </form>
        </Modal>

        {/* ======================================================
            MODAL 2: ADD / EDIT SCHEDULE (CHANGE 1 & 2)
        ====================================================== */}
        <Modal
          isOpen={showScheduleModal}
          onClose={closeScheduleModal}
          title={editingSchedule ? "Edit Class Schedule" : "Add Class Schedule"}
          badge="Batch Schedule"
          description="Set the weekly class timing for this batch. Conflict detection will verify faculty & student availability."
          footer={
            <>
              <button
                type="button"
                onClick={closeScheduleModal}
                disabled={scheduleSaving}
                className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-xs font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="schedule-form"
                disabled={scheduleSaving || teachers.length === 0}
                className="rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-orange-100 transition hover:bg-orange-600 disabled:opacity-60"
              >
                {scheduleSaving
                  ? "Saving..."
                  : editingSchedule
                    ? "Update Schedule"
                    : "Add Schedule"}
              </button>
            </>
          }
        >
          <form id="schedule-form" onSubmit={handleSaveSchedule}>
            {scheduleError && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
                {scheduleError}
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Day of the Week *
                </label>
                <select
                  value={scheduleForm.dayOfWeek}
                  onChange={(e) =>
                    setScheduleForm((cur) => ({
                      ...cur,
                      dayOfWeek: e.target.value,
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                >
                  <option value="" disabled>
                    Select a Day
                  </option>
                  {DAYS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Start Time *
                </label>
                <select
                  value={scheduleForm.startTime}
                  onChange={(e) =>
                    setScheduleForm((cur) => ({
                      ...cur,
                      startTime: e.target.value,
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                >
                  <option value="" disabled>
                    Select Start Time
                  </option>
                  {scheduleForm.startTime &&
                    !TIME_OPTIONS.includes(scheduleForm.startTime) && (
                      <option value={scheduleForm.startTime}>
                        {formatTimeOption(scheduleForm.startTime)}
                      </option>
                    )}
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {formatTimeOption(time)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                  End Time *
                </label>
                <select
                  value={scheduleForm.endTime}
                  onChange={(e) =>
                    setScheduleForm((cur) => ({
                      ...cur,
                      endTime: e.target.value,
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                >
                  <option value="" disabled>
                    Select End Time
                  </option>
                  {scheduleForm.endTime &&
                    !TIME_OPTIONS.includes(scheduleForm.endTime) && (
                      <option value={scheduleForm.endTime}>
                        {formatTimeOption(scheduleForm.endTime)}
                      </option>
                    )}
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {formatTimeOption(time)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Teacher *
                </label>
                <select
                  value={scheduleForm.teacherId}
                  onChange={(e) =>
                    setScheduleForm((cur) => ({
                      ...cur,
                      teacherId: e.target.value,
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                >
                  <option value="" disabled>
                    Select a Teacher
                  </option>
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
                  <p className="mt-1 text-xs text-red-600">
                    Assign a teacher to this batch before creating a schedule.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Subject
                </label>
                <select
                  value={scheduleForm.subjectId}
                  onChange={(e) =>
                    setScheduleForm((cur) => ({
                      ...cur,
                      subjectId: e.target.value,
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">Select subject (optional)</option>
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
                  Room / Location
                </label>
                <input
                  type="text"
                  value={scheduleForm.room}
                  onChange={(e) =>
                    setScheduleForm((cur) => ({
                      ...cur,
                      room: e.target.value,
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  placeholder="e.g. Room 102 / Lab A"
                />
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50/60 p-4 text-xs text-orange-800">
              <span className="font-bold">Conflict Guard:</span> Overlapping class times for the same cohort or teacher are prevented automatically. Back-to-back classes (e.g. 4:00–5:00 PM then 5:00–6:00 PM) are permitted.
            </div>
          </form>
        </Modal>

        {/* ======================================================
            MODAL 3: DELETE SCHEDULE CONFIRMATION
        ====================================================== */}
        {deleteScheduleTarget && (
          <Modal
            isOpen={Boolean(deleteScheduleTarget)}
            onClose={() => setDeleteScheduleTarget(null)}
            title="Delete Class Schedule?"
            badge="Schedule Removal"
            maxWidth="md"
            footer={
              <>
                <button
                  type="button"
                  onClick={() => setDeleteScheduleTarget(null)}
                  disabled={Boolean(scheduleDeletingId)}
                  className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSchedule}
                  disabled={Boolean(scheduleDeletingId)}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
                >
                  {scheduleDeletingId ? "Deleting..." : "Delete Schedule"}
                </button>
              </>
            }
          >
            <p className="text-sm text-stone-600">
              This will remove the weekly class timing from the batch schedule.
            </p>
            <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50/60 p-4 text-xs">
              <p className="font-bold text-stone-900">
                {getDayName(deleteScheduleTarget.dayOfWeek)} •{" "}
                {formatTimeRange(
                  deleteScheduleTarget.startTime,
                  deleteScheduleTarget.endTime,
                )}
              </p>
              <p className="mt-1 text-stone-600">
                Subject: {deleteScheduleTarget.subject?.name || "Unspecified"} • Teacher: {deleteScheduleTarget.teacher?.name || "Unspecified"}
              </p>
            </div>
          </Modal>
        )}

        {/* ======================================================
            MODAL 4: REMOVE STUDENT CONFIRMATION
        ====================================================== */}
        {removingStudentTarget && (
          <Modal
            isOpen={Boolean(removingStudentTarget)}
            onClose={() => setRemovingStudentTarget(null)}
            title="Remove Student from Batch?"
            badge="Cohort Unenrollment"
            maxWidth="md"
            footer={
              <>
                <button
                  type="button"
                  onClick={() => setRemovingStudentTarget(null)}
                  disabled={isRemovingStudent}
                  className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRemoveStudentConfirmed}
                  disabled={isRemovingStudent}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
                >
                  {isRemovingStudent ? "Removing..." : "Remove Student"}
                </button>
              </>
            }
          >
            <p className="text-sm text-stone-600">
              Are you sure you want to remove{" "}
              <strong className="font-semibold text-stone-900">
                {removingStudentTarget.studentName}
              </strong>{" "}
              from <strong className="font-semibold text-stone-900">{batch.name}</strong>?
            </p>
          </Modal>
        )}

        {/* ======================================================
            MODAL 5: SCHEDULE CONFLICT MODAL
        ====================================================== */}
        {conflictModal && (
          <Modal
            isOpen={Boolean(conflictModal)}
            onClose={() => setConflictModal(null)}
            title={conflictTitle(conflictModal.code)}
            badge="Schedule Conflict"
            maxWidth="2xl"
            footer={
              <button
                type="button"
                onClick={() => setConflictModal(null)}
                className="rounded-xl bg-orange-500 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-orange-600"
              >
                Understood
              </button>
            }
          >
            <div>
              <p className="text-sm font-medium text-stone-700 mb-4">
                {conflictModal.message}
              </p>

              {conflictModal.conflicts.length > 0 && (
                <div className="space-y-4">
                  {conflictModal.conflicts.map((conflict, index) => (
                    <div
                      key={`${conflict.existingBatchId || "conflict"}-${index}`}
                      className="rounded-2xl border border-stone-200 bg-white p-4"
                    >
                      {conflict.personName && (
                        <p className="mb-2 text-xs font-bold text-stone-900">
                          {conflict.personName}
                        </p>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2 text-xs">
                        <div className="rounded-xl border border-stone-100 bg-stone-50 p-3">
                          <p className="font-semibold text-stone-500 uppercase tracking-wider text-[10px]">
                            Existing Class
                          </p>
                          <p className="mt-1 font-bold text-stone-900">
                            {getConflictExistingLabel(conflict)}
                          </p>
                          <p className="mt-0.5 text-stone-600">
                            {conflict.existingDay || getDayName(conflict.existingDayOfWeek)}
                          </p>
                          <p className="mt-1 font-semibold text-red-600">
                            {formatTimeRange(
                              conflict.existingStartTime,
                              conflict.existingEndTime,
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-3">
                          <p className="font-semibold text-orange-600 uppercase tracking-wider text-[10px]">
                            Requested Class
                          </p>
                          <p className="mt-1 font-bold text-stone-900">
                            {getConflictRequestedLabel(conflict)}
                          </p>
                          <p className="mt-0.5 text-stone-600">
                            {conflict.newDay || getDayName(conflict.newDayOfWeek)}
                          </p>
                          <p className="mt-1 font-semibold text-orange-700">
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
            </div>
          </Modal>
        )}
      </div>
    </main>
  );
}
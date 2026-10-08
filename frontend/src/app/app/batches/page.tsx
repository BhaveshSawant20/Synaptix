"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Modal from "@/app/app/components/Modal";
import SortControl from "@/app/app/components/SortControl";
import WeeklyTimetable, { TimetableSchedule } from "@/app/app/components/WeeklyTimetable";
import { SortOption, sortRecords } from "@/lib/sorting";
import { API_URL, API_BASE } from "@/lib/api";

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
};

type BatchForm = {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
};

type ScheduleConflict = {
  type: "student" | "teacher" | "batch";
  personName?: string;
  studentId?: string;
  teacherId?: string;
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

const emptyForm: BatchForm = {
  name: "",
  description: "",
  startDate: "",
  endDate: "",
};

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

export default function BatchesPage() {
  const router = useRouter();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [form, setForm] = useState<BatchForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("alphabetical");

  // Tab View: List of Batches vs. Weekly Timetable view
  const [activeTab, setActiveTab] = useState<"list" | "timetable">("list");
  const [timetableBatchId, setTimetableBatchId] = useState<string>("");
  const [timetableTeacherId, setTimetableTeacherId] = useState<string>("");
  const [allSchedules, setAllSchedules] = useState<TimetableSchedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  // Dedicated Weekly Timetable Schedule Management
  const [allSubjects, setAllSubjects] = useState<
    Array<{ id: string; name: string; code?: string | null }>
  >([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] =
    useState<TimetableSchedule | null>(null);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleForm, setScheduleForm] = useState<{
    batchId: string;
    dayOfWeek: number | "";
    subjectId: string;
    teacherId: string;
    startTime: string;
    endTime: string;
    room: string;
  }>({
    batchId: "",
    dayOfWeek: "",
    subjectId: "",
    teacherId: "",
    startTime: "",
    endTime: "",
    room: "",
  });
  const [deletingSchedule, setDeletingSchedule] =
    useState<TimetableSchedule | null>(null);
  const [isDeletingSchedule, setIsDeletingSchedule] = useState(false);

  // Dedicated Delete Confirmation Modal state
  const [deletingBatch, setDeletingBatch] = useState<Batch | null>(null);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  // =========================
  // STUDENT ASSIGNMENT STATE
  // =========================

  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<
    BatchStudentAssignment[]
  >([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentActionLoading, setStudentActionLoading] = useState(false);
  const [studentError, setStudentError] = useState("");
  const [removingStudent, setRemovingStudent] = useState<{
    studentId: string;
    studentName: string;
  } | null>(null);

  // =========================
  // TEACHER ASSIGNMENT STATE
  // =========================

  const [isTeachersModalOpen, setIsTeachersModalOpen] = useState(false);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [assignedTeachers, setAssignedTeachers] = useState<
    BatchTeacherAssignment[]
  >([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [teacherActionLoading, setTeacherActionLoading] = useState(false);
  const [teacherError, setTeacherError] = useState("");
  const [removingTeacher, setRemovingTeacher] = useState<{
    teacherId: string;
    teacherName: string;
  } | null>(null);

  // =========================
  // COMMON
  // =========================

  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [conflictModal, setConflictModal] =
    useState<ConflictModalData | null>(null);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("synaptix_token")
      : null;

  // =========================
  // LOAD BATCHES
  // =========================

  async function loadBatches() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/batches`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load batches.");
      }

      const list: Batch[] = Array.isArray(data.batches) ? data.batches : [];
      setBatches(list);

      // Set default timetable batch if not already selected
      if (list.length > 0 && !timetableBatchId) {
        setTimetableBatchId(list[0].id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load batches."
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // LOAD SCHEDULES & TEACHERS & SUBJECTS FOR TIMETABLE
  // =========================

  async function loadAllSchedules() {
    try {
      setSchedulesLoading(true);
      const [schedulesRes, teachersRes, subjectsRes] = await Promise.all([
        fetch(`${API_BASE}/batch-schedules`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/teachers`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/subjects`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (
        schedulesRes.status === 401 ||
        teachersRes.status === 401 ||
        subjectsRes.status === 401
      ) {
        window.location.href = "/login";
        return;
      }

      const schedulesData = await schedulesRes.json();
      const teachersData = await teachersRes.json();
      const subjectsData = await subjectsRes.json();

      if (schedulesData.success) {
        setAllSchedules(
          Array.isArray(schedulesData.schedules) ? schedulesData.schedules : []
        );
      }
      if (teachersData.success) {
        setAllTeachers(
          Array.isArray(teachersData.teachers) ? teachersData.teachers : []
        );
      }
      if (subjectsData.success && Array.isArray(subjectsData.subjects)) {
        setAllSubjects(subjectsData.subjects);
      }
    } catch (err) {
      console.error("Failed to load schedules:", err);
    } finally {
      setSchedulesLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      window.location.href = "/login";
      return;
    }

    loadBatches();
    loadAllSchedules();
  }, []);

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

  // ============================================================
  // STUDENT ↔ BATCH
  // ============================================================

  async function loadStudentsForBatch(batch: Batch) {
    try {
      setStudentsLoading(true);
      setStudentError("");

      const [studentsResponse, assignedResponse] = await Promise.all([
        fetch(`${API_URL}/students`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),

        fetch(`${API_URL}/batches/${batch.id}/students`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (
        studentsResponse.status === 401 ||
        assignedResponse.status === 401
      ) {
        window.location.href = "/login";
        return;
      }

      const studentsData = await studentsResponse.json();
      const assignedData = await assignedResponse.json();

      if (!studentsResponse.ok || !studentsData.success) {
        throw new Error(
          studentsData.message || "Failed to load students."
        );
      }

      if (!assignedResponse.ok || !assignedData.success) {
        throw new Error(
          assignedData.message || "Failed to load assigned students."
        );
      }

      setAllStudents(
        Array.isArray(studentsData.students) ? studentsData.students : []
      );

      setAssignedStudents(
        Array.isArray(assignedData.students) ? assignedData.students : []
      );
    } catch (err) {
      setStudentError(
        err instanceof Error
          ? err.message
          : "Failed to load student information."
      );
    } finally {
      setStudentsLoading(false);
    }
  }

  function openStudentsModal(batch: Batch) {
    setSelectedBatch(batch);
    setSelectedStudentId("");
    setStudentSearch("");
    setStudentError("");
    setAssignedStudents([]);
    setAllStudents([]);
    setIsStudentsModalOpen(true);

    loadStudentsForBatch(batch);
  }

  function closeStudentsModal() {
    if (studentActionLoading) return;

    setIsStudentsModalOpen(false);
    setSelectedStudentId("");
    setStudentSearch("");
    setAssignedStudents([]);
    setAllStudents([]);
    setStudentError("");
  }

  async function handleAssignStudent(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selectedBatch || !selectedStudentId) {
      setStudentError("Please select a student.");
      return;
    }

    try {
      setStudentActionLoading(true);
      setStudentError("");

      const response = await fetch(
        `${API_URL}/batches/${selectedBatch.id}/students`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            studentId: selectedStudentId,
          }),
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok || !data.success) {
        if (response.status === 409 && showConflictModal(data)) {
          return;
        }

        throw new Error(
          data.message || "Failed to assign student to batch."
        );
      }

      setSelectedStudentId("");
      await loadStudentsForBatch(selectedBatch);
    } catch (err) {
      setStudentError(
        err instanceof Error
          ? err.message
          : "Failed to assign student to batch."
      );
    } finally {
      setStudentActionLoading(false);
    }
  }

  async function confirmRemoveStudent() {
    if (!selectedBatch || !removingStudent) return;

    try {
      setStudentActionLoading(true);
      setStudentError("");

      const response = await fetch(
        `${API_URL}/batches/${selectedBatch.id}/students/${removingStudent.studentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to remove student from batch."
        );
      }

      setRemovingStudent(null);
      await loadStudentsForBatch(selectedBatch);
    } catch (err) {
      setStudentError(
        err instanceof Error
          ? err.message
          : "Failed to remove student from batch."
      );
    } finally {
      setStudentActionLoading(false);
    }
  }

  // ============================================================
  // TEACHER ↔ BATCH
  // ============================================================

  async function loadTeachersForBatch(batch: Batch) {
    try {
      setTeachersLoading(true);
      setTeacherError("");

      const [teachersResponse, assignedResponse] = await Promise.all([
        fetch(`${API_URL}/teachers`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),

        fetch(`${API_URL}/batches/${batch.id}/teachers`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (
        teachersResponse.status === 401 ||
        assignedResponse.status === 401
      ) {
        window.location.href = "/login";
        return;
      }

      const teachersData = await teachersResponse.json();
      const assignedData = await assignedResponse.json();

      if (!teachersResponse.ok || !teachersData.success) {
        throw new Error(
          teachersData.message || "Failed to load teachers."
        );
      }

      if (!assignedResponse.ok || !assignedData.success) {
        throw new Error(
          assignedData.message || "Failed to load assigned teachers."
        );
      }

      setAllTeachers(
        Array.isArray(teachersData.teachers)
          ? teachersData.teachers
          : []
      );

      setAssignedTeachers(
        Array.isArray(assignedData.teachers)
          ? assignedData.teachers
          : []
      );
    } catch (err) {
      setTeacherError(
        err instanceof Error
          ? err.message
          : "Failed to load teacher information."
      );
    } finally {
      setTeachersLoading(false);
    }
  }

  function openTeachersModal(batch: Batch) {
    setSelectedBatch(batch);
    setSelectedTeacherId("");
    setTeacherError("");
    setAssignedTeachers([]);
    setAllTeachers([]);
    setIsTeachersModalOpen(true);

    loadTeachersForBatch(batch);
  }

  function closeTeachersModal() {
    if (teacherActionLoading) return;

    setIsTeachersModalOpen(false);
    setSelectedTeacherId("");
    setAssignedTeachers([]);
    setAllTeachers([]);
    setTeacherError("");
  }

  async function handleAssignTeacher(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selectedBatch || !selectedTeacherId) {
      setTeacherError("Please select a teacher.");
      return;
    }

    try {
      setTeacherActionLoading(true);
      setTeacherError("");

      const response = await fetch(
        `${API_URL}/batches/${selectedBatch.id}/teachers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            teacherId: selectedTeacherId,
          }),
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok || !data.success) {
        if (response.status === 409 && showConflictModal(data)) {
          return;
        }

        throw new Error(
          data.message || "Failed to assign teacher to batch."
        );
      }

      setSelectedTeacherId("");
      await loadTeachersForBatch(selectedBatch);
    } catch (err) {
      setTeacherError(
        err instanceof Error
          ? err.message
          : "Failed to assign teacher to batch."
      );
    } finally {
      setTeacherActionLoading(false);
    }
  }

  async function confirmRemoveTeacher() {
    if (!selectedBatch || !removingTeacher) return;

    try {
      setTeacherActionLoading(true);
      setTeacherError("");

      const response = await fetch(
        `${API_URL}/batches/${selectedBatch.id}/teachers/${removingTeacher.teacherId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to remove teacher from batch."
        );
      }

      setRemovingTeacher(null);
      await loadTeachersForBatch(selectedBatch);
    } catch (err) {
      setTeacherError(
        err instanceof Error
          ? err.message
          : "Failed to remove teacher from batch."
      );
    } finally {
      setTeacherActionLoading(false);
    }
  }

  // ============================================================
  // BATCH CRUD
  // ============================================================

  function openAddModal() {
    setEditingBatch(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setIsModalOpen(true);
  }

  function openEditModal(batch: Batch) {
    setEditingBatch(batch);

    setForm({
      name: batch.name || "",
      description: batch.description || "",
      startDate: batch.startDate
        ? batch.startDate.slice(0, 10)
        : "",
      endDate: batch.endDate
        ? batch.endDate.slice(0, 10)
        : "",
    });

    setError("");
    setSuccess("");
    setIsModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setIsModalOpen(false);
    setEditingBatch(null);
    setForm(emptyForm);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Batch name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      };

      const url = editingBatch
        ? `${API_URL}/batches/${editingBatch.id}`
        : `${API_URL}/batches`;

      const method = editingBatch ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to save batch."
        );
      }

      setSuccess(
        editingBatch
          ? "Batch updated successfully."
          : "Batch created successfully."
      );
      closeModal();
      await loadBatches();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save batch."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deletingBatch) return;

    try {
      setIsDeletingBatch(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_URL}/batches/${deletingBatch.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to delete batch."
        );
      }

      setSuccess(`Batch "${deletingBatch.name}" deleted successfully.`);
      setDeletingBatch(null);
      await loadBatches();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete batch."
      );
    } finally {
      setIsDeletingBatch(false);
    }
  }

  // ============================================================
  // FILTERING & ORDERING
  // ============================================================

  // Natural alphabetical/numeric sorting for Batches
  const sortedBatches = useMemo(() => {
    return sortRecords(
      batches,
      sortBy,
      (b) => b.name,
      (b) => b.createdAt
    );
  }, [batches, sortBy]);

  const filteredBatches = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return sortedBatches;

    return sortedBatches.filter((batch) => {
      return (
        batch.name.toLowerCase().includes(query) ||
        (batch.description || "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [sortedBatches, search]);

  const assignedStudentIds = useMemo(() => {
    return new Set(
      assignedStudents.map((item) => item.studentId)
    );
  }, [assignedStudents]);

  // Available students with rich search (Name, Student Code, Standard, School)
  const availableStudents = useMemo(() => {
    const unassigned = allStudents.filter(
      (student) => !assignedStudentIds.has(student.id)
    );

    const query = studentSearch.trim().toLowerCase();
    if (!query) return unassigned;

    return unassigned.filter((student) => {
      const name = student.name.toLowerCase();
      const code = (student.studentCode || "").toLowerCase();
      const standard = (student.standard?.name || "").toLowerCase();
      const school = (student.school?.name || "").toLowerCase();
      return (
        name.includes(query) ||
        code.includes(query) ||
        standard.includes(query) ||
        school.includes(query)
      );
    });
  }, [allStudents, assignedStudentIds, studentSearch]);

  const assignedTeacherIds = useMemo(() => {
    return new Set(
      assignedTeachers.map((item) => item.teacherId)
    );
  }, [assignedTeachers]);

  const availableTeachers = useMemo(() => {
    return allTeachers.filter(
      (teacher) => !assignedTeacherIds.has(teacher.id)
    );
  }, [allTeachers, assignedTeacherIds]);

  // Schedules filtered for the Weekly Timetable Tab
  const displayedSchedules = useMemo(() => {
    return allSchedules.filter((sched) => {
      if (timetableBatchId && sched.batchId !== timetableBatchId) {
        return false;
      }
      if (timetableTeacherId && sched.teacherId !== timetableTeacherId) {
        return false;
      }
      return true;
    });
  }, [allSchedules, timetableBatchId, timetableTeacherId]);

  function activeDateRange(batch: Batch) {
    if (!batch.startDate && !batch.endDate) {
      return "No dates set";
    }

    const start = batch.startDate
      ? new Date(batch.startDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

    const end = batch.endDate
      ? new Date(batch.endDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

    return `${start} → ${end}`;
  }

  function openAddScheduleModal() {
    setEditingSchedule(null);
    setScheduleError("");
    setScheduleForm({
      batchId: "",
      dayOfWeek: "",
      subjectId: "",
      teacherId: "",
      startTime: "",
      endTime: "",
      room: "",
    });
    setShowScheduleModal(true);
  }

  function openEditScheduleModal(schedule: TimetableSchedule) {
    setEditingSchedule(schedule);
    setScheduleError("");
    setScheduleForm({
      batchId: schedule.batchId,
      dayOfWeek: schedule.dayOfWeek,
      subjectId: schedule.subjectId || "",
      teacherId: schedule.teacherId || "",
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      room: schedule.room || "",
    });
    setShowScheduleModal(true);
  }

  async function handleSaveSchedule(e: React.FormEvent) {
    e.preventDefault();
    const currentToken = localStorage.getItem("synaptix_token");
    if (!currentToken) {
      window.location.href = "/login";
      return;
    }

    if (!scheduleForm.batchId) {
      setScheduleError("Please select a batch.");
      return;
    }
    if (
      scheduleForm.dayOfWeek === "" ||
      scheduleForm.dayOfWeek === undefined ||
      scheduleForm.dayOfWeek === null
    ) {
      setScheduleError("Please select a day.");
      return;
    }
    if (!scheduleForm.subjectId) {
      setScheduleError("Please select a subject.");
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
    if (scheduleForm.endTime <= scheduleForm.startTime) {
      setScheduleError("End time must be later than start time.");
      return;
    }

    try {
      setScheduleSaving(true);
      setScheduleError("");

      const payload = {
        batchId: scheduleForm.batchId,
        teacherId: scheduleForm.teacherId || null,
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
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (response.status === 409 && showConflictModal(data)) {
          setShowScheduleModal(false);
          return;
        }
        throw new Error(data.message || "Failed to save schedule.");
      }

      setShowScheduleModal(false);
      await loadAllSchedules();
    } catch (err) {
      console.error("Failed to save schedule:", err);
      setScheduleError(
        err instanceof Error ? err.message : "Failed to save schedule."
      );
    } finally {
      setScheduleSaving(false);
    }
  }

  async function handleDeleteSchedule() {
    if (!deletingSchedule) return;
    const currentToken = localStorage.getItem("synaptix_token");
    if (!currentToken) {
      window.location.href = "/login";
      return;
    }

    try {
      setIsDeletingSchedule(true);
      const response = await fetch(
        `${API_BASE}/batch-schedules/${deletingSchedule.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete schedule.");
      }

      setDeletingSchedule(null);
      await loadAllSchedules();
    } catch (err) {
      console.error("Failed to delete schedule:", err);
      alert(err instanceof Error ? err.message : "Failed to delete schedule.");
    } finally {
      setIsDeletingSchedule(false);
    }
  }

  return (
    <main className="w-full px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
              <span>◈</span>
              Coaching Operations
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
              Batches
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
              Create and manage coaching cohorts, weekly timetables, faculty assignments, and student rosters.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Switcher: Cohorts List vs Weekly Timetable */}
            <div className="inline-flex rounded-xl border border-stone-200 bg-white p-1 shadow-xs">
              <button
                type="button"
                onClick={() => setActiveTab("list")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  activeTab === "list"
                    ? "bg-orange-500 text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Cohorts List
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("timetable");
                  if (allSchedules.length === 0) loadAllSchedules();
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  activeTab === "timetable"
                    ? "bg-orange-500 text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <span>🗓</span>
                <span>Weekly Timetable</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {activeTab === "timetable" ? (
                <button
                  type="button"
                  onClick={() => openAddScheduleModal()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
                >
                  <span className="text-base leading-none">+</span>
                  <span>Add Class</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
                >
                  <span className="text-base leading-none">+</span>
                  <span>Add Batch</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Alerts */}
        {error &&
          !isModalOpen &&
          !isStudentsModalOpen &&
          !isTeachersModalOpen &&
          !deletingBatch && (
            <div className="mt-6 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                className="text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          )}

        {success && (
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700">
                ✓
              </span>
              <span>{success}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccess("")}
              className="text-emerald-500 hover:text-emerald-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* ============================================================
            TAB 1: COHORTS LIST VIEW
        ============================================================ */}
        {activeTab === "list" && (
          <>
            {/* Summary */}
            <section className="mt-8 grid gap-5 sm:grid-cols-2">
              <div className="glass rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                  Total Batches
                </p>

                <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
                  {batches.length}
                </p>

                <p className="mt-1 text-xs text-stone-400">
                  Active coaching cohorts
                </p>
              </div>

              <div className="glass rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                  Filtered Results
                </p>

                <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
                  {filteredBatches.length}
                </p>

                <p className="mt-1 text-xs text-stone-400">
                  Batches matching search criteria
                </p>
              </div>
            </section>

            {/* Search & Sort Controls */}
            <section className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                  ⌕
                </span>

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search batches by name or description..."
                  className="h-12 w-full rounded-2xl border border-stone-200 bg-white pl-11 pr-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 hover:border-stone-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <div className="flex shrink-0 items-center justify-end">
                <SortControl value={sortBy} onChange={setSortBy} />
              </div>
            </section>

            {/* Batches Table */}
            <section className="mt-7 overflow-hidden rounded-3xl border border-stone-200/70 bg-white/80 shadow-sm backdrop-blur-md">
              {loading ? (
                <div className="flex min-h-80 items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" />
                    <p className="mt-4 text-sm font-medium text-stone-500">
                      Loading batches...
                    </p>
                  </div>
                </div>
              ) : filteredBatches.length === 0 ? (
                <div className="flex min-h-80 items-center justify-center px-6">
                  <div className="max-w-md text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-2xl text-orange-500">
                      ◈
                    </div>

                    <h3 className="mt-5 text-lg font-semibold tracking-tight text-stone-900">
                      {search ? "No batches found" : "No batches yet"}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-stone-500">
                      {search
                        ? "Try refining your search terms or clearing the filter."
                        : "Create your first coaching batch to start assigning instructors, students, and schedules."}
                    </p>

                    {!search && (
                      <button
                        type="button"
                        onClick={openAddModal}
                        className="mt-5 inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0"
                      >
                        + Add Batch
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1150px]">
                    <thead>
                      <tr className="border-b border-stone-100 text-left">
                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                          Batch
                        </th>

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                          Description
                        </th>

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                          Duration
                        </th>

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                          Students
                        </th>

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                          Teachers
                        </th>

                        <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredBatches.map((batch) => (
                        <tr
                          key={batch.id}
                          className="border-b border-stone-100 transition duration-150 last:border-b-0 hover:bg-orange-50/30"
                        >
                          <td className="px-6 py-4">
                            <Link
                              href={`/app/batches/${batch.id}`}
                              className="group block"
                            >
                              <p className="text-sm font-semibold text-stone-900 transition duration-150 group-hover:text-orange-600">
                                {batch.name}
                              </p>
                              <p className="mt-0.5 font-mono text-xs text-stone-400">
                                ID: {batch.id.slice(0, 8)}...
                              </p>
                            </Link>
                          </td>

                          <td className="max-w-xs px-5 py-4">
                            <p className="truncate text-sm text-stone-600">
                              {batch.description || "—"}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-stone-600">
                              {activeDateRange(batch)}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => openStudentsModal(batch)}
                              className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-100 active:translate-y-0"
                            >
                              Manage Students
                            </button>
                          </td>

                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => openTeachersModal(batch)}
                              className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-100 active:translate-y-0"
                            >
                              Manage Teachers
                            </button>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/app/batches/${batch.id}`}
                                className="inline-flex items-center justify-center rounded-xl border border-orange-100 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-600 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-100 active:translate-y-0"
                              >
                                View Details →
                              </Link>

                              <button
                                type="button"
                                onClick={() => openEditModal(batch)}
                                className="rounded-xl border border-orange-200 bg-white px-3.5 py-2 text-xs font-semibold text-orange-700 transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 active:translate-y-0"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeletingBatch(batch)}
                                className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 transition duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-100 active:translate-y-0"
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
            </section>
          </>
        )}

        {/* ============================================================
            TAB 2: WEEKLY TIMETABLE VIEW
        ============================================================ */}
        {activeTab === "timetable" && (
          <section className="mt-8 space-y-6">
            {/* Modern Unified Timetable Control Toolbar */}
            <div className="flex flex-col gap-4 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                {/* Batch Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-stone-500">Batch:</span>
                  <select
                    value={timetableBatchId}
                    onChange={(e) => setTimetableBatchId(e.target.value)}
                    className="h-9 min-w-[200px] rounded-xl border border-stone-200 bg-stone-50/70 px-3 text-xs font-semibold text-stone-800 outline-none transition hover:bg-white focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                  >
                    <option value="">All Batches</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Teacher Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-stone-500">Teacher:</span>
                  <select
                    value={timetableTeacherId}
                    onChange={(e) => setTimetableTeacherId(e.target.value)}
                    className="h-9 min-w-[180px] rounded-xl border border-stone-200 bg-stone-50/70 px-3 text-xs font-semibold text-stone-800 outline-none transition hover:bg-white focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                  >
                    <option value="">All Teachers</option>
                    {allTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.specialization ? `(${t.specialization})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reset filters button */}
                {(timetableBatchId || timetableTeacherId) && (
                  <button
                    type="button"
                    onClick={() => {
                      setTimetableBatchId("");
                      setTimetableTeacherId("");
                    }}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              {/* Status Pill & Batch Details Link */}
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 border border-orange-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  {displayedSchedules.length} {displayedSchedules.length === 1 ? "class" : "classes"} scheduled
                </span>

                {timetableBatchId && (
                  <Link
                    href={`/app/batches/${timetableBatchId}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline transition"
                  >
                    <span>Batch Profile</span>
                    <span>→</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Timetable Grid Component */}
            {schedulesLoading ? (
              <div className="flex min-h-80 items-center justify-center rounded-3xl border border-stone-200 bg-white">
                <div className="text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" />
                  <p className="mt-4 text-sm font-medium text-stone-500">
                    Loading timetable schedules...
                  </p>
                </div>
              </div>
            ) : (
              <WeeklyTimetable
                schedules={displayedSchedules}
                onAddSchedule={() => openAddScheduleModal()}
                onEditSchedule={openEditScheduleModal}
                onDeleteSchedule={(sched) => setDeletingSchedule(sched)}
                showBatchName={!timetableBatchId}
                showTeacherName={!timetableTeacherId}
                title={
                  timetableBatchId
                    ? `${batches.find((b) => b.id === timetableBatchId)?.name || "Batch"} — Weekly Timetable`
                    : "Coaching Timetable Overview"
                }
                subtitle="Weekly class hours, subjects, instructors, and room allocation."
                emptyMessage="No classes scheduled for the selected batch or filter."
                readOnly={false}
              />
            )}
          </section>
        )}

        {/* ======================================================
            ADD / EDIT BATCH MODAL (CHANGE 2: FIXED MODAL)
        ====================================================== */}
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={editingBatch ? "Edit Batch" : "Add Batch"}
          badge="Cohort Management"
          description={
            editingBatch
              ? "Update the cohort's duration and description."
              : "Configure a new coaching batch for students and teachers."
          }
          maxWidth="xl"
          footer={
            <>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                form="batch-form"
                disabled={saving}
                className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-150 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingBatch
                    ? "Save Changes"
                    : "Create Batch"}
              </button>
            </>
          }
        >
          <form id="batch-form" onSubmit={handleSubmit}>
            {error && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-stone-700">
                  Batch Name *
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. Batch 1 — Standard 8"
                  className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700">
                  Description
                </label>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Brief overview or target goals for this cohort"
                  rows={3}
                  className="mt-2 w-full resize-none rounded-xl border border-stone-200 bg-white p-3.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-stone-700">
                    Start Date
                  </label>

                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        startDate: event.target.value,
                      }))
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700">
                    End Date
                  </label>

                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        endDate: event.target.value,
                      }))
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>
              </div>
            </div>
          </form>
        </Modal>

        {/* ======================================================
            MANAGE STUDENTS MODAL (CHANGE 3: IMPROVED ENROLLMENT)
        ====================================================== */}
        {selectedBatch && (
          <Modal
            isOpen={isStudentsModalOpen}
            onClose={closeStudentsModal}
            title={`${selectedBatch.name} — Students`}
            badge="Cohort Roster"
            description="Assign and manage student enrollment for this coaching batch."
            maxWidth="3xl"
          >
            <div>
              {studentError && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {studentError}
                </div>
              )}

              {/* ENROLL STUDENT PANEL */}
              <div className="rounded-3xl border border-orange-100 bg-orange-50/50 p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-700">
                    Enroll Student
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    Select a student from your institute directory. Search by name, ID, or standard.
                  </p>
                </div>

                {/* Enrollment Search */}
                <div className="mt-3">
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search available students by name, ID, or standard..."
                    className="h-10 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-xs text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                <form
                  onSubmit={handleAssignStudent}
                  className="mt-3 flex flex-col gap-3 sm:flex-row"
                >
                  <select
                    value={selectedStudentId}
                    onChange={(event) =>
                      setSelectedStudentId(event.target.value)
                    }
                    disabled={
                      studentsLoading ||
                      studentActionLoading ||
                      availableStudents.length === 0
                    }
                    className="h-11 min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-4 text-xs font-medium text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-stone-100"
                  >
                    <option value="">
                      {studentsLoading
                        ? "Loading students..."
                        : availableStudents.length === 0
                          ? studentSearch
                            ? "No matching un-enrolled students"
                            : "All students are already enrolled"
                          : "Select student to enroll..."}
                    </option>

                    {availableStudents.map((student) => {
                      const idLabel = student.studentCode || `STU-${student.id.slice(0, 5)}`;
                      const stdLabel = student.standard?.name || "Standard Unassigned";
                      return (
                        <option key={student.id} value={student.id}>
                          {student.name} — Student ID: {idLabel} — Standard: {stdLabel}
                        </option>
                      );
                    })}
                  </select>

                  <button
                    type="submit"
                    disabled={
                      studentsLoading ||
                      studentActionLoading ||
                      !selectedStudentId
                    }
                    className="shrink-0 rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-orange-200 transition duration-150 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {studentActionLoading ? "Adding..." : "+ Enroll Student"}
                  </button>
                </form>

                {/* Selected Student Preview badge */}
                {selectedStudentId && (() => {
                  const s = allStudents.find((st) => st.id === selectedStudentId);
                  if (!s) return null;
                  return (
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-white p-2.5 text-xs border border-orange-200">
                      <span className="font-bold text-stone-900">{s.name}</span>
                      <span className="text-stone-400">•</span>
                      <span className="font-mono text-stone-600">ID: {s.studentCode || `STU-${s.id.slice(0, 5)}`}</span>
                      <span className="text-stone-400">•</span>
                      <span className="font-medium text-orange-700">Standard: {s.standard?.name || "Unassigned"}</span>
                      {s.school?.name && (
                        <>
                          <span className="text-stone-400">•</span>
                          <span className="text-stone-500">{s.school.name}</span>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* ENROLLED STUDENTS LIST (CHANGE 3 TABLE FORMAT) */}
              <div className="mt-7">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                      Enrolled Students
                    </p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {assignedStudents.length} student{assignedStudents.length === 1 ? "" : "s"} enrolled
                    </p>
                  </div>

                  <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                    {assignedStudents.length}
                  </span>
                </div>

                {studentsLoading ? (
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-8 text-center">
                    <div className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" />
                    <p className="mt-3 text-sm text-stone-500">
                      Loading student records...
                    </p>
                  </div>
                ) : assignedStudents.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 p-8 text-center">
                    <p className="text-sm font-semibold text-stone-700">
                      No students enrolled yet
                    </p>
                    <p className="mt-1 text-xs text-stone-400">
                      Use the selector above to enroll students into this cohort.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-stone-100 bg-stone-50/70 text-stone-500">
                          <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                            Student
                          </th>
                          <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                            Student ID
                          </th>
                          <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                            Standard
                          </th>
                          <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                            School
                          </th>
                          <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {assignedStudents.map((assignment) => {
                          const student = assignment.student;
                          return (
                            <tr
                              key={assignment.id}
                              className="transition hover:bg-orange-50/30"
                            >
                              <td className="px-4 py-3">
                                <p className="font-bold text-stone-900">
                                  {student.name}
                                </p>
                              </td>
                              <td className="px-4 py-3 font-mono text-stone-600">
                                {student.studentCode || `STU-${student.id.slice(0, 5)}`}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex rounded-lg bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">
                                  {student.standard?.name || "Unassigned"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-stone-600">
                                {student.school?.name || "—"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRemovingStudent({
                                      studentId: student.id,
                                      studentName: student.name,
                                    })
                                  }
                                  disabled={studentActionLoading}
                                  className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </Modal>
        )}

        {/* ======================================================
            MANAGE TEACHERS MODAL
        ====================================================== */}
        {selectedBatch && (
          <Modal
            isOpen={isTeachersModalOpen}
            onClose={closeTeachersModal}
            title={`${selectedBatch.name} — Teachers`}
            badge="Faculty Allocation"
            description="Assign and manage teaching faculty for this coaching batch."
            maxWidth="3xl"
          >
            <div>
              {teacherError && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {teacherError}
                </div>
              )}

              <div className="rounded-3xl border border-orange-100 bg-orange-50/50 p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-700">
                    Assign Faculty
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    Select an instructor to allocate to this batch.
                  </p>
                </div>

                <form
                  onSubmit={handleAssignTeacher}
                  className="mt-3 flex flex-col gap-3 sm:flex-row"
                >
                  <select
                    value={selectedTeacherId}
                    onChange={(event) =>
                      setSelectedTeacherId(event.target.value)
                    }
                    disabled={
                      teachersLoading ||
                      teacherActionLoading ||
                      availableTeachers.length === 0
                    }
                    className="h-11 min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-stone-100"
                  >
                    <option value="">
                      {teachersLoading
                        ? "Loading instructors..."
                        : availableTeachers.length === 0
                          ? "All teachers already assigned"
                          : "Select instructor to assign"}
                    </option>

                    {availableTeachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}
                        {teacher.specialization ? ` — ${teacher.specialization}` : ""}
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    disabled={
                      teachersLoading ||
                      teacherActionLoading ||
                      !selectedTeacherId
                    }
                    className="rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-orange-200 transition duration-150 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {teacherActionLoading ? "Assigning..." : "+ Assign Teacher"}
                  </button>
                </form>
              </div>

              <div className="mt-7">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                      Assigned Instructors
                    </p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {assignedTeachers.length} instructor{assignedTeachers.length === 1 ? "" : "s"} allocated
                    </p>
                  </div>

                  <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                    {assignedTeachers.length}
                  </span>
                </div>

                {teachersLoading ? (
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-8 text-center">
                    <div className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" />
                    <p className="mt-3 text-sm text-stone-500">
                      Loading teacher records...
                    </p>
                  </div>
                ) : assignedTeachers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 p-8 text-center">
                    <p className="text-sm font-semibold text-stone-700">
                      No instructors assigned
                    </p>
                    <p className="mt-1 text-xs text-stone-400">
                      Use the selector above to assign instructors to this cohort.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {assignedTeachers.map((assignment) => {
                      const teacher = assignment.teacher;

                      return (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-stone-100 bg-stone-50/70 p-3.5 transition duration-150 hover:bg-orange-50/30"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-xs font-bold text-orange-700">
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

                          <button
                            type="button"
                            onClick={() =>
                              setRemovingTeacher({
                                teacherId: teacher.id,
                                teacherName: teacher.name,
                              })
                            }
                            disabled={teacherActionLoading}
                            className="rounded-xl border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </Modal>
        )}

        {/* ======================================================
            SCHEDULE CONFLICT MODAL
        ====================================================== */}
        {conflictModal && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-stone-950/50 px-4 py-6 backdrop-blur-sm lg:pl-72"
            role="dialog"
            aria-modal="true"
          >
            <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-red-100 bg-white shadow-2xl">
              <div className="border-b border-red-100 bg-red-50/80 p-6 sm:p-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-xl font-bold text-red-600">
                    ⚠
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-600">
                      Schedule Conflict Detected
                    </p>

                    <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
                      {conflictModal.code === "STUDENT_SCHEDULE_CONFLICT"
                        ? "Student Schedule Overlap"
                        : conflictModal.code === "TEACHER_SCHEDULE_CONFLICT"
                          ? "Teacher Schedule Overlap"
                          : "Batch Schedule Overlap"}
                    </h2>

                    <p className="mt-1 text-sm text-stone-600">
                      {conflictModal.code === "STUDENT_SCHEDULE_CONFLICT"
                        ? "This student is already committed to another batch with overlapping timings."
                        : conflictModal.code === "TEACHER_SCHEDULE_CONFLICT"
                          ? "This teacher is scheduled to instruct another cohort during this exact time slot."
                          : "This batch already has a class scheduled at an overlapping timing."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setConflictModal(null)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition hover:bg-stone-50"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="max-h-[calc(90vh-230px)] overflow-y-auto p-6 sm:p-7">
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-sm font-medium leading-6 text-stone-700">
                    {conflictModal.message}
                  </p>
                </div>

                {conflictModal.conflicts.length > 0 && (
                  <div className="mt-5 space-y-4">
                    {conflictModal.conflicts.map((conflict, index) => (
                      <div
                        key={`${conflict.type}-${index}`}
                        className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
                      >
                        {conflict.personName && (
                          <p className="mb-3 text-sm font-semibold text-stone-900">
                            {conflict.personName}
                          </p>
                        )}

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-500">
                              Existing Schedule
                            </p>

                            <p className="mt-2 text-sm font-bold text-stone-900">
                              {conflict.existingBatchName || "Existing batch"}
                            </p>

                            <p className="mt-1 text-xs text-stone-600">
                              {conflict.existingDay || "Scheduled day"}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-stone-700">
                              {conflict.existingStartTime || "—"} – {conflict.existingEndTime || "—"}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-600">
                              Requested Schedule
                            </p>

                            <p className="mt-2 text-sm font-bold text-stone-900">
                              {conflict.newBatchName || selectedBatch?.name || "New batch"}
                            </p>

                            <p className="mt-1 text-xs text-stone-600">
                              {conflict.newDay || "Scheduled day"}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-stone-700">
                              {conflict.newStartTime || "—"} – {conflict.newEndTime || "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-orange-800">
                    Synaptix Conflict Rule
                  </p>
                  <p className="mt-1 text-xs leading-5 text-stone-600">
                    Students and teachers can belong to multiple batches, but their timings cannot overlap. Consecutive classes (e.g. 4:00–5:00 PM and 5:00–6:00 PM) are permitted.
                  </p>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setConflictModal(null)}
                    className="rounded-xl bg-orange-500 px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600"
                  >
                    Understood
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================
            DELETE BATCH CONFIRMATION MODAL
        ====================================================== */}
        {deletingBatch && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-sm lg:pl-72"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !isDeletingBatch) setDeletingBatch(null);
            }}
          >
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-red-100 bg-white p-6 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-xl font-bold text-red-600">
                  ⚠
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-stone-900">
                    Delete Batch
                  </h3>
                  <p className="mt-0.5 text-xs text-stone-500">
                    Permanent cohort removal
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-stone-600">
                Are you sure you want to delete{" "}
                <strong className="font-semibold text-stone-900">
                  {deletingBatch.name}
                </strong>
                ? This will unassign all students, instructors, and timetables linked to this cohort.
              </p>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingBatch(null)}
                  disabled={isDeletingBatch}
                  className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-xs font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDeleteConfirmed}
                  disabled={isDeletingBatch}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-red-200 transition duration-150 hover:bg-red-700 disabled:opacity-60"
                >
                  {isDeletingBatch ? "Deleting..." : "Delete Batch"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================
            REMOVE STUDENT FROM BATCH CONFIRMATION MODAL
        ====================================================== */}
        {removingStudent && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-sm lg:pl-72"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !studentActionLoading) setRemovingStudent(null);
            }}
          >
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-red-100 bg-white p-6 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-xl font-bold text-red-600">
                  ⚠
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-stone-900">
                    Remove Student
                  </h3>
                  <p className="mt-0.5 text-xs text-stone-500">
                    Cohort unenrollment
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-stone-600">
                Are you sure you want to remove{" "}
                <strong className="font-semibold text-stone-900">
                  {removingStudent.studentName}
                </strong>{" "}
                from <strong className="font-semibold text-stone-900">{selectedBatch?.name}</strong>?
              </p>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRemovingStudent(null)}
                  disabled={studentActionLoading}
                  className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-xs font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmRemoveStudent}
                  disabled={studentActionLoading}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-red-200 transition duration-150 hover:bg-red-700 disabled:opacity-60"
                >
                  {studentActionLoading ? "Removing..." : "Remove Student"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================
            REMOVE TEACHER FROM BATCH CONFIRMATION MODAL
        ====================================================== */}
        {removingTeacher && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-sm lg:pl-72"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !teacherActionLoading) setRemovingTeacher(null);
            }}
          >
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-red-100 bg-white p-6 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-xl font-bold text-red-600">
                  ⚠
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-stone-900">
                    Unassign Teacher
                  </h3>
                  <p className="mt-0.5 text-xs text-stone-500">
                    Faculty reallocation
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-stone-600">
                Are you sure you want to unassign{" "}
                <strong className="font-semibold text-stone-900">
                  {removingTeacher.teacherName}
                </strong>{" "}
                from <strong className="font-semibold text-stone-900">{selectedBatch?.name}</strong>?
              </p>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRemovingTeacher(null)}
                  disabled={teacherActionLoading}
                  className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-xs font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmRemoveTeacher}
                  disabled={teacherActionLoading}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-red-200 transition duration-150 hover:bg-red-700 disabled:opacity-60"
                >
                  {teacherActionLoading ? "Unassigning..." : "Unassign Teacher"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================
            ADD / EDIT TIMETABLE CLASS MODAL
        ====================================================== */}
        <Modal
          isOpen={showScheduleModal}
          onClose={() => {
            if (!scheduleSaving) setShowScheduleModal(false);
          }}
          title={editingSchedule ? "Edit Timetable Class" : "Add Timetable Class"}
          badge="Weekly Timetable"
          description={
            editingSchedule
              ? "Update class timing, subject, assigned instructor, or room."
              : "Schedule a recurring weekly class session for this cohort."
          }
          maxWidth="xl"
          footer={
            <>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                disabled={scheduleSaving}
                className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="timetable-class-form"
                disabled={scheduleSaving || batches.length === 0}
                className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-150 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 disabled:opacity-60"
              >
                {scheduleSaving
                  ? "Saving..."
                  : editingSchedule
                    ? "Save Changes"
                    : "Add Class"}
              </button>
            </>
          }
        >
          <form
            id="timetable-class-form"
            onSubmit={handleSaveSchedule}
            className="space-y-4"
          >
            {scheduleError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
                {scheduleError}
              </div>
            )}

            {/* Batch Selector */}
            <div>
              <label className="text-xs font-semibold text-stone-700">
                Batch *
              </label>
              <select
                value={scheduleForm.batchId}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, batchId: e.target.value })
                }
                required
                className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm font-medium text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="" disabled>
                  Select a Batch
                </option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Day of Week */}
            <div>
              <label className="text-xs font-semibold text-stone-700">
                Day *
              </label>
              <select
                value={scheduleForm.dayOfWeek}
                onChange={(e) =>
                  setScheduleForm({
                    ...scheduleForm,
                    dayOfWeek: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                required
                className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm font-medium text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="" disabled>
                  Select a Day
                </option>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
              </select>
            </div>

            {/* Subject & Teacher Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-stone-700">
                  Subject *
                </label>
                <select
                  value={scheduleForm.subjectId}
                  onChange={(e) =>
                    setScheduleForm({
                      ...scheduleForm,
                      subjectId: e.target.value,
                    })
                  }
                  required
                  className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm font-medium text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="" disabled>
                    Select a Subject
                  </option>
                  {allSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700">
                  Teacher *
                </label>
                <select
                  value={scheduleForm.teacherId}
                  onChange={(e) =>
                    setScheduleForm({
                      ...scheduleForm,
                      teacherId: e.target.value,
                    })
                  }
                  required
                  className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm font-medium text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="" disabled>
                    Select a Teacher
                  </option>
                  {allTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.specialization ? `(${t.specialization})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-stone-700">
                  Start Time *
                </label>
                <select
                  value={scheduleForm.startTime}
                  onChange={(e) =>
                    setScheduleForm({
                      ...scheduleForm,
                      startTime: e.target.value,
                    })
                  }
                  required
                  className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm font-medium text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
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
                <label className="text-xs font-semibold text-stone-700">
                  End Time *
                </label>
                <select
                  value={scheduleForm.endTime}
                  onChange={(e) =>
                    setScheduleForm({
                      ...scheduleForm,
                      endTime: e.target.value,
                    })
                  }
                  required
                  className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm font-medium text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
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
            </div>

            {/* Room */}
            <div>
              <label className="text-xs font-semibold text-stone-700">
                Classroom / Room (Optional)
              </label>
              <input
                type="text"
                value={scheduleForm.room}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, room: e.target.value })
                }
                placeholder="e.g. Room 101, Lab B, Main Hall"
                className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm font-medium text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 placeholder:text-stone-400"
              />
            </div>
          </form>
        </Modal>

        {/* ======================================================
            DELETE TIMETABLE CLASS CONFIRMATION MODAL
        ====================================================== */}
        {deletingSchedule && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-sm lg:pl-72"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !isDeletingSchedule) {
                setDeletingSchedule(null);
              }
            }}
          >
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-red-100 bg-white p-6 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-xl font-bold text-red-600">
                  ⚠
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-stone-900">
                    Delete Timetable Class
                  </h3>
                  <p className="mt-0.5 text-xs text-stone-500">
                    Permanent schedule removal
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-stone-600">
                Are you sure you want to remove this class schedule (
                <strong className="font-semibold text-stone-900">
                  {deletingSchedule.subject?.name || "Class"}
                </strong>
                , {deletingSchedule.startTime} – {deletingSchedule.endTime})?
              </p>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingSchedule(null)}
                  disabled={isDeletingSchedule}
                  className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-xs font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDeleteSchedule}
                  disabled={isDeletingSchedule}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-red-200 transition duration-150 hover:bg-red-700 disabled:opacity-60"
                >
                  {isDeletingSchedule ? "Deleting..." : "Delete Class"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { API_BASE } from "@/lib/api";

type Exam = {
  id: string;
  name: string;
  academicYear?: string | null;
};

type Subject = {
  id: string;
  name: string;
  code?: string | null;
};

type ExamSchedule = {
  id: string;
  examId: string;
  subjectId: string;
  examDate: string;
  startTime?: string | null;
  endTime?: string | null;
  totalMarks?: number | null;
  syllabusNote?: string | null;
  exam?: Exam | null;
  subject?: Subject | null;
};

type ScheduleForm = {
  examId: string;
  subjectId: string;
  examDate: string;
  startTime: string;
  endTime: string;
  totalMarks: string;
  syllabusNote: string;
};

const emptyForm: ScheduleForm = {
  examId: "",
  subjectId: "",
  examDate: "",
  startTime: "",
  endTime: "",
  totalMarks: "",
  syllabusNote: "",
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("synaptix_token") || "";
}

export default function ExamSchedulesPage() {
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] =
    useState<ExamSchedule | null>(null);
  const [deleteSchedule, setDeleteSchedule] =
    useState<ExamSchedule | null>(null);

  const [form, setForm] = useState<ScheduleForm>(emptyForm);

  async function handleUnauthorized() {
    localStorage.removeItem("synaptix_token");
    window.location.href = "/login";
  }

  async function fetchData() {
    try {
      setLoading(true);
      setError("");

      const token = getToken();
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const [scheduleResponse, examResponse, subjectResponse] =
        await Promise.all([
          fetch(`${API_BASE}/exam-schedules`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_BASE}/exams`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_BASE}/subjects`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

      if (
        scheduleResponse.status === 401 ||
        examResponse.status === 401 ||
        subjectResponse.status === 401
      ) {
        await handleUnauthorized();
        return;
      }

      const scheduleData = await scheduleResponse.json();
      const examData = await examResponse.json();
      const subjectData = await subjectResponse.json();

      if (!scheduleResponse.ok) {
        throw new Error(
          scheduleData.message || "Failed to fetch exam schedules"
        );
      }

      if (!examResponse.ok) {
        throw new Error(examData.message || "Failed to fetch exams");
      }

      if (!subjectResponse.ok) {
        throw new Error(
          subjectData.message || "Failed to fetch subjects"
        );
      }

      setSchedules(scheduleData.schedules || []);
      setExams(examData.exams || []);
      setSubjects(subjectData.subjects || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const filteredSchedules = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return schedules;
    }

    return schedules.filter((schedule) => {
      const searchableText = [
        schedule.exam?.name || "",
        schedule.exam?.academicYear || "",
        schedule.subject?.name || "",
        schedule.subject?.code || "",
        schedule.syllabusNote || "",
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [schedules, search]);

  function openCreateModal() {
    setEditingSchedule(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setIsModalOpen(true);
  }

  function openEditModal(schedule: ExamSchedule) {
    setEditingSchedule(schedule);

    setForm({
      examId: schedule.examId || "",
      subjectId: schedule.subjectId || "",
      examDate: toLocalDate(schedule.examDate),
      startTime: toLocalTime(schedule.startTime),
      endTime: toLocalTime(schedule.endTime),
      totalMarks:
        schedule.totalMarks !== null &&
        schedule.totalMarks !== undefined
          ? String(schedule.totalMarks)
          : "",
      syllabusNote: schedule.syllabusNote || "",
    });

    setError("");
    setSuccess("");
    setIsModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setIsModalOpen(false);
    setEditingSchedule(null);
    setForm(emptyForm);
  }

  function openDeleteModal(schedule: ExamSchedule) {
    setDeleteSchedule(schedule);
    setError("");
    setSuccess("");
  }

  function closeDeleteModal() {
    if (deleting) return;
    setDeleteSchedule(null);
  }

  function updateForm(
    field: keyof ScheduleForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function toLocalDate(value?: string | null) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function toLocalTime(value?: string | null) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
  }

  function combineDateAndTime(
    date: string,
    time: string
  ): string | null {
    if (!time) return null;

    return new Date(`${date}T${time}`).toISOString();
  }

  function formatDate(value?: string | null) {
    if (!value) return "Not scheduled";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not scheduled";
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatTime(value?: string | null) {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  function getDuration(
    start?: string | null,
    end?: string | null
  ) {
    if (!start || !end) return null;

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      return null;
    }

    const difference =
      endDate.getTime() - startDate.getTime();

    if (difference <= 0) return null;

    const totalMinutes = Math.round(
      difference / (1000 * 60)
    );

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
      return `${minutes} min`;
    }

    if (minutes === 0) {
      return `${hours} hr`;
    }

    return `${hours} hr ${minutes} min`;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!form.examId) {
      setError("Please select an exam.");
      return;
    }

    if (!form.subjectId) {
      setError("Please select a subject.");
      return;
    }

    if (!form.examDate) {
      setError("Exam date is required.");
      return;
    }

    if (
      form.totalMarks &&
      Number.isNaN(Number(form.totalMarks))
    ) {
      setError("Total marks must be a valid number.");
      return;
    }

    if (
      form.startTime &&
      form.endTime &&
      form.endTime <= form.startTime
    ) {
      setError("End time must be after start time.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const token = getToken();
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const payload = {
        examId: form.examId,
        subjectId: form.subjectId,
        examDate: new Date(
          `${form.examDate}T00:00:00`
        ).toISOString(),
        startTime: combineDateAndTime(
          form.examDate,
          form.startTime
        ),
        endTime: combineDateAndTime(
          form.examDate,
          form.endTime
        ),
        totalMarks: form.totalMarks
          ? Number(form.totalMarks)
          : null,
        syllabusNote: form.syllabusNote.trim() || null,
      };

      const url = editingSchedule
        ? `${API_BASE}/exam-schedules/${editingSchedule.id}`
        : `${API_BASE}/exam-schedules`;

      const method = editingSchedule ? "PUT" : "POST";

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
        await handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to save exam schedule"
        );
      }

      setSuccess(
        editingSchedule
          ? "Exam schedule updated successfully."
          : "Exam schedule created successfully."
      );

      setIsModalOpen(false);
      setEditingSchedule(null);
      setForm(emptyForm);

      await fetchData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save exam schedule"
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteSchedule) return;

    try {
      setDeleting(true);
      setError("");
      setSuccess("");

      const token = getToken();
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch(
        `${API_BASE}/exam-schedules/${deleteSchedule.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to delete exam schedule"
        );
      }

      setDeleteSchedule(null);
      setSuccess("Exam schedule deleted successfully.");

      await fetchData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete exam schedule"
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Academics
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Exam Schedules
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
              Schedule examinations with dates, timings, marks, and syllabus guidelines for academic planning.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
          >
            <span>+</span> Add Schedule
          </button>
        </div>

        {/* Alerts */}
        {error && !isModalOpen && !deleteSchedule && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && !isModalOpen && !deleteSchedule && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {success}
          </div>
        )}

        {/* Summary Stat Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              Total Schedules
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
              {schedules.length}
            </p>
          </div>

          <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              Exams Covered
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
              {new Set(
                schedules.map((schedule) => schedule.examId)
              ).size}
            </p>
          </div>

          <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              With Timing
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
              {
                schedules.filter(
                  (schedule) =>
                    schedule.startTime || schedule.endTime
                ).length
              }
            </p>
          </div>

          <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              With Syllabus Notes
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
              {
                schedules.filter(
                  (schedule) =>
                    Boolean(schedule.syllabusNote)
                ).length
              }
            </p>
          </div>
        </div>

        {/* Main Content Container */}
        <div className="glass overflow-hidden rounded-2xl border border-stone-200/70">
          <div className="flex flex-col gap-4 border-b border-stone-200/70 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-stone-900">
                Scheduled Examinations
              </h2>

              <p className="mt-1 text-sm text-stone-500">
                {filteredSchedules.length} schedule
                {filteredSchedules.length === 1 ? "" : "s"} shown
              </p>
            </div>

            <div className="w-full lg:w-80">
              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search schedules..."
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500" />

              <p className="mt-4 text-sm text-stone-500">
                Loading exam schedules...
              </p>
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="p-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100/70 text-2xl">
                📅
              </div>

              <h3 className="mt-5 text-lg font-semibold tracking-tight text-stone-900">
                No exam schedules found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500">
                {search
                  ? "Try changing your search term."
                  : "Create a schedule timetable entry for an existing examination."}
              </p>

              {!search && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-6 inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0"
                >
                  + Add Schedule
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-stone-200/80 bg-stone-50/50">
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Exam
                      </th>

                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Subject
                      </th>

                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Date
                      </th>

                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Timing
                      </th>

                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Marks
                      </th>

                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Syllabus Note
                      </th>

                      <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredSchedules.map((schedule) => {
                      const start = formatTime(
                        schedule.startTime
                      );
                      const end = formatTime(schedule.endTime);
                      const duration = getDuration(
                        schedule.startTime,
                        schedule.endTime
                      );

                      return (
                        <tr
                          key={schedule.id}
                          className="border-b border-stone-100 transition duration-150 last:border-b-0 hover:bg-orange-50/30"
                        >
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-semibold text-stone-900">
                                {schedule.exam?.name ||
                                  "Unknown exam"}
                              </p>

                              {schedule.exam?.academicYear && (
                                <p className="mt-0.5 text-xs text-stone-400">
                                  {
                                    schedule.exam
                                      .academicYear
                                  }
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-semibold text-stone-900">
                                {schedule.subject?.name ||
                                  "Unknown subject"}
                              </p>

                              {schedule.subject?.code && (
                                <p className="mt-0.5 text-xs text-stone-400">
                                  {schedule.subject.code}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                              {formatDate(
                                schedule.examDate
                              )}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            {start || end ? (
                              <div>
                                <p className="text-sm font-medium text-stone-800">
                                  {start || "—"}{" "}
                                  {end && `– ${end}`}
                                </p>

                                {duration && (
                                  <p className="mt-0.5 text-xs text-stone-400">
                                    {duration}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-stone-400">
                                Not specified
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold text-stone-700">
                              {schedule.totalMarks ??
                                "—"}
                            </span>
                          </td>

                          <td className="max-w-[220px] px-6 py-4">
                            <p className="line-clamp-2 text-xs leading-relaxed text-stone-500">
                              {schedule.syllabusNote ||
                                "No syllabus note"}
                            </p>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  openEditModal(schedule)
                                }
                                className="rounded-xl border border-orange-200 bg-white px-3.5 py-2 text-xs font-semibold text-orange-700 transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 active:translate-y-0"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openDeleteModal(schedule)
                                }
                                className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 transition duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-100 active:translate-y-0"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="space-y-4 p-4 lg:hidden">
                {filteredSchedules.map((schedule) => {
                  const start = formatTime(
                    schedule.startTime
                  );
                  const end = formatTime(schedule.endTime);
                  const duration = getDuration(
                    schedule.startTime,
                    schedule.endTime
                  );

                  return (
                    <div
                      key={schedule.id}
                      className="rounded-xl border border-stone-200/80 bg-white/70 p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-stone-900">
                            {schedule.exam?.name ||
                              "Unknown exam"}
                          </p>

                          <p className="mt-0.5 text-xs text-stone-500">
                            {schedule.subject?.name ||
                              "Unknown subject"}
                          </p>
                        </div>

                        <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                          {formatDate(
                            schedule.examDate
                          )}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                            Timing
                          </p>

                          <p className="mt-1 text-sm font-medium text-stone-800">
                            {start || end
                              ? `${start || "—"}${
                                  end ? ` – ${end}` : ""
                                }`
                              : "Not specified"}
                          </p>

                          {duration && (
                            <p className="mt-0.5 text-xs text-stone-400">
                              {duration}
                            </p>
                          )}
                        </div>

                        <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                            Total Marks
                          </p>

                          <p className="mt-1 text-sm font-medium text-stone-800">
                            {schedule.totalMarks ??
                              "Not specified"}
                          </p>
                        </div>

                        <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-3 sm:col-span-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                            Syllabus Note
                          </p>

                          <p className="mt-1 text-xs leading-relaxed text-stone-600">
                            {schedule.syllabusNote ||
                              "No syllabus note"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openEditModal(schedule)
                          }
                          className="flex-1 rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openDeleteModal(schedule)
                          }
                          className="flex-1 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit / Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4 lg:pl-72 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-stone-200/80 bg-white/95 shadow-2xl backdrop-blur-xl">
            <div className="flex items-start justify-between border-b border-stone-200/70 px-6 py-5 sm:px-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  {editingSchedule
                    ? "Edit Schedule"
                    : "New Schedule"}
                </p>

                <h2 className="mt-1 text-xl font-bold tracking-tight text-stone-900">
                  {editingSchedule
                    ? "Update Exam Schedule"
                    : "Create Exam Schedule"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-lg text-stone-500 transition hover:border-orange-200 hover:text-orange-600"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 sm:p-7"
            >
              {error && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Exam */}
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                    Exam{" "}
                    <span className="text-orange-500">
                      *
                    </span>
                  </label>

                  <select
                    value={form.examId}
                    onChange={(event) =>
                      updateForm(
                        "examId",
                        event.target.value
                      )
                    }
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    <option value="">
                      Select exam
                    </option>

                    {exams.map((exam) => (
                      <option
                        key={exam.id}
                        value={exam.id}
                      >
                        {exam.name}
                        {exam.academicYear
                          ? ` — ${exam.academicYear}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                    Subject{" "}
                    <span className="text-orange-500">
                      *
                    </span>
                  </label>

                  <select
                    value={form.subjectId}
                    onChange={(event) =>
                      updateForm(
                        "subjectId",
                        event.target.value
                      )
                    }
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    <option value="">
                      Select subject
                    </option>

                    {subjects.map((subject) => (
                      <option
                        key={subject.id}
                        value={subject.id}
                      >
                        {subject.name}
                        {subject.code
                          ? ` — ${subject.code}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                    Exam Date{" "}
                    <span className="text-orange-500">
                      *
                    </span>
                  </label>

                  <input
                    type="date"
                    value={form.examDate}
                    onChange={(event) =>
                      updateForm(
                        "examDate",
                        event.target.value
                      )
                    }
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                {/* Start Time */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                    Start Time
                  </label>

                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(event) =>
                      updateForm(
                        "startTime",
                        event.target.value
                      )
                    }
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                {/* End Time */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                    End Time
                  </label>

                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(event) =>
                      updateForm(
                        "endTime",
                        event.target.value
                      )
                    }
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                {/* Total Marks */}
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                    Total Marks
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={form.totalMarks}
                    onChange={(event) =>
                      updateForm(
                        "totalMarks",
                        event.target.value
                      )
                    }
                    placeholder="e.g. 100"
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                {/* Syllabus Note */}
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                    Syllabus Note
                  </label>

                  <textarea
                    value={form.syllabusNote}
                    onChange={(event) =>
                      updateForm(
                        "syllabusNote",
                        event.target.value
                      )
                    }
                    rows={4}
                    placeholder="e.g. Newton's Laws, applications and numerical problems"
                    className="w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm leading-relaxed text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition duration-200 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingSchedule
                      ? "Update Schedule"
                      : "Create Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      {deleteSchedule && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/45 p-4 lg:pl-72 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-stone-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-xl font-bold text-red-600">
              !
            </div>

            <h2 className="mt-4 text-xl font-bold tracking-tight text-stone-900">
              Delete Exam Schedule?
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              Are you sure you want to remove the examination schedule for{" "}
              <span className="font-semibold text-stone-800">
                {deleteSchedule.subject?.name || "this subject"}
              </span>{" "}
              under{" "}
              <span className="font-semibold text-stone-800">
                {deleteSchedule.exam?.name || "this exam"}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-4 rounded-xl border border-stone-200/70 bg-stone-50/70 p-4">
              <div className="grid gap-2.5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                    Exam
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-stone-800">
                    {deleteSchedule.exam?.name || "Unknown exam"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                    Date & Time
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-stone-800">
                    {formatDate(deleteSchedule.examDate)}
                    {deleteSchedule.startTime ? ` (${formatTime(deleteSchedule.startTime)})` : ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition duration-200 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-200 transition duration-200 hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
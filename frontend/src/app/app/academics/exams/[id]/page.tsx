"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { API_BASE } from "@/lib/api";

type School = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
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
  subject?: Subject | null;
};

type Exam = {
  id: string;
  instituteId: string;
  schoolId: string;
  name: string;
  academicYear?: string | null;
  subjectId?: string | null;
  createdAt: string;
  updatedAt: string;
  school?: School | null;
  subject?: Subject | null;
  schedules?: ExamSchedule[];
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("synaptix_token") || "";
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ExamDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const examId = Array.isArray(params?.id)
    ? params.id[0]
    : String(params?.id || "");

  const [exam, setExam] = useState<Exam | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [editForm, setEditForm] = useState({
    schoolId: "",
    name: "",
    academicYear: "",
    subjectId: "",
  });

  useEffect(() => {
    if (!examId) return;

    const loadExam = async () => {
      const token = getToken();

      if (!token) {
        router.push("/login");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const [examResponse, schoolsResponse, subjectsResponse] =
          await Promise.all([
            fetch(`${API_BASE}/exams/${examId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }),

            fetch(`${API_BASE}/schools`, {
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
          examResponse.status === 401 ||
          schoolsResponse.status === 401 ||
          subjectsResponse.status === 401
        ) {
          localStorage.removeItem("synaptix_token");
          router.push("/login");
          return;
        }

        const examData = await parseJsonResponse(examResponse);
        const schoolsData = await parseJsonResponse(schoolsResponse);
        const subjectsData = await parseJsonResponse(subjectsResponse);

        if (!examResponse.ok || !examData.success) {
          throw new Error(
            examData.message || "Unable to load exam"
          );
        }

        setExam(examData.exam);

        setSchools(
          Array.isArray(schoolsData.schools)
            ? schoolsData.schools
            : []
        );

        setSubjects(
          Array.isArray(subjectsData.subjects)
            ? subjectsData.subjects
            : []
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load exam"
        );
      } finally {
        setLoading(false);
      }
    };

    loadExam();
  }, [examId, router]);

  const openEditModal = () => {
    if (!exam) return;

    setEditForm({
      schoolId: exam.schoolId || "",
      name: exam.name || "",
      academicYear: exam.academicYear || "",
      subjectId: exam.subjectId || "",
    });

    setEditError("");
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (saving) return;

    setShowEditModal(false);
    setEditError("");
  };

  const handleUpdateExam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    if (!editForm.name.trim()) {
      setEditError("Exam name is required.");
      return;
    }

    if (!editForm.schoolId) {
      setEditError("Please select a school.");
      return;
    }

    setSaving(true);
    setEditError("");

    try {
      const response = await fetch(`${API_BASE}/exams/${examId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schoolId: editForm.schoolId,
          name: editForm.name.trim(),
          academicYear: editForm.academicYear.trim() || null,
          subjectId: editForm.subjectId || null,
        }),
      });

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        router.push("/login");
        return;
      }

      const data = await parseJsonResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to update exam"
        );
      }

      setExam((current) => {
        if (!current) return data.exam;

        return {
          ...current,
          ...data.exam,
          schedules: current.schedules || [],
        };
      });

      setShowEditModal(false);
    } catch (err) {
      setEditError(
        err instanceof Error
          ? err.message
          : "Failed to update exam"
      );
    } finally {
      setSaving(false);
    }
  };

  const scheduleCount = exam?.schedules?.length || 0;

  const nextExamDate = useMemo(() => {
    if (!exam?.schedules?.length) return null;

    const sorted = [...exam.schedules].sort(
      (a, b) =>
        new Date(a.examDate).getTime() -
        new Date(b.examDate).getTime()
    );

    return sorted[0]?.examDate || null;
  }, [exam]);

  if (loading) {
    return (
      <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" />
            <p className="mt-4 text-sm font-medium text-stone-500">
              Loading examination details...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !exam) {
    return (
      <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <button
            type="button"
            onClick={() => router.back()}
            className="group mb-6 inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition duration-200 hover:text-orange-600"
          >
            <span className="transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
            Back to Exams
          </button>

          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
            <h1 className="text-xl font-bold text-stone-900">
              Unable to load exam
            </h1>

            <p className="mt-2 text-sm text-red-600">
              {error || "Exam not found."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Back */}
        <button
          type="button"
          onClick={() => router.back()}
          className="group inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition duration-200 hover:text-orange-600"
        >
          <span className="transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
          Back to Exams
        </button>

        {/* Header */}
        <section className="relative overflow-hidden rounded-3xl border border-orange-100/70 bg-white/80 p-7 shadow-sm backdrop-blur-xl sm:p-8">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-orange-100/60 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                Examination Record
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
                {exam.name}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-700">
                  {exam.school?.name || "School not assigned"}
                </span>

                {exam.academicYear && (
                  <span className="inline-flex items-center rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                    AY {exam.academicYear}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={openEditModal}
                className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
              >
                Edit Exam
              </button>

              {exam.school && (
                <Link
                  href={`/app/schools/${exam.school.id}`}
                  className="inline-flex items-center justify-center rounded-xl border border-orange-100 bg-orange-50 px-4 py-2.5 text-xs font-semibold text-orange-600 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-100 active:translate-y-0"
                >
                  View School →
                </Link>
              )}

              {exam.subject && (
                <Link
                  href={`/app/academics/subjects/${exam.subject.id}`}
                  className="inline-flex items-center justify-center rounded-xl border border-orange-100 bg-orange-50 px-4 py-2.5 text-xs font-semibold text-orange-600 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-100 active:translate-y-0"
                >
                  View Subject →
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Summary Stats */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-orange-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Partner School
            </p>

            <p className="mt-2 text-base font-bold tracking-tight text-stone-900">
              {exam.school?.name || "—"}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Affiliated institution
            </p>
          </div>

          <div className="rounded-3xl border border-orange-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Subject Tested
            </p>

            <p className="mt-2 text-base font-bold tracking-tight text-stone-900">
              {exam.subject?.name || "Multiple / Unspecified"}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Curriculum focus
            </p>
          </div>

          <div className="rounded-3xl border border-orange-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Academic Year
            </p>

            <p className="mt-2 text-base font-bold tracking-tight text-stone-900">
              {exam.academicYear || "—"}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Term session
            </p>
          </div>

          <div className="rounded-3xl border border-orange-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Papers Scheduled
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
              {scheduleCount}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Exam timetable slots
            </p>
          </div>
        </section>

        {/* Next exam highlight */}
        <section className="rounded-3xl border border-orange-100/70 bg-white/80 p-6 shadow-sm backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                Examination Date
              </p>

              <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
                Upcoming Schedule Slot
              </h2>

              <p className="mt-0.5 text-xs text-stone-500">
                Earliest test date configured for this examination series.
              </p>
            </div>

            <div className="rounded-2xl border border-orange-100 bg-orange-50/70 px-5 py-3 text-center">
              <p className="text-sm font-semibold text-orange-700">
                {nextExamDate
                  ? formatDate(nextExamDate)
                  : "No paper dates scheduled"}
              </p>
            </div>
          </div>
        </section>

        {/* Exam information */}
        <section className="rounded-3xl border border-orange-100/70 bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
            Exam Details
          </p>

          <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
            Basic Information
          </h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Exam Title
              </p>
              <p className="mt-1.5 text-sm font-semibold text-stone-900">
                {exam.name}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                School
              </p>

              {exam.school ? (
                <Link
                  href={`/app/schools/${exam.school.id}`}
                  className="mt-1.5 inline-flex items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700"
                >
                  {exam.school.name} →
                </Link>
              ) : (
                <p className="mt-1.5 text-sm text-stone-500">—</p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Subject
              </p>

              {exam.subject ? (
                <Link
                  href={`/app/academics/subjects/${exam.subject.id}`}
                  className="mt-1.5 inline-flex items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700"
                >
                  {exam.subject.name} →
                </Link>
              ) : (
                <p className="mt-1.5 text-sm text-stone-500">
                  Not assigned
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Academic Year
              </p>
              <p className="mt-1.5 text-sm font-semibold text-stone-900">
                {exam.academicYear || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Created
              </p>
              <p className="mt-1.5 text-sm font-medium text-stone-700">
                {formatDateTime(exam.createdAt)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Last Updated
              </p>
              <p className="mt-1.5 text-sm font-medium text-stone-700">
                {formatDateTime(exam.updatedAt)}
              </p>
            </div>
          </div>
        </section>

        {/* Schedules */}
        <section className="overflow-hidden rounded-3xl border border-orange-100/70 bg-white/80 shadow-sm backdrop-blur-xl">
          <div className="flex flex-col gap-3 border-b border-stone-200/70 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                Timetable
              </p>

              <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
                Scheduled Exam Papers
              </h2>

              <p className="mt-0.5 text-xs text-stone-500">
                Scheduled dates, timings, marks weightage and syllabus notes.
              </p>
            </div>

            <Link
              href="/app/academics/exam-schedules"
              className="inline-flex items-center justify-center rounded-xl border border-orange-100 bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-600 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-100 active:translate-y-0"
            >
              View All Schedules →
            </Link>
          </div>

          <div className="p-6 sm:p-7">
            {exam.schedules && exam.schedules.length > 0 ? (
              <div className="space-y-4">
                {exam.schedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="rounded-2xl border border-stone-200 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-base font-semibold text-stone-900">
                          {schedule.subject?.name ||
                            exam.subject?.name ||
                            "Subject Paper"}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-orange-600">
                          Date: {formatDate(schedule.examDate)}
                        </p>
                      </div>

                      {schedule.totalMarks !== null &&
                        schedule.totalMarks !== undefined && (
                          <div className="inline-flex items-center rounded-xl border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                            {schedule.totalMarks} Total Marks
                          </div>
                        )}
                    </div>

                    <div className="mt-4 grid gap-3 border-t border-stone-100 pt-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-stone-400">
                          Date
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-stone-800">
                          {formatDate(schedule.examDate)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-stone-400">
                          Start Time
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-stone-800">
                          {formatTime(schedule.startTime)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-stone-400">
                          End Time
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-stone-800">
                          {formatTime(schedule.endTime)}
                        </p>
                      </div>
                    </div>

                    {schedule.syllabusNote && (
                      <div className="mt-3.5 rounded-xl border border-stone-100 bg-stone-50 p-3.5">
                        <p className="text-xs font-semibold text-stone-500">
                          Syllabus / Exam Note
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-stone-700">
                          {schedule.syllabusNote}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 p-8 text-center">
                <p className="text-sm font-semibold text-stone-800">
                  No exam schedules added yet
                </p>

                <p className="mt-1 text-xs text-stone-500">
                  Add exam schedules to see paper dates and syllabus coverage here.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 px-5 py-8 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl border border-orange-100 bg-white p-6 shadow-2xl sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                    Edit Exam
                  </p>

                  <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-stone-900">
                    Update Exam Details
                  </h2>

                  <p className="mt-1 text-sm text-stone-500">
                    Modify the title, school affiliation, or academic year.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={saving}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-lg text-stone-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={handleUpdateExam}
                className="mt-6 space-y-4"
              >
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Exam Name
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
                    placeholder="Enter exam name"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    School
                  </label>

                  <select
                    value={editForm.schoolId}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        schoolId: event.target.value,
                      }))
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    required
                  >
                    <option value="">Select school</option>

                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Subject
                    <span className="ml-1 font-normal lowercase text-stone-400">
                      (optional)
                    </span>
                  </label>

                  <select
                    value={editForm.subjectId}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        subjectId: event.target.value,
                      }))
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    <option value="">No subject assigned</option>

                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                        {subject.code ? ` (${subject.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Academic Year
                    <span className="ml-1 font-normal lowercase text-stone-400">
                      (optional)
                    </span>
                  </label>

                  <input
                    type="text"
                    value={editForm.academicYear}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        academicYear: event.target.value,
                      }))
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="e.g. 2026-27"
                  />
                </div>

                {editError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {editError}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={closeEditModal}
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
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
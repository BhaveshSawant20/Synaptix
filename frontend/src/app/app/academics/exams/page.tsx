"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { API_BASE } from "@/lib/api";
import Modal from "@/app/app/components/Modal";
import SortControl from "@/app/app/components/SortControl";
import { SortOption, sortRecords } from "@/lib/sorting";

type School = {
  id: string;
  name: string;
};

type Subject = {
  id: string;
  name: string;
  code?: string | null;
};

type ExamSchedule = {
  id: string;
  examDate: string;
  startTime?: string | null;
  endTime?: string | null;
  totalMarks?: number | null;
  syllabusNote?: string | null;
  subject?: Subject | null;
};

type Exam = {
  id: string;
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

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("alphabetical");

  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Exam | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState({
    schoolId: "",
    name: "",
    academicYear: "",
    subjectId: "",
  });

  const loadData = async () => {
    const token = getToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [examsResponse, schoolsResponse, subjectsResponse] =
        await Promise.all([
          fetch(`${API_BASE}/exams`, {
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
        examsResponse.status === 401 ||
        schoolsResponse.status === 401 ||
        subjectsResponse.status === 401
      ) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      const examsData = await parseJsonResponse(examsResponse);
      const schoolsData = await parseJsonResponse(schoolsResponse);
      const subjectsData = await parseJsonResponse(subjectsResponse);

      if (!examsResponse.ok || !examsData.success) {
        throw new Error(
          examsData.message || "Unable to load exams"
        );
      }

      setExams(
        Array.isArray(examsData.exams)
          ? examsData.exams
          : []
      );

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
        err instanceof Error
          ? err.message
          : "Unable to load exams"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingExam(null);

    setForm({
      schoolId: "",
      name: "",
      academicYear: "",
      subjectId: "",
    });

    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (exam: Exam) => {
    setEditingExam(exam);

    setForm({
      schoolId: exam.schoolId || "",
      name: exam.name || "",
      academicYear: exam.academicYear || "",
      subjectId: exam.subjectId || "",
    });

    setFormError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingExam(null);
    setFormError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const token = getToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (!form.schoolId) {
      setFormError("Please select a school.");
      return;
    }

    if (!form.name.trim()) {
      setFormError("Exam name is required.");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const url = editingExam
        ? `${API_BASE}/exams/${editingExam.id}`
        : `${API_BASE}/exams`;

      const response = await fetch(url, {
        method: editingExam ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schoolId: form.schoolId,
          name: form.name.trim(),
          academicYear: form.academicYear.trim() || null,
          subjectId: form.subjectId || null,
        }),
      });

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      const data = await parseJsonResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            (editingExam
              ? "Failed to update exam"
              : "Failed to create exam")
        );
      }

      setShowModal(false);
      setEditingExam(null);

      await loadData();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Failed to save exam"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    const token = getToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      setDeletingId(deleteTarget.id);
      setError("");

      const response = await fetch(
        `${API_BASE}/exams/${deleteTarget.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      const data = await parseJsonResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to delete exam"
        );
      }

      setExams((current) =>
        current.filter((item) => item.id !== deleteTarget.id)
      );
      setDeleteTarget(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete exam"
      );
    } finally {
      setDeletingId(null);
    }
  };

  const filteredExams = useMemo(() => {
    const query = search.trim().toLowerCase();

    const matched = !query
      ? exams
      : exams.filter((exam) => {
          return (
            exam.name.toLowerCase().includes(query) ||
            exam.school?.name?.toLowerCase().includes(query) ||
            exam.subject?.name?.toLowerCase().includes(query) ||
            exam.academicYear?.toLowerCase().includes(query)
          );
        });

    return sortRecords(matched, sortBy, (e) => e.name, (e) => {
      if (e.schedules && e.schedules.length > 0) {
        return e.schedules[0].examDate;
      }
      return e.createdAt;
    });
  }, [exams, search, sortBy]);

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <section className="relative overflow-hidden rounded-3xl border border-orange-100/70 bg-white/80 p-7 shadow-sm backdrop-blur-xl sm:p-8">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-orange-100/60 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                Academic Management
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
                Examinations
              </h1>

              <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-stone-500">
                Manage examinations, semester tests, and paper schedules linked to partner schools and subjects.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
            >
              <span className="text-base leading-none">+</span>
              Add Exam
            </button>
          </div>
        </section>

        {/* Summary Stats */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-orange-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Total Exams
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-stone-900">
              {exams.length}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Recorded examinations
            </p>
          </div>

          <div className="rounded-3xl border border-orange-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Partner Schools
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-stone-900">
              {schools.length}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Schools affiliated
            </p>
          </div>

          <div className="rounded-3xl border border-orange-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Subjects Tested
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-stone-900">
              {subjects.length}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Curriculum disciplines
            </p>
          </div>
        </section>

        {/* Search & Sort */}
        <section className="flex flex-col gap-3 rounded-2xl border border-orange-100/70 bg-white/80 p-4 shadow-sm backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search exams by title, school, subject or academic year..."
              className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 pr-10 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-400 transition hover:text-orange-600"
              >
                ×
              </button>
            )}
          </div>

          <SortControl value={sortBy} onChange={setSortBy} />
        </section>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Loading / Cards Grid */}
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"
              >
                <div className="h-5 w-2/3 rounded bg-orange-100" />
                <div className="mt-4 h-4 w-1/2 rounded bg-orange-50" />
                <div className="mt-3 h-4 w-3/4 rounded bg-stone-100" />
                <div className="mt-6 h-10 rounded bg-stone-50" />
              </div>
            ))}
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-2xl">
              📝
            </div>

            <h2 className="mt-5 text-lg font-semibold tracking-tight text-stone-900">
              {search
                ? "No exams found"
                : "No examinations added yet"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500">
              {search
                ? "Try searching with a different exam title, school, or subject name."
                : "Create your first examination to track schedules and student assessment intelligence."}
            </p>

            {!search && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0"
              >
                + Add Exam
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredExams.map((exam) => (
              <div
                key={exam.id}
                className="flex flex-col justify-between rounded-3xl border border-orange-100/70 bg-white/80 p-6 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-stone-900">
                        {exam.name}
                      </h2>

                      <p className="mt-1 truncate text-xs text-stone-500">
                        {exam.school?.name || "School not assigned"}
                      </p>
                    </div>

                    {exam.academicYear && (
                      <span className="shrink-0 rounded-full border border-orange-100 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                        {exam.academicYear}
                      </span>
                    )}
                  </div>

                  <div className="mt-5 space-y-2.5 border-t border-stone-100 pt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-400">Subject</span>
                      <span className="font-semibold text-stone-700">
                        {exam.subject?.name || "Not assigned"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-400">Schedules</span>
                      <span className="font-semibold text-stone-700">
                        {exam.schedules?.length || 0} papers
                      </span>
                    </div>

                    {exam.schedules && exam.schedules.length > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-stone-400">Next Date</span>
                        <span className="font-semibold text-orange-600">
                          {formatDate(
                            [...exam.schedules].sort(
                              (a, b) =>
                                new Date(a.examDate).getTime() -
                                new Date(b.examDate).getTime()
                            )[0]?.examDate
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-4">
                  <Link
                    href={`/app/academics/exams/${exam.id}`}
                    className="inline-flex items-center justify-center rounded-xl border border-orange-100 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-600 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-100 active:translate-y-0"
                  >
                    View Details →
                  </Link>

                  <button
                    type="button"
                    onClick={() => openEditModal(exam)}
                    className="rounded-xl border border-orange-200 bg-white px-3.5 py-2 text-xs font-semibold text-orange-700 transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 active:translate-y-0"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(exam)}
                    disabled={deletingId === exam.id}
                    className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 transition duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-100 disabled:opacity-60 active:translate-y-0"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create / Edit Modal */}
        <Modal
          isOpen={showModal}
          onClose={closeModal}
          title={editingExam ? "Update Examination" : "Add Examination"}
          badge={editingExam ? "Edit Exam" : "New Exam"}
          description={
            editingExam
              ? "Update the examination parameters."
              : "Register an examination under a school structure."
          }
          footer={
            <>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-xs font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  const formEl = document.getElementById("exam-form") as HTMLFormElement | null;
                  formEl?.requestSubmit();
                }}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-orange-100 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingExam
                  ? "Save Changes"
                  : "Create Exam"}
              </button>
            </>
          }
        >
          <form
            id="exam-form"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Exam Name
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
                placeholder="e.g. First Semester Examination"
                required
                className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Partner School
              </label>

              <select
                value={form.schoolId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    schoolId: event.target.value,
                  }))
                }
                required
                className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
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
                value={form.subjectId}
                onChange={(event) =>
                  setForm((current) => ({
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
                value={form.academicYear}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    academicYear: event.target.value,
                  }))
                }
                placeholder="e.g. 2026-27"
                className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>

            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {formError}
              </div>
            )}
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          title="Delete examination?"
          badge="Warning"
          description="This action cannot be undone."
          maxWidth="md"
          footer={
            <>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={Boolean(deletingId)}
                className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-xs font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={Boolean(deletingId)}
                className="inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingId ? "Deleting..." : "Delete Exam"}
              </button>
            </>
          }
        >
          {deleteTarget && (
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl font-bold text-red-600">
                !
              </div>
              <p className="text-sm leading-6 text-stone-600">
                Are you sure you want to delete{" "}
                <strong className="font-semibold text-stone-800">
                  {deleteTarget.name}
                </strong>
                {deleteTarget.school?.name
                  ? ` (${deleteTarget.school.name})`
                  : ""}? This action cannot be undone and will delete linked exam paper schedules.
              </p>
            </div>
          )}
        </Modal>
      </div>
    </main>
  );
}
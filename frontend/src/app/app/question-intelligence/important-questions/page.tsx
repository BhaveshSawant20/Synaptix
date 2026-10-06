"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

type ImportantQuestion = {
  id: string;
  schoolName: string | null;
  standardName: string | null;
  subjectName: string | null;
  questionText: string;
  source: string | null;
  importance: number | null;
  createdAt: string;
  updatedAt: string;
};

type QuestionForm = {
  schoolName: string;
  standardName: string;
  subjectName: string;
  questionText: string;
  source: string;
  importance: string;
};

import { API_BASE } from "@/lib/api";

const emptyForm: QuestionForm = {
  schoolName: "",
  standardName: "",
  subjectName: "",
  questionText: "",
  source: "",
  importance: "",
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("synaptix_token") || "";
}

export default function ImportantQuestionsPage() {
  const [questions, setQuestions] = useState<ImportantQuestion[]>([]);
  const [form, setForm] = useState<QuestionForm>(emptyForm);
  const [editingQuestion, setEditingQuestion] = useState<ImportantQuestion | null>(null);
  const [deleteQuestion, setDeleteQuestion] = useState<ImportantQuestion | null>(null);

  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [importanceFilter, setImportanceFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  async function loadQuestions() {
    const token = getToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE}/important-questions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to load important questions.",
        );
      }

      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.questions)
          ? data.questions
          : Array.isArray(data?.importantQuestions)
            ? data.importantQuestions
            : Array.isArray(data?.data)
              ? data.data
              : [];

      setQuestions(items);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load important questions.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQuestions();
  }, []);

  const subjects = useMemo(() => {
    return Array.from(
      new Set(
        questions
          .map((question) => question.subjectName?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return questions.filter((question) => {
      const matchesSearch =
        !query ||
        [
          question.schoolName,
          question.standardName,
          question.subjectName,
          question.questionText,
          question.source,
        ]
          .filter(Boolean)
          .some((value) =>
            value!.toLowerCase().includes(query),
          );

      const matchesSubject =
        !subjectFilter || question.subjectName === subjectFilter;

      const matchesImportance =
        !importanceFilter ||
        String(question.importance ?? "") === importanceFilter;

      return matchesSearch && matchesSubject && matchesImportance;
    });
  }, [questions, search, subjectFilter, importanceFilter]);

  const stats = useMemo(() => {
    const withImportance = questions.filter(
      (question) => question.importance !== null,
    );

    return {
      total: questions.length,
      subjects: subjects.length,
      high: questions.filter(
        (question) => (question.importance ?? 0) >= 4,
      ).length,
      average:
        withImportance.length > 0
          ? (
              withImportance.reduce(
                (sum, question) => sum + (question.importance ?? 0),
                0,
              ) / withImportance.length
            ).toFixed(1)
          : "—",
    };
  }, [questions, subjects]);

  function openAddModal() {
    setEditingQuestion(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  }

  function openEditModal(question: ImportantQuestion) {
    setEditingQuestion(question);
    setForm({
      schoolName: question.schoolName ?? "",
      standardName: question.standardName ?? "",
      subjectName: question.subjectName ?? "",
      questionText: question.questionText,
      source: question.source ?? "",
      importance:
        question.importance === null ? "" : String(question.importance),
    });
    setError("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingQuestion(null);
    setForm(emptyForm);
  }

  function updateField(field: keyof QuestionForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.questionText.trim()) {
      setError("Question text is required.");
      return;
    }

    const token = getToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    const importanceValue = form.importance.trim()
      ? Number(form.importance)
      : null;

    if (
      importanceValue !== null &&
      (!Number.isInteger(importanceValue) ||
        importanceValue < 1 ||
        importanceValue > 5)
    ) {
      setError("Importance must be a whole number between 1 and 5.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        schoolName: form.schoolName.trim() || null,
        standardName: form.standardName.trim() || null,
        subjectName: form.subjectName.trim() || null,
        questionText: form.questionText.trim(),
        source: form.source.trim() || null,
        importance: importanceValue,
      };

      const url = editingQuestion
        ? `${API_BASE}/important-questions/${editingQuestion.id}`
        : `${API_BASE}/important-questions`;

      const response = await fetch(url, {
        method: editingQuestion ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to save important question.",
        );
      }

      await loadQuestions();
      closeModal();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save important question.",
      );
    } finally {
      setSaving(false);
    }
  }

  function openDeleteModal(question: ImportantQuestion) {
    setDeleteQuestion(question);
  }

  function closeDeleteModal() {
    if (deletingId) return;
    setDeleteQuestion(null);
  }

  async function confirmDelete() {
    if (!deleteQuestion) return;

    const token = getToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      setDeletingId(deleteQuestion.id);
      setError("");

      const response = await fetch(
        `${API_BASE}/important-questions/${deleteQuestion.id}`,
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to delete question.",
        );
      }

      setQuestions((current) =>
        current.filter((item) => item.id !== deleteQuestion.id),
      );
      setDeleteQuestion(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete question.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  function importanceLabel(value: number | null) {
    if (value === null) return "Not rated";
    if (value >= 5) return "Critical";
    if (value >= 4) return "High";
    if (value >= 3) return "Medium";
    if (value >= 2) return "Low";
    return "Very Low";
  }

  function importanceClasses(value: number | null) {
    if (value === null) {
      return "border-stone-200 bg-stone-50 text-stone-500";
    }
    if (value >= 4) {
      return "border-orange-200 bg-orange-50 text-orange-700";
    }
    if (value >= 3) {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }
    return "border-stone-200 bg-stone-50 text-stone-600";
  }

  return (
    <main className="w-full px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-stone-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-8">
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-orange-100/50 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Question Intelligence
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Important Questions
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
              Maintain an institute-wide repository of high-weightage questions with rating levels and multi-school source tracking.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
          >
            <span>+</span> Add Question
          </button>
        </div>
      </section>

      {/* Alerts */}
      {error && !modalOpen && !deleteQuestion && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
            Total Questions
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
            {stats.total}
          </p>
          <p className="mt-1 text-xs text-stone-400">Library inventory</p>
        </div>

        <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
            Subjects Covered
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
            {stats.subjects}
          </p>
          <p className="mt-1 text-xs text-stone-400">Categorized subjects</p>
        </div>

        <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
            High / Critical
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-orange-600">
            {stats.high}
          </p>
          <p className="mt-1 text-xs text-stone-400">Ranked 4★ or 5★</p>
        </div>

        <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
            Avg. Importance
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
            {stats.average}
          </p>
          <p className="mt-1 text-xs text-stone-400">Overall rating scale</p>
        </div>
      </section>

      {/* Filters */}
      <section className="glass rounded-2xl border border-stone-200/70 p-5 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="flex-1">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions, schools, subjects or sources..."
              className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="h-11 rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 sm:w-48"
            >
              <option value="">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>

            <select
              value={importanceFilter}
              onChange={(e) => setImportanceFilter(e.target.value)}
              className="h-11 rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 sm:w-48"
            >
              <option value="">All Importance</option>
              <option value="5">5 — Critical</option>
              <option value="4">4 — High</option>
              <option value="3">3 — Medium</option>
              <option value="2">2 — Low</option>
              <option value="1">1 — Very Low</option>
            </select>
          </div>
        </div>
      </section>

      {/* Table Section */}
      <section className="glass overflow-hidden rounded-2xl border border-stone-200/70">
        <div className="border-b border-stone-200/80 bg-stone-50/50 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
            Question Library ({filteredQuestions.length} of {questions.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-orange-100 border-t-orange-500" />
            <p className="mt-3 text-sm text-stone-500">Loading important questions...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-2xl text-orange-500">
              ❓
            </div>
            <h3 className="mt-4 text-base font-semibold text-stone-900">
              {questions.length === 0
                ? "No important questions yet"
                : "No matching questions found"}
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">
              {questions.length === 0
                ? "Collect questions from past tests, school exams, or coaching assessments to build the intelligence repository."
                : "Try adjusting your search criteria or rating filters."}
            </p>
            {questions.length === 0 && (
              <button
                type="button"
                onClick={openAddModal}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0"
              >
                <span>+</span> Add First Question
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[950px] text-left">
                <thead className="border-b border-stone-200/80 bg-stone-50/50">
                  <tr className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    <th className="px-6 py-3.5">Question Text</th>
                    <th className="px-6 py-3.5">Academic Context</th>
                    <th className="px-6 py-3.5">Source</th>
                    <th className="px-6 py-3.5">Importance</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-stone-100">
                  {filteredQuestions.map((question) => (
                    <tr
                      key={question.id}
                      className="border-b border-stone-100 transition duration-150 last:border-b-0 hover:bg-orange-50/30"
                    >
                      <td className="max-w-md px-6 py-4 align-top">
                        <p className="font-medium text-stone-900 leading-relaxed text-sm">
                          {question.questionText}
                        </p>
                      </td>

                      <td className="px-6 py-4 align-top text-sm">
                        <p className="font-semibold text-stone-800">
                          {question.subjectName || "—"}
                        </p>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {question.schoolName || "School not specified"}
                        </p>
                        <p className="text-xs text-stone-400">
                          {question.standardName || "Standard not set"}
                        </p>
                      </td>

                      <td className="px-6 py-4 align-top text-sm font-medium text-stone-600">
                        {question.source || "—"}
                      </td>

                      <td className="px-6 py-4 align-top">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${importanceClasses(
                            question.importance,
                          )}`}
                        >
                          {question.importance !== null
                            ? `${question.importance}/5 — ${importanceLabel(question.importance)}`
                            : "Not rated"}
                        </span>
                      </td>

                      <td className="px-6 py-4 align-top">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(question)}
                            className="rounded-xl border border-orange-200 bg-white px-3.5 py-2 text-xs font-semibold text-orange-700 transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 active:translate-y-0"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => openDeleteModal(question)}
                            disabled={deletingId === question.id}
                            className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 transition duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-100 active:translate-y-0 disabled:opacity-50"
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

            {/* Mobile Card List */}
            <div className="divide-y divide-stone-100 lg:hidden">
              {filteredQuestions.map((question) => (
                <article key={question.id} className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">
                        {question.subjectName || "Subject not set"}
                      </p>
                      <h4 className="mt-1.5 text-sm font-semibold leading-relaxed text-stone-900">
                        {question.questionText}
                      </h4>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${importanceClasses(
                        question.importance,
                      )}`}
                    >
                      {question.importance !== null ? `${question.importance}/5` : "—"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-stone-50 border border-stone-100 p-3 text-xs">
                    <div>
                      <p className="text-stone-400">School</p>
                      <p className="mt-0.5 font-medium text-stone-800">
                        {question.schoolName || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-stone-400">Standard</p>
                      <p className="mt-0.5 font-medium text-stone-800">
                        {question.standardName || "—"}
                      </p>
                    </div>

                    <div className="col-span-2">
                      <p className="text-stone-400">Source</p>
                      <p className="mt-0.5 font-medium text-stone-800">
                        {question.source || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(question)}
                      className="rounded-xl border border-orange-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-orange-700 transition hover:bg-orange-50"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => openDeleteModal(question)}
                      className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-stone-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:p-7">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Question Intelligence
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
                  {editingQuestion ? "Edit Important Question" : "Add Important Question"}
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  Categorize and evaluate question weightage for academic prep.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-500 transition hover:bg-stone-200 hover:text-stone-900 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-stone-700">
                  Question Text *
                </span>
                <textarea
                  value={form.questionText}
                  onChange={(e) => updateField("questionText", e.target.value)}
                  rows={4}
                  placeholder="Enter the complete question prompt..."
                  required
                  className="w-full resize-y rounded-xl border border-stone-200 bg-white p-4 text-sm leading-relaxed text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="School Name"
                  value={form.schoolName}
                  onChange={(val) => updateField("schoolName", val)}
                  placeholder="e.g. St. Xavier's School"
                />

                <Field
                  label="Standard / Class"
                  value={form.standardName}
                  onChange={(val) => updateField("standardName", val)}
                  placeholder="e.g. Class 10"
                />

                <Field
                  label="Subject Name"
                  value={form.subjectName}
                  onChange={(val) => updateField("subjectName", val)}
                  placeholder="e.g. Physics"
                />

                <Field
                  label="Source"
                  value={form.source}
                  onChange={(val) => updateField("source", val)}
                  placeholder="e.g. 2024 Board Exam, Unit Test"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                  Importance Rating
                </label>
                <select
                  value={form.importance}
                  onChange={(e) => updateField("importance", e.target.value)}
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">Not rated</option>
                  <option value="5">5 — Critical (High recurrence probability)</option>
                  <option value="4">4 — High</option>
                  <option value="3">3 — Medium</option>
                  <option value="2">2 — Low</option>
                  <option value="1">1 — Very Low</option>
                </select>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingQuestion
                      ? "Update Question"
                      : "Add Question"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteQuestion && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-stone-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-2xl text-red-600">
              🗑️
            </div>

            <h3 className="mt-4 text-xl font-bold tracking-tight text-stone-900">
              Delete Question?
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              This question will be permanently removed from your Question Intelligence library.
            </p>

            <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50/70 p-4">
              <p className="line-clamp-2 text-sm font-medium text-stone-800">
                {deleteQuestion.questionText}
              </p>
              <p className="mt-1 text-xs text-stone-500">
                {deleteQuestion.subjectName || "No subject"} ·{" "}
                {deleteQuestion.source || "No source"}
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={Boolean(deletingId)}
                className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                disabled={Boolean(deletingId)}
                className="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-200 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingId ? "Deleting..." : "Delete Question"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-stone-700">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
      />
    </div>
  );
}
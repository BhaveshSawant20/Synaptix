"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type QuestionPaper = {
  id: string;
  schoolName?: string | null;
  standardName?: string | null;
  subjectName?: string | null;
  academicYear?: string | null;
  title: string;
  fileUrl?: string | null;
  extractedText?: string | null;
  createdAt: string;
  updatedAt?: string;
};

type FormState = {
  schoolName: string;
  standardName: string;
  subjectName: string;
  academicYear: string;
  title: string;
  fileUrl: string;
  extractedText: string;
};

import { API_BASE } from "@/lib/api";

const emptyForm: FormState = {
  schoolName: "",
  standardName: "",
  subjectName: "",
  academicYear: "",
  title: "",
  fileUrl: "",
  extractedText: "",
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("synaptix_token") || "";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PreviousPapersPage() {
  const router = useRouter();
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPaper, setEditingPaper] = useState<QuestionPaper | null>(null);
  const [deletePaper, setDeletePaper] = useState<QuestionPaper | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  async function loadPapers(isInitial = false) {
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

      const response = await fetch(`${API_BASE}/question-papers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        router.push("/login");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to load previous papers.",
        );
      }

      setPapers(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load previous papers.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    async function init() {
      if (!ignore) {
        await loadPapers(true);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  const subjects = useMemo(() => {
    return Array.from(
      new Set(
        papers
          .map((paper) => paper.subjectName?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [papers]);

  const filteredPapers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return papers.filter((paper) => {
      const matchesSubject =
        subjectFilter === "ALL" ||
        paper.subjectName === subjectFilter;

      if (!matchesSubject) return false;

      if (!query) return true;

      return [
        paper.title,
        paper.schoolName,
        paper.standardName,
        paper.subjectName,
        paper.academicYear,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query),
        );
    });
  }, [papers, search, subjectFilter]);

  const papersWithText = papers.filter((paper) =>
    paper.extractedText?.trim(),
  ).length;

  const subjectsCount = new Set(
    papers.map((paper) => paper.subjectName).filter(Boolean),
  ).size;

  function openCreateModal() {
    setEditingPaper(null);
    setForm(emptyForm);
    setError("");
    setIsModalOpen(true);
  }

  function openEditModal(paper: QuestionPaper) {
    setEditingPaper(paper);
    setForm({
      schoolName: paper.schoolName || "",
      standardName: paper.standardName || "",
      subjectName: paper.subjectName || "",
      academicYear: paper.academicYear || "",
      title: paper.title || "",
      fileUrl: paper.fileUrl || "",
      extractedText: paper.extractedText || "",
    });
    setError("");
    setIsModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setIsModalOpen(false);
    setEditingPaper(null);
    setForm(emptyForm);
  }

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim()) {
      setError("Paper title is required.");
      return;
    }

    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        schoolName: form.schoolName.trim() || null,
        standardName: form.standardName.trim() || null,
        subjectName: form.subjectName.trim() || null,
        academicYear: form.academicYear.trim() || null,
        title: form.title.trim(),
        fileUrl: form.fileUrl.trim() || null,
        extractedText: form.extractedText.trim() || null,
      };

      const url = editingPaper
        ? `${API_BASE}/question-papers/${editingPaper.id}`
        : `${API_BASE}/question-papers`;

      const response = await fetch(url, {
        method: editingPaper ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        router.push("/login");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to save question paper.",
        );
      }

      closeModal();
      await loadPapers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save question paper.",
      );
    } finally {
      setSaving(false);
    }
  }

  function openDeleteModal(paper: QuestionPaper) {
    setDeletePaper(paper);
  }

  function closeDeleteModal() {
    if (deletingId) return;
    setDeletePaper(null);
  }

  async function confirmDelete() {
    if (!deletePaper) return;

    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    try {
      setDeletingId(deletePaper.id);
      setError("");

      const response = await fetch(
        `${API_BASE}/question-papers/${deletePaper.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        router.push("/login");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to delete question paper.",
        );
      }

      setPapers((current) =>
        current.filter((paper) => paper.id !== deletePaper.id),
      );
      setDeletePaper(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete question paper.",
      );
    } finally {
      setDeletingId(null);
    }
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
              Previous Papers
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
              Catalog and analyze historical question papers with extracted text to identify high-probability academic trends.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
          >
            <span>+</span> Add Paper
          </button>
        </div>
      </section>

      {/* Alerts */}
      {error && !isModalOpen && !deletePaper && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
            Total Papers
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
            {papers.length}
          </p>
          <p className="mt-1 text-xs text-stone-400">Recorded archive</p>
        </div>

        <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
            Distinct Subjects
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
            {subjectsCount}
          </p>
          <p className="mt-1 text-xs text-stone-400">Covered in papers</p>
        </div>

        <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
            With Extracted Text
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-orange-600">
            {papersWithText}
          </p>
          <p className="mt-1 text-xs text-stone-400">Ready for question analysis</p>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="glass rounded-2xl border border-stone-200/70 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search papers, school, subject or year..."
              className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </div>

          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="h-11 rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 sm:w-56"
          >
            <option value="ALL">All Subjects</option>
            {subjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Table Section */}
      <section className="glass overflow-hidden rounded-2xl border border-stone-200/70">
        {loading ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-orange-100 border-t-orange-500" />
            <p className="mt-3 text-sm text-stone-500">Loading previous papers...</p>
          </div>
        ) : filteredPapers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-2xl text-orange-500">
              📄
            </div>
            <h3 className="mt-4 text-base font-semibold text-stone-900">
              {papers.length === 0
                ? "No previous papers yet"
                : "No matching papers found"}
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">
              {papers.length === 0
                ? "Add your first previous-year question paper to begin constructing the question intelligence dataset."
                : "Try adjusting your search criteria or subject filter."}
            </p>
            {papers.length === 0 && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0"
              >
                <span>+</span> Add Paper
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[850px] text-left">
                <thead className="border-b border-stone-200/80 bg-stone-50/50">
                  <tr className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    <th className="px-6 py-3.5">Paper</th>
                    <th className="px-6 py-3.5">School / Standard</th>
                    <th className="px-6 py-3.5">Subject</th>
                    <th className="px-6 py-3.5">Academic Year</th>
                    <th className="px-6 py-3.5">Extracted Text</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-stone-100">
                  {filteredPapers.map((paper) => (
                    <tr
                      key={paper.id}
                      className="border-b border-stone-100 transition duration-150 last:border-b-0 hover:bg-orange-50/30"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-stone-900">
                          {paper.title}
                        </p>
                        {paper.fileUrl ? (
                          <a
                            href={paper.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline"
                          >
                            <span>Open File</span>
                            <span>↗</span>
                          </a>
                        ) : (
                          <p className="mt-1 text-xs text-stone-400">
                            No file attached
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-4 text-sm text-stone-600">
                        <p className="font-medium text-stone-800">
                          {paper.schoolName || "—"}
                        </p>
                        <p className="mt-0.5 text-xs text-stone-400">
                          {paper.standardName || "Standard not set"}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-sm font-medium text-stone-800">
                        {paper.subjectName || "—"}
                      </td>

                      <td className="px-6 py-4 text-sm text-stone-600">
                        {paper.academicYear || "—"}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            paper.extractedText?.trim()
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-stone-100 text-stone-500 border border-stone-200"
                          }`}
                        >
                          {paper.extractedText?.trim()
                            ? "Available"
                            : "Not added"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(paper)}
                            className="rounded-xl border border-orange-200 bg-white px-3.5 py-2 text-xs font-semibold text-orange-700 transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 active:translate-y-0"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => openDeleteModal(paper)}
                            disabled={deletingId === paper.id}
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
            <div className="divide-y divide-stone-100 md:hidden">
              {filteredPapers.map((paper) => (
                <article key={paper.id} className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-stone-900">
                        {paper.title}
                      </h4>
                      <p className="mt-1 text-xs text-stone-500">
                        {paper.subjectName || "No subject"} ·{" "}
                        {paper.academicYear || "No year"}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        paper.extractedText?.trim()
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-stone-100 text-stone-500 border border-stone-200"
                      }`}
                    >
                      {paper.extractedText?.trim() ? "Text" : "No text"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-stone-50 p-3 border border-stone-100">
                      <p className="text-stone-400">School</p>
                      <p className="mt-1 font-medium text-stone-800">
                        {paper.schoolName || "—"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-stone-50 p-3 border border-stone-100">
                      <p className="text-stone-400">Standard</p>
                      <p className="mt-1 font-medium text-stone-800">
                        {paper.standardName || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    {paper.fileUrl ? (
                      <a
                        href={paper.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-orange-600 hover:underline"
                      >
                        Open File ↗
                      </a>
                    ) : (
                      <span className="text-xs text-stone-400">
                        No file attached
                      </span>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(paper)}
                        className="rounded-xl border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 transition hover:bg-orange-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => openDeleteModal(paper)}
                        className="rounded-xl border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 text-[11px] text-stone-400">
                    Added {formatDate(paper.createdAt)}
                  </p>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4 lg:pl-72 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-stone-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:p-7">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Question Intelligence
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
                  {editingPaper ? "Edit Previous Paper" : "Add Previous Paper"}
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  Store paper metadata and extracted content for trend identification.
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
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-stone-700">
                    Paper Title *
                  </span>
                  <input
                    value={form.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="e.g. Physics Mid-Term 2024"
                    required
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-stone-700">
                    School Name
                  </span>
                  <input
                    value={form.schoolName}
                    onChange={(e) => updateField("schoolName", e.target.value)}
                    placeholder="e.g. St. Xavier's High School"
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-stone-700">
                    Standard / Class
                  </span>
                  <input
                    value={form.standardName}
                    onChange={(e) => updateField("standardName", e.target.value)}
                    placeholder="e.g. Class 10"
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-stone-700">
                    Subject Name
                  </span>
                  <input
                    value={form.subjectName}
                    onChange={(e) => updateField("subjectName", e.target.value)}
                    placeholder="e.g. Physics"
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-stone-700">
                    Academic Year
                  </span>
                  <input
                    value={form.academicYear}
                    onChange={(e) => updateField("academicYear", e.target.value)}
                    placeholder="e.g. 2024-25"
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-stone-700">
                    File URL
                  </span>
                  <input
                    value={form.fileUrl}
                    onChange={(e) => updateField("fileUrl", e.target.value)}
                    placeholder="https://..."
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-stone-700">
                  Extracted Text / OCR Content
                </span>
                <textarea
                  value={form.extractedText}
                  onChange={(e) => updateField("extractedText", e.target.value)}
                  placeholder="Paste OCR or extracted question text here..."
                  rows={8}
                  className="w-full resize-y rounded-xl border border-stone-200 bg-white p-4 text-sm leading-relaxed text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </label>

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
                    : editingPaper
                      ? "Update Paper"
                      : "Add Paper"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletePaper && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/45 p-4 lg:pl-72 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-stone-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-2xl text-red-600">
              🗑️
            </div>

            <h3 className="mt-4 text-xl font-bold tracking-tight text-stone-900">
              Delete Previous Paper?
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              This paper will be permanently removed from your Question Intelligence library.
            </p>

            <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50/70 p-4">
              <p className="font-semibold text-stone-900">
                {deletePaper.title}
              </p>
              <p className="mt-0.5 text-xs text-stone-500">
                {deletePaper.subjectName || "No subject"} ·{" "}
                {deletePaper.academicYear || "No academic year"}
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
                {deletingId ? "Deleting..." : "Delete Paper"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { API } from "@/lib/api";

interface Batch {
  id: string;
  name: string;
}

interface Assessment {
  id: string;
  batchId: string | null;
  name: string;
  subject: string | null;
  totalMarks: number | null;
  assessmentDate: string | null;
  batch: Batch | null;
  _count?: { performanceRecords: number };
}

interface FormState {
  batchId: string;
  name: string;
  subject: string;
  totalMarks: string;
  assessmentDate: string;
}

const emptyForm: FormState = {
  batchId: "",
  name: "",
  subject: "",
  totalMarks: "",
  assessmentDate: "",
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("synaptix_token") || "";
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Assessment | null>(null);
  const [deleteAssessment, setDeleteAssessment] = useState<Assessment | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  async function loadData() {
    const token = getToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [assessmentRes, batchRes] = await Promise.all([
        fetch(`${API}/assessments`, {
          headers: authHeaders(),
        }),
        fetch(`${API}/batches`, {
          headers: authHeaders(),
        }),
      ]);

      if (assessmentRes.status === 401 || batchRes.status === 401) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      const assessmentData = await assessmentRes.json();
      const batchData = await batchRes.json();

      if (!assessmentRes.ok) {
        throw new Error(
          assessmentData.message || "Failed to load assessments",
        );
      }

      if (!batchRes.ok) {
        throw new Error(batchData.message || "Failed to load batches");
      }

      setAssessments(
        Array.isArray(assessmentData.data) ? assessmentData.data : [],
      );

      setBatches(
        Array.isArray(batchData.batches) ? batchData.batches : [],
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load assessments",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return assessments.filter((item) => {
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.subject || "").toLowerCase().includes(q) ||
        (item.batch?.name || "").toLowerCase().includes(q);

      const matchesBatch =
        batchFilter === "ALL" || item.batchId === batchFilter;

      return matchesSearch && matchesBatch;
    });
  }, [assessments, search, batchFilter]);

  const stats = useMemo(() => {
    const totalMarks = assessments.filter(
      (a) => a.totalMarks !== null,
    ).length;

    const upcoming = assessments.filter(
      (a) =>
        a.assessmentDate &&
        new Date(a.assessmentDate).getTime() >= Date.now(),
    ).length;

    const records = assessments.reduce(
      (sum, a) => sum + (a._count?.performanceRecords || 0),
      0,
    );

    return {
      total: assessments.length,
      upcoming,
      totalMarks,
      records,
    };
  }, [assessments]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function openEdit(item: Assessment) {
    setEditing(item);

    setForm({
      batchId: item.batchId || "",
      name: item.name,
      subject: item.subject || "",
      totalMarks: item.totalMarks?.toString() || "",
      assessmentDate: item.assessmentDate
        ? new Date(item.assessmentDate).toISOString().slice(0, 10)
        : "",
    });

    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  function openDeleteModal(item: Assessment) {
    setDeleteAssessment(item);
    setError("");
    setSuccess("");
  }

  function closeDeleteModal() {
    if (deleting) return;
    setDeleteAssessment(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError("");

    const totalMarks =
      form.totalMarks.trim() === "" ? null : Number(form.totalMarks);

    if (
      totalMarks !== null &&
      (!Number.isInteger(totalMarks) || totalMarks <= 0)
    ) {
      setError("Total marks must be a positive whole number.");
      setSaving(false);
      return;
    }

    const payload = {
      batchId: form.batchId || null,
      name: form.name.trim(),
      subject: form.subject.trim() || null,
      totalMarks,
      assessmentDate: form.assessmentDate || null,
    };

    try {
      const url = editing
        ? `${API}/assessments/${editing.id}`
        : `${API}/assessments`;

      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 401) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      if (!res.ok) {
        throw new Error(
          data.message || "Failed to save assessment",
        );
      }

      setSuccess(
        editing
          ? "Assessment updated successfully."
          : "Assessment created successfully."
      );

      closeModal();
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save assessment",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteAssessment) return;

    try {
      setDeleting(true);
      setError("");
      setSuccess("");

      const res = await fetch(`${API}/assessments/${deleteAssessment.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      const data = await res.json();

      if (res.status === 401) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      if (!res.ok) {
        throw new Error(
          data.message || "Failed to delete assessment",
        );
      }

      setSuccess("Assessment deleted successfully.");
      setDeleteAssessment(null);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete assessment",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Tracking
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Assessments
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
              Manage tests and assessments for your coaching batches to drive academic performance analysis.
            </p>
          </div>

          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
          >
            <span>+</span> Add Assessment
          </button>
        </div>

        {/* Alerts */}
        {error && !modalOpen && !deleteAssessment && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && !modalOpen && !deleteAssessment && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {success}
          </div>
        )}

        {/* Stat Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              Total Assessments
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
              {stats.total}
            </p>
            <p className="mt-1 text-xs text-stone-400">All recorded tests</p>
          </div>

          <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              Upcoming
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-orange-600">
              {stats.upcoming}
            </p>
            <p className="mt-1 text-xs text-stone-400">Scheduled future tests</p>
          </div>

          <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              With Marks
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
              {stats.totalMarks}
            </p>
            <p className="mt-1 text-xs text-stone-400">With total marks defined</p>
          </div>

          <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              Performance Records
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
              {stats.records}
            </p>
            <p className="mt-1 text-xs text-stone-400">Linked student scores</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="glass mb-8 rounded-2xl border border-stone-200/70 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search assessments, subjects or batches..."
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="h-11 rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 sm:w-60"
            >
              <option value="ALL">All batches</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Container */}
        <div className="glass overflow-hidden rounded-2xl border border-stone-200/70">
          <div className="border-b border-stone-200/70 px-5 py-5 sm:px-6">
            <h2 className="text-lg font-semibold tracking-tight text-stone-900">
              Assessment Records
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              {filtered.length} assessment{filtered.length === 1 ? "" : "s"} shown
            </p>
          </div>

          {loading ? (
            <div className="p-16 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500" />
              <p className="mt-4 text-sm text-stone-500">
                Loading assessments...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100/70 text-2xl">
                📝
              </div>

              <h3 className="mt-5 text-lg font-semibold tracking-tight text-stone-900">
                No assessments found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500">
                {search || batchFilter !== "ALL"
                  ? "Try adjusting your search query or batch filter."
                  : "Create your first assessment to begin recording student marks."}
              </p>

              {!search && batchFilter === "ALL" && (
                <button
                  onClick={openCreate}
                  className="mt-6 inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0"
                >
                  + Add Assessment
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] text-left">
                  <thead>
                    <tr className="border-b border-stone-200/80 bg-stone-50/50">
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Assessment
                      </th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Batch
                      </th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Subject
                      </th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Date
                      </th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Total Marks
                      </th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Records
                      </th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-stone-100 transition duration-150 last:border-b-0 hover:bg-orange-50/30"
                      >
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-stone-900">
                            {item.name}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-sm text-stone-600">
                          {item.batch?.name || "Unassigned"}
                        </td>

                        <td className="px-6 py-4 text-sm text-stone-600">
                          {item.subject || "—"}
                        </td>

                        <td className="px-6 py-4 text-sm text-stone-600">
                          {formatDate(item.assessmentDate)}
                        </td>

                        <td className="px-6 py-4 text-sm font-semibold text-stone-700">
                          {item.totalMarks ?? "—"}
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                            {item._count?.performanceRecords || 0}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/app/assessments/${item.id}`}
                              className="inline-flex items-center justify-center rounded-xl border border-orange-100 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-600 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-100 active:translate-y-0"
                            >
                              View Details →
                            </Link>

                            <button
                              onClick={() => openEdit(item)}
                              className="rounded-xl border border-orange-200 bg-white px-3.5 py-2 text-xs font-semibold text-orange-700 transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 active:translate-y-0"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => openDeleteModal(item)}
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

              {/* Mobile Card View */}
              <div className="space-y-4 p-4 md:hidden">
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-stone-200/80 bg-white/70 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-stone-900">
                          {item.name}
                        </h3>

                        <p className="mt-0.5 text-xs text-stone-500">
                          {item.batch?.name || "Unassigned"} ·{" "}
                          {item.subject || "No subject"}
                        </p>
                      </div>

                      <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                        {item._count?.performanceRecords || 0} records
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">Date</p>
                        <p className="mt-1 font-medium text-stone-800">
                          {formatDate(item.assessmentDate)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">Total Marks</p>
                        <p className="mt-1 font-medium text-stone-800">
                          {item.totalMarks ?? "—"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/app/assessments/${item.id}`}
                        className="flex-1 inline-flex items-center justify-center rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-600 transition hover:bg-orange-100"
                      >
                        View Details →
                      </Link>

                      <button
                        onClick={() => openEdit(item)}
                        className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-50"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => openDeleteModal(item)}
                        className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit / Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4 backdrop-blur-sm lg:pl-72">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-stone-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:p-7">
            <div className="mb-5 flex items-start justify-between border-b border-stone-200/70 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  {editing ? "Edit Record" : "New Record"}
                </p>

                <h2 className="mt-1 text-xl font-bold tracking-tight text-stone-900">
                  {editing ? "Edit Assessment" : "Add Assessment"}
                </h2>
              </div>

              <button
                onClick={closeModal}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-lg text-stone-500 transition hover:border-orange-200 hover:text-orange-600"
              >
                ×
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                  Assessment Name <span className="text-orange-500">*</span>
                </label>

                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  placeholder="e.g. Physics Unit Test 1"
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                    Batch
                  </label>

                  <select
                    value={form.batchId}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        batchId: e.target.value,
                      })
                    }
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    <option value="">No batch</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                    Subject
                  </label>

                  <input
                    value={form.subject}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        subject: e.target.value,
                      })
                    }
                    placeholder="e.g. Physics"
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                    Total Marks
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.totalMarks}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        totalMarks: e.target.value,
                      })
                    }
                    placeholder="100"
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                    Assessment Date
                  </label>

                  <input
                    type="date"
                    value={form.assessmentDate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        assessmentDate: e.target.value,
                      })
                    }
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition duration-200 hover:bg-stone-50"
                >
                  Cancel
                </button>

                <button
                  disabled={saving}
                  type="submit"
                  className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editing
                      ? "Update Assessment"
                      : "Create Assessment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      {deleteAssessment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-sm lg:pl-72">
          <div className="w-full max-w-md rounded-3xl border border-stone-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-xl font-bold text-red-600">
              !
            </div>

            <h2 className="mt-4 text-xl font-bold tracking-tight text-stone-900">
              Delete Assessment?
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              Are you sure you want to remove{" "}
              <span className="font-semibold text-stone-800">
                {deleteAssessment.name}
              </span>
              ? All linked student performance records for this test will be impacted. This action cannot be undone.
            </p>

            <div className="mt-4 rounded-xl border border-stone-200/70 bg-stone-50/70 p-4">
              <div className="grid gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                    Batch & Subject
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-stone-800">
                    {deleteAssessment.batch?.name || "Unassigned"} • {deleteAssessment.subject || "No subject"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                    Total Marks & Date
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-stone-800">
                    {deleteAssessment.totalMarks ? `${deleteAssessment.totalMarks} marks` : "No marks"} • {formatDate(deleteAssessment.assessmentDate)}
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
                {deleting ? "Deleting..." : "Delete Assessment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
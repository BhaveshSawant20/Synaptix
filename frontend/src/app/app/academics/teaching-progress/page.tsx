"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/app/app/components/Modal";

import { API_URL } from "@/lib/api";

type Batch = {
  id: string;
  name: string;
};

type Subject = {
  id: string;
  name: string;
};

type Topic = {
  id: string;
  name: string;
  subject?: Subject;
};

type Teacher = {
  id: string;
  name: string;
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
  batch: Batch;
  topic: Topic;
  teacher?: Teacher | null;
};

type FormState = {
  batchId: string;
  topicId: string;
  teacherId: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  startedAt: string;
  completedAt: string;
  notes: string;
};

const emptyForm: FormState = {
  batchId: "",
  topicId: "",
  teacherId: "",
  status: "NOT_STARTED",
  startedAt: "",
  completedAt: "",
  notes: "",
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("synaptix_token") || "";
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

function formatStatus(status: TeachingProgress["status"]) {
  if (status === "IN_PROGRESS") return "In Progress";
  if (status === "COMPLETED") return "Completed";
  return "Not Started";
}

function statusClasses(status: TeachingProgress["status"]) {
  if (status === "COMPLETED") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "IN_PROGRESS") {
    return "border border-orange-200 bg-orange-50 text-orange-700";
  }

  return "border border-stone-200 bg-stone-50 text-stone-600";
}

export default function TeachingProgressPage() {
  const router = useRouter();

  const [progress, setProgress] = useState<TeachingProgress[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const [selectedBatch, setSelectedBatch] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgress, setEditingProgress] =
    useState<TeachingProgress | null>(null);
  const [deleteItem, setDeleteItem] =
    useState<TeachingProgress | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [topicsLoading, setTopicsLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function init() {
      if (!ignore) {
        await loadInitialData();
      }
    }

    init();

    return () => {
      ignore = true;
    };
  }, []);

  async function handleUnauthorized() {
    localStorage.removeItem("synaptix_token");
    router.push("/login");
  }

  async function loadInitialData() {
    try {
      const token = getToken();

      if (!token) {
        router.push("/login");
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [progressResponse, batchesResponse, teachersResponse] =
        await Promise.all([
          fetch(`${API_URL}/teaching-progress`, { headers }),
          fetch(`${API_URL}/batches`, { headers }),
          fetch(`${API_URL}/teachers`, { headers }),
        ]);

      if (
        progressResponse.status === 401 ||
        batchesResponse.status === 401 ||
        teachersResponse.status === 401
      ) {
        await handleUnauthorized();
        return;
      }

      const [progressData, batchesData, teachersData] = await Promise.all([
        progressResponse.json(),
        batchesResponse.json(),
        teachersResponse.json(),
      ]);

      if (!progressResponse.ok || !progressData.success) {
        throw new Error(
          progressData.message || "Failed to fetch teaching progress."
        );
      }

      if (!batchesResponse.ok || !batchesData.success) {
        throw new Error(batchesData.message || "Failed to fetch batches.");
      }

      if (!teachersResponse.ok || !teachersData.success) {
        throw new Error(teachersData.message || "Failed to fetch teachers.");
      }

      setProgress(progressData.teachingProgress || []);
      setBatches(batchesData.batches || []);
      setTeachers(teachersData.teachers || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load teaching progress."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadTopicsForBatch(batchId: string) {
    if (!batchId) {
      setTopics([]);
      return;
    }

    try {
      setTopicsLoading(true);

      const token = getToken();

      if (!token) {
        await handleUnauthorized();
        return;
      }

      const response = await fetch(`${API_URL}/topics`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch topics.");
      }

      setTopics(data.topics || []);
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : "Failed to load topics."
      );
    } finally {
      setTopicsLoading(false);
    }
  }

  function openAddModal() {
    setEditingProgress(null);
    setForm({
      ...emptyForm,
      batchId: selectedBatch,
    });
    setModalError("");
    setIsModalOpen(true);

    if (selectedBatch) {
      loadTopicsForBatch(selectedBatch);
    } else {
      setTopics([]);
    }
  }

  async function openEditModal(item: TeachingProgress) {
    setEditingProgress(item);

    setForm({
      batchId: item.batchId,
      topicId: item.topicId,
      teacherId: item.teacherId || "",
      status: item.status,
      startedAt: item.startedAt
        ? new Date(item.startedAt).toISOString().slice(0, 16)
        : "",
      completedAt: item.completedAt
        ? new Date(item.completedAt).toISOString().slice(0, 16)
        : "",
      notes: item.notes || "",
    });

    setModalError("");
    setIsModalOpen(true);

    await loadTopicsForBatch(item.batchId);
  }

  function closeModal() {
    if (saving) return;

    setIsModalOpen(false);
    setEditingProgress(null);
    setForm(emptyForm);
    setModalError("");
  }

  function openDeleteModal(item: TeachingProgress) {
    setDeleteItem(item);
    setError("");
    setSuccess("");
  }

  function closeDeleteModal() {
    if (deleting) return;
    setDeleteItem(null);
  }

  async function handleBatchChange(batchId: string) {
    setForm((current) => ({
      ...current,
      batchId,
      topicId: "",
    }));

    await loadTopicsForBatch(batchId);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingProgress && !form.batchId) {
      setModalError("Batch is required.");
      return;
    }

    if (!editingProgress && !form.topicId) {
      setModalError("Topic is required.");
      return;
    }

    try {
      setSaving(true);
      setModalError("");

      const payload = editingProgress
        ? {
            teacherId: form.teacherId || null,
            status: form.status,
            startedAt: form.startedAt || null,
            completedAt: form.completedAt || null,
            notes: form.notes.trim() || null,
          }
        : {
            batchId: form.batchId,
            topicId: form.topicId,
            teacherId: form.teacherId || undefined,
            status: form.status,
            startedAt: form.startedAt || undefined,
            completedAt: form.completedAt || undefined,
            notes: form.notes.trim() || undefined,
          };

      const url = editingProgress
        ? `${API_URL}/teaching-progress/${editingProgress.id}`
        : `${API_URL}/teaching-progress`;

      const method = editingProgress ? "PUT" : "POST";

      const token = getToken();

      if (!token) {
        await handleUnauthorized();
        return;
      }

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

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to save teaching progress."
        );
      }

      setSuccess(
        editingProgress
          ? "Teaching progress record updated successfully."
          : "Teaching progress record created successfully."
      );

      await loadInitialData();
      closeModal();
    } catch (err) {
      setModalError(
        err instanceof Error
          ? err.message
          : "Failed to save teaching progress."
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteItem) return;

    try {
      setDeleting(true);
      setError("");
      setSuccess("");

      const token = getToken();

      if (!token) {
        await handleUnauthorized();
        return;
      }

      const response = await fetch(
        `${API_URL}/teaching-progress/${deleteItem.id}`,
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

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to delete teaching progress."
        );
      }

      setSuccess("Teaching progress record deleted successfully.");
      setDeleteItem(null);
      await loadInitialData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete teaching progress."
      );
    } finally {
      setDeleting(false);
    }
  }

  const filteredProgress = useMemo(() => {
    const query = search.trim().toLowerCase();

    return progress.filter((item) => {
      const matchesBatch =
        !selectedBatch || item.batchId === selectedBatch;

      const matchesStatus =
        statusFilter === "ALL" || item.status === statusFilter;

      const matchesSearch =
        !query ||
        item.batch?.name?.toLowerCase().includes(query) ||
        item.topic?.name?.toLowerCase().includes(query) ||
        item.topic?.subject?.name?.toLowerCase().includes(query) ||
        item.teacher?.name?.toLowerCase().includes(query) ||
        item.notes?.toLowerCase().includes(query);

      return matchesBatch && matchesStatus && matchesSearch;
    });
  }, [progress, search, selectedBatch, statusFilter]);

  const completedCount = progress.filter(
    (item) => item.status === "COMPLETED"
  ).length;

  const inProgressCount = progress.filter(
    (item) => item.status === "IN_PROGRESS"
  ).length;

  const notStartedCount = progress.filter(
    (item) => item.status === "NOT_STARTED"
  ).length;

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
              Teaching Progress
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
              Track topic-level curriculum delivery across batches, faculty, and subjects.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
          >
            <span>+</span> Add Progress
          </button>
        </div>

        {/* Alerts */}
        {error && !isModalOpen && !deleteItem && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && !isModalOpen && !deleteItem && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {success}
          </div>
        )}

        {/* Summary Stat Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              Total Topics Tracked
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
              {progress.length}
            </p>
          </div>

          <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              Completed
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-600">
              {completedCount}
            </p>
          </div>

          <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              In Progress
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-orange-600">
              {inProgressCount}
            </p>
          </div>

          <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              Not Started
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-700">
              {notStartedCount}
            </p>
          </div>
        </div>

        {/* Filters and List */}
        <div className="glass overflow-hidden rounded-2xl border border-stone-200/70">
          <div className="flex flex-col gap-4 border-b border-stone-200/70 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-stone-900">
                Teaching Records
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                {filteredProgress.length} record
                {filteredProgress.length === 1 ? "" : "s"} shown
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search topic, teacher..."
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 sm:w-64"
              />

              <select
                value={selectedBatch}
                onChange={(event) => setSelectedBatch(event.target.value)}
                className="h-11 rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="">All Batches</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-11 rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="ALL">All Statuses</option>
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500" />
              <p className="mt-4 text-sm text-stone-500">
                Loading teaching progress...
              </p>
            </div>
          ) : filteredProgress.length === 0 ? (
            <div className="p-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100/70 text-2xl">
                📖
              </div>

              <h3 className="mt-5 text-lg font-semibold tracking-tight text-stone-900">
                No teaching progress records found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500">
                {search || selectedBatch || statusFilter !== "ALL"
                  ? "Try adjusting your filters or search term."
                  : "Start logging curriculum delivery progress across your institute's batches."}
              </p>

              {!search && !selectedBatch && statusFilter === "ALL" && (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="mt-6 inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0"
                >
                  + Add Progress
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
                        Batch
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Topic
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Teacher
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Status
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Started
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Completed
                      </th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProgress.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-stone-100 transition duration-150 last:border-b-0 hover:bg-orange-50/30"
                      >
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-stone-900">
                            {item.batch?.name || "—"}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-stone-900">
                            {item.topic?.name || "—"}
                          </p>
                          <p className="mt-0.5 text-xs text-stone-500">
                            {item.topic?.subject?.name || "No subject"}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-sm text-stone-600">
                          {item.teacher?.name || (
                            <span className="text-stone-400">Unassigned</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClasses(
                              item.status
                            )}`}
                          >
                            {formatStatus(item.status)}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-sm text-stone-600">
                          {formatDate(item.startedAt)}
                        </td>

                        <td className="px-6 py-4 text-sm text-stone-600">
                          {formatDate(item.completedAt)}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="rounded-xl border border-orange-200 bg-white px-3.5 py-2 text-xs font-semibold text-orange-700 transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 active:translate-y-0"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
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
              <div className="space-y-4 p-4 lg:hidden">
                {filteredProgress.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-stone-200/80 bg-white/70 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">
                          {item.topic?.name || "—"}
                        </p>

                        <p className="mt-0.5 text-xs text-stone-500">
                          {item.topic?.subject?.name || "No subject"}
                        </p>

                        <p className="mt-2 text-xs font-medium text-stone-700">
                          Batch: {item.batch?.name || "—"}
                        </p>
                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClasses(
                          item.status
                        )}`}
                      >
                        {formatStatus(item.status)}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">Teacher</p>
                        <p className="mt-1 font-medium text-stone-800">
                          {item.teacher?.name || "Unassigned"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">Started</p>
                        <p className="mt-1 font-medium text-stone-800">
                          {formatDate(item.startedAt)}
                        </p>
                      </div>
                    </div>

                    {item.notes && (
                      <div className="mt-3 rounded-xl border border-stone-100 bg-stone-50/70 p-3 text-xs leading-relaxed text-stone-600">
                        {item.notes}
                      </div>
                    )}

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="flex-1 rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => openDeleteModal(item)}
                        className="flex-1 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"
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
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingProgress ? "Edit Teaching Progress" : "Add Teaching Progress"}
        subtitle={editingProgress ? "Update Record" : "New Record"}
        size="2xl"
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end w-full">
            <button
              type="button"
              onClick={closeModal}
              disabled={saving}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition duration-200 hover:bg-stone-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="teaching-progress-form"
              disabled={saving}
              className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingProgress
                ? "Update Progress"
                : "Create Progress"}
            </button>
          </div>
        }
      >
        <form id="teaching-progress-form" onSubmit={handleSubmit}>
          {modalError && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {modalError}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                  Batch <span className="text-orange-500">*</span>
                </label>

                <select
                  value={form.batchId}
                  onChange={(event) =>
                    handleBatchChange(event.target.value)
                  }
                  disabled={Boolean(editingProgress)}
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:bg-stone-50 disabled:text-stone-400"
                >
                  <option value="">Select batch</option>

                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                  Topic <span className="text-orange-500">*</span>
                </label>

                <select
                  value={form.topicId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      topicId: event.target.value,
                    }))
                  }
                  disabled={Boolean(editingProgress) || topicsLoading}
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:bg-stone-50 disabled:text-stone-400"
                >
                  <option value="">
                    {topicsLoading ? "Loading topics..." : "Select topic"}
                  </option>

                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.subject?.name
                        ? `${topic.subject.name} — ${topic.name}`
                        : topic.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                Teacher
              </label>

              <select
                value={form.teacherId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    teacherId: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="">Unassigned</option>

                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                Status <span className="text-orange-500">*</span>
              </label>

              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as FormState["status"],
                  }))
                }
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                  Started At
                </label>

                <input
                  type="datetime-local"
                  value={form.startedAt}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      startedAt: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                  Completed At
                </label>

                <input
                  type="datetime-local"
                  value={form.completedAt}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      completedAt: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                Notes
              </label>

              <textarea
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                rows={4}
                placeholder="Add teaching notes or progress details..."
                className="w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm leading-relaxed text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* In-App Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteItem)}
        onClose={closeDeleteModal}
        title="Delete Teaching Progress?"
        size="md"
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end w-full">
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
              {deleting ? "Deleting..." : "Delete Record"}
            </button>
          </div>
        }
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-xl font-bold text-red-600">
          !
        </div>

        <p className="mt-3 text-sm leading-relaxed text-stone-500">
          Are you sure you want to remove the teaching progress record for{" "}
          <span className="font-semibold text-stone-800">
            {deleteItem?.topic?.name || "this topic"}
          </span>{" "}
          in batch{" "}
          <span className="font-semibold text-stone-800">
            {deleteItem?.batch?.name || "this batch"}
          </span>
          ? This action cannot be undone.
        </p>

        {deleteItem && (
          <div className="mt-4 rounded-xl border border-stone-200/70 bg-stone-50/70 p-4">
            <div className="grid gap-2.5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                  Topic
                </p>
                <p className="mt-0.5 text-sm font-medium text-stone-800">
                  {deleteItem.topic?.name || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                  Batch & Teacher
                </p>
                <p className="mt-0.5 text-sm font-medium text-stone-800">
                  {deleteItem.batch?.name || "—"} • {deleteItem.teacher?.name || "Unassigned"}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
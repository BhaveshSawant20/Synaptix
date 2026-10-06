"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { API_BASE } from "@/lib/api";

type Subject = {
  id: string;
  name: string;
  code?: string | null;
};

type Topic = {
  id: string;
  instituteId: string;
  subjectId: string;
  name: string;
  description?: string | null;
  orderIndex?: number | null;
  createdAt: string;
  updatedAt: string;
  subject?: Subject | null;
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

export default function TopicsPage() {
  const router = useRouter();

  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("ALL");

  const [showModal, setShowModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Topic | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState({
    subjectId: "",
    name: "",
    description: "",
    orderIndex: "",
  });

  async function loadData() {
    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [topicsResponse, subjectsResponse] = await Promise.all([
        fetch(`${API_BASE}/topics`, {
          headers,
        }),
        fetch(`${API_BASE}/subjects`, {
          headers,
        }),
      ]);

      if (
        topicsResponse.status === 401 ||
        subjectsResponse.status === 401
      ) {
        localStorage.removeItem("synaptix_token");
        router.replace("/login");
        return;
      }

      const topicsData = await parseJsonResponse(topicsResponse);
      const subjectsData = await parseJsonResponse(subjectsResponse);

      if (!topicsResponse.ok) {
        throw new Error(
          topicsData.message || "Unable to load topics"
        );
      }

      if (!subjectsResponse.ok) {
        throw new Error(
          subjectsData.message || "Unable to load subjects"
        );
      }

      setTopics(
        Array.isArray(topicsData.topics)
          ? topicsData.topics
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
          : "Unable to load topics"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredTopics = useMemo(() => {
    const query = search.trim().toLowerCase();

    return topics.filter((topic) => {
      const matchesSearch =
        !query ||
        topic.name.toLowerCase().includes(query) ||
        topic.description?.toLowerCase().includes(query) ||
        topic.subject?.name.toLowerCase().includes(query);

      const matchesSubject =
        subjectFilter === "ALL" ||
        topic.subjectId === subjectFilter;

      return matchesSearch && matchesSubject;
    });
  }, [topics, search, subjectFilter]);

  function openCreateModal() {
    setEditingTopic(null);
    setFormError("");

    setForm({
      subjectId: subjects.length > 0 ? subjects[0].id : "",
      name: "",
      description: "",
      orderIndex: "",
    });

    setShowModal(true);
  }

  function openEditModal(topic: Topic) {
    setEditingTopic(topic);
    setFormError("");

    setForm({
      subjectId: topic.subjectId,
      name: topic.name,
      description: topic.description || "",
      orderIndex:
        topic.orderIndex !== null &&
        topic.orderIndex !== undefined
          ? String(topic.orderIndex)
          : "",
    });

    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingTopic(null);
    setFormError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    if (!form.subjectId) {
      setFormError("Please select a subject.");
      return;
    }

    if (!form.name.trim()) {
      setFormError("Topic name is required.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const isEditing = Boolean(editingTopic);

      const response = await fetch(
        isEditing
          ? `${API_BASE}/topics/${editingTopic?.id}`
          : `${API_BASE}/topics`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            isEditing
              ? {
                  name: form.name.trim(),
                  description:
                    form.description.trim() || null,
                  orderIndex:
                    form.orderIndex.trim() === ""
                      ? null
                      : Number(form.orderIndex),
                }
              : {
                  subjectId: form.subjectId,
                  name: form.name.trim(),
                  description:
                    form.description.trim() || null,
                  orderIndex:
                    form.orderIndex.trim() === ""
                      ? null
                      : Number(form.orderIndex),
                }
          ),
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        router.replace("/login");
        return;
      }

      const data = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
            (isEditing
              ? "Failed to update topic"
              : "Failed to create topic")
        );
      }

      setShowModal(false);
      setEditingTopic(null);

      await loadData();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setDeletingId(deleteTarget.id);
      setError("");

      const response = await fetch(
        `${API_BASE}/topics/${deleteTarget.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        router.replace("/login");
        return;
      }

      const data = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to delete topic"
        );
      }

      setTopics((current) =>
        current.filter((item) => item.id !== deleteTarget.id)
      );
      setDeleteTarget(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete topic"
      );
    } finally {
      setDeletingId(null);
    }
  }

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
                Topics & Modules
              </h1>

              <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-stone-500">
                Organize chapter-level syllabus topics, order them sequentially, and link them to curriculum subjects.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
            >
              <span className="text-base leading-none">+</span>
              Add Topic
            </button>
          </div>
        </section>

        {/* Filters */}
        <section className="rounded-3xl border border-orange-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
          <div className="grid gap-4 md:grid-cols-[1fr_260px]">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Search Topics
              </label>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search by topic, description or subject..."
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Subject
              </label>

              <select
                value={subjectFilter}
                onChange={(event) =>
                  setSubjectFilter(event.target.value)
                }
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="ALL">All Subjects</option>

                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Content */}
        <section className="overflow-hidden rounded-3xl border border-orange-100/70 bg-white/80 shadow-sm backdrop-blur-xl">
          <div className="border-b border-stone-200/70 px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-stone-900">
                  Curriculum Topics
                </h2>

                <p className="mt-0.5 text-xs text-stone-500">
                  {filteredTopics.length} topic
                  {filteredTopics.length === 1 ? "" : "s"} found
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4 p-8 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" />
              <p className="mt-4 text-sm font-medium text-stone-500">
                Loading academic topics...
              </p>
            </div>
          ) : filteredTopics.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-2xl">
                📚
              </div>

              <h3 className="mt-4 text-lg font-semibold tracking-tight text-stone-900">
                No topics found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
                {search || subjectFilter !== "ALL"
                  ? "Try changing your search query or subject filter."
                  : "Create your first topic to start organizing the academic syllabus."}
              </p>

              {!search && subjectFilter === "ALL" && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-5 inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0"
                >
                  + Add Topic
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {filteredTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="p-6 transition duration-150 hover:bg-orange-50/30"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-stone-900">
                          {topic.name}
                        </h3>

                        {topic.orderIndex !== null &&
                          topic.orderIndex !== undefined && (
                            <span className="inline-flex rounded-full border border-orange-100 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                              Order #{topic.orderIndex}
                            </span>
                          )}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold text-orange-600">
                          {topic.subject?.name || "No Subject"}
                        </span>

                        {topic.subject?.code && (
                          <>
                            <span className="text-stone-300">•</span>
                            <span className="text-xs text-stone-500">
                              {topic.subject.code}
                            </span>
                          </>
                        )}
                      </div>

                      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-500">
                        {topic.description ||
                          "No description available."}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/app/academics/topics/${topic.id}`}
                        className="inline-flex items-center justify-center rounded-xl border border-orange-100 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-600 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-100 active:translate-y-0"
                      >
                        View Details →
                      </Link>

                      <button
                        type="button"
                        onClick={() => openEditModal(topic)}
                        className="rounded-xl border border-orange-200 bg-white px-3.5 py-2 text-xs font-semibold text-orange-700 transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 active:translate-y-0"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(topic)}
                        disabled={deletingId === topic.id}
                        className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 transition duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-100 disabled:opacity-60 active:translate-y-0"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 px-5 py-8 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-orange-100 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  {editingTopic ? "Edit Topic" : "New Topic"}
                </p>

                <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-stone-900">
                  {editingTopic ? "Update Topic" : "Add Topic"}
                </h2>

                <p className="mt-1 text-sm text-stone-500">
                  {editingTopic
                    ? "Update the topic syllabus parameters."
                    : "Create a new chapter or module topic."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-lg text-stone-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-4"
            >
              {!editingTopic && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Subject
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
                    required
                  >
                    <option value="">
                      Select Subject
                    </option>

                    {subjects.map((subject) => (
                      <option
                        key={subject.id}
                        value={subject.id}
                      >
                        {subject.name}
                        {subject.code
                          ? ` (${subject.code})`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {editingTopic && (
                <div className="rounded-xl border border-orange-100 bg-orange-50/60 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">
                    Subject
                  </p>

                  <p className="mt-1 text-sm font-semibold text-stone-800">
                    {editingTopic.subject?.name ||
                      "Unknown Subject"}
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Topic Name
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
                  placeholder="e.g. Thermodynamics"
                  required
                  className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
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
                  placeholder="Enter topic outline or syllabus details"
                  rows={3}
                  className="mt-2 w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Order Index
                  <span className="ml-1 font-normal lowercase text-stone-400">
                    (optional sequence)
                  </span>
                </label>

                <input
                  type="number"
                  min="0"
                  value={form.orderIndex}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      orderIndex: event.target.value,
                    }))
                  }
                  placeholder="e.g. 1"
                  className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeModal}
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
                  {saving
                    ? "Saving..."
                    : editingTopic
                    ? "Save Changes"
                    : "Create Topic"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/45 px-5 py-8 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl font-bold text-red-600">
              !
            </div>

            <h2 className="mt-5 text-lg font-semibold tracking-tight text-stone-900">
              Delete topic?
            </h2>

            <p className="mt-2 text-sm leading-6 text-stone-500">
              Are you sure you want to delete{" "}
              <strong className="font-semibold text-stone-800">
                {deleteTarget.name}
              </strong>
              {deleteTarget.subject?.name
                ? ` under ${deleteTarget.subject.name}`
                : ""}? This action cannot be undone and will affect teaching progress records.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
                {deletingId ? "Deleting..." : "Delete Topic"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
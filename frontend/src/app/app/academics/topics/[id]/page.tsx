"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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

type TeachingProgress = {
  id: string;
  batchId: string;
  topicId: string;
  teacherId?: string | null;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  startedAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  batch?: {
    id: string;
    name: string;
  } | null;
  teacher?: {
    id: string;
    name: string;
  } | null;
  topic?: {
    id: string;
    name: string;
    subject?: {
      id: string;
      name: string;
    } | null;
  } | null;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  topic?: Topic;
  teachingProgress?: TeachingProgress[];
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

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatStatus(status: TeachingProgress["status"]) {
  switch (status) {
    case "COMPLETED":
      return "Completed";
    case "IN_PROGRESS":
      return "In Progress";
    default:
      return "Not Started";
  }
}

function statusClasses(status: TeachingProgress["status"]) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "IN_PROGRESS":
      return "bg-orange-50 text-orange-700 border-orange-200";
    default:
      return "bg-stone-50 text-stone-600 border-stone-200";
  }
}

export default function TopicDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const topicId = String(params.id);

  const [topic, setTopic] = useState<Topic | null>(null);
  const [teachingProgress, setTeachingProgress] = useState<
    TeachingProgress[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    orderIndex: "",
  });

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    async function loadTopicDetails() {
      try {
        setLoading(true);
        setError("");

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [topicResponse, progressResponse] = await Promise.all([
          fetch(`${API_BASE}/topics/${topicId}`, {
            headers,
          }),
          fetch(`${API_BASE}/teaching-progress`, {
            headers,
          }),
        ]);

        if (topicResponse.status === 401 || progressResponse.status === 401) {
          localStorage.removeItem("synaptix_token");
          router.replace("/login");
          return;
        }

        const topicData: ApiResponse =
          await parseJsonResponse(topicResponse);

        const progressData: ApiResponse =
          await parseJsonResponse(progressResponse);

        if (!topicResponse.ok || !topicData.topic) {
          throw new Error(
            topicData.message || "Unable to load topic"
          );
        }

        setTopic(topicData.topic);

        const allProgress = Array.isArray(progressData.teachingProgress)
          ? progressData.teachingProgress
          : [];

        setTeachingProgress(
          allProgress.filter((item) => item.topicId === topicId)
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load topic"
        );
      } finally {
        setLoading(false);
      }
    }

    loadTopicDetails();
  }, [router, topicId]);

  function openEditModal() {
    if (!topic) return;

    setEditError("");

    setEditForm({
      name: topic.name || "",
      description: topic.description || "",
      orderIndex:
        topic.orderIndex !== null && topic.orderIndex !== undefined
          ? String(topic.orderIndex)
          : "",
    });

    setShowEditModal(true);
  }

  function closeEditModal() {
    if (saving) return;

    setShowEditModal(false);
    setEditError("");
  }

  async function handleUpdateTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    if (!editForm.name.trim()) {
      setEditError("Topic name is required.");
      return;
    }

    try {
      setSaving(true);
      setEditError("");

      const response = await fetch(`${API_BASE}/topics/${topicId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
          orderIndex:
            editForm.orderIndex.trim() === ""
              ? null
              : Number(editForm.orderIndex),
        }),
      });

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        router.replace("/login");
        return;
      }

      const data: ApiResponse = await parseJsonResponse(response);

      if (!response.ok || !data.topic) {
        throw new Error(
          data.message || "Failed to update topic"
        );
      }

      setTopic(data.topic);
      setShowEditModal(false);
    } catch (err) {
      setEditError(
        err instanceof Error
          ? err.message
          : "Failed to update topic"
      );
    } finally {
      setSaving(false);
    }
  }

  const progressSummary = useMemo(() => {
    const completed = teachingProgress.filter(
      (item) => item.status === "COMPLETED"
    ).length;

    const inProgress = teachingProgress.filter(
      (item) => item.status === "IN_PROGRESS"
    ).length;

    const notStarted = teachingProgress.filter(
      (item) => item.status === "NOT_STARTED"
    ).length;

    return {
      total: teachingProgress.length,
      completed,
      inProgress,
      notStarted,
    };
  }, [teachingProgress]);

  if (loading) {
    return (
      <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" />
            <p className="mt-4 text-sm font-medium text-stone-500">
              Loading topic details...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !topic) {
    return (
      <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <button
            type="button"
            onClick={() => router.back()}
            className="group mb-6 inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition duration-200 hover:text-orange-600"
          >
            <span className="transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
            Back to Topics
          </button>

          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
            <h1 className="text-xl font-bold text-stone-900">
              Unable to load topic
            </h1>

            <p className="mt-2 text-sm text-red-600">
              {error || "Topic not found."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => router.back()}
          className="group inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition duration-200 hover:text-orange-600"
        >
          <span className="transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
          Back to Topics
        </button>

        {/* Header */}
        <section className="relative overflow-hidden rounded-3xl border border-orange-100/70 bg-white/80 p-7 shadow-sm backdrop-blur-xl sm:p-8">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-orange-100/60 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                Curriculum Topic
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
                {topic.name}
              </h1>

              {topic.subject && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                    Subject: {topic.subject.name}
                  </span>

                  {topic.subject.code && (
                    <span className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-xs font-semibold text-stone-600">
                      {topic.subject.code}
                    </span>
                  )}
                </div>
              )}

              {topic.description && (
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-stone-500">
                  {topic.description}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={openEditModal}
                className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
              >
                Edit Topic
              </button>

              {topic.subject && (
                <Link
                  href={`/app/academics/subjects/${topic.subject.id}`}
                  className="inline-flex items-center justify-center rounded-xl border border-orange-100 bg-orange-50 px-4 py-2.5 text-xs font-semibold text-orange-600 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-100 active:translate-y-0"
                >
                  View Subject →
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Summary Stats */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-orange-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Subject
            </p>

            <p className="mt-3 text-lg font-bold tracking-tight text-stone-900">
              {topic.subject?.name || "—"}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Assigned curriculum discipline
            </p>
          </div>

          <div className="rounded-3xl border border-orange-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Order Index
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-stone-900">
              {topic.orderIndex ?? "—"}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Syllabus sequence position
            </p>
          </div>

          <div className="rounded-3xl border border-orange-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Batch Records
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-stone-900">
              {progressSummary.total}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Batches tracking this topic
            </p>
          </div>

          <div className="rounded-3xl border border-orange-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Completed
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-emerald-600">
              {progressSummary.completed}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Batches completed this topic
            </p>
          </div>
        </section>

        {/* Topic Information Details */}
        <section className="rounded-3xl border border-orange-100/70 bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-7">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                Topic Information
              </p>

              <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
                Basic Details
              </h2>
            </div>

            {topic.subject && (
              <Link
                href={`/app/academics/subjects/${topic.subject.id}`}
                className="inline-flex items-center justify-center rounded-xl border border-orange-100 bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-600 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-100 active:translate-y-0"
              >
                View Subject Details →
              </Link>
            )}
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Topic Name
              </p>

              <p className="mt-1.5 text-sm font-semibold text-stone-900">
                {topic.name}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Subject
              </p>

              <p className="mt-1.5 text-sm font-semibold text-stone-900">
                {topic.subject?.name || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Created
              </p>

              <p className="mt-1.5 text-sm font-medium text-stone-700">
                {formatDate(topic.createdAt)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Last Updated
              </p>

              <p className="mt-1.5 text-sm font-medium text-stone-700">
                {formatDate(topic.updatedAt)}
              </p>
            </div>
          </div>

          {topic.description && (
            <div className="mt-6 border-t border-stone-100 pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Syllabus Outline
              </p>

              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                {topic.description}
              </p>
            </div>
          )}
        </section>

        {/* Teaching Progress Table */}
        <section className="overflow-hidden rounded-3xl border border-orange-100/70 bg-white/80 shadow-sm backdrop-blur-xl">
          <div className="border-b border-stone-200/70 p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Cohort Coverage
            </p>

            <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-stone-900">
              Teaching Progress across Batches
            </h2>

            <p className="mt-1 text-sm text-stone-500">
              Batch-wise instruction progress recorded for this syllabus module.
            </p>
          </div>

          {teachingProgress.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-2xl">
                📖
              </div>

              <p className="mt-4 text-sm font-semibold text-stone-800">
                No teaching progress recorded yet
              </p>

              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-stone-500">
                Teaching progress for this topic will appear here once faculty log completed lecture sessions.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/50">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      Batch
                    </th>

                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      Teacher
                    </th>

                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      Status
                    </th>

                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      Started
                    </th>

                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      Completed
                    </th>

                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {teachingProgress.map((progress) => (
                    <tr
                      key={progress.id}
                      className="border-b border-stone-100 transition duration-150 last:border-b-0 hover:bg-orange-50/30"
                    >
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-stone-900">
                          {progress.batch?.name || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-stone-600">
                        {progress.teacher?.name || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClasses(
                            progress.status
                          )}`}
                        >
                          {formatStatus(progress.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-stone-600">
                        {formatDate(progress.startedAt)}
                      </td>

                      <td className="px-5 py-4 text-sm text-stone-600">
                        {formatDate(progress.completedAt)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {progress.batch?.id ? (
                          <Link
                            href={`/app/batches/${progress.batch.id}`}
                            className="inline-flex items-center justify-center rounded-xl border border-orange-100 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-600 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-100 active:translate-y-0"
                          >
                            View Batch →
                          </Link>
                        ) : (
                          <span className="text-xs text-stone-400">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 px-5 py-8 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-orange-100 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Edit Topic
                </p>

                <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-stone-900">
                  Update Topic Information
                </h2>

                <p className="mt-1 text-sm text-stone-500">
                  Modify the topic syllabus name, description, or sequence order.
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
              onSubmit={handleUpdateTopic}
              className="mt-6 space-y-4"
            >
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Topic Name
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
                  placeholder="Enter topic name"
                  required
                  className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Description
                </label>

                <textarea
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Enter topic description"
                  rows={3}
                  className="mt-2 w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Order Index
                </label>

                <input
                  type="number"
                  min="0"
                  value={editForm.orderIndex}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      orderIndex: event.target.value,
                    }))
                  }
                  placeholder="e.g. 1"
                  className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
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
    </main>
  );
}
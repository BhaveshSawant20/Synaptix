"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Subject = {
  id: string;
  name: string;
  code?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type SubjectForm = {
  name: string;
  code: string;
};

import { API_URL } from "@/lib/api";

export default function SubjectsPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const [form, setForm] = useState<SubjectForm>({
    name: "",
    code: "",
  });

  const filteredSubjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return subjects;
    }

    return subjects.filter((subject) => {
      return (
        subject.name.toLowerCase().includes(query) ||
        (subject.code ?? "").toLowerCase().includes(query)
      );
    });
  }, [subjects, search]);

  async function loadSubjects() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("synaptix_token");

      if (!token) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch(`${API_URL}/subjects`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load subjects.");
      }

      setSubjects(Array.isArray(data.subjects) ? data.subjects : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load subjects."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubjects();
  }, []);

  function openAddModal() {
    setEditingSubject(null);
    setForm({
      name: "",
      code: "",
    });
    setError("");
    setIsModalOpen(true);
  }

  function openEditModal(subject: Subject) {
    setEditingSubject(subject);
    setForm({
      name: subject.name,
      code: subject.code ?? "",
    });
    setError("");
    setIsModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setIsModalOpen(false);
    setEditingSubject(null);
    setForm({
      name: "",
      code: "",
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    const code = form.code.trim();

    if (!name) {
      setError("Subject name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const token = localStorage.getItem("synaptix_token");

      if (!token) {
        window.location.href = "/login";
        return;
      }

      const isEditing = Boolean(editingSubject);

      const response = await fetch(
        isEditing
          ? `${API_URL}/subjects/${editingSubject?.id}`
          : `${API_URL}/subjects`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name,
            code: code || null,
          }),
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            `Failed to ${isEditing ? "update" : "create"} subject.`
        );
      }

      setIsModalOpen(false);
      setEditingSubject(null);
      setForm({
        name: "",
        code: "",
      });

      await loadSubjects();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save subject."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;

    try {
      setDeletingId(deleteTarget.id);
      setError("");

      const token = localStorage.getItem("synaptix_token");

      if (!token) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch(`${API_URL}/subjects/${deleteTarget.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete subject.");
      }

      setDeleteTarget(null);
      await loadSubjects();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete subject."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Academics
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Subjects
            </h1>

            <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-stone-500">
              Manage the curriculum subjects and discipline identifiers offered by your coaching institute.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
          >
            <span className="text-base leading-none">+</span>
            Add Subject
          </button>
        </div>

        {/* Summary */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-orange-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Total Subjects
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-stone-900">
              {subjects.length}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Subjects active in this institute
            </p>
          </div>

          <div className="rounded-3xl border border-orange-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Search Results
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-stone-900">
              {filteredSubjects.length}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Subjects matching your filter
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="mb-6 rounded-2xl border border-orange-100/70 bg-white/80 p-4 shadow-sm backdrop-blur-xl">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by subject name or code..."
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
        </div>

        {/* Subjects Table */}
        <div className="overflow-hidden rounded-3xl border border-orange-100/70 bg-white/80 shadow-sm backdrop-blur-xl">
          {loading ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" />
              <p className="mt-4 text-sm font-medium text-stone-500">
                Loading subjects...
              </p>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-2xl">
                📚
              </div>

              <h2 className="mt-5 text-lg font-semibold tracking-tight text-stone-900">
                {search ? "No subjects found" : "No subjects yet"}
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
                {search
                  ? "Try searching for a different subject name or code."
                  : "Add your first subject to start building the institute's academic structure."}
              </p>

              {!search && (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="mt-6 inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0"
                >
                  Add Subject
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px]">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/50">
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      Subject
                    </th>

                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      Code
                    </th>

                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSubjects.map((subject) => (
                    <tr
                      key={subject.id}
                      className="border-b border-stone-100 transition duration-150 last:border-b-0 hover:bg-orange-50/30"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-sm font-bold text-orange-700">
                            {subject.name.charAt(0).toUpperCase()}
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-stone-900">
                              {subject.name}
                            </p>

                            <p className="mt-0.5 text-xs text-stone-400">
                              Subject
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {subject.code ? (
                          <span className="inline-flex rounded-lg border border-orange-100 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
                            {subject.code}
                          </span>
                        ) : (
                          <span className="text-sm text-stone-400">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => router.push(`/app/academics/subjects/${subject.id}`)}
                            className="inline-flex items-center justify-center rounded-xl border border-orange-100 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-600 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-100 active:translate-y-0"
                          >
                            View Details →
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(subject)}
                            className="rounded-xl border border-orange-200 bg-white px-3.5 py-2 text-xs font-semibold text-orange-700 transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 active:translate-y-0"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(subject)}
                            disabled={deletingId === subject.id}
                            className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 transition duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-100 disabled:opacity-60 active:translate-y-0"
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
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 px-5 py-8 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-orange-100 bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  {editingSubject ? "Edit Subject" : "New Subject"}
                </p>

                <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-stone-900">
                  {editingSubject
                    ? "Update Subject"
                    : "Add a Subject"}
                </h2>

                <p className="mt-1 text-sm text-stone-500">
                  {editingSubject
                    ? "Update the subject details below."
                    : "Add a subject to your institute's academic structure."}
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

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Subject Name
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
                  placeholder="e.g. Physics"
                  autoFocus
                  required
                  className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Subject Code
                  <span className="ml-1 font-normal lowercase text-stone-400">
                    (optional)
                  </span>
                </label>

                <input
                  type="text"
                  value={form.code}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      code: event.target.value,
                    }))
                  }
                  placeholder="e.g. PHY"
                  className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm uppercase text-stone-900 placeholder:normal-case placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>

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
                    ? editingSubject
                      ? "Updating..."
                      : "Adding..."
                    : editingSubject
                      ? "Update Subject"
                      : "Add Subject"}
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
              Delete subject?
            </h2>

            <p className="mt-2 text-sm leading-6 text-stone-500">
              Are you sure you want to delete{" "}
              <strong className="font-semibold text-stone-800">
                {deleteTarget.name}
              </strong>
              {deleteTarget.code ? ` (${deleteTarget.code})` : ""}? This action
              cannot be undone and will affect topics and assessments linked to this subject.
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
                {deletingId ? "Deleting..." : "Delete Subject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
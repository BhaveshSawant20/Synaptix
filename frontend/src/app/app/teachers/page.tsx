"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { API_BASE } from "@/lib/api";

type Teacher = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  specialization?: string | null;
};

type TeacherForm = {
  name: string;
  email: string;
  phone: string;
  specialization: string;
};

const emptyForm: TeacherForm = {
  name: "",
  email: "",
  phone: "",
  specialization: "",
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("synaptix_token") || "";
}

function getHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  };
}

function getInitials(name: string) {
  if (!name.trim()) return "TC";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [form, setForm] = useState<TeacherForm>(emptyForm);

  // Dedicated Delete Confirmation Modal state
  const [deletingTeacher, setDeletingTeacher] = useState<Teacher | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function loadTeachers() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE}/teachers`, {
        headers: getHeaders(),
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load teachers.");
      }

      setTeachers(Array.isArray(data.teachers) ? data.teachers : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading teachers."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/login";
      return;
    }

    loadTeachers();
  }, []);

  const filteredTeachers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return teachers;

    return teachers.filter((teacher) => {
      const values = [
        teacher.name,
        teacher.email,
        teacher.phone,
        teacher.specialization,
      ];

      return values.some((value) =>
        value?.toLowerCase().includes(query)
      );
    });
  }, [teachers, search]);

  function openCreateModal() {
    setEditingTeacher(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function openEditModal(teacher: Teacher) {
    setEditingTeacher(teacher);
    setForm({
      name: teacher.name || "",
      email: teacher.email || "",
      phone: teacher.phone || "",
      specialization: teacher.specialization || "",
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingTeacher(null);
    setForm(emptyForm);
  }

  function updateForm(field: keyof TeacherForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Teacher name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        specialization: form.specialization.trim() || undefined,
      };

      const url = editingTeacher
        ? `${API_BASE}/teachers/${editingTeacher.id}`
        : `${API_BASE}/teachers`;

      const response = await fetch(url, {
        method: editingTeacher ? "PUT" : "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            `Failed to ${editingTeacher ? "update" : "create"} teacher.`
        );
      }

      closeModal();
      setSuccess(
        editingTeacher
          ? "Teacher updated successfully."
          : "Teacher added successfully."
      );
      await loadTeachers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while saving the teacher."
      );
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(teacher: Teacher) {
    setDeletingTeacher(teacher);
  }

  async function handleDeleteConfirmed() {
    if (!deletingTeacher) return;

    try {
      setIsDeleting(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_BASE}/teachers/${deletingTeacher.id}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete teacher.");
      }

      setSuccess(`Teacher "${deletingTeacher.name}" deleted successfully.`);
      setDeletingTeacher(null);
      await loadTeachers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while deleting the teacher."
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main className="w-full px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
              <span>👨‍🏫</span>
              Faculty Directory
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
              Teachers
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
              Manage your institute&apos;s teaching faculty, contact profiles, and academic subject specializations.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
          >
            <span className="text-base leading-none">+</span>
            <span>Add Teacher</span>
          </button>
        </section>

        {/* Alerts */}
        {error && !showModal && !deletingTeacher && (
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        )}

        {success && (
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700">
                ✓
              </span>
              <span>{success}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccess("")}
              className="text-emerald-500 hover:text-emerald-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Summary */}
        <section className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="glass rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
              Total Faculty
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
              {teachers.length}
            </p>
          </div>

          <div className="glass rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
              Active Specializations
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
              {
                new Set(
                  teachers
                    .map((teacher) => teacher.specialization?.trim())
                    .filter(Boolean)
                ).size
              }
            </p>
          </div>
        </section>

        {/* Search */}
        <section className="mt-7">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
              ⌕
            </span>

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search teachers by name, email, phone or specialization..."
              className="h-12 w-full rounded-2xl border border-stone-200 bg-white pl-11 pr-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 hover:border-stone-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </div>
        </section>

        {/* Teachers table */}
        <section className="mt-7 overflow-hidden rounded-3xl border border-stone-200/70 bg-white/80 shadow-sm backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="border-b border-stone-100 text-left">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Teacher
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Email
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Phone
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Specialization
                  </th>

                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <tr
                      key={index}
                      className="border-b border-stone-100 last:border-b-0"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 animate-pulse rounded-xl bg-stone-200" />
                          <div className="space-y-2">
                            <div className="h-4 w-32 animate-pulse rounded bg-stone-200" />
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <div className="h-4 w-32 animate-pulse rounded bg-stone-100" />
                      </td>

                      <td className="px-5 py-5">
                        <div className="h-4 w-28 animate-pulse rounded bg-stone-100" />
                      </td>

                      <td className="px-5 py-5">
                        <div className="h-7 w-24 animate-pulse rounded-xl bg-stone-100" />
                      </td>

                      <td className="px-6 py-5">
                        <div className="ml-auto h-9 w-32 animate-pulse rounded-xl bg-stone-100" />
                      </td>
                    </tr>
                  ))
                ) : filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16">
                      <div className="mx-auto max-w-md text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-2xl text-orange-500">
                          {search ? "⌕" : "👨‍🏫"}
                        </div>

                        <h3 className="mt-5 text-lg font-semibold tracking-tight text-stone-900">
                          {search ? "No teachers found" : "No teachers yet"}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-stone-500">
                          {search
                            ? "Try refining your search terms or clearing the filter."
                            : "Add your first teacher to start assigning instructors to batches and tracking progress."}
                        </p>

                        {!search && (
                          <button
                            type="button"
                            onClick={openCreateModal}
                            className="mt-5 inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0"
                          >
                            + Add Teacher
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTeachers.map((teacher) => (
                    <tr
                      key={teacher.id}
                      className="border-b border-stone-100 transition duration-150 last:border-b-0 hover:bg-orange-50/30"
                    >
                      {/* Teacher */}
                      <td className="px-6 py-4">
                        <Link
                          href={`/app/teachers/${teacher.id}`}
                          className="group flex w-fit items-center gap-3 rounded-xl outline-none transition focus-visible:ring-4 focus-visible:ring-orange-100"
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-sm font-bold text-orange-700 transition duration-200 group-hover:bg-orange-200">
                            {getInitials(teacher.name)}
                          </div>

                          <p className="font-semibold text-stone-900 transition duration-150 group-hover:text-orange-600">
                            {teacher.name}
                          </p>
                        </Link>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-4 text-sm text-stone-600">
                        {teacher.email || "—"}
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-4 text-sm text-stone-600">
                        {teacher.phone || "—"}
                      </td>

                      {/* Specialization */}
                      <td className="px-5 py-4">
                        {teacher.specialization ? (
                          <span className="inline-flex rounded-xl bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
                            {teacher.specialization}
                          </span>
                        ) : (
                          <span className="text-sm text-stone-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* View Details */}
                          <Link
                            href={`/app/teachers/${teacher.id}`}
                            className="inline-flex items-center justify-center rounded-xl border border-orange-100 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-600 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-100 active:translate-y-0"
                          >
                            View Details →
                          </Link>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => openEditModal(teacher)}
                            className="rounded-xl border border-orange-200 bg-white px-3.5 py-2 text-xs font-semibold text-orange-700 transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 active:translate-y-0"
                          >
                            Edit
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => confirmDelete(teacher)}
                            className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 transition duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-100 active:translate-y-0"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/45 px-4 py-6 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-orange-100 bg-[#fffdf9] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-6 py-5 sm:px-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Faculty Management
                </p>

                <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
                  {editingTeacher ? "Edit Teacher" : "Add Teacher"}
                </h2>

                <p className="mt-1 text-sm text-stone-500">
                  {editingTeacher
                    ? "Update the faculty member's profile and subject specialization."
                    : "Register a new teacher to your institute directory."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto">
              <div className="px-6 py-6 sm:px-7">
                {error && (
                  <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  {/* Name */}
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-stone-700">
                      Teacher Name *
                    </label>

                    <input
                      type="text"
                      value={form.name}
                      onChange={(event) =>
                        updateForm("name", event.target.value)
                      }
                      placeholder="e.g. Dr. Rajesh Sharma"
                      className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-xs font-semibold text-stone-700">
                      Email Address
                    </label>

                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        updateForm("email", event.target.value)
                      }
                      placeholder="teacher@example.com"
                      className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="text-xs font-semibold text-stone-700">
                      Phone Number
                    </label>

                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(event) =>
                        updateForm("phone", event.target.value)
                      }
                      placeholder="e.g. 9876543210"
                      className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  {/* Specialization */}
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-stone-700">
                      Specialization / Subjects
                    </label>

                    <input
                      type="text"
                      value={form.specialization}
                      onChange={(event) =>
                        updateForm("specialization", event.target.value)
                      }
                      placeholder="e.g. Mathematics, Physics, Chemistry"
                      className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-stone-100 bg-white/80 px-6 py-5 sm:flex-row sm:justify-end sm:px-7">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-600 transition duration-150 hover:border-stone-300 hover:bg-stone-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-150 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingTeacher
                    ? "Save Changes"
                    : "Add Teacher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Delete Confirmation Modal */}
      {deletingTeacher && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isDeleting) {
              setDeletingTeacher(null);
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-red-100 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-xl font-bold text-red-600">
                ⚠
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-stone-900">
                  Delete Teacher
                </h3>
                <p className="mt-0.5 text-xs text-stone-500">
                  Permanent removal confirmation
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-stone-600">
              Are you sure you want to delete{" "}
              <strong className="font-semibold text-stone-900">
                {deletingTeacher.name}
              </strong>
              ? This action cannot be undone and will unassign the teacher from active batches and progress records.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingTeacher(null)}
                disabled={isDeleting}
                className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-xs font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteConfirmed}
                disabled={isDeleting}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-red-200 transition duration-150 hover:bg-red-700 disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Delete Teacher"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
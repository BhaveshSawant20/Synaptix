"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { API_BASE } from "@/lib/api";

type School = {
  id: string;
  name: string;
};

type Standard = {
  id: string;
  name: string;
  schoolId: string;
  school?: School | null;
  createdAt: string;
};

type StandardForm = {
  name: string;
  schoolId: string;
};

export default function StandardsPage() {
  const [standards, setStandards] = useState<Standard[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingStandard, setEditingStandard] =
    useState<Standard | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingStandard, setDeletingStandard] =
    useState<Standard | null>(null);

  const [form, setForm] = useState<StandardForm>({
    name: "",
    schoolId: "",
  });

  async function loadData() {
    const token = localStorage.getItem("synaptix_token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      setLoading(true);
      setError("");

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [standardsResponse, schoolsResponse] = await Promise.all([
        fetch(`${API_BASE}/standards`, { headers }),
        fetch(`${API_BASE}/schools`, { headers }),
      ]);

      if (
        standardsResponse.status === 401 ||
        schoolsResponse.status === 401
      ) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      const standardsData = await standardsResponse.json();
      const schoolsData = await schoolsResponse.json();

      if (!standardsResponse.ok || !standardsData.success) {
        throw new Error(
          standardsData.message || "Failed to load standards."
        );
      }

      if (!schoolsResponse.ok || !schoolsData.success) {
        throw new Error(
          schoolsData.message || "Failed to load schools."
        );
      }

      setStandards(
        Array.isArray(standardsData.standards)
          ? standardsData.standards
          : []
      );

      setSchools(
        Array.isArray(schoolsData.schools)
          ? schoolsData.schools
          : []
      );
    } catch (err) {
      console.error("Standards loading error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load standards."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function openAddModal() {
    setEditingStandard(null);
    setForm({
      name: "",
      schoolId: schools[0]?.id ?? "",
    });
    setError("");
    setShowModal(true);
  }

  function openEditModal(standard: Standard) {
    setEditingStandard(standard);
    setForm({
      name: standard.name,
      schoolId: standard.schoolId,
    });
    setError("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;
    setShowModal(false);
    setEditingStandard(null);
  }

  function openDeleteModal(standard: Standard) {
    setDeletingStandard(standard);
    setShowDeleteModal(true);
  }

  function closeDeleteModal() {
    if (deletingId) return;
    setShowDeleteModal(false);
    setDeletingStandard(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = localStorage.getItem("synaptix_token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (!form.name.trim()) {
      setError("Standard name is required.");
      return;
    }

    if (!form.schoolId) {
      setError("Please select a school.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const url = editingStandard
        ? `${API_BASE}/standards/${editingStandard.id}`
        : `${API_BASE}/standards`;

      const response = await fetch(url, {
        method: editingStandard ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          schoolId: form.schoolId,
        }),
      });

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to save standard."
        );
      }

      setShowModal(false);
      setEditingStandard(null);
      setForm({
        name: "",
        schoolId: "",
      });

      await loadData();
    } catch (err) {
      console.error("Standard save error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save standard."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingStandard) return;

    const token = localStorage.getItem("synaptix_token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      setDeletingId(deletingStandard.id);
      setError("");

      const response = await fetch(
        `${API_BASE}/standards/${deletingStandard.id}`,
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

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to delete standard."
        );
      }

      setShowDeleteModal(false);
      setDeletingStandard(null);
      await loadData();
    } catch (err) {
      console.error("Standard delete error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete standard."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function getSchoolName(standard: Standard) {
    if (standard.school?.name) {
      return standard.school.name;
    }

    return (
      schools.find((school) => school.id === standard.schoolId)
        ?.name ?? "Unknown school"
    );
  }

  return (
    <main className="w-full px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <section className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
              <span>◇</span>
              Institute Records
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
              Standards
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
              Organize academic standards under the schools served by your
              institute.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            disabled={schools.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <span className="text-base leading-none">+</span>
            <span>Add Standard</span>
          </button>
        </section>

      {/* Error Banner */}
      {error && !showModal && !showDeleteModal && (
        <section className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-red-800">
                Something went wrong
              </p>

              <p className="mt-1 text-xs leading-5 text-red-700">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white px-4 text-xs font-semibold text-red-700 transition duration-200 hover:border-red-300 hover:bg-red-50 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>
      )}

      {/* Summary */}
      <section className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-stone-200/80 bg-white/75 p-5 shadow-sm backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
            Total standards
          </p>

          <p className="mt-3 text-3xl font-bold tracking-tight text-stone-900">
            {loading ? "—" : standards.length}
          </p>

          <p className="mt-1 text-xs text-stone-500">
            Academic standards across your schools
          </p>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">
            Academic hierarchy
          </p>

          <p className="mt-3 text-sm font-semibold text-stone-800">
            School → Standard → Student
          </p>

          <p className="mt-2 text-xs leading-5 text-stone-500">
            Each standard is linked to one school.
          </p>
        </div>
      </section>

      {/* Standards List Section */}
      <section className="rounded-3xl border border-stone-200/80 bg-white/75 shadow-sm backdrop-blur-xl">
        <div className="border-b border-stone-200/80 px-6 py-5">
          <h2 className="text-lg font-semibold tracking-tight text-stone-900">
            Registered standards
          </h2>

          <p className="mt-1 text-xs text-stone-500">
            Academic standards currently configured for your institute.
          </p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="animate-pulse rounded-2xl border border-stone-100 bg-stone-50/60 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-stone-200" />

                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 rounded bg-stone-200" />
                      <div className="h-3 w-44 rounded bg-stone-200" />
                    </div>

                    <div className="hidden h-10 w-28 rounded-xl bg-stone-200 sm:block" />
                    <div className="hidden h-10 w-16 rounded-xl bg-stone-200 sm:block" />
                  </div>
                </div>
              ))}
            </div>
          ) : standards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 px-5 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-xl text-orange-600">
                ◇
              </div>

              <h3 className="mt-5 text-sm font-semibold text-stone-900">
                No standards added yet
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-stone-500">
                Add a standard and associate it with one of your registered
                schools.
              </p>

              {schools.length > 0 && (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="mt-5 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
                >
                  Add your first standard
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {standards.map((standard) => (
                <div
                  key={standard.id}
                  className="group flex flex-col gap-4 rounded-2xl border border-stone-100 bg-stone-50/60 p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-orange-100 hover:bg-orange-50/30 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* Standard Information Link */}
                  <Link
                    href={`/app/standards/${standard.id}`}
                    className="flex min-w-0 flex-1 items-center gap-4 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-orange-100"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-lg font-bold text-orange-700 transition-transform duration-200 ease-out group-hover:scale-105">
                      {standard.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-stone-900 transition-colors duration-200 group-hover:text-orange-700">
                        {standard.name}
                      </h3>

                      <p className="mt-1 truncate text-xs text-stone-500">
                        {getSchoolName(standard)}
                      </p>
                    </div>

                    <span className="ml-auto hidden shrink-0 rounded-xl border border-orange-100 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-600 transition duration-200 hover:border-orange-200 hover:bg-orange-100 sm:inline-flex">
                      View Details →
                    </span>
                  </Link>

                  {/* Actions */}
                  <div className="flex items-center gap-2 sm:opacity-90 sm:transition-opacity sm:group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => openEditModal(standard)}
                      className="rounded-xl border border-orange-200 bg-white px-4 py-2 text-xs font-semibold text-orange-700 transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 active:translate-y-0"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => openDeleteModal(standard)}
                      disabled={deletingId === standard.id}
                      className="rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 transition duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-100 disabled:opacity-60 active:translate-y-0"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 px-5 py-8 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-white/50 bg-white p-6 shadow-2xl transition-all duration-200 sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  {editingStandard ? "Edit standard" : "New standard"}
                </p>

                <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
                  {editingStandard
                    ? "Update standard details"
                    : "Add a standard"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-500 transition duration-200 hover:bg-stone-200 hover:text-stone-800 active:scale-95 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="standard-school"
                  className="mb-2 block text-xs font-semibold text-stone-700"
                >
                  School *
                </label>

                <select
                  id="standard-school"
                  value={form.schoolId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      schoolId: event.target.value,
                    }))
                  }
                  required
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition duration-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">Select a school</option>

                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="standard-name"
                  className="mb-2 block text-xs font-semibold text-stone-700"
                >
                  Standard name *
                </label>

                <input
                  id="standard-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. Class 10"
                  required
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition duration-200 placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="h-11 rounded-xl border border-stone-200 bg-white px-5 text-sm font-semibold text-stone-600 transition duration-200 hover:border-stone-300 hover:bg-stone-50 active:translate-y-0 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || schools.length === 0}
                  className="h-11 rounded-xl bg-orange-500 px-6 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingStandard
                      ? "Save changes"
                      : "Add standard"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingStandard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 px-5 py-8 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/50 bg-white p-6 shadow-2xl transition-all duration-200 sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>

            <div className="mt-5 text-center">
              <h3 className="text-lg font-semibold text-stone-900">
                Delete Standard
              </h3>

              <p className="mt-2 text-xs leading-5 text-stone-500">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-stone-800">
                  &ldquo;{deletingStandard.name}&rdquo;
                </span>
                ? This may affect student records and subject associations
                linked to this standard. This action cannot be undone.
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={Boolean(deletingId)}
                className="h-11 flex-1 rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-600 transition duration-200 hover:border-stone-300 hover:bg-stone-50 active:translate-y-0 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={Boolean(deletingId)}
                className="h-11 flex-1 rounded-xl border border-red-200 bg-red-600 px-4 text-sm font-semibold text-white shadow-md shadow-red-200 transition duration-200 hover:-translate-y-0.5 hover:bg-red-700 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingId ? "Deleting..." : "Delete Standard"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
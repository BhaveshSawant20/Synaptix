"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { API_BASE } from "@/lib/api";
import Modal from "../components/Modal";
import SortControl from "../components/SortControl";
import { SortOption, sortRecords } from "@/lib/sorting";

type School = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  createdAt: string;
};

type SchoolForm = {
  name: string;
  address: string;
  city: string;
  state: string;
};

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingSchool, setDeletingSchool] = useState<School | null>(null);

  const [form, setForm] = useState<SchoolForm>({
    name: "",
    address: "",
    city: "",
    state: "",
  });

  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("alphabetical");

  const processedSchools = useMemo(() => {
    let result = [...schools];
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.city || "").toLowerCase().includes(q) ||
          (s.state || "").toLowerCase().includes(q) ||
          (s.address || "").toLowerCase().includes(q)
      );
    }
    return sortRecords(result, sortOption, (s) => s.name, (s) => s.createdAt);
  }, [schools, search, sortOption]);

  async function loadSchools() {
    const token = localStorage.getItem("synaptix_token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE}/schools`, {
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

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load schools.");
      }

      setSchools(Array.isArray(data.schools) ? data.schools : []);
    } catch (err) {
      console.error("Schools loading error:", err);
      setError(err instanceof Error ? err.message : "Failed to load schools.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSchools();
  }, []);

  function openAddModal() {
    setEditingSchool(null);
    setForm({
      name: "",
      address: "",
      city: "",
      state: "",
    });
    setError("");
    setShowModal(true);
  }

  function openEditModal(school: School) {
    setEditingSchool(school);
    setForm({
      name: school.name,
      address: school.address ?? "",
      city: school.city ?? "",
      state: school.state ?? "",
    });
    setError("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;
    setShowModal(false);
    setEditingSchool(null);
  }

  function openDeleteModal(school: School) {
    setDeletingSchool(school);
    setShowDeleteModal(true);
  }

  function closeDeleteModal() {
    if (deletingId) return;
    setShowDeleteModal(false);
    setDeletingSchool(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = localStorage.getItem("synaptix_token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (!form.name.trim()) {
      setError("School name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const url = editingSchool
        ? `${API_BASE}/schools/${editingSchool.id}`
        : `${API_BASE}/schools`;

      const response = await fetch(url, {
        method: editingSchool ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          address: form.address.trim() || undefined,
          city: form.city.trim() || undefined,
          state: form.state.trim() || undefined,
        }),
      });

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save school.");
      }

      setShowModal(false);
      setEditingSchool(null);
      setForm({
        name: "",
        address: "",
        city: "",
        state: "",
      });

      await loadSchools();
    } catch (err) {
      console.error("School save error:", err);
      setError(err instanceof Error ? err.message : "Failed to save school.");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingSchool) return;

    const token = localStorage.getItem("synaptix_token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      setDeletingId(deletingSchool.id);
      setError("");

      const response = await fetch(
        `${API_BASE}/schools/${deletingSchool.id}`,
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

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete school.");
      }

      setShowDeleteModal(false);
      setDeletingSchool(null);
      await loadSchools();
    } catch (err) {
      console.error("School delete error:", err);
      setError(err instanceof Error ? err.message : "Failed to delete school.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="w-full px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <section className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
              <span>▣</span>
              Institute Records
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
              Schools
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
              Manage the schools represented across your coaching institute.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
          >
            <span className="text-base leading-none">+</span>
            <span>Add School</span>
          </button>
        </section>

      {/* Error Banner */}
      {error && !showModal && !showDeleteModal && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary */}
      <section className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-stone-200/80 bg-white/75 p-5 shadow-sm backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
            Total schools
          </p>

          <p className="mt-3 text-3xl font-bold tracking-tight text-stone-900">
            {loading ? "—" : schools.length}
          </p>

          <p className="mt-1 text-xs text-stone-500">
            Schools registered in your institute
          </p>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">
            Academic structure
          </p>

          <p className="mt-3 text-sm font-semibold text-stone-800">
            School → Standard → Student
          </p>

          <p className="mt-2 text-xs leading-5 text-stone-500">
            Standards and students can be organized under each school.
          </p>
        </div>
      </section>

      {/* Schools Section */}
      <section className="rounded-3xl border border-stone-200/80 bg-white/75 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col gap-4 border-b border-stone-200/80 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-stone-900">
              Registered schools
            </h2>

            <p className="mt-1 text-xs text-stone-500">
              Your institute&apos;s school records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search schools..."
              className="h-10 w-full sm:w-56 rounded-xl border border-stone-200 bg-white px-3.5 text-xs text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
            <SortControl value={sortOption} onChange={setSortOption} />
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse rounded-2xl bg-stone-100"
                />
              ))}
            </div>
          ) : processedSchools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 px-5 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-xl text-orange-600">
                ▣
              </div>

              <h3 className="mt-5 text-sm font-semibold text-stone-900">
                {search ? "No matching schools found" : "No schools added yet"}
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-stone-500">
                {search
                  ? "Try adjusting your search criteria."
                  : "Add your first school to start organizing standards, students and academic information."}
              </p>

              {!search && (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="mt-5 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
                >
                  Add your first school
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {processedSchools.map((school) => (
                <div
                  key={school.id}
                  className="group flex flex-col gap-4 rounded-2xl border border-stone-100 bg-stone-50/60 p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-orange-100 hover:bg-orange-50/30 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <Link
                    href={`/app/schools/${school.id}`}
                    className="flex min-w-0 flex-1 items-center gap-4 rounded-xl outline-none transition focus-visible:ring-4 focus-visible:ring-orange-100"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-lg font-bold text-orange-700 transition-transform duration-200 ease-out group-hover:scale-105">
                      {school.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-stone-900 transition-colors duration-200 group-hover:text-orange-700">
                        {school.name}
                      </h3>

                      <p className="mt-1 text-xs text-stone-500">
                        {[school.city, school.state]
                          .filter(Boolean)
                          .join(", ") || "Location not specified"}
                      </p>

                      {school.address && (
                        <p className="mt-1 truncate text-xs text-stone-400">
                          {school.address}
                        </p>
                      )}
                    </div>

                    <span className="ml-auto hidden shrink-0 rounded-xl border border-orange-100 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-600 transition duration-200 hover:border-orange-200 hover:bg-orange-100 sm:inline-flex">
                      View Details →
                    </span>
                  </Link>

                  <div className="flex items-center gap-2 sm:opacity-90 sm:transition-opacity sm:group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => openEditModal(school)}
                      className="rounded-xl border border-orange-200 bg-white px-4 py-2 text-xs font-semibold text-orange-700 transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 active:translate-y-0"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => openDeleteModal(school)}
                      disabled={deletingId === school.id}
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

      {/* Add / Edit School Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        badge={editingSchool ? "Edit school" : "New school"}
        title={editingSchool ? "Update school details" : "Add a school"}
        description={
          editingSchool
            ? "Update the school address and details below."
            : "Register a new affiliated school to your coaching institute."
        }
        maxWidth="lg"
      >
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="school-name"
              className="mb-2 block text-xs font-semibold text-stone-700"
            >
              School name *
            </label>

            <input
              id="school-name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="e.g. St. Xavier's School"
              required
              className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition duration-200 placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </div>

          <div>
            <label
              htmlFor="school-address"
              className="mb-2 block text-xs font-semibold text-stone-700"
            >
              Address
            </label>

            <input
              id="school-address"
              value={form.address}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  address: event.target.value,
                }))
              }
              placeholder="School address"
              className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition duration-200 placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="school-city"
                className="mb-2 block text-xs font-semibold text-stone-700"
              >
                City
              </label>

              <input
                id="school-city"
                value={form.city}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    city: event.target.value,
                  }))
                }
                placeholder="Mumbai"
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition duration-200 placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <div>
              <label
                htmlFor="school-state"
                className="mb-2 block text-xs font-semibold text-stone-700"
              >
                State
              </label>

              <input
                id="school-state"
                value={form.state}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    state: event.target.value,
                  }))
                }
                placeholder="Maharashtra"
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition duration-200 placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>
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
              disabled={saving}
              className="h-11 rounded-xl bg-orange-500 px-6 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingSchool
                  ? "Save changes"
                  : "Add school"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingSchool && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-950/45 px-5 py-8 backdrop-blur-sm lg:pl-72">
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
                Delete School
              </h3>

              <p className="mt-2 text-xs leading-5 text-stone-500">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-stone-800">
                  &ldquo;{deletingSchool.name}&rdquo;
                </span>
                ? This will remove the school and its academic records. This
                action cannot be undone.
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
                {deletingId ? "Deleting..." : "Delete School"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}

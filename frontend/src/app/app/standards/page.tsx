"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { API_BASE } from "@/lib/api";
import Modal from "../components/Modal";
import SortControl from "../components/SortControl";
import { SortOption, naturalCompare, compareStandards } from "@/lib/sorting";

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

  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("alphabetical");

  const groupedStandards = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = standards.filter((std) => {
      if (!q) return true;
      const schoolName = schools.find((s) => s.id === std.schoolId)?.name || "";
      return (
        std.name.toLowerCase().includes(q) ||
        schoolName.toLowerCase().includes(q)
      );
    });

    const sortedSchools = [...schools].sort((a, b) =>
      naturalCompare(a.name, b.name)
    );

    return sortedSchools
      .map((school) => {
        const schoolStds = filtered.filter((std) => std.schoolId === school.id);
        if (sortOption === "alphabetical") {
          schoolStds.sort((a, b) => compareStandards(a.name, b.name));
        } else if (sortOption === "newest") {
          schoolStds.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        } else if (sortOption === "oldest") {
          schoolStds.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        }
        return {
          school,
          standards: schoolStds,
        };
      })
      .filter((group) => group.standards.length > 0);
  }, [standards, schools, search, sortOption]);

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
      schoolId: "",
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
        <div className="flex flex-col gap-4 border-b border-stone-200/80 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-stone-900">
              Registered standards
            </h2>

            <p className="mt-1 text-xs text-stone-500">
              Academic standards organized by affiliated school.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search standards or schools..."
              className="h-10 w-full sm:w-64 rounded-xl border border-stone-200 bg-white px-3.5 text-xs text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
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
          ) : groupedStandards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 px-5 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-xl text-orange-600">
                ◇
              </div>

              <h3 className="mt-5 text-sm font-semibold text-stone-900">
                {search ? "No matching standards found" : "No standards added yet"}
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-stone-500">
                {search
                  ? "Try adjusting your search criteria."
                  : "Add a standard and associate it with one of your registered schools."}
              </p>

              {!search && schools.length > 0 && (
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
            <div className="space-y-7">
              {groupedStandards.map((group) => (
                <div key={group.school.id} className="rounded-2xl border border-stone-200/70 bg-stone-50/40 p-4 sm:p-5">
                  <div className="mb-3.5 flex items-center justify-between border-b border-stone-200/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-xs font-bold text-orange-700">
                        ▣
                      </span>
                      <h3 className="text-sm font-bold tracking-tight text-stone-900">
                        {group.school.name}
                      </h3>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-stone-600 border border-stone-200/80 shadow-xs">
                      {group.standards.length} {group.standards.length === 1 ? "standard" : "standards"}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.standards.map((standard) => (
                      <div
                        key={standard.id}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-stone-200/90 bg-white p-3.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-sm"
                      >
                        <Link
                          href={`/app/standards/${standard.id}`}
                          className="min-w-0 flex-1"
                        >
                          <h4 className="truncate text-sm font-semibold text-stone-900 group-hover:text-orange-600 transition-colors">
                            {standard.name}
                          </h4>
                          <p className="mt-0.5 text-[11px] text-stone-400">
                            {group.school.name}
                          </p>
                        </Link>

                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(standard)}
                            className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 transition"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(standard)}
                            disabled={deletingId === standard.id}
                            className="rounded-lg border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Add / Edit Standard Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        badge={editingStandard ? "Edit standard" : "New standard"}
        title={editingStandard ? "Update standard details" : "Add a standard"}
        description={
          editingStandard
            ? "Update the standard name and affiliated school."
            : "Add a new standard under one of your registered schools."
        }
        maxWidth="lg"
        footer={
          <>
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
              form="standard-form"
              disabled={saving || schools.length === 0}
              className="h-11 rounded-xl bg-orange-500 px-6 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingStandard
                  ? "Save changes"
                  : "Add standard"}
            </button>
          </>
        }
      >
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
            {error}
          </div>
        )}

        <form id="standard-form" onSubmit={handleSubmit} className="space-y-4">
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
              <option value="">Select a School</option>

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
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingStandard && (
        <Modal
          isOpen={showDeleteModal}
          onClose={closeDeleteModal}
          badge="Danger Zone"
          title="Delete Standard"
          description={`Are you sure you want to delete "${deletingStandard.name}"? This action cannot be undone.`}
          maxWidth="md"
          footer={
            <>
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={Boolean(deletingId)}
                className="h-11 rounded-xl border border-stone-200 bg-white px-5 text-sm font-semibold text-stone-600 transition duration-200 hover:border-stone-300 hover:bg-stone-50 active:translate-y-0 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={Boolean(deletingId)}
                className="h-11 rounded-xl border border-red-200 bg-red-600 px-5 text-sm font-semibold text-white shadow-md shadow-red-200 transition duration-200 hover:-translate-y-0.5 hover:bg-red-700 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingId ? "Deleting..." : "Delete Standard"}
              </button>
            </>
          }
        >
          <div className="py-2 text-xs leading-5 text-stone-600">
            <p>
              This may affect student records and subject associations linked to{" "}
              <strong className="font-semibold text-stone-800">
                {deletingStandard.name}
              </strong>
              . This action cannot be undone.
            </p>
          </div>
        </Modal>
      )}
      </div>
    </main>
  );
}
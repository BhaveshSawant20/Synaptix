"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type School = {
  id: string;
  name: string;
};

type Standard = {
  id: string;
  name: string;
  school?: School | null;
};

type Subject = {
  id: string;
  name: string;
  code?: string | null;
};

type StandardSubjectMapping = {
  id: string;
  standardId: string;
  subjectId: string;
  subject: Subject;
};

import { API_URL } from "@/lib/api";
import Modal from "@/app/app/components/Modal";
import { compareStandards, naturalCompare } from "@/lib/sorting";

export default function StandardSubjectsPage() {
  const router = useRouter();
  const [standards, setStandards] = useState<Standard[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [mappings, setMappings] = useState<StandardSubjectMapping[]>([]);

  const [selectedStandardId, setSelectedStandardId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [removeTarget, setRemoveTarget] = useState<StandardSubjectMapping | null>(null);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("synaptix_token")
      : null;

  function handleUnauthorized() {
    localStorage.removeItem("synaptix_token");
    router.push("/login");
  }

  async function fetchInitialData() {
    if (!token) {
      handleUnauthorized();
      return;
    }

    try {
      const [standardsResponse, subjectsResponse] = await Promise.all([
        fetch(`${API_URL}/standards`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_URL}/subjects`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (standardsResponse.status === 401 || subjectsResponse.status === 401) {
        handleUnauthorized();
        return;
      }

      const standardsData = await standardsResponse.json();
      const subjectsData = await subjectsResponse.json();

      if (!standardsResponse.ok) {
        throw new Error(
          standardsData.message || "Failed to load standards."
        );
      }

      if (!subjectsResponse.ok) {
        throw new Error(subjectsData.message || "Failed to load subjects.");
      }

      const loadedStandards: Standard[] = (standardsData.standards || []).sort(
        (a: Standard, b: Standard) => {
          const schoolA = a.school?.name || "";
          const schoolB = b.school?.name || "";
          if (schoolA !== schoolB) {
            return naturalCompare(schoolA, schoolB);
          }
          return compareStandards(a.name, b.name);
        }
      );
      const loadedSubjects: Subject[] = (subjectsData.subjects || []).sort(
        (a: Subject, b: Subject) => naturalCompare(a.name, b.name)
      );

      setStandards(loadedStandards);
      setSubjects(loadedSubjects);

      if (loadedStandards.length > 0) {
        setSelectedStandardId(loadedStandards[0].id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load data."
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchMappings(standardId: string) {
    if (!token || !standardId) {
      setMappings([]);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/standards/${standardId}/subjects`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load assigned subjects."
        );
      }

      setMappings(data.subjects || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load assigned subjects."
      );
      setMappings([]);
    } finally {
      setMappingLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function init() {
      if (!ignore) {
        await fetchInitialData();
      }
    }

    init();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function initMappings() {
      if (!ignore && selectedStandardId) {
        await fetchMappings(selectedStandardId);
      }
    }

    initMappings();

    return () => {
      ignore = true;
    };
  }, [selectedStandardId]);

  const selectedStandard = standards.find(
    (standard) => standard.id === selectedStandardId
  );

  const assignedSubjectIds = useMemo(() => {
    return new Set(mappings.map((mapping) => mapping.subjectId));
  }, [mappings]);

  const availableSubjects = useMemo(() => {
    return subjects.filter((subject) => !assignedSubjectIds.has(subject.id));
  }, [subjects, assignedSubjectIds]);

  const filteredMappings = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return mappings;
    }

    return mappings.filter((mapping) => {
      const name = mapping.subject.name.toLowerCase();
      const code = mapping.subject.code?.toLowerCase() || "";

      return name.includes(query) || code.includes(query);
    });
  }, [mappings, search]);

  async function handleAssignSubject() {
    if (!token || !selectedStandardId || !selectedSubjectId) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        `${API_URL}/standards/${selectedStandardId}/subjects`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            subjectId: selectedSubjectId,
          }),
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to assign subject."
        );
      }

      setSelectedSubjectId("");
      await fetchMappings(selectedStandardId);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to assign subject."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmRemove() {
    if (!token || !selectedStandardId || !removeTarget) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        `${API_URL}/standards/${selectedStandardId}/subjects/${removeTarget.subjectId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to remove subject."
        );
      }

      setRemoveTarget(null);
      await fetchMappings(selectedStandardId);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to remove subject."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" />
            <p className="mt-4 text-sm font-medium text-stone-500">
              Loading academic mappings...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Academics
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Standard-Subject Mapping
            </h1>

            <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-stone-500">
              Assign curriculum subjects to each standard so Synaptix links
              academic syllabi and exam intelligence to the correct school level.
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Standard Selector & Stats */}
        <section className="rounded-3xl border border-orange-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Select Standard
              </label>

              <select
                value={selectedStandardId}
                onChange={(event) => {
                  setSelectedStandardId(event.target.value);
                  setSelectedSubjectId("");
                  setSearch("");
                }}
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 lg:max-w-xl"
              >
                {standards.length === 0 ? (
                  <option value="">No standards available</option>
                ) : (
                  standards.map((standard) => (
                    <option key={standard.id} value={standard.id}>
                      {standard.name}
                      {standard.school?.name
                        ? ` — ${standard.school.name}`
                        : ""}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[300px]">
              <div className="rounded-2xl border border-stone-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                  Assigned
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-stone-900">
                  {mappings.length}
                </p>
              </div>

              <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">
                  Available
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-orange-700">
                  {availableSubjects.length}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Assign Subject Card */}
        <section className="rounded-3xl border border-orange-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl sm:p-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-stone-900">
              Assign Subject
            </h2>

            <p className="mt-1 text-sm text-stone-500">
              Add an institute subject to{" "}
              <span className="font-semibold text-stone-800">
                {selectedStandard?.name || "the selected standard"}
              </span>
              .
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedSubjectId}
              onChange={(event) =>
                setSelectedSubjectId(event.target.value)
              }
              disabled={
                !selectedStandardId ||
                availableSubjects.length === 0 ||
                saving
              }
              className="h-11 flex-1 rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
            >
              <option value="">
                {availableSubjects.length === 0
                  ? "All subjects are already assigned"
                  : "Select a subject"}
              </option>

              {availableSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                  {subject.code ? ` (${subject.code})` : ""}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleAssignSubject}
              disabled={
                !selectedStandardId ||
                !selectedSubjectId ||
                saving
              }
              className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Assign Subject"}
            </button>
          </div>
        </section>

        {/* Assigned Subjects Table */}
        <section className="overflow-hidden rounded-3xl border border-orange-100/70 bg-white/80 shadow-sm backdrop-blur-xl">
          <div className="border-b border-stone-200/70 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-stone-900">
                  Assigned Subjects
                </h2>

                <p className="mt-1 text-sm text-stone-500">
                  Subjects currently mapped to{" "}
                  <span className="font-semibold text-stone-800">
                    {selectedStandard?.name || "the selected standard"}
                  </span>
                  .
                </p>
              </div>

              <div className="relative w-full lg:w-80">
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search assigned subjects..."
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>
            </div>
          </div>

          {mappingLoading ? (
            <div className="flex min-h-[250px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" />
                <p className="mt-3 text-sm text-stone-500">
                  Loading subjects...
                </p>
              </div>
            </div>
          ) : filteredMappings.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-xl text-orange-600">
                ◈
              </div>

              <h3 className="mt-4 text-lg font-semibold tracking-tight text-stone-900">
                {mappings.length === 0
                  ? "No subjects assigned"
                  : "No subjects found"}
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
                {mappings.length === 0
                  ? "Use the Assign Subject section above to link a subject to this standard."
                  : "Try a different search keyword."}
              </p>
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
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredMappings.map((mapping) => (
                    <tr
                      key={mapping.id}
                      className="border-b border-stone-100 transition duration-150 last:border-b-0 hover:bg-orange-50/30"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-semibold text-stone-900">
                            {mapping.subject.name}
                          </p>
                          <p className="mt-0.5 text-xs text-stone-400">
                            Subject mapped to{" "}
                            {selectedStandard?.name || "standard"}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {mapping.subject.code ? (
                          <span className="inline-flex rounded-lg border border-orange-100 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
                            {mapping.subject.code}
                          </span>
                        ) : (
                          <span className="text-sm text-stone-400">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setRemoveTarget(mapping)}
                          disabled={saving}
                          className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 transition duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-100 disabled:opacity-60 active:translate-y-0"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Remove Confirmation Modal */}
      <Modal
        isOpen={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        title="Remove subject from standard?"
        badge="Warning"
        description="This unlinks the subject from this standard's curriculum."
        maxWidth="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setRemoveTarget(null)}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-xs font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirmRemove}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Removing..." : "Remove Subject"}
            </button>
          </>
        }
      >
        {removeTarget && (
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl font-bold text-red-600">
              !
            </div>
            <p className="text-sm leading-6 text-stone-600">
              Are you sure you want to remove{" "}
              <strong className="font-semibold text-stone-800">
                {removeTarget.subject.name}
              </strong>{" "}
              from{" "}
              <strong className="font-semibold text-stone-800">
                {selectedStandard?.name || "this standard"}
              </strong>
              ? This unlinks the subject from this standard&apos;s curriculum.
            </p>
          </div>
        )}
      </Modal>
    </main>
  );
}
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/app/app/components/Modal";

import { API_BASE } from "@/lib/api";

type School = {
  id: string;
  name: string;
};

type Standard = {
  id: string;
  schoolId: string;
  name: string;
};

type Subject = {
  id: string;
  name: string;
  code?: string | null;
};

type Topic = {
  id: string;
  subjectId: string;
  name: string;
  description?: string | null;
  orderIndex?: number | null;
};

type Requirement = {
  id: string;
  schoolId: string;
  standardId: string;
  subjectId: string;
  topicId: string;
  required: boolean;
  school?: School | null;
  standard?: Standard | null;
  subject?: Subject | null;
  topic?: Topic | null;
};

type FormState = {
  schoolId: string;
  standardId: string;
  subjectId: string;
  topicId: string;
  required: boolean;
};

const emptyForm: FormState = {
  schoolId: "",
  standardId: "",
  subjectId: "",
  topicId: "",
  required: true,
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("synaptix_token") || "";
}

export default function SyllabusRequirementsPage() {
  const router = useRouter();

  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [formSubjects, setFormSubjects] = useState<Subject[]>([]);
  const [formTopics, setFormTopics] = useState<Topic[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [standardFilter, setStandardFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] =
    useState<Requirement | null>(null);

  const [deleteRequirement, setDeleteRequirement] =
    useState<Requirement | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm);

  async function handleUnauthorized() {
    localStorage.removeItem("synaptix_token");
    router.push("/login");
  }

  async function fetchRequirements() {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    const response = await fetch(`${API_BASE}/syllabus-requirements`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      await handleUnauthorized();
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to fetch syllabus requirements"
      );
    }

    setRequirements(data.requirements || []);
  }

  async function fetchStandardSubjects(standardId: string) {
    const token = getToken();

    if (!token || !standardId) {
      setFormSubjects([]);
      return;
    }

    const response = await fetch(
      `${API_BASE}/standards/${standardId}/subjects`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 401) {
      await handleUnauthorized();
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to fetch standard subjects"
      );
    }

    const mappings = data.subjects || data.standardSubjects || [];

    const mappedSubjects: Subject[] = mappings
      .map((mapping: { subject?: Subject }) => mapping.subject)
      .filter((subj: Subject | undefined): subj is Subject => Boolean(subj));

    setFormSubjects(mappedSubjects);
  }

  async function fetchTopics(subjectId: string) {
    const token = getToken();

    if (!token || !subjectId) {
      setFormTopics([]);
      return;
    }

    const response = await fetch(
      `${API_BASE}/topics/subject/${subjectId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 401) {
      await handleUnauthorized();
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch topics");
    }

    setFormTopics(data.topics || []);
  }

  async function fetchData() {
    try {
      const token = getToken();

      if (!token) {
        router.push("/login");
        return;
      }

      const [reqRes, schRes, stdRes, subRes] = await Promise.all([
        fetch(`${API_BASE}/syllabus-requirements`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/schools`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/standards`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/subjects`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (
        reqRes.status === 401 ||
        schRes.status === 401 ||
        stdRes.status === 401 ||
        subRes.status === 401
      ) {
        await handleUnauthorized();
        return;
      }

      const [reqData, schData, stdData, subData] = await Promise.all([
        reqRes.json(),
        schRes.json(),
        stdRes.json(),
        subRes.json(),
      ]);

      if (!reqRes.ok) throw new Error(reqData.message || "Failed to fetch syllabus requirements");
      if (!schRes.ok) throw new Error(schData.message || "Failed to fetch schools");
      if (!stdRes.ok) throw new Error(stdData.message || "Failed to fetch standards");
      if (!subRes.ok) throw new Error(subData.message || "Failed to fetch subjects");

      setRequirements(reqData.requirements || []);
      setSchools(schData.schools || []);
      setStandards(stdData.standards || []);
      setSubjects(subData.subjects || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function init() {
      if (!ignore) {
        await fetchData();
      }
    }

    init();

    return () => {
      ignore = true;
    };
  }, []);

  const filteredStandards = useMemo(() => {
    if (!schoolFilter) return standards;

    return standards.filter(
      (standard) => standard.schoolId === schoolFilter
    );
  }, [standards, schoolFilter]);

  const formStandards = useMemo(() => {
    if (!form.schoolId) return [];

    return standards.filter(
      (standard) => standard.schoolId === form.schoolId
    );
  }, [standards, form.schoolId]);

  const filteredRequirements = useMemo(() => {
    const query = search.trim().toLowerCase();

    return requirements.filter((requirement) => {
      const matchesSchool =
        !schoolFilter || requirement.schoolId === schoolFilter;

      const matchesStandard =
        !standardFilter ||
        requirement.standardId === standardFilter;

      const matchesSubject =
        !subjectFilter ||
        requirement.subjectId === subjectFilter;

      if (!matchesSchool || !matchesStandard || !matchesSubject) {
        return false;
      }

      if (!query) return true;

      const searchableText = [
        requirement.school?.name || "",
        requirement.standard?.name || "",
        requirement.subject?.name || "",
        requirement.subject?.code || "",
        requirement.topic?.name || "",
        requirement.topic?.description || "",
        requirement.required ? "required" : "optional",
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [
    requirements,
    search,
    schoolFilter,
    standardFilter,
    subjectFilter,
  ]);

  const requiredCount = requirements.filter(
    (requirement) => requirement.required
  ).length;

  const optionalCount = requirements.filter(
    (requirement) => !requirement.required
  ).length;

  const schoolCount = new Set(
    requirements.map((requirement) => requirement.schoolId)
  ).size;

  const standardCount = new Set(
    requirements.map((requirement) => requirement.standardId)
  ).size;

  function openCreateModal() {
    setEditingRequirement(null);
    setForm(emptyForm);
    setFormSubjects([]);
    setFormTopics([]);
    setError("");
    setSuccess("");
    setIsModalOpen(true);
  }

  async function openEditModal(requirement: Requirement) {
    setEditingRequirement(requirement);

    setForm({
      schoolId: requirement.schoolId,
      standardId: requirement.standardId,
      subjectId: requirement.subjectId,
      topicId: requirement.topicId,
      required: requirement.required,
    });

    setError("");
    setSuccess("");
    setFormSubjects([]);
    setFormTopics([]);
    setIsModalOpen(true);

    try {
      await fetchStandardSubjects(requirement.standardId);
      await fetchTopics(requirement.subjectId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load syllabus data"
      );
    }
  }

  function closeModal() {
    if (saving) return;

    setIsModalOpen(false);
    setEditingRequirement(null);
    setForm(emptyForm);
    setFormSubjects([]);
    setFormTopics([]);
    setError("");
  }

  function openDeleteModal(requirement: Requirement) {
    setDeleteRequirement(requirement);
    setError("");
    setSuccess("");
  }

  function closeDeleteModal() {
    if (deleting) return;
    setDeleteRequirement(null);
  }

  function handleSchoolChange(schoolId: string) {
    setForm({
      schoolId,
      standardId: "",
      subjectId: "",
      topicId: "",
      required: form.required,
    });

    setFormSubjects([]);
    setFormTopics([]);
    setError("");
  }

  async function handleStandardChange(standardId: string) {
    setForm((current) => ({
      ...current,
      standardId,
      subjectId: "",
      topicId: "",
    }));

    setFormTopics([]);
    setError("");

    try {
      await fetchStandardSubjects(standardId);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load subjects"
      );
    }
  }

  async function handleSubjectChange(subjectId: string) {
    setForm((current) => ({
      ...current,
      subjectId,
      topicId: "",
    }));

    setFormTopics([]);
    setError("");

    try {
      await fetchTopics(subjectId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load topics"
      );
    }
  }

  function updateForm(
    field: keyof FormState,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.schoolId) {
      setError("Please select a school.");
      return;
    }

    if (!form.standardId) {
      setError("Please select a standard.");
      return;
    }

    if (!form.subjectId) {
      setError("Please select a subject.");
      return;
    }

    if (!form.topicId) {
      setError("Please select a topic.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const token = getToken();

      if (!token) {
        router.push("/login");
        return;
      }

      const body = {
        schoolId: form.schoolId,
        standardId: form.standardId,
        subjectId: form.subjectId,
        topicId: form.topicId,
        required: form.required,
      };

      const response = await fetch(
        editingRequirement
          ? `${API_BASE}/syllabus-requirements/${editingRequirement.id}`
          : `${API_BASE}/syllabus-requirements`,
        {
          method: editingRequirement ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            (editingRequirement
              ? "Failed to update syllabus requirement"
              : "Failed to create syllabus requirement")
        );
      }

      setSuccess(
        editingRequirement
          ? "Syllabus requirement updated successfully."
          : "Syllabus requirement created successfully."
      );

      setIsModalOpen(false);
      setEditingRequirement(null);
      setForm(emptyForm);
      setFormSubjects([]);
      setFormTopics([]);

      await fetchRequirements();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save syllabus requirement"
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteRequirement) return;

    try {
      setDeleting(true);
      setError("");
      setSuccess("");

      const token = getToken();

      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(
        `${API_BASE}/syllabus-requirements/${deleteRequirement.id}`,
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

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to delete syllabus requirement"
        );
      }

      setDeleteRequirement(null);
      setSuccess("Syllabus requirement deleted successfully.");

      await fetchRequirements();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete syllabus requirement"
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Academics
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Syllabus Requirements
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
              Define and track curriculum coverage requirements by school, standard, and subject.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
          >
            <span>+</span> Add Requirement
          </button>
        </div>

        {/* Alerts */}
        {error && !isModalOpen && !deleteRequirement && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && !isModalOpen && !deleteRequirement && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {success}
          </div>
        )}

        {/* Stat Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              Total Requirements
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
              {requirements.length}
            </p>
          </div>

          <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              Required Topics
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-orange-600">
              {requiredCount}
            </p>
          </div>

          <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              Optional Topics
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
              {optionalCount}
            </p>
          </div>

          <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              Schools / Standards
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
              {schoolCount}
              <span className="mx-2 text-stone-300">/</span>
              {standardCount}
            </p>
          </div>
        </div>

        {/* Content Container */}
        <div className="glass overflow-hidden rounded-2xl border border-stone-200/70">
          <div className="border-b border-stone-200/70 p-5 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-stone-900">
                  Topic Requirements
                </h2>

                <p className="mt-1 text-sm text-stone-500">
                  {filteredRequirements.length} requirement
                  {filteredRequirements.length === 1 ? "" : "s"} shown
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search topics, subjects..."
                  className="h-11 rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />

                <select
                  value={schoolFilter}
                  onChange={(event) => {
                    setSchoolFilter(event.target.value);
                    setStandardFilter("");
                  }}
                  className="h-11 rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">All schools</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>

                <select
                  value={standardFilter}
                  onChange={(event) =>
                    setStandardFilter(event.target.value)
                  }
                  className="h-11 rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">All standards</option>
                  {filteredStandards.map((standard) => (
                    <option key={standard.id} value={standard.id}>
                      {standard.name}
                    </option>
                  ))}
                </select>

                <select
                  value={subjectFilter}
                  onChange={(event) =>
                    setSubjectFilter(event.target.value)
                  }
                  className="h-11 rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">All subjects</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500" />
              <p className="mt-4 text-sm text-stone-500">
                Loading syllabus requirements...
              </p>
            </div>
          ) : filteredRequirements.length === 0 ? (
            <div className="p-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100/70 text-2xl">
                📚
              </div>

              <h3 className="mt-5 text-lg font-semibold tracking-tight text-stone-900">
                No syllabus requirements found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500">
                {search ||
                schoolFilter ||
                standardFilter ||
                subjectFilter
                  ? "Try changing your filters or search term."
                  : "Define a curriculum topic requirement by linking a school, standard, subject, and topic."}
              </p>

              {!search &&
                !schoolFilter &&
                !standardFilter &&
                !subjectFilter && (
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="mt-6 inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0"
                  >
                    + Add Requirement
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
                        School
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Standard
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Subject
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Topic
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Requirement
                      </th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRequirements.map((requirement) => (
                      <tr
                        key={requirement.id}
                        className="border-b border-stone-100 transition duration-150 last:border-b-0 hover:bg-orange-50/30"
                      >
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-stone-900">
                            {requirement.school?.name || "Unknown school"}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-stone-700">
                            {requirement.standard?.name ||
                              "Unknown standard"}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-stone-900">
                            {requirement.subject?.name ||
                              "Unknown subject"}
                          </p>

                          {requirement.subject?.code && (
                            <p className="mt-0.5 text-xs text-stone-400">
                              {requirement.subject.code}
                            </p>
                          )}
                        </td>

                        <td className="max-w-[280px] px-6 py-4">
                          <p className="text-sm font-semibold text-stone-900">
                            {requirement.topic?.name || "Unknown topic"}
                          </p>

                          {requirement.topic?.description && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">
                              {requirement.topic.description}
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {requirement.required ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                              Required
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-xs font-semibold text-stone-600">
                              Optional
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(requirement)}
                              className="rounded-xl border border-orange-200 bg-white px-3.5 py-2 text-xs font-semibold text-orange-700 transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 active:translate-y-0"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => openDeleteModal(requirement)}
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
                {filteredRequirements.map((requirement) => (
                  <div
                    key={requirement.id}
                    className="rounded-xl border border-stone-200/80 bg-white/70 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">
                          {requirement.topic?.name || "Unknown topic"}
                        </p>

                        <p className="mt-0.5 text-xs text-stone-500">
                          {requirement.subject?.name ||
                            "Unknown subject"}
                        </p>
                      </div>

                      {requirement.required ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                          Required
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-xs font-semibold text-stone-600">
                          Optional
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                          School
                        </p>

                        <p className="mt-1 text-sm font-medium text-stone-800">
                          {requirement.school?.name || "Unknown school"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                          Standard
                        </p>

                        <p className="mt-1 text-sm font-medium text-stone-800">
                          {requirement.standard?.name ||
                            "Unknown standard"}
                        </p>
                      </div>
                    </div>

                    {requirement.topic?.description && (
                      <p className="mt-3 text-xs leading-relaxed text-stone-500">
                        {requirement.topic.description}
                      </p>
                    )}

                    <div className="mt-5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(requirement)}
                        className="flex-1 rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => openDeleteModal(requirement)}
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

      {/* EDIT / CREATE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingRequirement ? "Update Syllabus Requirement" : "Create Syllabus Requirement"}
        subtitle={editingRequirement ? "Edit Requirement" : "New Requirement"}
        size="2xl"
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end w-full">
            <button
              type="button"
              onClick={closeModal}
              disabled={saving}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition duration-200 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="syllabus-requirement-form"
              disabled={saving}
              className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingRequirement
                ? "Update Requirement"
                : "Create Requirement"}
            </button>
          </div>
        }
      >
        <form id="syllabus-requirement-form" onSubmit={handleSubmit}>
          {error && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* SCHOOL */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                School <span className="text-orange-500">*</span>
              </label>

              <select
                value={form.schoolId}
                disabled={saving}
                onChange={(event) =>
                  handleSchoolChange(event.target.value)
                }
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-500"
              >
                <option value="">Select school</option>

                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>

            {/* STANDARD */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                Standard <span className="text-orange-500">*</span>
              </label>

              <select
                value={form.standardId}
                disabled={saving || !form.schoolId}
                onChange={(event) =>
                  handleStandardChange(event.target.value)
                }
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-500"
              >
                <option value="">
                  {!form.schoolId
                    ? "Select a school first"
                    : formStandards.length === 0
                    ? "No standards available"
                    : "Select standard"}
                </option>

                {formStandards.map((standard) => (
                  <option
                    key={standard.id}
                    value={standard.id}
                  >
                    {standard.name}
                  </option>
                ))}
              </select>
            </div>

            {/* SUBJECT */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                Subject <span className="text-orange-500">*</span>
              </label>

              <select
                value={form.subjectId}
                disabled={saving || !form.standardId}
                onChange={(event) =>
                  handleSubjectChange(event.target.value)
                }
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-500"
              >
                <option value="">
                  {!form.standardId
                    ? "Select a standard first"
                    : formSubjects.length === 0
                    ? "No subjects assigned"
                    : "Select subject"}
                </option>

                {formSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                    {subject.code ? ` — ${subject.code}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* TOPIC */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                Topic <span className="text-orange-500">*</span>
              </label>

              <select
                value={form.topicId}
                disabled={saving || !form.subjectId}
                onChange={(event) =>
                  updateForm("topicId", event.target.value)
                }
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-500"
              >
                <option value="">
                  {!form.subjectId
                    ? "Select a subject first"
                    : formTopics.length === 0
                    ? "No topics available"
                    : "Select topic"}
                </option>

                {formTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.orderIndex !== null &&
                    topic.orderIndex !== undefined
                      ? `${topic.orderIndex}. `
                      : ""}
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>

            {/* REQUIRED */}
            <div className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={form.required}
                  disabled={saving}
                  onChange={(event) =>
                    updateForm(
                      "required",
                      event.target.checked
                    )
                  }
                  className="mt-0.5 h-4 w-4 rounded border-stone-300 text-orange-500 accent-orange-500 focus:ring-orange-300 disabled:cursor-not-allowed"
                />

                <span>
                  <span className="block text-sm font-semibold text-stone-900">
                    Required Topic
                  </span>

                  <span className="mt-0.5 block text-xs leading-relaxed text-stone-500">
                    Mark this topic as required curriculum for the selected school and standard.
                  </span>
                </span>
              </label>
            </div>
          </div>
        </form>
      </Modal>

      {/* CUSTOM DELETE MODAL */}
      <Modal
        isOpen={Boolean(deleteRequirement)}
        onClose={closeDeleteModal}
        title="Delete Syllabus Requirement?"
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
              {deleting ? "Deleting..." : "Delete Requirement"}
            </button>
          </div>
        }
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-xl font-bold text-red-600">
          !
        </div>

        <p className="mt-3 text-sm leading-relaxed text-stone-500">
          This will remove the syllabus requirement for{" "}
          <span className="font-semibold text-stone-800">
            {deleteRequirement?.topic?.name || "this topic"}
          </span>
          . This action cannot be undone.
        </p>

        {deleteRequirement && (
          <div className="mt-4 rounded-xl border border-stone-200/70 bg-stone-50/70 p-4">
            <div className="grid gap-2.5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                  School
                </p>

                <p className="mt-0.5 text-sm font-medium text-stone-800">
                  {deleteRequirement.school?.name || "Unknown school"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                  Standard
                </p>

                <p className="mt-0.5 text-sm font-medium text-stone-800">
                  {deleteRequirement.standard?.name ||
                    "Unknown standard"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                  Subject
                </p>

                <p className="mt-0.5 text-sm font-medium text-stone-800">
                  {deleteRequirement.subject?.name ||
                    "Unknown subject"}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
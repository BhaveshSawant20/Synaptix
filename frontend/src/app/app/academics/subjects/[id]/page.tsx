"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Subject = {
  id: string;
  instituteId: string;
  name: string;
  code?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type Topic = {
  id: string;
  instituteId: string;
  subjectId: string;
  name: string;
  description?: string | null;
  orderIndex?: number | null;
};

type School = {
  id: string;
  name: string;
};

type Standard = {
  id: string;
  schoolId: string;
  name: string;
};

type Exam = {
  id: string;
  name: string;
  schoolId: string;
  subjectId?: string | null;
  academicYear?: string | null;
  school?: {
    id: string;
    name: string;
  } | null;
};

import { API_BASE } from "@/lib/api";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("synaptix_token") || "";
}

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    localStorage.removeItem("synaptix_token");
    window.location.href = "/login";
    throw new Error("Authentication required.");
  }

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function SubjectDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const subjectId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [subject, setSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    code: "",
  });

  async function loadSubjectDetails() {
    if (!subjectId) return;

    try {
      setLoading(true);
      setError("");

      const token = getToken();

      if (!token) {
        window.location.href = "/login";
        return;
      }

      const subjectResponse = await fetch(
        `${API_BASE}/subjects/${subjectId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const subjectData = await parseResponse(subjectResponse);
      setSubject(subjectData.subject);

      const [
        topicsResponse,
        schoolsResponse,
        standardsResponse,
        examsResponse,
      ] = await Promise.all([
        fetch(`${API_BASE}/topics`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_BASE}/schools`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_BASE}/standards`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_BASE}/exams`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const topicsData = await parseResponse(topicsResponse);
      const schoolsData = await parseResponse(schoolsResponse);
      const standardsData = await parseResponse(standardsResponse);
      const examsData = await parseResponse(examsResponse);

      setTopics(
        Array.isArray(topicsData.topics)
          ? topicsData.topics.filter(
              (topic: Topic) => topic.subjectId === subjectId
            )
          : []
      );

      setSchools(
        Array.isArray(schoolsData.schools)
          ? schoolsData.schools
          : []
      );

      setStandards(
        Array.isArray(standardsData.standards)
          ? standardsData.standards
          : []
      );

      setExams(
        Array.isArray(examsData.exams)
          ? examsData.exams.filter(
              (exam: Exam) => exam.subjectId === subjectId
            )
          : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load subject."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubjectDetails();
  }, [subjectId]);

  function openEditModal() {
    if (!subject) return;
    setEditForm({
      name: subject.name || "",
      code: subject.code || "",
    });
    setIsEditModalOpen(true);
  }

  async function handleUpdateSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = editForm.name.trim();
    const code = editForm.code.trim();

    if (!name) {
      setError("Subject name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const token = getToken();

      if (!token) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch(`${API_BASE}/subjects/${subjectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          code: code || null,
        }),
      });

      const data = await parseResponse(response);

      setSubject(data.subject);
      setIsEditModalOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update subject."
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
              Loading subject details...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !subject) {
    return (
      <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <button
            type="button"
            onClick={() => router.back()}
            className="group mb-6 inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition duration-200 hover:text-orange-600"
          >
            <span className="transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
            Back to Subjects
          </button>

          <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
            <h2 className="text-lg font-semibold text-red-800">
              Unable to load subject
            </h2>

            <p className="mt-2 text-sm text-red-600">
              {error || "Subject not found."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => router.back()}
          className="group mb-6 inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition duration-200 hover:text-orange-600"
        >
          <span className="transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
          Back to Subjects
        </button>

        {/* Header */}
        <section className="relative overflow-hidden rounded-3xl border border-orange-100/70 bg-white/80 p-7 shadow-sm backdrop-blur-xl sm:p-8">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-orange-100/60 blur-3xl" />

          <div className="relative z-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Academic Curriculum
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
                  {subject.name}
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-2.5">
                  {subject.code && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                      Code: {subject.code}
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-600">
                    Curriculum Subject
                  </span>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={openEditModal}
                  className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
                >
                  Edit Subject
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Summary Stats */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-orange-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Topics
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-stone-900">
              {topics.length}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Topics mapped to this subject
            </p>
          </div>

          <div className="rounded-3xl border border-orange-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Standards
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-stone-900">
              {standards.length}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Standards in the institute
            </p>
          </div>

          <div className="rounded-3xl border border-orange-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Exams
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-stone-900">
              {exams.length}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Exams testing this subject
            </p>
          </div>

          <div className="rounded-3xl border border-orange-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Subject Code
            </p>

            <p className="mt-3 text-2xl font-bold tracking-tight text-stone-900">
              {subject.code || "—"}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Curriculum identifier
            </p>
          </div>
        </section>

        {/* Topics */}
        <section className="mt-6 overflow-hidden rounded-3xl border border-orange-100/70 bg-white/80 shadow-sm backdrop-blur-xl">
          <div className="border-b border-stone-200/70 p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Curriculum Modules
            </p>

            <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-stone-900">
              Subject Topics
            </h2>

            <p className="mt-1 text-sm text-stone-500">
              Topics currently mapped to {subject.name}.
            </p>
          </div>

          <div className="p-6 sm:p-7">
            {topics.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 p-8 text-center">
                <p className="text-sm font-semibold text-stone-800">
                  No topics found
                </p>

                <p className="mt-1 text-xs text-stone-500">
                  Topics linked to this subject will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {topics.map((topic) => (
                  <div
                    key={topic.id}
                    className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <h3 className="text-sm font-semibold text-stone-900">
                        {topic.name}
                      </h3>

                      {topic.description && (
                        <p className="mt-0.5 text-xs text-stone-500">
                          {topic.description}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/app/academics/topics/${topic.id}`)
                      }
                      className="inline-flex shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-600 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-100 active:translate-y-0"
                    >
                      View Details →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Standards */}
        <section className="mt-6 overflow-hidden rounded-3xl border border-orange-100/70 bg-white/80 shadow-sm backdrop-blur-xl">
          <div className="border-b border-stone-200/70 p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Academic Structure
            </p>

            <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-stone-900">
              Institute Standards
            </h2>

            <p className="mt-1 text-sm text-stone-500">
              Standards available across schools in your institute.
            </p>
          </div>

          <div className="p-6 sm:p-7">
            {standards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 p-8 text-center">
                <p className="text-sm font-semibold text-stone-800">
                  No standards found
                </p>

                <p className="mt-1 text-xs text-stone-500">
                  Standards will appear here once they are registered.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {standards.map((standard) => (
                  <div
                    key={standard.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-sm"
                  >
                    <div>
                      <p className="text-sm font-semibold text-stone-900">
                        {standard.name}
                      </p>

                      <p className="mt-0.5 text-xs text-stone-400">
                        Standard
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/app/standards/${standard.id}`)
                      }
                      className="inline-flex shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-600 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-100 active:translate-y-0"
                    >
                      View →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Exams */}
        <section className="mt-6 overflow-hidden rounded-3xl border border-orange-100/70 bg-white/80 shadow-sm backdrop-blur-xl">
          <div className="border-b border-stone-200/70 p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Examination
            </p>

            <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-stone-900">
              Associated Exams
            </h2>

            <p className="mt-1 text-sm text-stone-500">
              Exams currently testing students on {subject.name}.
            </p>
          </div>

          <div className="p-6 sm:p-7">
            {exams.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 p-8 text-center">
                <p className="text-sm font-semibold text-stone-800">
                  No exams found
                </p>

                <p className="mt-1 text-xs text-stone-500">
                  Exams covering this subject will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {exams.map((exam) => (
                  <div
                    key={exam.id}
                    className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <h3 className="text-sm font-semibold text-stone-900">
                        {exam.name}
                      </h3>

                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {exam.school?.name && (
                          <span className="rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs font-medium text-stone-600">
                            {exam.school.name}
                          </span>
                        )}

                        {exam.academicYear && (
                          <span className="rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs font-medium text-stone-600">
                            {exam.academicYear}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/app/academics/exams/${exam.id}`)
                      }
                      className="inline-flex shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-600 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-100 active:translate-y-0"
                    >
                      View Exam Details →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Basic Details */}
        <section className="mt-6 mb-8 rounded-3xl border border-orange-100/70 bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
            Subject Information
          </p>

          <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-stone-900">
            Basic Details
          </h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Subject ID
              </p>

              <p className="mt-2 break-all text-sm font-medium text-stone-700">
                {subject.id}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Subject Name
              </p>

              <p className="mt-2 text-sm font-semibold text-stone-800">
                {subject.name}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Subject Code
              </p>

              <p className="mt-2 text-sm font-semibold text-stone-800">
                {subject.code || "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Registered Date
              </p>

              <p className="mt-2 text-sm font-medium text-stone-700">
                {formatDate(subject.createdAt)}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Edit Subject Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 px-5 py-8 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-orange-100 bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Edit Subject
                </p>

                <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-stone-900">
                  Update Subject Details
                </h2>

                <p className="mt-1 text-sm text-stone-500">
                  Modify the name or identifier code for this subject.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                disabled={saving}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-lg text-stone-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateSubject} className="space-y-5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Subject Name
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
                  placeholder="e.g. Mathematics"
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
                  value={editForm.code}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      code: event.target.value,
                    }))
                  }
                  placeholder="e.g. MATH"
                  className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm uppercase text-stone-900 placeholder:normal-case placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
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
                  {saving ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
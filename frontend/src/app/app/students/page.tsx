"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { API_BASE } from "@/lib/api";

type School = {
  id: string;
  name: string;
};

type Standard = {
  id: string;
  name: string;
  schoolId: string;
};

type Student = {
  id: string;
  name: string;
  studentCode?: string | null;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  schoolId: string;
  standardId: string;
  school?: {
    id: string;
    name: string;
  } | null;
  standard?: {
    id: string;
    name: string;
  } | null;
};

type StudentForm = {
  name: string;
  studentCode: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  schoolId: string;
  standardId: string;
};

const emptyForm: StudentForm = {
  name: "",
  studentCode: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  schoolId: "",
  standardId: "",
};

function getToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem("synaptix_token") || "";
}

function getInitials(name: string) {
  if (!name.trim()) {
    return "ST";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getDateInputValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function getFormFromStudent(student: Student): StudentForm {
  return {
    name: student.name || "",
    studentCode: student.studentCode || "",
    email: student.email || "",
    phone: student.phone || "",
    dateOfBirth: getDateInputValue(student.dateOfBirth),
    schoolId: student.schoolId || "",
    standardId: student.standardId || "",
  };
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Dedicated Delete Confirmation Modal state
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState<StudentForm>(emptyForm);

  async function loadData() {
    const token = getToken();

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

      const [studentsResponse, schoolsResponse, standardsResponse] =
        await Promise.all([
          fetch(`${API_BASE}/students`, {
            method: "GET",
            headers,
          }),
          fetch(`${API_BASE}/schools`, {
            method: "GET",
            headers,
          }),
          fetch(`${API_BASE}/standards`, {
            method: "GET",
            headers,
          }),
        ]);

      if (
        studentsResponse.status === 401 ||
        schoolsResponse.status === 401 ||
        standardsResponse.status === 401
      ) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      const studentsData = await studentsResponse.json();
      const schoolsData = await schoolsResponse.json();
      const standardsData = await standardsResponse.json();

      if (!studentsResponse.ok || !studentsData.success) {
        throw new Error(studentsData.message || "Failed to load students.");
      }

      if (!schoolsResponse.ok || !schoolsData.success) {
        throw new Error(schoolsData.message || "Failed to load schools.");
      }

      if (!standardsResponse.ok || !standardsData.success) {
        throw new Error(standardsData.message || "Failed to load standards.");
      }

      setStudents(
        Array.isArray(studentsData.students) ? studentsData.students : [],
      );
      setSchools(Array.isArray(schoolsData.schools) ? schoolsData.schools : []);
      setStandards(
        Array.isArray(standardsData.standards) ? standardsData.standards : [],
      );
    } catch (err) {
      console.error("Failed to load students:", err);
      setError(err instanceof Error ? err.message : "Failed to load students.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return students;
    }

    return students.filter((student) => {
      const schoolName =
        student.school?.name ||
        schools.find((school) => school.id === student.schoolId)?.name ||
        "";

      const standardName =
        student.standard?.name ||
        standards.find((standard) => standard.id === student.standardId)
          ?.name ||
        "";

      return (
        student.name.toLowerCase().includes(query) ||
        (student.studentCode || "").toLowerCase().includes(query) ||
        schoolName.toLowerCase().includes(query) ||
        standardName.toLowerCase().includes(query) ||
        (student.email || "").toLowerCase().includes(query) ||
        (student.phone || "").toLowerCase().includes(query)
      );
    });
  }, [students, schools, standards, search]);

  const schoolCount = useMemo(() => {
    return new Set(students.map((student) => student.schoolId).filter(Boolean))
      .size;
  }, [students]);

  const standardCount = useMemo(() => {
    return new Set(
      students.map((student) => student.standardId).filter(Boolean),
    ).size;
  }, [students]);

  const modalStandards = useMemo(() => {
    if (!form.schoolId) {
      return [];
    }

    return standards.filter((standard) => standard.schoolId === form.schoolId);
  }, [standards, form.schoolId]);

  function openCreateModal() {
    setEditingStudent(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function openEditModal(student: Student) {
    setEditingStudent(student);
    setForm(getFormFromStudent(student));
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingStudent(null);
    setForm(emptyForm);
    setError("");
  }

  function handleSchoolChange(schoolId: string) {
    setForm((current) => ({
      ...current,
      schoolId,
      standardId: "",
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const token = getToken();

      if (!token) {
        window.location.href = "/login";
        return;
      }

      if (!form.name.trim()) {
        setError("Student name is required.");
        return;
      }

      if (!form.schoolId) {
        setError("Please select a school.");
        return;
      }

      if (!form.standardId) {
        setError("Please select a standard.");
        return;
      }

      const payload = {
        name: form.name.trim(),
        studentCode: form.studentCode.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        schoolId: form.schoolId,
        standardId: form.standardId,
      };

      const url = editingStudent
        ? `${API_BASE}/students/${editingStudent.id}`
        : `${API_BASE}/students`;

      const method = editingStudent ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
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
            `Failed to ${editingStudent ? "update" : "create"} student.`,
        );
      }

      setShowModal(false);
      setEditingStudent(null);
      setForm(emptyForm);

      setSuccess(
        editingStudent
          ? "Student details updated successfully."
          : "Student added successfully.",
      );

      await loadData();
    } catch (err) {
      console.error("Student save error:", err);
      setError(err instanceof Error ? err.message : "Failed to save student.");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(student: Student) {
    setDeletingStudent(student);
  }

  async function handleDeleteConfirmed() {
    if (!deletingStudent) return;

    try {
      setIsDeleting(true);
      setError("");
      setSuccess("");

      const token = getToken();

      if (!token) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch(
        `${API_BASE}/students/${deletingStudent.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete student.");
      }

      setSuccess(`Student "${deletingStudent.name}" deleted successfully.`);
      setDeletingStudent(null);

      await loadData();
    } catch (err) {
      console.error("Student delete error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to delete student.",
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
              <span>♙</span>
              Institute Records
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
              Students
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
              Manage student rosters across schools, standards, and coaching batches with end-to-end performance tracking.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
          >
            <span className="text-base leading-none">+</span>
            <span>Add Student</span>
          </button>
        </section>

        {/* Alerts */}
        {error && !showModal && !deletingStudent && (
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

        {/* Stats */}
        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="glass rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
              Total Students
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
              {students.length}
            </p>
          </div>

          <div className="glass rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
              Affiliated Schools
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
              {schoolCount}
            </p>
          </div>

          <div className="glass rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
              Active Standards
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
              {standardCount}
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
              placeholder="Search students by name, code, school, standard, email or phone..."
              className="h-12 w-full rounded-2xl border border-stone-200 bg-white pl-11 pr-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 hover:border-stone-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </div>
        </section>

        {/* Student table */}
        <section className="mt-7 overflow-hidden rounded-3xl border border-stone-200/70 bg-white/80 shadow-sm backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px]">
              <thead>
                <tr className="border-b border-stone-100 text-left">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Student
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Code
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    School
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Standard
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Contact
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
                            <div className="h-3 w-40 animate-pulse rounded bg-stone-100" />
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <div className="h-4 w-16 animate-pulse rounded bg-stone-100" />
                      </td>

                      <td className="px-5 py-5">
                        <div className="h-4 w-28 animate-pulse rounded bg-stone-100" />
                      </td>

                      <td className="px-5 py-5">
                        <div className="h-7 w-20 animate-pulse rounded-xl bg-stone-100" />
                      </td>

                      <td className="px-5 py-5">
                        <div className="h-4 w-28 animate-pulse rounded bg-stone-100" />
                      </td>

                      <td className="px-6 py-5">
                        <div className="ml-auto h-9 w-32 animate-pulse rounded-xl bg-stone-100" />
                      </td>
                    </tr>
                  ))
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16">
                      <div className="mx-auto max-w-md text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-xl text-orange-500">
                          {search ? "⌕" : "♟"}
                        </div>

                        <h3 className="mt-5 text-lg font-semibold tracking-tight text-stone-900">
                          {search ? "No students found" : "No students yet"}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-stone-500">
                          {search
                            ? "Try refining your search terms or clearing the filter."
                            : "Add your first student to start managing academic records and batch allocations."}
                        </p>

                        {!search && (
                          <button
                            type="button"
                            onClick={openCreateModal}
                            className="mt-5 inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0"
                          >
                            + Add Student
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const schoolName =
                      student.school?.name ||
                      schools.find((school) => school.id === student.schoolId)
                        ?.name ||
                      "—";

                    const standardName =
                      student.standard?.name ||
                      standards.find(
                        (standard) => standard.id === student.standardId,
                      )?.name ||
                      "—";

                    return (
                      <tr
                        key={student.id}
                        className="border-b border-stone-100 transition duration-150 last:border-b-0 hover:bg-orange-50/30"
                      >
                        {/* Student */}
                        <td className="px-6 py-4">
                          <Link
                            href={`/app/students/${student.id}`}
                            className="group flex w-fit items-center gap-3 rounded-xl outline-none transition focus-visible:ring-4 focus-visible:ring-orange-100"
                          >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-sm font-bold text-orange-700 transition duration-200 group-hover:bg-orange-200">
                              {getInitials(student.name)}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-stone-900 transition duration-150 group-hover:text-orange-600">
                                {student.name}
                              </p>

                              <p className="truncate text-xs text-stone-500">
                                {student.email || "No email provided"}
                              </p>
                            </div>
                          </Link>
                        </td>

                        {/* Code */}
                        <td className="px-5 py-4 text-sm font-medium text-stone-600">
                          {student.studentCode || "—"}
                        </td>

                        {/* School */}
                        <td className="px-5 py-4 text-sm text-stone-600">
                          {schoolName}
                        </td>

                        {/* Standard */}
                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-xl bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
                            {standardName}
                          </span>
                        </td>

                        {/* Contact */}
                        <td className="px-5 py-4">
                          <div className="text-sm text-stone-700">
                            {student.phone || "—"}
                          </div>

                          {student.dateOfBirth && (
                            <div className="mt-0.5 text-xs text-stone-400">
                              DOB: {formatDate(student.dateOfBirth)}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {/* View Details */}
                            <Link
                              href={`/app/students/${student.id}`}
                              className="inline-flex items-center justify-center rounded-xl border border-orange-100 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-600 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-100 active:translate-y-0"
                            >
                              View Details →
                            </Link>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => openEditModal(student)}
                              className="rounded-xl border border-orange-200 bg-white px-3.5 py-2 text-xs font-semibold text-orange-700 transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 active:translate-y-0"
                            >
                              Edit
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => confirmDelete(student)}
                              className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 transition duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-100 active:translate-y-0"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Add / Edit Student Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/45 px-4 py-6 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-orange-100 bg-[#fffdf9] shadow-2xl">
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-6 py-5 sm:px-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Student Management
                </p>

                <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
                  {editingStudent ? "Edit Student" : "Add Student"}
                </h2>

                <p className="mt-1 text-sm text-stone-500">
                  {editingStudent
                    ? "Update the student's personal details and standard mapping."
                    : "Add a new student to your institute directory."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {/* Modal body */}
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
                    <label
                      htmlFor="student-name"
                      className="text-xs font-semibold text-stone-700"
                    >
                      Student Name *
                    </label>

                    <input
                      id="student-name"
                      type="text"
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="e.g. John Doe"
                      className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  {/* Student Code */}
                  <div>
                    <label
                      htmlFor="student-code"
                      className="text-xs font-semibold text-stone-700"
                    >
                      Student Code
                    </label>

                    <input
                      id="student-code"
                      type="text"
                      value={form.studentCode}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          studentCode: event.target.value,
                        }))
                      }
                      placeholder="e.g. STU002"
                      className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  {/* DOB */}
                  <div>
                    <label
                      htmlFor="student-dob"
                      className="text-xs font-semibold text-stone-700"
                    >
                      Date of Birth
                    </label>

                    <input
                      id="student-dob"
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          dateOfBirth: event.target.value,
                        }))
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="student-email"
                      className="text-xs font-semibold text-stone-700"
                    >
                      Email Address
                    </label>

                    <input
                      id="student-email"
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="student@example.com"
                      className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label
                      htmlFor="student-phone"
                      className="text-xs font-semibold text-stone-700"
                    >
                      Phone Number
                    </label>

                    <input
                      id="student-phone"
                      type="tel"
                      value={form.phone}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      placeholder="Enter phone number"
                      className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  {/* School */}
                  <div>
                    <label
                      htmlFor="student-school"
                      className="text-xs font-semibold text-stone-700"
                    >
                      School *
                    </label>

                    <select
                      id="student-school"
                      value={form.schoolId}
                      onChange={(event) =>
                        handleSchoolChange(event.target.value)
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="">Select school</option>
                      {schools.map((school) => (
                        <option key={school.id} value={school.id}>
                          {school.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Standard */}
                  <div>
                    <label
                      htmlFor="student-standard"
                      className="text-xs font-semibold text-stone-700"
                    >
                      Standard *
                    </label>

                    <select
                      id="student-standard"
                      value={form.standardId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          standardId: event.target.value,
                        }))
                      }
                      disabled={!form.schoolId}
                      className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="">
                        {form.schoolId
                          ? "Select standard"
                          : "Select school first"}
                      </option>
                      {modalStandards.map((standard) => (
                        <option key={standard.id} value={standard.id}>
                          {standard.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="flex flex-col-reverse gap-3 border-t border-stone-100 bg-white/80 px-6 py-5 sm:flex-row sm:justify-end sm:px-7">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-600 transition duration-150 hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-150 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingStudent
                      ? "Save Changes"
                      : "Add Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Delete Confirmation Modal */}
      {deletingStudent && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isDeleting) {
              setDeletingStudent(null);
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
                  Delete Student
                </h3>
                <p className="mt-0.5 text-xs text-stone-500">
                  Permanent removal confirmation
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-stone-600">
              Are you sure you want to delete{" "}
              <strong className="font-semibold text-stone-900">
                {deletingStudent.name}
              </strong>
              ? This action cannot be undone and will permanently remove all associated enrollment and academic records.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
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
                {isDeleting ? "Deleting..." : "Delete Student"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

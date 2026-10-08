"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Modal from "@/app/app/components/Modal";
import SortControl from "@/app/app/components/SortControl";
import { SortOption, naturalCompare, sortRecords } from "@/lib/sorting";
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
  createdAt?: string;
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
  if (!name.trim()) return "ST";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getDateInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
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
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("alphabetical");

  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Delete Confirmation Modal state
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState<StudentForm>(emptyForm);

  async function loadData(isInitial = false) {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    try {
      if (!isInitial) {
        setLoading(true);
        setError("");
      }

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
        router.push("/login");
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
    let ignore = false;
    async function init() {
      if (!ignore) {
        await loadData(true);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  // Filter students by search
  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter((student) => {
      // School filter
      if (selectedSchoolFilter !== "all" && student.schoolId !== selectedSchoolFilter) {
        return false;
      }

      if (!query) return true;

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
  }, [students, schools, standards, search, selectedSchoolFilter]);

  // Group students by school and sort alphabetically / by selected sortBy option
  const schoolGroups = useMemo(() => {
    const sortedSchools = [...schools].sort((a, b) => naturalCompare(a.name, b.name));

    const groups: { school: School | null; students: Student[] }[] = [];

    for (const school of sortedSchools) {
      if (selectedSchoolFilter !== "all" && selectedSchoolFilter !== school.id) {
        continue;
      }

      const schoolStudents = filteredStudents.filter((s) => s.schoolId === school.id);

      // Only include school if it has matching students, or if not searching
      if (schoolStudents.length > 0 || !search) {
        const sorted = sortRecords(
          schoolStudents,
          sortBy,
          (s) => s.name,
          (s) => s.createdAt || s.id
        );
        groups.push({ school, students: sorted });
      }
    }

    // Unassigned students
    const unassigned = filteredStudents.filter((s) => !s.schoolId);
    if (unassigned.length > 0 && selectedSchoolFilter === "all") {
      const sorted = sortRecords(
        unassigned,
        sortBy,
        (s) => s.name,
        (s) => s.createdAt || s.id
      );
      groups.push({ school: null, students: sorted });
    }

    return groups;
  }, [schools, filteredStudents, sortBy, search, selectedSchoolFilter]);

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
    if (!form.schoolId) return [];
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
    if (saving) return;
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
        router.push("/login");
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
        router.push("/login");
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
        router.push("/login");
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
        router.push("/login");
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
              Manage student rosters organized by school and standard with alphabetical sorting and batch allocations.
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

        {/* Search & Sort Controls */}
        <section className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
              ⌕
            </span>

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search students by name, student code, email, phone..."
              className="h-12 w-full rounded-2xl border border-stone-200 bg-white pl-11 pr-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 hover:border-stone-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* School Filter Dropdown */}
            <select
              value={selectedSchoolFilter}
              onChange={(e) => setSelectedSchoolFilter(e.target.value)}
              className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            >
              <option value="all">All Schools</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Sort Control (Alphabetical, Newest, Oldest) */}
            <SortControl value={sortBy} onChange={setSortBy} />
          </div>
        </section>

        {/* Student Grouped-by-School Lists (CHANGE 5: GROUPED BY SCHOOL) */}
        <section className="mt-7 space-y-7">
          {loading ? (
            <div className="flex min-h-80 items-center justify-center rounded-3xl border border-stone-200/70 bg-white/80 p-8 shadow-sm">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" />
                <p className="mt-4 text-sm font-medium text-stone-500">
                  Loading students directory...
                </p>
              </div>
            </div>
          ) : schoolGroups.length === 0 || filteredStudents.length === 0 ? (
            <div className="flex min-h-80 items-center justify-center rounded-3xl border border-stone-200/70 bg-white/80 p-8 shadow-sm">
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
            </div>
          ) : (
            schoolGroups.map(({ school, students: schoolStudents }) => {
              const schoolTitle = school ? school.name : "Other / Unassigned School";

              return (
                <div
                  key={school?.id || "unassigned"}
                  className="overflow-hidden rounded-3xl border border-stone-200/70 bg-white/80 shadow-sm backdrop-blur-md"
                >
                  {/* School Group Header */}
                  <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/60 px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-xs font-bold text-orange-700">
                        🏫
                      </span>
                      <h3 className="text-base font-bold text-stone-900">
                        {schoolTitle}
                      </h3>
                    </div>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-stone-600 border border-stone-200 shadow-2xs">
                      {schoolStudents.length} student{schoolStudents.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {schoolStudents.length === 0 ? (
                    <div className="p-8 text-center text-xs text-stone-400">
                      No students enrolled under this school.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[950px]">
                        <thead>
                          <tr className="border-b border-stone-100 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400 bg-white">
                            <th className="px-6 py-3.5">Student</th>
                            <th className="px-5 py-3.5">Student ID</th>
                            <th className="px-5 py-3.5">Standard</th>
                            <th className="px-5 py-3.5">Contact</th>
                            <th className="px-6 py-3.5 text-right">Actions</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-stone-100 bg-white">
                          {schoolStudents.map((student) => {
                            const standardName =
                              student.standard?.name ||
                              standards.find(
                                (standard) => standard.id === student.standardId,
                              )?.name ||
                              "—";

                            return (
                              <tr
                                key={student.id}
                                className="transition duration-150 hover:bg-orange-50/30"
                              >
                                {/* Student Name (Primary) */}
                                <td className="px-6 py-4">
                                  <Link
                                    href={`/app/students/${student.id}`}
                                    className="group flex w-fit items-center gap-3 rounded-xl outline-none transition"
                                  >
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-xs font-bold text-orange-700 transition duration-200 group-hover:bg-orange-200">
                                      {getInitials(student.name)}
                                    </div>

                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-bold text-stone-900 transition duration-150 group-hover:text-orange-600">
                                        {student.name}
                                      </p>
                                      <p className="truncate text-xs text-stone-400">
                                        {student.email || "No email"}
                                      </p>
                                    </div>
                                  </Link>
                                </td>

                                {/* Student ID */}
                                <td className="px-5 py-4 font-mono text-xs font-medium text-stone-600">
                                  {student.studentCode || `STU-${student.id.slice(0, 5)}`}
                                </td>

                                {/* Standard */}
                                <td className="px-5 py-4">
                                  <span className="inline-flex rounded-lg bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
                                    {standardName}
                                  </span>
                                </td>

                                {/* Contact */}
                                <td className="px-5 py-4 text-xs text-stone-600">
                                  <div>{student.phone || "—"}</div>
                                  {student.dateOfBirth && (
                                    <div className="mt-0.5 text-[11px] text-stone-400">
                                      DOB: {formatDate(student.dateOfBirth)}
                                    </div>
                                  )}
                                </td>

                                {/* Actions */}
                                <td className="px-6 py-4">
                                  <div className="flex items-center justify-end gap-2">
                                    <Link
                                      href={`/app/students/${student.id}`}
                                      className="inline-flex items-center justify-center rounded-xl border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600 transition hover:bg-orange-100"
                                    >
                                      View
                                    </Link>

                                    <button
                                      type="button"
                                      onClick={() => openEditModal(student)}
                                      className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
                                    >
                                      Edit
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => confirmDelete(student)}
                                      className="rounded-xl border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      </div>

      {/* ======================================================
          ADD / EDIT STUDENT MODAL (CHANGE 2 FIXED MODAL)
      ====================================================== */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingStudent ? "Edit Student" : "Add Student"}
        badge="Student Management"
        description={
          editingStudent
            ? "Update the student's personal details and standard mapping."
            : "Add a new student to your institute directory."
        }
        maxWidth="2xl"
        footer={
          <>
            <button
              type="button"
              onClick={closeModal}
              disabled={saving}
              className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="student-form"
              disabled={saving}
              className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-150 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingStudent
                  ? "Save Changes"
                  : "Add Student"}
            </button>
          </>
        }
      >
        <form id="student-form" onSubmit={handleSubmit}>
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
                placeholder="e.g. Rahul Sharma"
                className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                required
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
                placeholder="e.g. STU-001"
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
                required
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
                required
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
        </form>
      </Modal>

      {/* ======================================================
          DELETE CONFIRMATION MODAL
      ====================================================== */}
      {deletingStudent && (
        <Modal
          isOpen={Boolean(deletingStudent)}
          onClose={() => setDeletingStudent(null)}
          title="Delete Student Record?"
          badge="Permanent Removal"
          maxWidth="md"
          footer={
            <>
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                disabled={isDeleting}
                className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-60"
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
            </>
          }
        >
          <p className="text-sm leading-6 text-stone-600">
            Are you sure you want to delete{" "}
            <strong className="font-semibold text-stone-900">
              {deletingStudent.name}
            </strong>
            ? This action cannot be undone and will permanently remove all associated enrollment and academic records.
          </p>
        </Modal>
      )}
    </main>
  );
}

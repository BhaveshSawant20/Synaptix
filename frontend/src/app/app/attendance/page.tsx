"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { API_URL } from "@/lib/api";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

type Student = {
  id: string;
  name: string;
  studentCode?: string | null;
  school?: { id: string; name: string } | null;
  standard?: { id: string; name: string } | null;
};

type Attendance = {
  id: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  remarks?: string | null;
  student: Student;
};

type AttendanceForm = {
  studentId: string;
  date: string;
  status: AttendanceStatus;
  remarks: string;
};

const emptyForm: AttendanceForm = {
  studentId: "",
  date: "",
  status: "PRESENT",
  remarks: "",
};

const statusConfig: Record<
  AttendanceStatus,
  { label: string; className: string }
> = {
  PRESENT: {
    label: "Present",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  ABSENT: {
    label: "Absent",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  LATE: {
    label: "Late",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  EXCUSED: {
    label: "Excused",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("synaptix_token") || "";
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function percentage(value: number) {
  return `${value.toFixed(1)}%`;
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string | number;
  note?: string;
  icon: string;
}) {
  return (
    <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
          {label}
        </p>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-xs font-bold text-orange-600">
          {icon}
        </span>
      </div>

      <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">{value}</p>

      {note && <p className="mt-1 text-xs text-stone-500">{note}</p>}
    </div>
  );
}

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | AttendanceStatus
  >("ALL");
  const [studentFilter, setStudentFilter] = useState("ALL");
  const [schoolFilter, setSchoolFilter] = useState("ALL");
  const [standardFilter, setStandardFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] =
    useState<Attendance | null>(null);
  const [deleteRecord, setDeleteRecord] =
    useState<Attendance | null>(null);

  const [form, setForm] = useState<AttendanceForm>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadStudents() {
    const response = await fetch(`${API_URL}/students`, {
      headers: authHeaders(),
    });

    if (response.status === 401) {
      localStorage.removeItem("synaptix_token");
      window.location.href = "/login";
      return;
    }

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to load students.");
    }

    setStudents(data.students || data.data || []);
  }

  async function loadAttendance() {
    const response = await fetch(`${API_URL}/attendance`, {
      headers: authHeaders(),
    });

    if (response.status === 401) {
      localStorage.removeItem("synaptix_token");
      window.location.href = "/login";
      return;
    }

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to load attendance.");
    }

    setAttendance(data.data || []);
  }

  async function loadInitialData() {
    if (!getToken()) {
      window.location.href = "/login";
      return;
    }

    try {
      setLoading(true);
      setError("");

      await Promise.all([loadStudents(), loadAttendance()]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load attendance data.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  const schools = useMemo(() => {
    const map = new Map<string, string>();

    students.forEach((student) => {
      if (student.school) {
        map.set(student.school.id, student.school.name);
      }
    });

    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1]),
    );
  }, [students]);

  const standards = useMemo(() => {
    const map = new Map<string, string>();

    students.forEach((student) => {
      if (
        student.standard &&
        (schoolFilter === "ALL" ||
          student.school?.id === schoolFilter)
      ) {
        map.set(student.standard.id, student.standard.name);
      }
    });

    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1]),
    );
  }, [students, schoolFilter]);

  const filteredAttendance = useMemo(() => {
    const query = search.trim().toLowerCase();

    return attendance.filter((record) => {
      const recordDate = record.date.slice(0, 10);

      const matchesSearch =
        !query ||
        record.student.name.toLowerCase().includes(query) ||
        (record.student.studentCode || "")
          .toLowerCase()
          .includes(query) ||
        (record.student.school?.name || "")
          .toLowerCase()
          .includes(query) ||
        (record.student.standard?.name || "")
          .toLowerCase()
          .includes(query) ||
        (record.remarks || "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" || record.status === statusFilter;

      const matchesStudent =
        studentFilter === "ALL" ||
        record.studentId === studentFilter;

      const matchesSchool =
        schoolFilter === "ALL" ||
        record.student.school?.id === schoolFilter;

      const matchesStandard =
        standardFilter === "ALL" ||
        record.student.standard?.id === standardFilter;

      const matchesFrom = !dateFrom || recordDate >= dateFrom;
      const matchesTo = !dateTo || recordDate <= dateTo;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesStudent &&
        matchesSchool &&
        matchesStandard &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [
    attendance,
    search,
    statusFilter,
    studentFilter,
    schoolFilter,
    standardFilter,
    dateFrom,
    dateTo,
  ]);

  const summary = useMemo(() => {
    const total = filteredAttendance.length;

    const present = filteredAttendance.filter(
      (item) => item.status === "PRESENT",
    ).length;

    const absent = filteredAttendance.filter(
      (item) => item.status === "ABSENT",
    ).length;

    const late = filteredAttendance.filter(
      (item) => item.status === "LATE",
    ).length;

    const excused = filteredAttendance.filter(
      (item) => item.status === "EXCUSED",
    ).length;

    return {
      total,
      present,
      absent,
      late,
      excused,
      presentRate: total ? (present / total) * 100 : 0,
    };
  }, [filteredAttendance]);

  const studentSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        student: Student;
        total: number;
        present: number;
        absent: number;
        late: number;
        excused: number;
      }
    >();

    filteredAttendance.forEach((record) => {
      const existing = map.get(record.studentId);

      if (!existing) {
        map.set(record.studentId, {
          student: record.student,
          total: 1,
          present: record.status === "PRESENT" ? 1 : 0,
          absent: record.status === "ABSENT" ? 1 : 0,
          late: record.status === "LATE" ? 1 : 0,
          excused: record.status === "EXCUSED" ? 1 : 0,
        });
        return;
      }

      existing.total += 1;

      if (record.status === "PRESENT") existing.present += 1;
      if (record.status === "ABSENT") existing.absent += 1;
      if (record.status === "LATE") existing.late += 1;
      if (record.status === "EXCUSED") existing.excused += 1;
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        rate: item.total ? (item.present / item.total) * 100 : 0,
      }))
      .sort((a, b) => b.rate - a.rate);
  }, [filteredAttendance]);

  function openAddModal() {
    setEditingAttendance(null);

    setForm({
      ...emptyForm,
      date: new Date().toISOString().slice(0, 10),
    });

    setError("");
    setSuccess("");
    setIsModalOpen(true);
  }

  function openEditModal(record: Attendance) {
    setEditingAttendance(record);

    setForm({
      studentId: record.studentId,
      date: record.date.slice(0, 10),
      status: record.status,
      remarks: record.remarks || "",
    });

    setError("");
    setSuccess("");
    setIsModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setIsModalOpen(false);
    setEditingAttendance(null);
    setForm(emptyForm);
    setError("");
  }

  function openDeleteModal(record: Attendance) {
    setDeleteRecord(record);
    setError("");
    setSuccess("");
  }

  function closeDeleteModal() {
    if (deleting) return;
    setDeleteRecord(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.studentId) {
      setError("Please select a student.");
      return;
    }

    if (!form.date) {
      setError("Attendance date is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        ...(editingAttendance
          ? {}
          : { studentId: form.studentId }),
        date: form.date,
        status: form.status,
        remarks: form.remarks.trim() || undefined,
      };

      const url = editingAttendance
        ? `${API_URL}/attendance/${editingAttendance.id}`
        : `${API_URL}/attendance`;

      const response = await fetch(url, {
        method: editingAttendance ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save attendance.");
      }

      setSuccess(
        editingAttendance
          ? "Attendance record updated successfully."
          : "Attendance record added successfully."
      );

      closeModal();
      await loadAttendance();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save attendance.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteRecord) return;

    try {
      setDeleting(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_URL}/attendance/${deleteRecord.id}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        },
      );

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete attendance.");
      }

      setSuccess("Attendance record deleted successfully.");
      setDeleteRecord(null);
      await loadAttendance();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete attendance.",
      );
    } finally {
      setDeleting(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setStudentFilter("ALL");
    setSchoolFilter("ALL");
    setStandardFilter("ALL");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Tracking
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Attendance
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
              Record and monitor student attendance across your coaching institute.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
          >
            <span>+</span> Add Attendance
          </button>
        </div>

        {/* Alerts */}
        {error && !isModalOpen && !deleteRecord && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && !isModalOpen && !deleteRecord && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {success}
          </div>
        )}

        {/* Summary Stat Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Attendance Rate"
            value={percentage(summary.presentRate)}
            note="Present records"
            icon="%"
          />
          <SummaryCard
            label="Total Records"
            value={summary.total}
            icon="▦"
          />
          <SummaryCard
            label="Present"
            value={summary.present}
            icon="✓"
          />
          <SummaryCard
            label="Absent"
            value={summary.absent}
            icon="×"
          />
          <SummaryCard
            label="Late / Excused"
            value={summary.late + summary.excused}
            note={`${summary.late} late · ${summary.excused} excused`}
            icon="◷"
          />
        </div>

        {/* Filters Section */}
        <div className="glass mb-8 rounded-2xl border border-stone-200/70 p-5 sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-tight text-stone-900">
              Attendance Analytics & Filters
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Filter by student, school, standard, status, or date range.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student, code..."
              className="h-11 rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />

            <select
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              className="h-11 rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            >
              <option value="ALL">All students</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>

            <select
              value={schoolFilter}
              onChange={(e) => {
                setSchoolFilter(e.target.value);
                setStandardFilter("ALL");
              }}
              className="h-11 rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            >
              <option value="ALL">All schools</option>
              {schools.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={standardFilter}
              onChange={(e) => setStandardFilter(e.target.value)}
              className="h-11 rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            >
              <option value="ALL">All standards</option>
              {standards.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as "ALL" | AttendanceStatus,
                )
              }
              className="h-11 rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            >
              <option value="ALL">All statuses</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
              <option value="EXCUSED">Excused</option>
            </select>

            <button
              type="button"
              onClick={clearFilters}
              className="h-11 rounded-xl border border-orange-200 bg-orange-50 px-4 text-sm font-semibold text-orange-700 transition duration-200 hover:bg-orange-100 active:scale-[0.98]"
            >
              Clear filters
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>
          </div>
        </div>

        {/* Student Attendance Overview Breakdown */}
        {studentSummary.length > 0 && (
          <div className="glass mb-8 overflow-hidden rounded-2xl border border-stone-200/70">
            <div className="border-b border-stone-200/70 px-5 py-5 sm:px-6">
              <h2 className="text-lg font-semibold tracking-tight text-stone-900">
                Student Attendance Overview
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Attendance rate performance based on current filter selections.
              </p>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {studentSummary.slice(0, 12).map((item) => (
                <div
                  key={item.student.id}
                  className="rounded-xl border border-stone-200/70 bg-white/70 p-4 transition duration-150 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-stone-900">
                        {item.student.name}
                      </p>
                      <p className="mt-0.5 text-xs text-stone-400">
                        {item.student.school?.name || "No school"} ·{" "}
                        {item.student.standard?.name || "No standard"}
                      </p>
                    </div>

                    <span
                      className={`text-sm font-bold ${
                        item.rate >= 75
                          ? "text-emerald-600"
                          : item.rate >= 50
                            ? "text-amber-600"
                            : "text-red-600"
                      }`}
                    >
                      {percentage(item.rate)}
                    </span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-orange-500 transition-all duration-300"
                      style={{ width: `${Math.min(item.rate, 100)}%` }}
                    />
                  </div>

                  <div className="mt-2.5 flex justify-between text-xs text-stone-500">
                    <span>{item.present} present</span>
                    <span>{item.absent} absent</span>
                    <span>{item.total} total</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attendance Records Table */}
        <div className="glass overflow-hidden rounded-2xl border border-stone-200/70">
          <div className="border-b border-stone-200/70 px-5 py-5 sm:px-6">
            <h2 className="text-lg font-semibold tracking-tight text-stone-900">
              Attendance Records
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              {filteredAttendance.length} record
              {filteredAttendance.length !== 1 ? "s" : ""} shown
            </p>
          </div>

          {loading ? (
            <div className="p-16 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500" />
              <p className="mt-4 text-sm text-stone-500">
                Loading attendance...
              </p>
            </div>
          ) : filteredAttendance.length === 0 ? (
            <div className="p-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100/70 text-2xl">
                ✓
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-stone-900">
                No attendance records found
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500">
                Adjust your filters or add attendance records to start building attendance insights.
              </p>
              <button
                type="button"
                onClick={openAddModal}
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0"
              >
                + Add Attendance
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-stone-200/80 bg-stone-50/50">
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Student
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        School / Standard
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Date
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Status
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Remarks
                      </th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredAttendance.map((record) => (
                      <tr
                        key={record.id}
                        className="border-b border-stone-100 transition duration-150 last:border-b-0 hover:bg-orange-50/30"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100/80 text-xs font-bold text-orange-700">
                              {record.student.name
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-stone-900">
                                {record.student.name}
                              </p>
                              <p className="mt-0.5 text-xs text-stone-400">
                                {record.student.studentCode || "No code"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-stone-800">
                            {record.student.school?.name || "—"}
                          </p>
                          <p className="mt-0.5 text-xs text-stone-400">
                            {record.student.standard?.name || "—"}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-sm text-stone-600">
                          {formatDate(record.date)}
                        </td>

                        <td className="px-6 py-4">
                          <StatusBadge status={record.status} />
                        </td>

                        <td className="max-w-xs px-6 py-4 text-xs leading-relaxed text-stone-500">
                          {record.remarks || "—"}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(record)}
                              className="rounded-xl border border-orange-200 bg-white px-3.5 py-2 text-xs font-semibold text-orange-700 transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 active:translate-y-0"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteModal(record)}
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
              <div className="divide-y divide-stone-100 lg:hidden">
                {filteredAttendance.map((record) => (
                  <div key={record.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100/80 text-xs font-bold text-orange-700">
                          {record.student.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-stone-900">
                            {record.student.name}
                          </p>
                          <p className="mt-0.5 text-xs text-stone-400">
                            {record.student.school?.name || "No school"} ·{" "}
                            {record.student.standard?.name || "No standard"}
                          </p>
                        </div>
                      </div>

                      <StatusBadge status={record.status} />
                    </div>

                    <div className="mt-4 rounded-xl border border-stone-100 bg-stone-50/70 p-3">
                      <p className="text-xs font-medium text-stone-700">
                        {formatDate(record.date)}
                      </p>
                      {record.remarks && (
                        <p className="mt-1 text-xs leading-relaxed text-stone-500">
                          {record.remarks}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(record)}
                        className="flex-1 rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteModal(record)}
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

      {/* Edit / Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-stone-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:p-7">
            <div className="flex items-start justify-between gap-4 border-b border-stone-200/70 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Attendance
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-stone-900">
                  {editingAttendance ? "Edit Attendance Record" : "Add Attendance Record"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-lg text-stone-500 transition hover:border-orange-200 hover:text-orange-600"
              >
                ×
              </button>
            </div>

            {error && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                  Student <span className="text-orange-500">*</span>
                </label>

                {editingAttendance ? (
                  <div className="flex h-11 items-center rounded-xl border border-stone-200 bg-stone-50 px-4 text-sm font-semibold text-stone-700">
                    {editingAttendance.student.name}
                  </div>
                ) : (
                  <select
                    value={form.studentId}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        studentId: e.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    <option value="">Select student</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                        {student.studentCode
                          ? ` · ${student.studentCode}`
                          : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                  Date <span className="text-orange-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      date: e.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                  Status <span className="text-orange-500">*</span>
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      status: e.target.value as AttendanceStatus,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LATE">Late</option>
                  <option value="EXCUSED">Excused</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                  Remarks <span className="text-stone-400">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={form.remarks}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      remarks: e.target.value,
                    }))
                  }
                  placeholder="Add note or justification..."
                  className="w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm leading-relaxed text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition duration-200 hover:bg-stone-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingAttendance
                      ? "Update Attendance"
                      : "Add Attendance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      {deleteRecord && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-stone-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-xl font-bold text-red-600">
              !
            </div>

            <h2 className="mt-4 text-xl font-bold tracking-tight text-stone-900">
              Delete Attendance Record?
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              Are you sure you want to remove the attendance record for{" "}
              <span className="font-semibold text-stone-800">
                {deleteRecord.student.name}
              </span>{" "}
              on{" "}
              <span className="font-semibold text-stone-800">
                {formatDate(deleteRecord.date)}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-4 rounded-xl border border-stone-200/70 bg-stone-50/70 p-4">
              <div className="grid gap-2.5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                    Status
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-stone-800">
                    {statusConfig[deleteRecord.status]?.label || deleteRecord.status}
                  </p>
                </div>

                {deleteRecord.remarks && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                      Remarks
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-stone-800">
                      {deleteRecord.remarks}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
                {deleting ? "Deleting..." : "Delete Record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
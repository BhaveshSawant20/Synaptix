"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { API_BASE } from "@/lib/api";

type Student = {
  id: string;
  name: string;
  studentCode?: string | null;
  school?: { id: string; name: string } | null;
  standard?: { id: string; name: string } | null;
};

type Assessment = {
  id: string;
  name: string;
  subject?: string | null;
  totalMarks?: number | null;
  assessmentDate?: string | null;
  batch?: { id: string; name: string } | null;
};

type PerformanceRecord = {
  id: string;
  studentId: string;
  assessmentId: string;
  marksObtained: number;
  percentage?: number | null;
  remarks?: string | null;
  createdAt: string;
  student: Student;
  assessment: Assessment;
};

type FormState = {
  studentId: string;
  assessmentId: string;
  marksObtained: string;
  remarks: string;
};

const emptyForm: FormState = {
  studentId: "",
  assessmentId: "",
  marksObtained: "",
  remarks: "",
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

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getPercentage(record: PerformanceRecord) {
  const value = Number(record.percentage);
  return Number.isFinite(value) ? value : 0;
}

function formatPercentage(value?: number | null) {
  if (value === null || value === undefined) return "—";
  return `${Number(value).toFixed(1)}%`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function MetricCard({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
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
      <p className="mt-1 text-xs text-stone-400">{note}</p>
    </div>
  );
}

export default function PerformancePage() {
  const [records, setRecords] = useState<PerformanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [assessmentFilter, setAssessmentFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("all");
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [standardFilter, setStandardFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] =
    useState<PerformanceRecord | null>(null);
  const [deleteRecord, setDeleteRecord] =
    useState<PerformanceRecord | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm);

  async function loadData() {
    const token = getToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [
        performanceResponse,
        studentsResponse,
        assessmentsResponse,
      ] = await Promise.all([
        fetch(`${API_BASE}/performance`, {
          headers: authHeaders(),
        }),
        fetch(`${API_BASE}/students`, {
          headers: authHeaders(),
        }),
        fetch(`${API_BASE}/assessments`, {
          headers: authHeaders(),
        }),
      ]);

      if (
        [
          performanceResponse,
          studentsResponse,
          assessmentsResponse,
        ].some((response) => response.status === 401)
      ) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      const [
        performanceData,
        studentsData,
        assessmentsData,
      ] = await Promise.all([
        performanceResponse.json(),
        studentsResponse.json(),
        assessmentsResponse.json(),
      ]);

      if (!performanceResponse.ok) {
        throw new Error(
          performanceData.message ||
            "Failed to load performance records.",
        );
      }

      if (!studentsResponse.ok) {
        throw new Error(
          studentsData.message || "Failed to load students.",
        );
      }

      if (!assessmentsResponse.ok) {
        throw new Error(
          assessmentsData.message ||
            "Failed to load assessments.",
        );
      }

      setRecords(
        Array.isArray(performanceData.data)
          ? performanceData.data
          : [],
      );

      setStudents(
        Array.isArray(studentsData.students)
          ? studentsData.students
          : Array.isArray(studentsData.data)
            ? studentsData.data
            : [],
      );

      setAssessments(
        Array.isArray(assessmentsData.data)
          ? assessmentsData.data
          : [],
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load performance data.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch =
        !query ||
        record.student.name.toLowerCase().includes(query) ||
        (record.student.studentCode || "")
          .toLowerCase()
          .includes(query) ||
        record.assessment.name.toLowerCase().includes(query) ||
        (record.assessment.subject || "")
          .toLowerCase()
          .includes(query) ||
        (record.assessment.batch?.name || "")
          .toLowerCase()
          .includes(query);

      const matchesAssessment =
        assessmentFilter === "all" ||
        record.assessmentId === assessmentFilter;

      const matchesStudent =
        studentFilter === "all" ||
        record.studentId === studentFilter;

      const matchesSchool =
        schoolFilter === "all" ||
        record.student.school?.id === schoolFilter;

      const matchesStandard =
        standardFilter === "all" ||
        record.student.standard?.id === standardFilter;

      return (
        matchesSearch &&
        matchesAssessment &&
        matchesStudent &&
        matchesSchool &&
        matchesStandard
      );
    });
  }, [
    records,
    search,
    assessmentFilter,
    studentFilter,
    schoolFilter,
    standardFilter,
  ]);

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
        (schoolFilter === "all" ||
          student.school?.id === schoolFilter)
      ) {
        map.set(student.standard.id, student.standard.name);
      }
    });

    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1]),
    );
  }, [students, schoolFilter]);

  const stats = useMemo(() => {
    const percentages = filteredRecords.map(getPercentage);

    const total = filteredRecords.length;

    const average = total
      ? percentages.reduce((sum, value) => sum + value, 0) /
        total
      : 0;

    const highest = total ? Math.max(...percentages) : 0;
    const lowest = total ? Math.min(...percentages) : 0;

    const passed = percentages.filter((value) => value >= 40).length;

    return {
      total,
      average,
      highest,
      lowest,
      passed,
      passRate: total ? (passed / total) * 100 : 0,
    };
  }, [filteredRecords]);

  const distribution = useMemo(() => {
    const total = filteredRecords.length;

    const excellent = filteredRecords.filter(
      (record) => getPercentage(record) >= 80,
    ).length;

    const good = filteredRecords.filter((record) => {
      const value = getPercentage(record);
      return value >= 60 && value < 80;
    }).length;

    const average = filteredRecords.filter((record) => {
      const value = getPercentage(record);
      return value >= 40 && value < 60;
    }).length;

    const needsImprovement = filteredRecords.filter(
      (record) => getPercentage(record) < 40,
    ).length;

    return [
      {
        label: "Excellent",
        range: "80–100%",
        count: excellent,
        percent: total ? (excellent / total) * 100 : 0,
      },
      {
        label: "Good",
        range: "60–79%",
        count: good,
        percent: total ? (good / total) * 100 : 0,
      },
      {
        label: "Average",
        range: "40–59%",
        count: average,
        percent: total ? (average / total) * 100 : 0,
      },
      {
        label: "Needs Improvement",
        range: "< 40%",
        count: needsImprovement,
        percent: total ? (needsImprovement / total) * 100 : 0,
      },
    ];
  }, [filteredRecords]);

  const studentSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        student: Student;
        total: number;
        average: number;
        highest: number;
        passed: number;
      }
    >();

    filteredRecords.forEach((record) => {
      const value = getPercentage(record);
      const existing = map.get(record.studentId);

      if (!existing) {
        map.set(record.studentId, {
          student: record.student,
          total: 1,
          average: value,
          highest: value,
          passed: value >= 40 ? 1 : 0,
        });
        return;
      }

      existing.average =
        (existing.average * existing.total + value) /
        (existing.total + 1);

      existing.total += 1;
      existing.highest = Math.max(existing.highest, value);

      if (value >= 40) existing.passed += 1;
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        passRate: item.total
          ? (item.passed / item.total) * 100
          : 0,
      }))
      .sort((a, b) => b.average - a.average);
  }, [filteredRecords]);

  function openCreateModal() {
    setEditingRecord(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function openEditModal(record: PerformanceRecord) {
    setEditingRecord(record);

    setForm({
      studentId: record.studentId,
      assessmentId: record.assessmentId,
      marksObtained: String(record.marksObtained),
      remarks: record.remarks || "",
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingRecord(null);
    setForm(emptyForm);
  }

  function openDeleteModal(record: PerformanceRecord) {
    setDeleteRecord(record);
    setError("");
    setSuccess("");
  }

  function closeDeleteModal() {
    if (deleting) return;
    setDeleteRecord(null);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");

    const marks = Number(form.marksObtained);

    if (
      !form.studentId ||
      !form.assessmentId ||
      form.marksObtained.trim() === ""
    ) {
      setError(
        "Student, assessment and marks are required.",
      );
      return;
    }

    if (!Number.isFinite(marks) || marks < 0) {
      setError(
        "Marks must be a valid non-negative number.",
      );
      return;
    }

    const selectedAssessment = assessments.find(
      (assessment) => assessment.id === form.assessmentId,
    );

    if (
      selectedAssessment?.totalMarks !== null &&
      selectedAssessment?.totalMarks !== undefined &&
      marks > selectedAssessment.totalMarks
    ) {
      setError(
        `Marks cannot be greater than ${selectedAssessment.totalMarks}.`,
      );
      return;
    }

    try {
      setSaving(true);

      const url = editingRecord
        ? `${API_BASE}/performance/${editingRecord.id}`
        : `${API_BASE}/performance`;

      const body = editingRecord
        ? {
            marksObtained: marks,
            remarks: form.remarks || null,
          }
        : {
            studentId: form.studentId,
            assessmentId: form.assessmentId,
            marksObtained: marks,
            remarks: form.remarks || null,
          };

      const response = await fetch(url, {
        method: editingRecord ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        window.location.href = "/login";
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to save performance record.",
        );
      }

      setSuccess(
        editingRecord
          ? "Performance record updated successfully."
          : "Performance record logged successfully."
      );

      closeModal();
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save performance record.",
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
        `${API_BASE}/performance/${deleteRecord.id}`,
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

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete performance record.",
        );
      }

      setSuccess("Performance record deleted successfully.");
      setDeleteRecord(null);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete performance record.",
      );
    } finally {
      setDeleting(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setAssessmentFilter("all");
    setStudentFilter("all");
    setSchoolFilter("all");
    setStandardFilter("all");
  }

  const selectedAssessment = assessments.find(
    (assessment) => assessment.id === form.assessmentId,
  );

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
              Performance
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
              Record student assessment results and monitor academic performance across coaching cohorts.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
          >
            <span>+</span> Add Performance
          </button>
        </div>

        {/* Alerts */}
        {error && !showModal && !deleteRecord && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && !showModal && !deleteRecord && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {success}
          </div>
        )}

        {/* Metrics Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Class Average"
            value={stats.total ? `${stats.average.toFixed(1)}%` : "—"}
            note="Filtered score mean"
            icon="%"
          />

          <MetricCard
            label="Pass Rate"
            value={stats.total ? `${stats.passRate.toFixed(1)}%` : "—"}
            note="Scores ≥ 40%"
            icon="✓"
          />

          <MetricCard
            label="Highest"
            value={stats.total ? `${stats.highest.toFixed(1)}%` : "—"}
            note="Top recorded score"
            icon="↑"
          />

          <MetricCard
            label="Lowest"
            value={stats.total ? `${stats.lowest.toFixed(1)}%` : "—"}
            note="Minimum recorded score"
            icon="↓"
          />

          <MetricCard
            label="Total Results"
            value={String(stats.total)}
            note={`${stats.passed} passed tests`}
            icon="▦"
          />
        </div>

        {/* Filters Bar */}
        <div className="glass mb-8 rounded-2xl border border-stone-200/70 p-5 sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-tight text-stone-900">
              Performance Analytics & Filters
            </h2>

            <p className="mt-1 text-sm text-stone-500">
              Filter performance data by student, test, school, or standard.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student, test..."
              className="h-11 rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />

            <select
              value={studentFilter}
              onChange={(event) =>
                setStudentFilter(event.target.value)
              }
              className="h-11 rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            >
              <option value="all">All students</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>

            <select
              value={assessmentFilter}
              onChange={(event) =>
                setAssessmentFilter(event.target.value)
              }
              className="h-11 rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            >
              <option value="all">All assessments</option>
              {assessments.map((assessment) => (
                <option key={assessment.id} value={assessment.id}>
                  {assessment.name}
                </option>
              ))}
            </select>

            <select
              value={schoolFilter}
              onChange={(event) => {
                setSchoolFilter(event.target.value);
                setStandardFilter("all");
              }}
              className="h-11 rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            >
              <option value="all">All schools</option>
              {schools.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
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
              <option value="all">All standards</option>
              {standards.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={clearFilters}
              className="h-11 rounded-xl border border-orange-200 bg-orange-50 px-4 text-sm font-semibold text-orange-700 transition duration-200 hover:bg-orange-100 active:scale-[0.98]"
            >
              Clear filters
            </button>
          </div>
        </div>

        {/* Analytics Breakdown Grid */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          {/* Distribution Card */}
          <div className="glass rounded-2xl border border-stone-200/70 p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-stone-900">
                Performance Distribution
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Breakdown of student score bands across current results.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {distribution.map((item) => (
                <div key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-stone-800">
                        {item.label}
                      </p>
                      <p className="text-xs text-stone-400">
                        {item.range}
                      </p>
                    </div>

                    <span className="text-sm font-bold text-stone-700">
                      {item.count}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-orange-500 transition-all duration-300"
                      style={{
                        width: `${Math.min(item.percent, 100)}%`,
                      }}
                    />
                  </div>

                  <p className="mt-1 text-right text-xs text-stone-400">
                    {item.percent.toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Student Overview Card */}
          <div className="glass rounded-2xl border border-stone-200/70 p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-stone-900">
                Top Student Scores
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Average performance rankings by individual student.
              </p>
            </div>

            {studentSummary.length === 0 ? (
              <div className="py-12 text-center text-sm text-stone-500">
                No student performance data available.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {studentSummary.slice(0, 5).map((item) => (
                  <div
                    key={item.student.id}
                    className="rounded-xl border border-stone-200/70 bg-white/70 p-4 transition duration-150 hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100/80 text-xs font-bold text-orange-700">
                          {getInitials(item.student.name)}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-stone-900">
                            {item.student.name}
                          </p>

                          <p className="truncate text-xs text-stone-400">
                            {item.student.school?.name || "No school"} ·{" "}
                            {item.student.standard?.name || "No standard"}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-sm font-bold ${
                          item.average >= 60
                            ? "text-emerald-600"
                            : item.average >= 40
                              ? "text-amber-600"
                              : "text-red-600"
                        }`}
                      >
                        {item.average.toFixed(1)}%
                      </span>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-orange-500 transition-all duration-300"
                        style={{
                          width: `${Math.min(item.average, 100)}%`,
                        }}
                      />
                    </div>

                    <div className="mt-2 flex justify-between text-xs text-stone-400">
                      <span>{item.total} result(s)</span>
                      <span>
                        {item.passed}/{item.total} passed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Performance Records Table */}
        <div className="glass overflow-hidden rounded-2xl border border-stone-200/70">
          <div className="border-b border-stone-200/70 px-5 py-5 sm:px-6">
            <h2 className="text-lg font-semibold tracking-tight text-stone-900">
              Performance Records
            </h2>

            <p className="mt-1 text-sm text-stone-500">
              {filteredRecords.length} record{filteredRecords.length === 1 ? "" : "s"} shown
            </p>
          </div>

          {loading ? (
            <div className="p-16 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500" />
              <p className="mt-4 text-sm text-stone-500">
                Loading performance records...
              </p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100/70 text-2xl">
                ▦
              </div>

              <h3 className="mt-5 text-lg font-semibold tracking-tight text-stone-900">
                No performance records found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500">
                Record student marks or adjust the filters above to explore performance analytics.
              </p>

              <button
                type="button"
                onClick={openCreateModal}
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0"
              >
                + Add Performance
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1000px] text-left">
                  <thead>
                    <tr className="border-b border-stone-200/80 bg-stone-50/50">
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Student
                      </th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Assessment
                      </th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Marks
                      </th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Percentage
                      </th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Date
                      </th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr
                        key={record.id}
                        className="border-b border-stone-100 transition duration-150 last:border-b-0 hover:bg-orange-50/30"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100/80 text-xs font-bold text-orange-700">
                              {getInitials(record.student.name)}
                            </div>

                            <div>
                              <p className="text-sm font-semibold text-stone-900">
                                {record.student.name}
                              </p>
                              <p className="mt-0.5 text-xs text-stone-400">
                                {record.student.studentCode ||
                                  "No code"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-stone-800">
                            {record.assessment.name}
                          </p>
                          <p className="mt-0.5 text-xs text-stone-400">
                            {record.assessment.subject ||
                              "No subject"}
                            {record.assessment.batch
                              ? ` · ${record.assessment.batch.name}`
                              : ""}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-sm font-semibold text-stone-800">
                          {record.marksObtained}
                          {record.assessment.totalMarks
                            ? ` / ${record.assessment.totalMarks}`
                            : ""}
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                            {formatPercentage(
                              getPercentage(record),
                            )}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-sm text-stone-600">
                          {formatDate(
                            record.assessment.assessmentDate,
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(record)
                              }
                              className="rounded-xl border border-orange-200 bg-white px-3.5 py-2 text-xs font-semibold text-orange-700 transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 active:translate-y-0"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openDeleteModal(record)
                              }
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
                {filteredRecords.map((record) => (
                  <div key={record.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100/80 text-xs font-bold text-orange-700">
                          {getInitials(record.student.name)}
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-stone-900">
                            {record.student.name}
                          </p>
                          <p className="mt-0.5 text-xs text-stone-400">
                            {record.student.studentCode ||
                              "No code"}
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                        {formatPercentage(
                          getPercentage(record),
                        )}
                      </span>
                    </div>

                    <div className="mt-4 rounded-xl border border-stone-100 bg-stone-50/70 p-3">
                      <p className="text-sm font-semibold text-stone-800">
                        {record.assessment.name}
                      </p>

                      <p className="mt-0.5 text-xs text-stone-400">
                        {record.assessment.subject ||
                          "No subject"}
                        {record.assessment.batch
                          ? ` · ${record.assessment.batch.name}`
                          : ""}
                      </p>

                      <p className="mt-3 text-xs font-medium text-stone-700">
                        Score: {record.marksObtained}
                        {record.assessment.totalMarks
                          ? ` / ${record.assessment.totalMarks}`
                          : ""}
                        <span className="ml-2 text-stone-400">
                          ·{" "}
                          {formatDate(
                            record.assessment.assessmentDate,
                          )}
                        </span>
                      </p>
                    </div>

                    {record.remarks && (
                      <p className="mt-2 text-xs leading-relaxed text-stone-500">
                        {record.remarks}
                      </p>
                    )}

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
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-stone-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:p-7">
            <div className="flex items-start justify-between gap-4 border-b border-stone-200/70 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Performance
                </p>

                <h2 className="mt-1 text-xl font-bold tracking-tight text-stone-900">
                  {editingRecord ? "Edit Performance Result" : "Add Performance Result"}
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

            <form
              onSubmit={handleSubmit}
              className="mt-5 space-y-4"
            >
              {!editingRecord ? (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                      Student <span className="text-orange-500">*</span>
                    </label>

                    <select
                      value={form.studentId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          studentId: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="">
                        Select student
                      </option>

                      {students.map((student) => (
                        <option
                          key={student.id}
                          value={student.id}
                        >
                          {student.name}
                          {student.studentCode
                            ? ` · ${student.studentCode}`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                      Assessment <span className="text-orange-500">*</span>
                    </label>

                    <select
                      value={form.assessmentId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          assessmentId: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="">
                        Select assessment
                      </option>

                      {assessments.map((assessment) => (
                        <option
                          key={assessment.id}
                          value={assessment.id}
                        >
                          {assessment.name}
                          {assessment.totalMarks
                            ? ` · ${assessment.totalMarks} marks`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                    Student & Assessment
                  </p>

                  <p className="mt-1 text-sm font-semibold text-stone-900">
                    {editingRecord.student.name} · {editingRecord.assessment.name}
                  </p>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                  Marks Obtained <span className="text-orange-500">*</span>
                  {selectedAssessment?.totalMarks
                    ? ` (out of ${selectedAssessment.totalMarks})`
                    : editingRecord?.assessment.totalMarks
                      ? ` (out of ${editingRecord.assessment.totalMarks})`
                      : ""}
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.marksObtained}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      marksObtained: event.target.value,
                    }))
                  }
                  placeholder="e.g. 42"
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                  Remarks <span className="text-stone-400">(optional)</span>
                </label>

                <textarea
                  rows={3}
                  value={form.remarks}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      remarks: event.target.value,
                    }))
                  }
                  placeholder="Add a performance note or feedback..."
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
                    : editingRecord
                      ? "Update Result"
                      : "Add Result"}
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
              Delete Performance Record?
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              Are you sure you want to remove the result record for{" "}
              <span className="font-semibold text-stone-800">
                {deleteRecord.student.name}
              </span>{" "}
              in{" "}
              <span className="font-semibold text-stone-800">
                {deleteRecord.assessment.name}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-4 rounded-xl border border-stone-200/70 bg-stone-50/70 p-4">
              <div className="grid gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                    Score
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-stone-800">
                    {deleteRecord.marksObtained}
                    {deleteRecord.assessment.totalMarks ? ` / ${deleteRecord.assessment.totalMarks}` : ""}
                    {deleteRecord.percentage !== null && deleteRecord.percentage !== undefined
                      ? ` (${formatPercentage(Number(deleteRecord.percentage))})`
                      : ""}
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
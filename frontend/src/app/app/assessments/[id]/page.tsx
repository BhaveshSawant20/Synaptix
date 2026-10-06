"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { API_BASE } from "@/lib/api";

type Batch = {
  id: string;
  name: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

type School = {
  id: string;
  name: string;
};

type Standard = {
  id: string;
  name: string;
};

type Student = {
  id: string;
  name: string;
  studentCode?: string | null;
  school?: School | null;
  standard?: Standard | null;
};

type PerformanceRecord = {
  id: string;
  studentId: string;
  marksObtained: number;
  percentage?: number | null;
  remarks?: string | null;
  createdAt: string;
  student: Student;
};

type Assessment = {
  id: string;
  instituteId: string;
  batchId?: string | null;
  name: string;
  subject?: string | null;
  totalMarks?: number | null;
  assessmentDate?: string | null;
  createdAt: string;
  updatedAt: string;
  batch?: Batch | null;
  performanceRecords?: PerformanceRecord[];
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("synaptix_token") || "";
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function formatDate(date?: string | null) {
  if (!date) return "Not specified";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Not specified";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date?: string | null) {
  if (!date) return "Not specified";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Not specified";
  }

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatInputDate(date?: string | null) {
  if (!date) return "";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getPercentage(record: PerformanceRecord, totalMarks?: number | null) {
  if (record.percentage !== null && record.percentage !== undefined) {
    return Number(record.percentage);
  }

  if (
    totalMarks &&
    totalMarks > 0 &&
    record.marksObtained !== undefined
  ) {
    return (record.marksObtained / totalMarks) * 100;
  }

  return null;
}

function getPerformanceClass(percentage: number | null) {
  if (percentage === null) {
    return "border border-stone-200 bg-stone-50 text-stone-600";
  }

  if (percentage >= 75) {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (percentage >= 50) {
    return "border border-orange-200 bg-orange-50 text-orange-700";
  }

  return "border border-red-200 bg-red-50 text-red-700";
}

export default function AssessmentDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const assessmentId = String(params.id);

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [editForm, setEditForm] = useState({
    batchId: "",
    name: "",
    subject: "",
    totalMarks: "",
    assessmentDate: "",
  });

  const loadAssessment = async () => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/assessments/${assessmentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await parseJsonResponse(response);

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to load assessment"
        );
      }

      setAssessment(data.data);
    } catch (err) {
      console.error("Load assessment error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load assessment"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async () => {
    const token = getToken();

    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/batches`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await parseJsonResponse(response);

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        router.push("/login");
        return;
      }

      if (!response.ok) {
        return;
      }

      setBatches(data.batches || []);
    } catch (err) {
      console.error("Load batches error:", err);
    }
  };

  useEffect(() => {
    if (!assessmentId) return;

    loadAssessment();
    loadBatches();
  }, [assessmentId]);

  const openEditModal = () => {
    if (!assessment) return;

    setEditForm({
      batchId: assessment.batchId || "",
      name: assessment.name || "",
      subject: assessment.subject || "",
      totalMarks:
        assessment.totalMarks !== null &&
        assessment.totalMarks !== undefined
          ? String(assessment.totalMarks)
          : "",
      assessmentDate: formatInputDate(
        assessment.assessmentDate
      ),
    });

    setEditError("");
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (saving) return;

    setShowEditModal(false);
    setEditError("");
  };

  const handleUpdateAssessment = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    if (!editForm.name.trim()) {
      setEditError("Assessment name is required.");
      return;
    }

    let parsedTotalMarks: number | null = null;

    if (editForm.totalMarks.trim()) {
      parsedTotalMarks = Number(editForm.totalMarks);

      if (
        !Number.isInteger(parsedTotalMarks) ||
        parsedTotalMarks <= 0
      ) {
        setEditError(
          "Total marks must be a positive whole number."
        );
        return;
      }
    }

    try {
      setSaving(true);
      setEditError("");

      const response = await fetch(
        `${API_BASE}/assessments/${assessmentId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            batchId: editForm.batchId || null,
            name: editForm.name.trim(),
            subject: editForm.subject.trim() || null,
            totalMarks: parsedTotalMarks,
            assessmentDate:
              editForm.assessmentDate || null,
          }),
        }
      );

      const data = await parseJsonResponse(response);

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to update assessment"
        );
      }

      setAssessment((current) => {
        if (!current) return data.data;

        return {
          ...current,
          ...data.data,
        };
      });

      setShowEditModal(false);
    } catch (err) {
      console.error("Update assessment error:", err);

      setEditError(
        err instanceof Error
          ? err.message
          : "Failed to update assessment"
      );
    } finally {
      setSaving(false);
    }
  };

  const performanceRecords = assessment?.performanceRecords || [];

  const averagePercentage = useMemo(() => {
    if (!performanceRecords.length) return null;

    const percentages = performanceRecords
      .map((record) =>
        getPercentage(record, assessment?.totalMarks)
      )
      .filter(
        (value): value is number =>
          value !== null && Number.isFinite(value)
      );

    if (!percentages.length) return null;

    return (
      percentages.reduce((sum, value) => sum + value, 0) /
      percentages.length
    );
  }, [performanceRecords, assessment?.totalMarks]);

  const highestPercentage = useMemo(() => {
    if (!performanceRecords.length) return null;

    const percentages = performanceRecords
      .map((record) =>
        getPercentage(record, assessment?.totalMarks)
      )
      .filter(
        (value): value is number =>
          value !== null && Number.isFinite(value)
      );

    if (!percentages.length) return null;

    return Math.max(...percentages);
  }, [performanceRecords, assessment?.totalMarks]);

  const lowestPercentage = useMemo(() => {
    if (!performanceRecords.length) return null;

    const percentages = performanceRecords
      .map((record) =>
        getPercentage(record, assessment?.totalMarks)
      )
      .filter(
        (value): value is number =>
          value !== null && Number.isFinite(value)
      );

    if (!percentages.length) return null;

    return Math.min(...percentages);
  }, [performanceRecords, assessment?.totalMarks]);

  if (loading) {
    return (
      <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-5 w-32 rounded bg-stone-200" />

            <div className="glass rounded-2xl border border-stone-200/70 p-8 shadow-sm">
              <div className="h-8 w-64 rounded bg-stone-200" />
              <div className="mt-4 h-4 w-96 max-w-full rounded bg-stone-100" />

              <div className="mt-8 grid gap-4 md:grid-cols-4">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="h-24 rounded-2xl bg-stone-100"
                  />
                ))}
              </div>
            </div>

            <div className="h-80 rounded-2xl border border-stone-200/70 bg-white/70 shadow-sm" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !assessment) {
    return (
      <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/app/assessments"
            className="group mb-6 inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition duration-200 hover:text-orange-600"
          >
            <span className="transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
            Back to Assessments
          </Link>

          <div className="glass rounded-2xl border border-red-200 bg-white/90 p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl text-red-600">
              !
            </div>

            <h1 className="mt-5 text-xl font-bold tracking-tight text-stone-900">
              Unable to Load Assessment
            </h1>

            <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
              {error || "The requested assessment could not be found."}
            </p>

            <button
              type="button"
              onClick={loadAssessment}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header Section */}
        <div className="glass rounded-2xl border border-stone-200/70 p-6 sm:p-8">
          <Link
            href="/app/assessments"
            className="group mb-6 inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition duration-200 hover:text-orange-600"
          >
            <span className="transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
            Back to Assessments
          </Link>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                Assessment Details
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
                {assessment.name}
              </h1>

              <p className="mt-2 text-sm text-stone-500">
                {assessment.subject || "No subject specified"}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openEditModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
              >
                Edit Assessment
              </button>

              {assessment.batch && (
                <Link
                  href={`/app/batches/${assessment.batch.id}`}
                  className="rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-orange-700 transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 active:translate-y-0"
                >
                  View Batch
                </Link>
              )}

              <Link
                href="/app/assessments"
                className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition duration-200 hover:-translate-y-0.5 hover:bg-stone-50 active:translate-y-0"
              >
                All Assessments
              </Link>
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                Subject
              </p>
              <p className="mt-2 truncate text-base font-bold text-stone-900">
                {assessment.subject || "Not specified"}
              </p>
            </div>

            <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                Total Marks
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
                {assessment.totalMarks ?? "—"}
              </p>
            </div>

            <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                Assessment Date
              </p>
              <p className="mt-2 text-base font-bold text-stone-900">
                {formatDate(assessment.assessmentDate)}
              </p>
            </div>

            <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                Students Evaluated
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-orange-600">
                {performanceRecords.length}
              </p>
            </div>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="glass rounded-2xl border border-stone-200/70 p-6 sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Score Metrics
            </p>

            <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
              Performance Overview
            </h2>

            <p className="mt-1 text-sm text-stone-500">
              Aggregate score benchmarks for all evaluated students.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                Class Average
              </p>

              <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
                {averagePercentage !== null
                  ? `${averagePercentage.toFixed(1)}%`
                  : "—"}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
                Highest Score
              </p>

              <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-700">
                {highestPercentage !== null
                  ? `${highestPercentage.toFixed(1)}%`
                  : "—"}
              </p>
            </div>

            <div className="rounded-xl border border-red-100 bg-red-50/50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-600">
                Lowest Score
              </p>

              <p className="mt-2 text-3xl font-bold tracking-tight text-red-700">
                {lowestPercentage !== null
                  ? `${lowestPercentage.toFixed(1)}%`
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Batch Information */}
        <div className="glass rounded-2xl border border-stone-200/70 p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                Cohort Details
              </p>

              <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
                Assigned Coaching Batch
              </h2>
            </div>

            {assessment.batch && (
              <Link
                href={`/app/batches/${assessment.batch.id}`}
                className="inline-flex items-center justify-center rounded-xl border border-orange-100 bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-600 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-100 active:translate-y-0"
              >
                View Batch Details →
              </Link>
            )}
          </div>

          {assessment.batch ? (
            <div className="mt-6 rounded-xl border border-stone-100 bg-stone-50/70 p-5">
              <h3 className="text-base font-bold text-stone-900">
                {assessment.batch.name}
              </h3>

              {assessment.batch.description && (
                <p className="mt-1 text-sm leading-relaxed text-stone-500">
                  {assessment.batch.description}
                </p>
              )}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                    Batch Start Date
                  </p>
                  <p className="mt-1 text-sm font-medium text-stone-800">
                    {formatDate(assessment.batch.startDate)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                    Batch End Date
                  </p>
                  <p className="mt-1 text-sm font-medium text-stone-800">
                    {formatDate(assessment.batch.endDate)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-stone-200 p-8 text-center">
              <p className="text-sm font-medium text-stone-500">
                No coaching batch has been assigned to this assessment.
              </p>
            </div>
          )}
        </div>

        {/* Student Results Table */}
        <div className="glass overflow-hidden rounded-2xl border border-stone-200/70">
          <div className="border-b border-stone-200/70 p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Score Registry
            </p>

            <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
              Student Performance Records
            </h2>

            <p className="mt-1 text-sm text-stone-500">
              Individual student marks, grades, and evaluator remarks.
            </p>
          </div>

          {performanceRecords.length === 0 ? (
            <div className="p-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100/70 text-2xl">
                📊
              </div>

              <h3 className="mt-5 text-lg font-semibold tracking-tight text-stone-900">
                No performance records logged yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500">
                Add student marks via the Performance module to record exam scores and analyze individual insights.
              </p>

              <Link
                href="/app/performance"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0"
              >
                Go to Performance Tracking →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead>
                  <tr className="border-b border-stone-200/80 bg-stone-50/50">
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      Student
                    </th>

                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      School
                    </th>

                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      Standard
                    </th>

                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      Marks
                    </th>

                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      Percentage
                    </th>

                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      Remarks
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {performanceRecords.map((record) => {
                    const percentage = getPercentage(
                      record,
                      assessment.totalMarks
                    );

                    return (
                      <tr
                        key={record.id}
                        className="border-b border-stone-100 transition duration-150 last:border-b-0 hover:bg-orange-50/30"
                      >
                        <td className="px-6 py-4">
                          <Link
                            href={`/app/students/${record.student.id}`}
                            className="text-sm font-semibold text-stone-900 transition hover:text-orange-600"
                          >
                            {record.student.name}
                          </Link>

                          {record.student.studentCode && (
                            <p className="mt-0.5 text-xs text-stone-400">
                              {record.student.studentCode}
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-4 text-sm text-stone-600">
                          {record.student.school?.name || "—"}
                        </td>

                        <td className="px-6 py-4 text-sm text-stone-600">
                          {record.student.standard?.name || "—"}
                        </td>

                        <td className="px-6 py-4 text-sm font-semibold text-stone-800">
                          {record.marksObtained}
                          {assessment.totalMarks
                            ? ` / ${assessment.totalMarks}`
                            : ""}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getPerformanceClass(
                              percentage
                            )}`}
                          >
                            {percentage !== null
                              ? `${percentage.toFixed(1)}%`
                              : "—"}
                          </span>
                        </td>

                        <td className="max-w-xs px-6 py-4 text-xs leading-relaxed text-stone-500">
                          {record.remarks || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Audit Details */}
        <div className="glass rounded-2xl border border-stone-200/70 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
            Audit Metadata
          </p>

          <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
            System Information
          </h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                Assessment ID
              </p>
              <p className="mt-1 break-all font-mono text-xs text-stone-700">
                {assessment.id}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                Created
              </p>
              <p className="mt-1 text-sm font-medium text-stone-800">
                {formatDateTime(assessment.createdAt)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                Last Updated
              </p>
              <p className="mt-1 text-sm font-medium text-stone-800">
                {formatDateTime(assessment.updatedAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-stone-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:p-7">
            <div className="flex items-start justify-between gap-4 border-b border-stone-200/70 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Edit Assessment
                </p>

                <h2 className="mt-1 text-xl font-bold tracking-tight text-stone-900">
                  Update Assessment
                </h2>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-lg text-stone-500 transition hover:border-orange-200 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleUpdateAssessment}
              className="mt-5 space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                  Assessment Name <span className="text-orange-500">*</span>
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
                  placeholder="Enter assessment name"
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                  Batch
                </label>

                <select
                  value={editForm.batchId}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      batchId: event.target.value,
                    }))
                  }
                  disabled={saving}
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">No batch</option>

                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                  Subject
                </label>

                <input
                  type="text"
                  value={editForm.subject}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      subject: event.target.value,
                    }))
                  }
                  placeholder="Enter subject"
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  disabled={saving}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                    Total Marks
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editForm.totalMarks}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        totalMarks: event.target.value,
                      }))
                    }
                    placeholder="e.g. 100"
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                    Assessment Date
                  </label>

                  <input
                    type="date"
                    value={editForm.assessmentDate}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        assessmentDate: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    disabled={saving}
                  />
                </div>
              </div>

              {editError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {editError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={saving}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition duration-200 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
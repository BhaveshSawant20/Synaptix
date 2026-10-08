"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { API_BASE } from "@/lib/api";

type School = {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
};

type Standard = {
  id: string;
  name: string;
  schoolId: string;
};

type Batch = {
  id: string;
  name: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

type StudentBatch = {
  id: string;
  studentId: string;
  batchId: string;
  joinedAt: string;
  batch: Batch;
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
  school: School;
  standard: Standard;
  batches?: StudentBatch[];
};

type Subject = {
  id: string;
  name: string;
  code?: string | null;
};

type StandardSubject = {
  id: string;
  standardId: string;
  subjectId: string;
  subject: Subject;
};

type Attendance = {
  id: string;
  studentId: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  remarks?: string | null;
};

type Assessment = {
  id: string;
  batchId?: string | null;
  name: string;
  subject?: string | null;
  totalMarks?: number | null;
  assessmentDate?: string | null;
};

type PerformanceRecord = {
  id: string;
  assessmentId: string;
  marksObtained: number;
  percentage?: number | null;
  remarks?: string | null;
  createdAt: string;
  assessment: Assessment & {
    batch?: Batch | null;
  };
};

type ExamSchedule = {
  id: string;
  examId: string;
  subjectId: string;
  examDate: string;
  startTime?: string | null;
  endTime?: string | null;
  totalMarks?: number | null;
  syllabusNote?: string | null;
  subject?: Subject;
};

type Exam = {
  id: string;
  schoolId: string;
  name: string;
  academicYear?: string | null;
  subjectId?: string | null;
  subject?: Subject | null;
  schedules?: ExamSchedule[];
};

type SyllabusRequirement = {
  id: string;
  schoolId: string;
  subjectId: string;
  topicId: string;
  required: boolean;
  subject: Subject;
  topic: {
    id: string;
    name: string;
    description?: string | null;
    orderIndex?: number | null;
  };
};

type TeachingProgress = {
  id: string;
  instituteId: string;
  batchId: string;
  topicId: string;
  teacherId?: string | null;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  startedAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  batch: Batch;
  topic: {
    id: string;
    name: string;
    subject?: Subject;
  };
  teacher?: {
    id: string;
    name: string;
  } | null;
};

type FormState = {
  name: string;
  studentCode: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  schoolId: string;
  standardId: string;
};

function getToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem("synaptix_token") || "";
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
    month: "short",
    year: "numeric",
  });
}

function formatAttendanceStatus(status: Attendance["status"]) {
  switch (status) {
    case "PRESENT":
      return "Present";
    case "ABSENT":
      return "Absent";
    case "LATE":
      return "Late";
    case "EXCUSED":
      return "Excused";
    default:
      return status;
  }
}

function formatProgressStatus(status: TeachingProgress["status"]) {
  switch (status) {
    case "COMPLETED":
      return "Completed";
    case "IN_PROGRESS":
      return "In Progress";
    case "NOT_STARTED":
      return "Not Started";
    default:
      return status;
  }
}

function getProgressBadgeClass(status: TeachingProgress["status"]) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "IN_PROGRESS":
      return "bg-orange-50 text-orange-700 border-orange-200";
    default:
      return "bg-stone-100 text-stone-600 border-stone-200";
  }
}

async function parseJsonResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.toLowerCase().includes("application/json")) {
    const text = await response.text();

    throw new Error(
      `Server returned a non-JSON response (${response.status}). ${
        text.slice(0, 120) || "Please check the requested API route."
      }`,
    );
  }

  return response.json();
}

export default function StudentDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const studentId = String(params.id);

  const [student, setStudent] = useState<Student | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);

  const [subjects, setSubjects] = useState<StandardSubject[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [syllabus, setSyllabus] = useState<SyllabusRequirement[]>([]);
  const [teachingProgress, setTeachingProgress] = useState<TeachingProgress[]>([]);

  const [loading, setLoading] = useState(true);
  const [academicLoading, setAcademicLoading] = useState(true);

  const [error, setError] = useState("");
  const [academicError, setAcademicError] = useState("");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const [form, setForm] = useState<FormState>({
    name: "",
    studentCode: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    schoolId: "",
    standardId: "",
  });

  const loadStudent = async () => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [studentResponse, schoolsResponse, standardsResponse] =
        await Promise.all([
          fetch(`${API_BASE}/students/${studentId}`, {
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
        studentResponse.status === 401 ||
        schoolsResponse.status === 401 ||
        standardsResponse.status === 401
      ) {
        localStorage.removeItem("synaptix_token");
        router.push("/login");
        return;
      }

      const studentData = await parseJsonResponse(studentResponse);
      const schoolsData = await parseJsonResponse(schoolsResponse);
      const standardsData = await parseJsonResponse(standardsResponse);

      if (!studentResponse.ok || !studentData.success) {
        throw new Error(studentData.message || "Unable to load student.");
      }

      if (!schoolsResponse.ok || !schoolsData.success) {
        throw new Error(schoolsData.message || "Unable to load schools.");
      }

      if (!standardsResponse.ok || !standardsData.success) {
        throw new Error(standardsData.message || "Unable to load standards.");
      }

      const loadedStudent = studentData.student as Student;

      setStudent(loadedStudent);
      setSchools(Array.isArray(schoolsData.schools) ? schoolsData.schools : []);
      setStandards(
        Array.isArray(standardsData.standards) ? standardsData.standards : [],
      );

      setForm({
        name: loadedStudent.name || "",
        studentCode: loadedStudent.studentCode || "",
        email: loadedStudent.email || "",
        phone: loadedStudent.phone || "",
        dateOfBirth: loadedStudent.dateOfBirth
          ? loadedStudent.dateOfBirth.slice(0, 10)
          : "",
        schoolId: loadedStudent.schoolId || "",
        standardId: loadedStudent.standardId || "",
      });

      loadAcademicData(loadedStudent);
    } catch (err) {
      console.error("Failed to load student:", err);
      setError(err instanceof Error ? err.message : "Unable to load student.");
    } finally {
      setLoading(false);
    }
  };

  const loadAcademicData = async (loadedStudent: Student) => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const responses = await Promise.all([
        fetch(`${API_BASE}/standards/${loadedStudent.standardId}/subjects`, {
          method: "GET",
          headers,
        }),
        fetch(`${API_BASE}/attendance/student/${loadedStudent.id}`, {
          method: "GET",
          headers,
        }),
        fetch(`${API_BASE}/performance/student/${loadedStudent.id}`, {
          method: "GET",
          headers,
        }),
        fetch(`${API_BASE}/exams`, {
          method: "GET",
          headers,
        }),
        fetch(
          `${API_BASE}/syllabus-requirements/school/${loadedStudent.schoolId}`,
          {
            method: "GET",
            headers,
          },
        ),
        fetch(`${API_BASE}/teaching-progress`, {
          method: "GET",
          headers,
        }),
        fetch(`${API_BASE}/assessments`, {
          method: "GET",
          headers,
        }),
      ]);

      if (responses.some((response) => response.status === 401)) {
        localStorage.removeItem("synaptix_token");
        router.push("/login");
        return;
      }

      const [
        subjectsResponse,
        attendanceResponse,
        performanceResponse,
        examsResponse,
        syllabusResponse,
        progressResponse,
        assessmentsResponse,
      ] = responses;

      const [
        subjectsData,
        attendanceData,
        performanceData,
        examsData,
        syllabusData,
        progressData,
        assessmentsData,
      ] = await Promise.all(
        responses.map((response) => parseJsonResponse(response)),
      );

      if (!subjectsResponse.ok || !subjectsData.success) {
        throw new Error(
          subjectsData.message || "Unable to load student subjects.",
        );
      }

      if (!attendanceResponse.ok || !attendanceData.success) {
        throw new Error(attendanceData.message || "Unable to load attendance.");
      }

      if (!performanceResponse.ok || !performanceData.success) {
        throw new Error(
          performanceData.message || "Unable to load performance.",
        );
      }

      if (!examsResponse.ok || !examsData.success) {
        throw new Error(examsData.message || "Unable to load exams.");
      }

      if (!syllabusResponse.ok || !syllabusData.success) {
        throw new Error(
          syllabusData.message || "Unable to load syllabus information.",
        );
      }

      if (!progressResponse.ok || !progressData.success) {
        throw new Error(
          progressData.message || "Unable to load teaching progress.",
        );
      }

      if (!assessmentsResponse.ok || !assessmentsData.success) {
        throw new Error(
          assessmentsData.message || "Unable to load assessments.",
        );
      }

      setSubjects(
        Array.isArray(subjectsData.subjects) ? subjectsData.subjects : [],
      );
      setAttendance(
        Array.isArray(attendanceData.data) ? attendanceData.data : [],
      );
      setPerformance(
        Array.isArray(performanceData.data) ? performanceData.data : [],
      );

      const allExams: Exam[] = Array.isArray(examsData.exams)
        ? examsData.exams
        : [];
      setExams(
        allExams.filter((exam) => exam.schoolId === loadedStudent.schoolId),
      );

      setSyllabus(
        Array.isArray(syllabusData.requirements)
          ? syllabusData.requirements
          : [],
      );

      const studentBatchIds = new Set(
        (loadedStudent.batches || []).map((assignment) => assignment.batchId),
      );

      const allTeachingProgress: TeachingProgress[] = Array.isArray(
        progressData.teachingProgress,
      )
        ? progressData.teachingProgress
        : [];

      setTeachingProgress(
        allTeachingProgress.filter((item) => studentBatchIds.has(item.batchId)),
      );

      void assessmentsData;
    } catch (err) {
      console.error("Failed to load student academic data:", err);
      setAcademicError(
        err instanceof Error
          ? err.message
          : "Unable to load academic information.",
      );
    } finally {
      setAcademicLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function init() {
      if (!ignore) {
        await loadStudent();
      }
    }

    init();

    return () => {
      ignore = true;
    };
  }, [studentId]);

  const school = student?.school;
  const standard = student?.standard;
  const studentBatches = student?.batches || [];

  const attendanceStats = useMemo(() => {
    const present = attendance.filter(
      (item) => item.status === "PRESENT",
    ).length;
    const absent = attendance.filter((item) => item.status === "ABSENT").length;
    const late = attendance.filter((item) => item.status === "LATE").length;
    const excused = attendance.filter(
      (item) => item.status === "EXCUSED",
    ).length;
    const total = attendance.length;

    const attendancePercentage =
      total > 0 ? Math.round((present / total) * 100) : null;

    return {
      present,
      absent,
      late,
      excused,
      total,
      attendancePercentage,
    };
  }, [attendance]);

  const performanceStats = useMemo(() => {
    if (performance.length === 0) {
      return {
        average: null,
        highest: null,
        lowest: null,
      };
    }

    const percentages = performance
      .map((item) => {
        if (item.percentage !== null && item.percentage !== undefined) {
          return Number(item.percentage);
        }

        const totalMarks = item.assessment?.totalMarks;

        if (
          totalMarks !== null &&
          totalMarks !== undefined &&
          Number(totalMarks) > 0
        ) {
          return (Number(item.marksObtained) / Number(totalMarks)) * 100;
        }

        return null;
      })
      .filter(
        (value): value is number => value !== null && Number.isFinite(value),
      );

    if (percentages.length === 0) {
      return {
        average: null,
        highest: null,
        lowest: null,
      };
    }

    const average =
      percentages.reduce((sum, value) => sum + value, 0) / percentages.length;

    return {
      average,
      highest: Math.max(...percentages),
      lowest: Math.min(...percentages),
    };
  }, [performance]);

  const syllabusStats = useMemo(() => {
    const total = syllabus.length;
    const required = syllabus.filter((item) => item.required).length;
    const subjectsCount = new Set(syllabus.map((item) => item.subjectId)).size;
    const topicsCount = new Set(syllabus.map((item) => item.topicId)).size;

    return {
      total,
      required,
      subjectsCount,
      topicsCount,
    };
  }, [syllabus]);

  const completedProgress = useMemo(
    () => teachingProgress.filter((item) => item.status === "COMPLETED").length,
    [teachingProgress],
  );

  const inProgressTeaching = useMemo(
    () =>
      teachingProgress.filter((item) => item.status === "IN_PROGRESS").length,
    [teachingProgress],
  );

  const handleSchoolChange = (schoolId: string) => {
    setForm((current) => ({
      ...current,
      schoolId,
      standardId: "",
    }));
  };

  const availableStandards = useMemo(() => {
    if (!form.schoolId) {
      return [];
    }

    return standards.filter((item) => item.schoolId === form.schoolId);
  }, [form.schoolId, standards]);

  const openEditModal = () => {
    if (!student) {
      return;
    }

    setSaveMessage("");
    setSaveError("");

    setForm({
      name: student.name || "",
      studentCode: student.studentCode || "",
      email: student.email || "",
      phone: student.phone || "",
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : "",
      schoolId: student.schoolId || "",
      standardId: student.standardId || "",
    });

    setIsEditOpen(true);
  };

  const handleUpdateStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!student) {
      return;
    }

    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    try {
      setSaving(true);
      setSaveError("");
      setSaveMessage("");

      const response = await fetch(`${API_BASE}/students/${student.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          studentCode: form.studentCode.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          dateOfBirth: form.dateOfBirth ? form.dateOfBirth : null,
          schoolId: form.schoolId,
          standardId: form.standardId,
        }),
      });

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        router.push("/login");
        return;
      }

      const data = await parseJsonResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update student.");
      }

      const updatedStudent = data.student as Student;

      setStudent(updatedStudent);

      setForm({
        name: updatedStudent.name || "",
        studentCode: updatedStudent.studentCode || "",
        email: updatedStudent.email || "",
        phone: updatedStudent.phone || "",
        dateOfBirth: updatedStudent.dateOfBirth
          ? updatedStudent.dateOfBirth.slice(0, 10)
          : "",
        schoolId: updatedStudent.schoolId || "",
        standardId: updatedStudent.standardId || "",
      });

      setSaveMessage("Student details updated successfully.");

      setTimeout(() => {
        setIsEditOpen(false);
      }, 500);
    } catch (err) {
      console.error("Failed to update student:", err);
      setSaveError(
        err instanceof Error ? err.message : "Failed to update student.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="w-full px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl animate-pulse space-y-6">
          <div className="h-5 w-24 rounded-lg bg-stone-200" />
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-stone-200" />
            <div className="space-y-2">
              <div className="h-8 w-64 rounded-xl bg-stone-200" />
              <div className="h-4 w-40 rounded-lg bg-stone-100" />
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <div className="h-48 rounded-3xl bg-stone-200" />
            <div className="h-48 rounded-3xl bg-stone-200" />
            <div className="h-48 rounded-3xl bg-stone-200" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !student) {
    return (
      <main className="w-full px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={() => router.back()}
            className="group inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition duration-200 hover:text-orange-600"
          >
            <span className="transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
            <span>Back</span>
          </button>

          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-lg font-semibold tracking-tight text-red-800">
              Unable to load student
            </h1>
            <p className="mt-2 text-sm text-red-700">
              {error || "Student record could not be found."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Back */}
        <button
          type="button"
          onClick={() => router.back()}
          className="group mb-6 inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition duration-200 hover:text-orange-600"
        >
          <span className="transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
          <span>Back to Students</span>
        </button>

        {/* Header */}
        <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-xl font-bold text-white shadow-md shadow-orange-200">
              {student.name.charAt(0).toUpperCase()}
            </div>

            <div>
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                <span>♟</span>
                {student.studentCode ? student.studentCode : "Student Profile"}
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
                {student.name}
              </h1>

              <p className="mt-1 text-sm text-stone-500">
                {school?.name || "Unassigned School"} • {standard?.name || "Standard N/A"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/app/schools/${student.schoolId}`}
              className="rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-xs font-semibold text-orange-700 transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 active:translate-y-0"
            >
              View School
            </Link>

            <Link
              href={`/app/standards/${student.standardId}`}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:text-orange-700 active:translate-y-0"
            >
              View Standard
            </Link>

            <button
              type="button"
              onClick={openEditModal}
              className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
            >
              Edit Student
            </button>
          </div>
        </section>

        {/* Basic Information */}
        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          <div className="rounded-3xl border border-orange-100/80 bg-white/90 p-6 shadow-sm backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Academic Identity
            </p>

            <div className="mt-5 space-y-3.5">
              <Link
                href={`/app/schools/${student.schoolId}`}
                className="group block rounded-2xl border border-stone-100 bg-stone-50/70 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50/40 hover:shadow-sm"
              >
                <p className="text-xs font-medium text-stone-500">School</p>
                <p className="mt-1 font-semibold text-stone-900 group-hover:text-orange-700">
                  {school?.name || "—"}
                </p>
                <p className="mt-1 text-xs font-medium text-orange-600">
                  View Details →
                </p>
              </Link>

              <Link
                href={`/app/standards/${student.standardId}`}
                className="group block rounded-2xl border border-stone-100 bg-stone-50/70 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50/40 hover:shadow-sm"
              >
                <p className="text-xs font-medium text-stone-500">Standard</p>
                <p className="mt-1 font-semibold text-stone-900 group-hover:text-orange-700">
                  {standard?.name || "—"}
                </p>
                <p className="mt-1 text-xs font-medium text-orange-600">
                  View Details →
                </p>
              </Link>

              <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
                <p className="text-xs font-medium text-stone-500">
                  Student Code
                </p>
                <p className="mt-1 font-semibold text-stone-900">
                  {student.studentCode || "Not assigned"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-orange-100/80 bg-white/90 p-6 shadow-sm backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Personal Details
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-medium text-stone-500">Email Address</p>
                <p className="mt-1 break-all text-sm font-semibold text-stone-900">
                  {student.email || "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-stone-500">Phone Number</p>
                <p className="mt-1 text-sm font-semibold text-stone-900">
                  {student.phone || "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-stone-500">Date of Birth</p>
                <p className="mt-1 text-sm font-semibold text-stone-900">
                  {formatDate(student.dateOfBirth)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-orange-100/80 bg-white/90 p-6 shadow-sm backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Coaching Batches
            </p>

            {studentBatches.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 p-5 text-center">
                <p className="text-sm font-semibold text-stone-700">
                  No batch assigned
                </p>
                <p className="mt-1 text-xs leading-5 text-stone-500">
                  This student has not been assigned to an active coaching batch yet.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {studentBatches.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4 transition duration-150 hover:bg-orange-50/30"
                  >
                    <p className="text-sm font-semibold text-stone-900">
                      {assignment.batch.name}
                    </p>

                    {assignment.batch.description && (
                      <p className="mt-1 text-xs leading-5 text-stone-500">
                        {assignment.batch.description}
                      </p>
                    )}

                    <p className="mt-2 text-xs text-stone-400">
                      Enrolled {formatDate(assignment.joinedAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Academic Summary */}
        <section className="mt-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Academic Overview
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
              Performance & Attendance Metrics
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-orange-100/80 bg-white/90 p-5 shadow-sm backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                Subjects
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
                {academicLoading ? "—" : subjects.length}
              </p>
              <p className="mt-1 text-xs text-stone-400">
                Mapped to standard
              </p>
            </div>

            <div className="rounded-3xl border border-orange-100/80 bg-white/90 p-5 shadow-sm backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                Attendance
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
                {academicLoading
                  ? "—"
                  : attendanceStats.attendancePercentage !== null
                    ? `${attendanceStats.attendancePercentage}%`
                    : "—"}
              </p>
              <p className="mt-1 text-xs text-stone-400">
                Overall attendance rate
              </p>
            </div>

            <div className="rounded-3xl border border-orange-100/80 bg-white/90 p-5 shadow-sm backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                Test Average
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
                {academicLoading
                  ? "—"
                  : performanceStats.average !== null
                    ? `${performanceStats.average.toFixed(1)}%`
                    : "—"}
              </p>
              <p className="mt-1 text-xs text-stone-400">
                Across recorded tests
              </p>
            </div>

            <div className="rounded-3xl border border-orange-100/80 bg-white/90 p-5 shadow-sm backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                Upcoming Exams
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
                {academicLoading ? "—" : exams.length}
              </p>
              <p className="mt-1 text-xs text-stone-400">
                Scheduled by school
              </p>
            </div>
          </div>
        </section>

        {academicError && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {academicError}
          </div>
        )}

        {/* Subjects */}
        <section className="mt-8 rounded-3xl border border-orange-100/80 bg-white/90 p-6 shadow-sm backdrop-blur-md">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                Academic Curriculum
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
                Standard Subjects
              </h2>
            </div>

            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
              {subjects.length} subject{subjects.length === 1 ? "" : "s"}
            </span>
          </div>

          {academicLoading ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse rounded-2xl bg-stone-100"
                />
              ))}
            </div>
          ) : subjects.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 p-6 text-center">
              <p className="text-sm font-semibold text-stone-700">
                No subjects assigned
              </p>
              <p className="mt-1 text-xs text-stone-500">
                No subjects are currently mapped to this student&apos;s standard.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {subjects.map((mapping) => (
                <div
                  key={mapping.id}
                  className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4 transition duration-150 hover:bg-orange-50/30"
                >
                  <p className="text-sm font-semibold text-stone-900">
                    {mapping.subject.name}
                  </p>
                  {mapping.subject.code && (
                    <p className="mt-1 text-xs text-stone-500">
                      Code: {mapping.subject.code}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Attendance */}
        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          <div className="rounded-3xl border border-orange-100/80 bg-white/90 p-6 shadow-sm backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Attendance
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
              Status Breakdown
            </h2>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3">
                <span className="text-sm font-medium text-emerald-700">
                  Present
                </span>
                <span className="text-sm font-bold text-emerald-800">
                  {attendanceStats.present}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-red-50 px-4 py-3">
                <span className="text-sm font-medium text-red-700">
                  Absent
                </span>
                <span className="text-sm font-bold text-red-800">
                  {attendanceStats.absent}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-orange-50 px-4 py-3">
                <span className="text-sm font-medium text-orange-700">
                  Late
                </span>
                <span className="text-sm font-bold text-orange-800">
                  {attendanceStats.late}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-stone-100 px-4 py-3">
                <span className="text-sm font-medium text-stone-600">
                  Excused
                </span>
                <span className="text-sm font-bold text-stone-700">
                  {attendanceStats.excused}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-orange-100/80 bg-white/90 p-6 shadow-sm backdrop-blur-md lg:col-span-2">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Attendance History
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
                  Recent Sessions
                </h2>
              </div>

              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                {attendance.length} record{attendance.length === 1 ? "" : "s"}
              </span>
            </div>

            {attendance.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 p-6 text-center">
                <p className="text-sm font-semibold text-stone-700">
                  No attendance records
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  Attendance data will appear here once session registers are saved.
                </p>
              </div>
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left">
                  <thead>
                    <tr className="border-b border-stone-100 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Remarks</th>
                    </tr>
                  </thead>

                  <tbody>
                    {attendance.slice(0, 8).map((record) => (
                      <tr
                        key={record.id}
                        className="border-b border-stone-50 transition duration-150 last:border-0 hover:bg-orange-50/30"
                      >
                        <td className="px-3 py-3 text-sm font-medium text-stone-800">
                          {formatDate(record.date)}
                        </td>

                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              record.status === "PRESENT"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : record.status === "ABSENT"
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : record.status === "LATE"
                                    ? "border-orange-200 bg-orange-50 text-orange-700"
                                    : "border-stone-200 bg-stone-100 text-stone-600"
                            }`}
                          >
                            {formatAttendanceStatus(record.status)}
                          </span>
                        </td>

                        <td className="px-3 py-3 text-sm text-stone-500">
                          {record.remarks || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Performance */}
        <section className="mt-8 rounded-3xl border border-orange-100/80 bg-white/90 p-6 shadow-sm backdrop-blur-md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                Performance Evaluation
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
                Assessment Results
              </h2>
            </div>

            <div className="flex gap-5 text-sm">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                  Average
                </span>
                <p className="text-base font-bold text-stone-900">
                  {performanceStats.average !== null
                    ? `${performanceStats.average.toFixed(1)}%`
                    : "—"}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                  Top Score
                </span>
                <p className="text-base font-bold text-emerald-600">
                  {performanceStats.highest !== null
                    ? `${performanceStats.highest.toFixed(1)}%`
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          {performance.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 p-6 text-center">
              <p className="text-sm font-semibold text-stone-700">
                No performance records
              </p>
              <p className="mt-1 text-xs text-stone-500">
                Assessment marks will appear here once scores are entered.
              </p>
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[650px] text-left">
                <thead>
                  <tr className="border-b border-stone-100 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    <th className="px-3 py-3">Assessment</th>
                    <th className="px-3 py-3">Subject</th>
                    <th className="px-3 py-3">Batch</th>
                    <th className="px-3 py-3">Marks</th>
                    <th className="px-3 py-3">Percentage</th>
                  </tr>
                </thead>

                <tbody>
                  {performance.map((record) => {
                    const percentage =
                      record.percentage !== null &&
                      record.percentage !== undefined
                        ? Number(record.percentage)
                        : record.assessment.totalMarks
                          ? (Number(record.marksObtained) /
                              Number(record.assessment.totalMarks)) *
                            100
                          : null;

                    return (
                      <tr
                        key={record.id}
                        className="border-b border-stone-50 transition duration-150 last:border-0 hover:bg-orange-50/30"
                      >
                        <td className="px-3 py-4 text-sm font-semibold text-stone-900">
                          {record.assessment.name}
                        </td>

                        <td className="px-3 py-4 text-sm text-stone-600">
                          {record.assessment.subject || "—"}
                        </td>

                        <td className="px-3 py-4 text-sm text-stone-600">
                          {record.assessment.batch?.name || "—"}
                        </td>

                        <td className="px-3 py-4 text-sm font-medium text-stone-800">
                          {record.marksObtained}
                          {record.assessment.totalMarks !== null &&
                          record.assessment.totalMarks !== undefined
                            ? ` / ${record.assessment.totalMarks}`
                            : ""}
                        </td>

                        <td className="px-3 py-4">
                          <span className="text-sm font-bold text-orange-600">
                            {percentage !== null
                              ? `${percentage.toFixed(1)}%`
                              : "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Exams + Syllabus */}
        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          {/* Exams */}
          <div className="rounded-3xl border border-orange-100/80 bg-white/90 p-6 shadow-sm backdrop-blur-md">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Examination Context
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
                  School Examinations
                </h2>
              </div>

              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                {exams.length} exam{exams.length === 1 ? "" : "s"}
              </span>
            </div>

            {exams.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 p-6 text-center">
                <p className="text-sm font-semibold text-stone-700">
                  No exams recorded
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  School examination dates will appear here once configured.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {exams.slice(0, 6).map((exam) => (
                  <div
                    key={exam.id}
                    className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4 transition duration-150 hover:bg-orange-50/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">
                          {exam.name}
                        </p>
                        <p className="mt-1 text-xs text-stone-500">
                          {exam.subject?.name || "Subject not specified"}
                          {exam.academicYear ? ` • ${exam.academicYear}` : ""}
                        </p>
                      </div>

                      {exam.schedules && exam.schedules.length > 0 && (
                        <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                          {exam.schedules.length} paper{exam.schedules.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>

                    {exam.schedules && exam.schedules.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {exam.schedules.slice(0, 3).map((schedule) => (
                          <div
                            key={schedule.id}
                            className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs shadow-xs"
                          >
                            <span className="font-medium text-stone-600">
                              {schedule.subject?.name ||
                                exam.subject?.name ||
                                "Subject"}
                            </span>
                            <span className="font-semibold text-stone-800">
                              {formatDate(schedule.examDate)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Syllabus */}
          <div className="rounded-3xl border border-orange-100/80 bg-white/90 p-6 shadow-sm backdrop-blur-md">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Syllabus Context
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
                  Curriculum Requirements
                </h2>
              </div>

              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                {syllabusStats.topicsCount} topics
              </span>
            </div>

            {syllabus.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 p-6 text-center">
                <p className="text-sm font-semibold text-stone-700">
                  No syllabus requirements
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  School syllabus requirements will appear here when defined.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-stone-50 p-3 text-center">
                    <p className="text-xl font-bold text-stone-900">
                      {syllabusStats.total}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-stone-500">Total</p>
                  </div>

                  <div className="rounded-2xl bg-orange-50 p-3 text-center">
                    <p className="text-xl font-bold text-orange-700">
                      {syllabusStats.required}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-orange-600">Required</p>
                  </div>

                  <div className="rounded-2xl bg-stone-50 p-3 text-center">
                    <p className="text-xl font-bold text-stone-900">
                      {syllabusStats.subjectsCount}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-stone-500">Subjects</p>
                  </div>
                </div>

                <div className="mt-5 max-h-[350px] space-y-2 overflow-y-auto pr-1">
                  {syllabus.slice(0, 20).map((requirement) => (
                    <div
                      key={requirement.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-stone-100 bg-stone-50/70 p-3 transition duration-150 hover:bg-orange-50/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-stone-900">
                          {requirement.topic.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-stone-500">
                          {requirement.subject.name}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                          requirement.required
                            ? "border-orange-200 bg-orange-50 text-orange-700"
                            : "border-stone-200 bg-stone-100 text-stone-500"
                        }`}
                      >
                        {requirement.required ? "Required" : "Optional"}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Teaching Progress */}
        <section className="mt-8 rounded-3xl border border-orange-100/80 bg-white/90 p-6 shadow-sm backdrop-blur-md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                Coaching Progress
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
                Topic Coverage
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Progress tracking across batches assigned to this student.
              </p>
            </div>

            <div className="flex gap-5 text-sm">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                  Completed
                </span>
                <p className="text-base font-bold text-emerald-600">
                  {completedProgress}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                  In Progress
                </span>
                <p className="text-base font-bold text-orange-600">
                  {inProgressTeaching}
                </p>
              </div>
            </div>
          </div>

          {teachingProgress.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 p-6 text-center">
              <p className="text-sm font-semibold text-stone-700">
                No teaching progress recorded
              </p>
              <p className="mt-1 text-xs text-stone-500">
                Coverage will appear here once topics are logged for student batches.
              </p>
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead>
                  <tr className="border-b border-stone-100 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    <th className="px-3 py-3">Topic</th>
                    <th className="px-3 py-3">Subject</th>
                    <th className="px-3 py-3">Batch</th>
                    <th className="px-3 py-3">Teacher</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {teachingProgress.slice(0, 20).map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-stone-50 transition duration-150 last:border-0 hover:bg-orange-50/30"
                    >
                      <td className="px-3 py-4 text-sm font-semibold text-stone-900">
                        {item.topic.name}
                      </td>

                      <td className="px-3 py-4 text-sm text-stone-600">
                        {item.topic.subject?.name || "—"}
                      </td>

                      <td className="px-3 py-4 text-sm text-stone-600">
                        {item.batch.name}
                      </td>

                      <td className="px-3 py-4 text-sm text-stone-600">
                        {item.teacher?.name || "—"}
                      </td>

                      <td className="px-3 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getProgressBadgeClass(
                            item.status,
                          )}`}
                        >
                          {formatProgressStatus(item.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Edit Modal */}
      {isEditOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-sm lg:pl-72"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) {
              setIsEditOpen(false);
            }
          }}
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-orange-100 bg-[#fffdf9] shadow-2xl">
            <div className="flex items-start justify-between border-b border-stone-100 p-6 sm:px-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Student Management
                </p>

                <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
                  Edit Student
                </h2>

                <p className="mt-1 text-sm text-stone-500">
                  Update basic student details and academic allocation.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="p-6 sm:px-7">
              {saveError && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {saveError}
                </div>
              )}

              {saveMessage && (
                <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                  {saveMessage}
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-stone-700">
                    Student Name *
                  </label>

                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    required
                    placeholder="Enter full name"
                    className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700">
                    Student Code
                  </label>

                  <input
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

                <div>
                  <label className="text-xs font-semibold text-stone-700">
                    Date of Birth
                  </label>

                  <input
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

                <div>
                  <label className="text-xs font-semibold text-stone-700">
                    Email Address
                  </label>

                  <input
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

                <div>
                  <label className="text-xs font-semibold text-stone-700">
                    Phone Number
                  </label>

                  <input
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

                <div>
                  <label className="text-xs font-semibold text-stone-700">
                    School *
                  </label>

                  <select
                    value={form.schoolId}
                    onChange={(event) => handleSchoolChange(event.target.value)}
                    required
                    className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    <option value="">Select school</option>
                    {schools.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700">
                    Standard *
                  </label>

                  <select
                    value={form.standardId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        standardId: event.target.value,
                      }))
                    }
                    required
                    disabled={!form.schoolId}
                    className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400"
                  >
                    <option value="">Select standard</option>
                    {availableStandards.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  disabled={saving}
                  className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-150 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
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

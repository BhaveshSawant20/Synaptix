import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./lib/prisma";
import authRoutes from "./routes/auth.routes";
import schoolRoutes from "./routes/school.routes";
import standardRoutes from "./routes/standard.routes";
import studentRoutes from "./routes/student.routes";
import teacherRoutes from "./routes/teacher.routes";
import batchRoutes from "./routes/batch.routes";
import batchStudentRoutes from "./routes/batch-student.routes";
import batchTeacherRoutes from "./routes/batch-teacher.routes";
import subjectRoutes from "./routes/subject.routes";
import standardSubjectRoutes from "./routes/standard-subject.routes";
import topicRoutes from "./routes/topic.routes";
import syllabusRequirementRoutes from "./routes/syllabus-requirement.routes";
import examRoutes from "./routes/exam.routes";
import examScheduleRoutes from "./routes/exam-schedule.routes";
import teachingProgressRoutes from "./routes/teaching-progress.routes";
import attendanceRoutes from "./routes/attendance.routes";
import assessmentRoutes from "./routes/assessment.routes";
import performanceRoutes from "./routes/performance.routes";
import questionPaperRoutes from "./routes/question-paper.routes";
import importantQuestionRoutes from "./routes/important-question.routes";
import fileAssetRoutes from "./routes/file-asset.routes";
import academicPlanRoutes from "./routes/academic-plan.routes";
import recommendationRoutes from "./routes/recommendation.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import instituteRoutes from "./routes/institute.routes";
import batchScheduleRoutes from "./routes/batch-schedule.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

/* =========================
   HEALTH CHECK
========================= */

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Synaptix API",
  });
});

/* =========================
   DATABASE TEST
========================= */

app.get("/api/db-test", async (_req, res) => {
  try {
    const instituteCount = await prisma.institute.count();

    res.json({
      success: true,
      message: "Database connection is working",
      instituteCount,
    });
  } catch (error) {
    console.error("Database test failed:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

/* =========================
   AUTH ROUTES
========================= */

app.use("/api/auth", authRoutes);
app.use("/api/schools", schoolRoutes);
app.use("/api/standards", standardRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/batches", batchStudentRoutes);
app.use("/api/batches", batchTeacherRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/standards", standardSubjectRoutes);
app.use("/api/topics", topicRoutes);
app.use("/api/syllabus-requirements", syllabusRequirementRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/exam-schedules", examScheduleRoutes);
app.use("/api/teaching-progress", teachingProgressRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api/performance", performanceRoutes);
app.use("/api/question-papers", questionPaperRoutes);
app.use("/api/important-questions", importantQuestionRoutes);
app.use("/api/file-assets", fileAssetRoutes);
app.use("/api/academic-plans", academicPlanRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/dashboard", dashboardRoutes); 
app.use("/api/institute", instituteRoutes);
app.use("/api/batch-schedules", batchScheduleRoutes);

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {
  console.log(`Synaptix backend running on http://localhost:${PORT}`);
});
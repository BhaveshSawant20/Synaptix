import { Router, Response } from "express";
import prisma from "../lib/prisma";
import authMiddleware, {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

/**
 * CREATE EXAM SCHEDULE
 * POST /api/exam-schedules
 */
router.post(
  "/",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const {
        examId,
        subjectId,
        examDate,
        startTime,
        endTime,
        totalMarks,
        syllabusNote,
      } = req.body;

      if (!examId || !subjectId || !examDate) {
        return res.status(400).json({
          success: false,
          message: "examId, subjectId and examDate are required",
        });
      }

      const exam = await prisma.exam.findFirst({
        where: {
          id: examId,
          instituteId: req.instituteId,
        },
      });

      if (!exam) {
        return res.status(404).json({
          success: false,
          message: "Exam not found",
        });
      }

      const subject = await prisma.subject.findFirst({
        where: {
          id: subjectId,
          instituteId: req.instituteId,
        },
      });

      if (!subject) {
        return res.status(404).json({
          success: false,
          message: "Subject not found",
        });
      }

      const schedule = await prisma.examSchedule.create({
        data: {
          examId,
          subjectId,
          examDate: new Date(examDate),
          startTime: startTime ? new Date(startTime) : null,
          endTime: endTime ? new Date(endTime) : null,
          totalMarks:
            totalMarks !== undefined && totalMarks !== null
              ? Number(totalMarks)
              : null,
          syllabusNote: syllabusNote || null,
        },
        include: {
          exam: true,
          subject: true,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Exam schedule created successfully",
        schedule,
      });
    } catch (error) {
      console.error("Create exam schedule error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create exam schedule",
      });
    }
  }
);

/**
 * GET ALL EXAM SCHEDULES
 * GET /api/exam-schedules
 */
router.get(
  "/",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const schedules = await prisma.examSchedule.findMany({
        where: {
          exam: {
            instituteId: req.instituteId,
          },
        },
        include: {
          exam: true,
          subject: true,
        },
        orderBy: {
          examDate: "asc",
        },
      });

      return res.json({
        success: true,
        count: schedules.length,
        schedules,
      });
    } catch (error) {
      console.error("Get exam schedules error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch exam schedules",
      });
    }
  }
);

/**
 * GET SCHEDULES BY EXAM
 * GET /api/exam-schedules/exam/:examId
 */
router.get(
  "/exam/:examId",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const examId = String(req.params.examId);

      const exam = await prisma.exam.findFirst({
        where: {
          id: examId,
          instituteId: req.instituteId,
        },
      });

      if (!exam) {
        return res.status(404).json({
          success: false,
          message: "Exam not found",
        });
      }

      const schedules = await prisma.examSchedule.findMany({
        where: {
          examId,
        },
        include: {
          subject: true,
        },
        orderBy: {
          examDate: "asc",
        },
      });

      return res.json({
        success: true,
        count: schedules.length,
        exam,
        schedules,
      });
    } catch (error) {
      console.error("Get schedules by exam error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch exam schedules",
      });
    }
  }
);

/**
 * GET EXAM SCHEDULE BY ID
 * GET /api/exam-schedules/:id
 */
router.get(
  "/:id",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const scheduleId = String(req.params.id);

      const schedule = await prisma.examSchedule.findFirst({
        where: {
          id: scheduleId,
          exam: {
            instituteId: req.instituteId,
          },
        },
        include: {
          exam: true,
          subject: true,
        },
      });

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: "Exam schedule not found",
        });
      }

      return res.json({
        success: true,
        schedule,
      });
    } catch (error) {
      console.error("Get exam schedule error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch exam schedule",
      });
    }
  }
);

/**
 * UPDATE EXAM SCHEDULE
 * PUT /api/exam-schedules/:id
 */
router.put(
  "/:id",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const scheduleId = String(req.params.id);

      const existingSchedule = await prisma.examSchedule.findFirst({
        where: {
          id: scheduleId,
          exam: {
            instituteId: req.instituteId,
          },
        },
      });

      if (!existingSchedule) {
        return res.status(404).json({
          success: false,
          message: "Exam schedule not found",
        });
      }

      const {
        examId,
        subjectId,
        examDate,
        startTime,
        endTime,
        totalMarks,
        syllabusNote,
      } = req.body;

      if (examId) {
        const exam = await prisma.exam.findFirst({
          where: {
            id: examId,
            instituteId: req.instituteId,
          },
        });

        if (!exam) {
          return res.status(404).json({
            success: false,
            message: "Exam not found",
          });
        }
      }

      if (subjectId) {
        const subject = await prisma.subject.findFirst({
          where: {
            id: subjectId,
            instituteId: req.instituteId,
          },
        });

        if (!subject) {
          return res.status(404).json({
            success: false,
            message: "Subject not found",
          });
        }
      }

      const schedule = await prisma.examSchedule.update({
        where: {
          id: scheduleId,
        },
        data: {
          ...(examId !== undefined && { examId }),
          ...(subjectId !== undefined && { subjectId }),
          ...(examDate !== undefined && {
            examDate: new Date(examDate),
          }),
          ...(startTime !== undefined && {
            startTime: startTime ? new Date(startTime) : null,
          }),
          ...(endTime !== undefined && {
            endTime: endTime ? new Date(endTime) : null,
          }),
          ...(totalMarks !== undefined && {
            totalMarks:
              totalMarks !== null ? Number(totalMarks) : null,
          }),
          ...(syllabusNote !== undefined && {
            syllabusNote: syllabusNote || null,
          }),
        },
        include: {
          exam: true,
          subject: true,
        },
      });

      return res.json({
        success: true,
        message: "Exam schedule updated successfully",
        schedule,
      });
    } catch (error) {
      console.error("Update exam schedule error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update exam schedule",
      });
    }
  }
);

/**
 * DELETE EXAM SCHEDULE
 * DELETE /api/exam-schedules/:id
 */
router.delete(
  "/:id",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const scheduleId = String(req.params.id);

      const schedule = await prisma.examSchedule.findFirst({
        where: {
          id: scheduleId,
          exam: {
            instituteId: req.instituteId,
          },
        },
      });

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: "Exam schedule not found",
        });
      }

      await prisma.examSchedule.delete({
        where: {
          id: scheduleId,
        },
      });

      return res.json({
        success: true,
        message: "Exam schedule deleted successfully",
      });
    } catch (error) {
      console.error("Delete exam schedule error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete exam schedule",
      });
    }
  }
);

export default router;
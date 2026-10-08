import { Router, Response } from "express";
import prisma from "../lib/prisma";
import authMiddleware, {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

/**
 * CREATE EXAM
 * POST /api/exams
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
        schoolId,
        name,
        academicYear,
        subjectId,
      } = req.body;

      if (!schoolId || !name) {
        return res.status(400).json({
          success: false,
          message: "schoolId and name are required",
        });
      }

      const school = await prisma.school.findFirst({
        where: {
          id: schoolId,
          instituteId: req.instituteId,
        },
      });

      if (!school) {
        return res.status(404).json({
          success: false,
          message: "School not found",
        });
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

      const exam = await prisma.exam.create({
        data: {
          instituteId: req.instituteId,
          schoolId,
          name,
          academicYear: academicYear || null,
          subjectId: subjectId || null,
        },
        include: {
          school: true,
          subject: true,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Exam created successfully",
        exam,
      });
    } catch (error) {
      console.error("Create exam error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create exam",
      });
    }
  }
);

/**
 * GET ALL EXAMS
 * GET /api/exams
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

      const exams = await prisma.exam.findMany({
        where: {
          instituteId: req.instituteId,
        },
        include: {
          school: true,
          subject: true,
          schedules: {
            orderBy: {
              examDate: "asc",
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      return res.json({
        success: true,
        count: exams.length,
        exams,
      });
    } catch (error) {
      console.error("Get exams error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch exams",
      });
    }
  }
);

/**
 * GET EXAM BY ID
 * GET /api/exams/:id
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

      const examId = String(req.params.id);

      const exam = await prisma.exam.findFirst({
        where: {
          id: examId,
          instituteId: req.instituteId,
        },
        include: {
          school: true,
          subject: true,
          schedules: {
            include: {
              subject: true,
            },
            orderBy: {
              examDate: "asc",
            },
          },
        },
      });

      if (!exam) {
        return res.status(404).json({
          success: false,
          message: "Exam not found",
        });
      }

      return res.json({
        success: true,
        exam,
      });
    } catch (error) {
      console.error("Get exam error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch exam",
      });
    }
  }
);

/**
 * UPDATE EXAM
 * PUT /api/exams/:id
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

      const examId = String(req.params.id);

      const existingExam = await prisma.exam.findFirst({
        where: {
          id: examId,
          instituteId: req.instituteId,
        },
      });

      if (!existingExam) {
        return res.status(404).json({
          success: false,
          message: "Exam not found",
        });
      }

      const {
        schoolId,
        name,
        academicYear,
        subjectId,
      } = req.body;

      if (schoolId) {
        const school = await prisma.school.findFirst({
          where: {
            id: schoolId,
            instituteId: req.instituteId,
          },
        });

        if (!school) {
          return res.status(404).json({
            success: false,
            message: "School not found",
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

      const exam = await prisma.exam.update({
        where: {
          id: examId,
        },
        data: {
          ...(schoolId !== undefined && { schoolId }),
          ...(name !== undefined && { name }),
          ...(academicYear !== undefined && {
            academicYear: academicYear || null,
          }),
          ...(subjectId !== undefined && {
            subjectId: subjectId || null,
          }),
        },
        include: {
          school: true,
          subject: true,
        },
      });

      return res.json({
        success: true,
        message: "Exam updated successfully",
        exam,
      });
    } catch (error) {
      console.error("Update exam error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update exam",
      });
    }
  }
);

/**
 * DELETE EXAM
 * DELETE /api/exams/:id
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

      const examId = String(req.params.id);

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

      await prisma.exam.delete({
        where: {
          id: examId,
        },
      });

      return res.json({
        success: true,
        message: "Exam deleted successfully",
      });
    } catch (error) {
      console.error("Delete exam error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete exam",
      });
    }
  }
);

export default router;
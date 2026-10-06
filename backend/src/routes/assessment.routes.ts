import { Router, Response } from "express";
import prisma from "../lib/prisma";
import authMiddleware, {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

/**
 * CREATE ASSESSMENT
 * POST /api/assessments
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
        batchId,
        name,
        subject,
        totalMarks,
        assessmentDate,
      } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Assessment name is required",
        });
      }

      if (
        totalMarks !== undefined &&
        totalMarks !== null &&
        (!Number.isInteger(totalMarks) || totalMarks <= 0)
      ) {
        return res.status(400).json({
          success: false,
          message: "totalMarks must be a positive integer",
        });
      }

      let parsedAssessmentDate: Date | null = null;

      if (assessmentDate !== undefined && assessmentDate !== null) {
        parsedAssessmentDate = new Date(assessmentDate);

        if (Number.isNaN(parsedAssessmentDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid assessment date",
          });
        }
      }

      if (batchId) {
        const batch = await prisma.batch.findFirst({
          where: {
            id: batchId,
            instituteId: req.instituteId,
          },
        });

        if (!batch) {
          return res.status(404).json({
            success: false,
            message: "Batch not found",
          });
        }
      }

      const assessment = await prisma.assessment.create({
        data: {
          instituteId: req.instituteId,
          batchId: batchId || null,
          name,
          subject: subject || null,
          totalMarks: totalMarks ?? null,
          assessmentDate: parsedAssessmentDate,
        },
        include: {
          batch: true,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Assessment created successfully",
        data: assessment,
      });
    } catch (error) {
      console.error("Create assessment error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create assessment",
      });
    }
  }
);

/**
 * GET ALL ASSESSMENTS
 * GET /api/assessments
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

      const assessments = await prisma.assessment.findMany({
        where: {
          instituteId: req.instituteId,
        },
        include: {
          batch: true,
          _count: {
            select: {
              performanceRecords: true,
            },
          },
        },
        orderBy: {
          assessmentDate: "desc",
        },
      });

      return res.status(200).json({
        success: true,
        count: assessments.length,
        data: assessments,
      });
    } catch (error) {
      console.error("Get assessments error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch assessments",
      });
    }
  }
);

/**
 * GET ASSESSMENT BY ID
 * GET /api/assessments/:id
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

      const id = String(req.params.id);

      const assessment = await prisma.assessment.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
        include: {
          batch: true,
          performanceRecords: {
            include: {
              student: {
                select: {
                  id: true,
                  name: true,
                  studentCode: true,
                  school: true,
                  standard: true,
                },
              },
            },
            orderBy: {
              marksObtained: "desc",
            },
          },
        },
      });

      if (!assessment) {
        return res.status(404).json({
          success: false,
          message: "Assessment not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: assessment,
      });
    } catch (error) {
      console.error("Get assessment by ID error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch assessment",
      });
    }
  }
);

/**
 * UPDATE ASSESSMENT
 * PUT /api/assessments/:id
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

      const id = String(req.params.id);

      const existingAssessment = await prisma.assessment.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
      });

      if (!existingAssessment) {
        return res.status(404).json({
          success: false,
          message: "Assessment not found",
        });
      }

      const {
        batchId,
        name,
        subject,
        totalMarks,
        assessmentDate,
      } = req.body;

      if (
        totalMarks !== undefined &&
        totalMarks !== null &&
        (!Number.isInteger(totalMarks) || totalMarks <= 0)
      ) {
        return res.status(400).json({
          success: false,
          message: "totalMarks must be a positive integer",
        });
      }

      if (batchId !== undefined && batchId !== null) {
        const batch = await prisma.batch.findFirst({
          where: {
            id: batchId,
            instituteId: req.instituteId,
          },
        });

        if (!batch) {
          return res.status(404).json({
            success: false,
            message: "Batch not found",
          });
        }
      }

      let parsedAssessmentDate: Date | null | undefined;

      if (assessmentDate !== undefined) {
        if (assessmentDate === null || assessmentDate === "") {
          parsedAssessmentDate = null;
        } else {
          parsedAssessmentDate = new Date(assessmentDate);

          if (Number.isNaN(parsedAssessmentDate.getTime())) {
            return res.status(400).json({
              success: false,
              message: "Invalid assessment date",
            });
          }
        }
      }

      const assessment = await prisma.assessment.update({
        where: {
          id,
        },
        data: {
          ...(batchId !== undefined && {
            batchId: batchId || null,
          }),
          ...(name !== undefined && {
            name,
          }),
          ...(subject !== undefined && {
            subject: subject || null,
          }),
          ...(totalMarks !== undefined && {
            totalMarks: totalMarks ?? null,
          }),
          ...(parsedAssessmentDate !== undefined && {
            assessmentDate: parsedAssessmentDate,
          }),
        },
        include: {
          batch: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Assessment updated successfully",
        data: assessment,
      });
    } catch (error) {
      console.error("Update assessment error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update assessment",
      });
    }
  }
);

/**
 * DELETE ASSESSMENT
 * DELETE /api/assessments/:id
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

      const id = String(req.params.id);

      const existingAssessment = await prisma.assessment.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
      });

      if (!existingAssessment) {
        return res.status(404).json({
          success: false,
          message: "Assessment not found",
        });
      }

      await prisma.assessment.delete({
        where: {
          id,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Assessment deleted successfully",
      });
    } catch (error) {
      console.error("Delete assessment error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete assessment",
      });
    }
  }
);

export default router;
import { Router, Response } from "express";
import prisma from "../lib/prisma";
import authMiddleware, {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

/**
 * CREATE teaching progress
 * POST /api/teaching-progress
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
        topicId,
        teacherId,
        status,
        startedAt,
        completedAt,
        notes,
      } = req.body;

      if (!batchId || !topicId) {
        return res.status(400).json({
          success: false,
          message: "batchId and topicId are required",
        });
      }

      const batch = await prisma.batch.findFirst({
        where: {
          id: String(batchId),
          instituteId: req.instituteId,
        },
      });

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: "Batch not found",
        });
      }

      const topic = await prisma.topic.findFirst({
        where: {
          id: String(topicId),
          instituteId: req.instituteId,
        },
      });

      if (!topic) {
        return res.status(404).json({
          success: false,
          message: "Topic not found",
        });
      }

      if (teacherId) {
        const teacher = await prisma.teacher.findFirst({
          where: {
            id: String(teacherId),
            instituteId: req.instituteId,
          },
        });

        if (!teacher) {
          return res.status(404).json({
            success: false,
            message: "Teacher not found",
          });
        }
      }

      const existingProgress = await prisma.teachingProgress.findUnique({
        where: {
          batchId_topicId: {
            batchId: String(batchId),
            topicId: String(topicId),
          },
        },
      });

      if (existingProgress) {
        return res.status(409).json({
          success: false,
          message: "Teaching progress already exists for this batch and topic",
        });
      }

      const teachingProgress = await prisma.teachingProgress.create({
        data: {
          instituteId: req.instituteId,
          batchId: String(batchId),
          topicId: String(topicId),
          teacherId: teacherId ? String(teacherId) : undefined,
          status: status || "NOT_STARTED",
          startedAt: startedAt ? new Date(startedAt) : undefined,
          completedAt: completedAt ? new Date(completedAt) : undefined,
          notes: notes ? String(notes) : undefined,
        },
        include: {
          batch: true,
          topic: {
            include: {
              subject: true,
            },
          },
          teacher: true,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Teaching progress created successfully",
        teachingProgress,
      });
    } catch (error) {
      console.error("Create teaching progress error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create teaching progress",
      });
    }
  }
);

/**
 * GET all teaching progress
 * GET /api/teaching-progress
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

      const teachingProgress = await prisma.teachingProgress.findMany({
        where: {
          instituteId: req.instituteId,
        },
        include: {
          batch: true,
          topic: {
            include: {
              subject: true,
            },
          },
          teacher: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.status(200).json({
        success: true,
        count: teachingProgress.length,
        teachingProgress,
      });
    } catch (error) {
      console.error("Get teaching progress error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch teaching progress",
      });
    }
  }
);

/**
 * GET teaching progress by batch
 * GET /api/teaching-progress/batch/:batchId
 */
router.get(
  "/batch/:batchId",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const batchId = String(req.params.batchId);

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

      const teachingProgress = await prisma.teachingProgress.findMany({
        where: {
          batchId,
          instituteId: req.instituteId,
        },
        include: {
          topic: {
            include: {
              subject: true,
            },
          },
          teacher: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.status(200).json({
        success: true,
        count: teachingProgress.length,
        batch,
        teachingProgress,
      });
    } catch (error) {
      console.error("Get batch teaching progress error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch batch teaching progress",
      });
    }
  }
);

/**
 * GET teaching progress by ID
 * GET /api/teaching-progress/:id
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

      const teachingProgress = await prisma.teachingProgress.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
        include: {
          batch: true,
          topic: {
            include: {
              subject: true,
            },
          },
          teacher: true,
        },
      });

      if (!teachingProgress) {
        return res.status(404).json({
          success: false,
          message: "Teaching progress not found",
        });
      }

      return res.status(200).json({
        success: true,
        teachingProgress,
      });
    } catch (error) {
      console.error("Get teaching progress by ID error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch teaching progress",
      });
    }
  }
);

/**
 * UPDATE teaching progress
 * PUT /api/teaching-progress/:id
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

      const existingProgress = await prisma.teachingProgress.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
      });

      if (!existingProgress) {
        return res.status(404).json({
          success: false,
          message: "Teaching progress not found",
        });
      }

      const {
        teacherId,
        status,
        startedAt,
        completedAt,
        notes,
      } = req.body;

      if (teacherId) {
        const teacher = await prisma.teacher.findFirst({
          where: {
            id: String(teacherId),
            instituteId: req.instituteId,
          },
        });

        if (!teacher) {
          return res.status(404).json({
            success: false,
            message: "Teacher not found",
          });
        }
      }

      const updatedProgress = await prisma.teachingProgress.update({
        where: {
          id,
        },
        data: {
          teacherId:
            teacherId !== undefined
              ? teacherId
                ? String(teacherId)
                : null
              : undefined,
          status: status !== undefined ? status : undefined,
          startedAt:
            startedAt !== undefined
              ? startedAt
                ? new Date(startedAt)
                : null
              : undefined,
          completedAt:
            completedAt !== undefined
              ? completedAt
                ? new Date(completedAt)
                : null
              : undefined,
          notes: notes !== undefined ? (notes ? String(notes) : null) : undefined,
        },
        include: {
          batch: true,
          topic: {
            include: {
              subject: true,
            },
          },
          teacher: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Teaching progress updated successfully",
        teachingProgress: updatedProgress,
      });
    } catch (error) {
      console.error("Update teaching progress error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update teaching progress",
      });
    }
  }
);

/**
 * DELETE teaching progress
 * DELETE /api/teaching-progress/:id
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

      const existingProgress = await prisma.teachingProgress.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
      });

      if (!existingProgress) {
        return res.status(404).json({
          success: false,
          message: "Teaching progress not found",
        });
      }

      await prisma.teachingProgress.delete({
        where: {
          id,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Teaching progress deleted successfully",
      });
    } catch (error) {
      console.error("Delete teaching progress error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete teaching progress",
      });
    }
  }
);

export default router;
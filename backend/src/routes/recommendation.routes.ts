import { Router, Response } from "express";
import prisma from "../lib/prisma";
import authMiddleware, {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

const VALID_CATEGORIES = [
  "SYLLABUS",
  "EXAM",
  "ATTENDANCE",
  "PERFORMANCE",
  "QUESTION_INTELLIGENCE",
  "BATCH",
  "GENERAL",
] as const;

const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

/**
 * Create a recommendation
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

      const { title, description, category, priority, isRead } = req.body;

      if (!title || !description || !category || !priority) {
        return res.status(400).json({
          success: false,
          message:
            "title, description, category and priority are required",
        });
      }

      if (!VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid recommendation category",
        });
      }

      if (!VALID_PRIORITIES.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: "Invalid recommendation priority",
        });
      }

      const recommendation = await prisma.recommendation.create({
        data: {
          instituteId: req.instituteId,
          title: String(title).trim(),
          description: String(description).trim(),
          category,
          priority,
          isRead: typeof isRead === "boolean" ? isRead : false,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Recommendation created successfully",
        data: recommendation,
      });
    } catch (error) {
      console.error("Create recommendation error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create recommendation",
      });
    }
  }
);

/**
 * Get all recommendations
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

      const recommendations = await prisma.recommendation.findMany({
        where: {
          instituteId: req.instituteId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.status(200).json({
        success: true,
        count: recommendations.length,
        data: recommendations,
      });
    } catch (error) {
      console.error("Get recommendations error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch recommendations",
      });
    }
  }
);

/**
 * Get recommendation by ID
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

      const recommendation = await prisma.recommendation.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
      });

      if (!recommendation) {
        return res.status(404).json({
          success: false,
          message: "Recommendation not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: recommendation,
      });
    } catch (error) {
      console.error("Get recommendation error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch recommendation",
      });
    }
  }
);

/**
 * Update recommendation
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

      const existingRecommendation =
        await prisma.recommendation.findFirst({
          where: {
            id,
            instituteId: req.instituteId,
          },
        });

      if (!existingRecommendation) {
        return res.status(404).json({
          success: false,
          message: "Recommendation not found",
        });
      }

      const { title, description, category, priority, isRead } = req.body;

      if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid recommendation category",
        });
      }

      if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: "Invalid recommendation priority",
        });
      }

      const recommendation = await prisma.recommendation.update({
        where: {
          id,
        },
        data: {
          ...(title !== undefined && {
            title: String(title).trim(),
          }),
          ...(description !== undefined && {
            description: String(description).trim(),
          }),
          ...(category !== undefined && {
            category,
          }),
          ...(priority !== undefined && {
            priority,
          }),
          ...(isRead !== undefined && {
            isRead: Boolean(isRead),
          }),
        },
      });

      return res.status(200).json({
        success: true,
        message: "Recommendation updated successfully",
        data: recommendation,
      });
    } catch (error) {
      console.error("Update recommendation error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update recommendation",
      });
    }
  }
);

/**
 * Delete recommendation
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

      const existingRecommendation =
        await prisma.recommendation.findFirst({
          where: {
            id,
            instituteId: req.instituteId,
          },
        });

      if (!existingRecommendation) {
        return res.status(404).json({
          success: false,
          message: "Recommendation not found",
        });
      }

      await prisma.recommendation.delete({
        where: {
          id,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Recommendation deleted successfully",
      });
    } catch (error) {
      console.error("Delete recommendation error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete recommendation",
      });
    }
  }
);

export default router;
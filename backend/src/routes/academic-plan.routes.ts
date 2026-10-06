import { Router, Response } from "express";
import prisma from "../lib/prisma";
import authMiddleware, {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

const validPlanStatuses = [
  "DRAFT",
  "ACTIVE",
  "COMPLETED",
  "ARCHIVED",
] as const;

const validPlanItemTypes = [
  "TEACHING",
  "REVISION",
  "TEST",
  "MOCK",
  "PRACTICE",
] as const;

/**
 * CREATE ACADEMIC PLAN
 * POST /api/academic-plans
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
        title,
        description,
        generatedBy,
        status,
      } = req.body;

      if (!title || !String(title).trim()) {
        return res.status(400).json({
          success: false,
          message: "Academic plan title is required",
        });
      }

      if (
        status !== undefined &&
        !validPlanStatuses.includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid plan status. Use DRAFT, ACTIVE, COMPLETED or ARCHIVED",
        });
      }

      if (batchId) {
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
      }

      const academicPlan = await prisma.academicPlan.create({
        data: {
          instituteId: req.instituteId,
          batchId: batchId || null,
          title: String(title).trim(),
          description: description || null,
          generatedBy: generatedBy || null,
          status: status || "DRAFT",
        },
        include: {
          batch: true,
          items: {
            orderBy: {
              date: "asc",
            },
          },
        },
      });

      return res.status(201).json({
        success: true,
        message: "Academic plan created successfully",
        data: academicPlan,
      });
    } catch (error) {
      console.error("Create academic plan error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create academic plan",
      });
    }
  }
);

/**
 * GET ALL ACADEMIC PLANS
 * GET /api/academic-plans
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

      const academicPlans = await prisma.academicPlan.findMany({
        where: {
          instituteId: req.instituteId,
        },
        include: {
          batch: true,
          items: {
            orderBy: {
              date: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.status(200).json({
        success: true,
        count: academicPlans.length,
        data: academicPlans,
      });
    } catch (error) {
      console.error("Get academic plans error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch academic plans",
      });
    }
  }
);

/**
 * GET ACADEMIC PLAN BY ID
 * GET /api/academic-plans/:id
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

      const academicPlan = await prisma.academicPlan.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
        include: {
          batch: true,
          items: {
            orderBy: {
              date: "asc",
            },
          },
        },
      });

      if (!academicPlan) {
        return res.status(404).json({
          success: false,
          message: "Academic plan not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: academicPlan,
      });
    } catch (error) {
      console.error("Get academic plan by ID error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch academic plan",
      });
    }
  }
);

/**
 * UPDATE ACADEMIC PLAN
 * PUT /api/academic-plans/:id
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

      const existingPlan = await prisma.academicPlan.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
      });

      if (!existingPlan) {
        return res.status(404).json({
          success: false,
          message: "Academic plan not found",
        });
      }

      const {
        batchId,
        title,
        description,
        generatedBy,
        status,
      } = req.body;

      if (
        title !== undefined &&
        !String(title).trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Academic plan title cannot be empty",
        });
      }

      if (
        status !== undefined &&
        !validPlanStatuses.includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid plan status. Use DRAFT, ACTIVE, COMPLETED or ARCHIVED",
        });
      }

      if (batchId !== undefined && batchId !== null && batchId !== "") {
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
      }

      const academicPlan = await prisma.academicPlan.update({
        where: {
          id,
        },
        data: {
          ...(batchId !== undefined && {
            batchId: batchId || null,
          }),
          ...(title !== undefined && {
            title: String(title).trim(),
          }),
          ...(description !== undefined && {
            description: description || null,
          }),
          ...(generatedBy !== undefined && {
            generatedBy: generatedBy || null,
          }),
          ...(status !== undefined && {
            status,
          }),
        },
        include: {
          batch: true,
          items: {
            orderBy: {
              date: "asc",
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        message: "Academic plan updated successfully",
        data: academicPlan,
      });
    } catch (error) {
      console.error("Update academic plan error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update academic plan",
      });
    }
  }
);

/**
 * DELETE ACADEMIC PLAN
 * DELETE /api/academic-plans/:id
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

      const existingPlan = await prisma.academicPlan.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
      });

      if (!existingPlan) {
        return res.status(404).json({
          success: false,
          message: "Academic plan not found",
        });
      }

      await prisma.academicPlan.delete({
        where: {
          id,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Academic plan deleted successfully",
      });
    } catch (error) {
      console.error("Delete academic plan error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete academic plan",
      });
    }
  }
);

/**
 * CREATE ACADEMIC PLAN ITEM
 * POST /api/academic-plans/:planId/items
 */
router.post(
  "/:planId/items",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const planId = String(req.params.planId);

      const academicPlan = await prisma.academicPlan.findFirst({
        where: {
          id: planId,
          instituteId: req.instituteId,
        },
      });

      if (!academicPlan) {
        return res.status(404).json({
          success: false,
          message: "Academic plan not found",
        });
      }

      const {
        date,
        title,
        description,
        type,
        priority,
      } = req.body;

      if (!date) {
        return res.status(400).json({
          success: false,
          message: "Plan item date is required",
        });
      }

      const parsedDate = new Date(date);

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid plan item date",
        });
      }

      if (!title || !String(title).trim()) {
        return res.status(400).json({
          success: false,
          message: "Plan item title is required",
        });
      }

      if (!type || !validPlanItemTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid plan item type. Use TEACHING, REVISION, TEST, MOCK or PRACTICE",
        });
      }

      let parsedPriority: number | null = null;

      if (
        priority !== undefined &&
        priority !== null &&
        priority !== ""
      ) {
        parsedPriority = Number(priority);

        if (!Number.isInteger(parsedPriority)) {
          return res.status(400).json({
            success: false,
            message: "Priority must be an integer",
          });
        }
      }

      const item = await prisma.academicPlanItem.create({
        data: {
          planId,
          date: parsedDate,
          title: String(title).trim(),
          description: description || null,
          type,
          priority: parsedPriority,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Academic plan item created successfully",
        data: item,
      });
    } catch (error) {
      console.error("Create academic plan item error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create academic plan item",
      });
    }
  }
);

/**
 * GET PLAN ITEMS
 * GET /api/academic-plans/:planId/items
 */
router.get(
  "/:planId/items",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const planId = String(req.params.planId);

      const academicPlan = await prisma.academicPlan.findFirst({
        where: {
          id: planId,
          instituteId: req.instituteId,
        },
      });

      if (!academicPlan) {
        return res.status(404).json({
          success: false,
          message: "Academic plan not found",
        });
      }

      const items = await prisma.academicPlanItem.findMany({
        where: {
          planId,
        },
        orderBy: {
          date: "asc",
        },
      });

      return res.status(200).json({
        success: true,
        count: items.length,
        data: items,
      });
    } catch (error) {
      console.error("Get academic plan items error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch academic plan items",
      });
    }
  }
);

/**
 * UPDATE PLAN ITEM
 * PUT /api/academic-plans/:planId/items/:itemId
 */
router.put(
  "/:planId/items/:itemId",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const planId = String(req.params.planId);
      const itemId = String(req.params.itemId);

      const academicPlan = await prisma.academicPlan.findFirst({
        where: {
          id: planId,
          instituteId: req.instituteId,
        },
      });

      if (!academicPlan) {
        return res.status(404).json({
          success: false,
          message: "Academic plan not found",
        });
      }

      const existingItem = await prisma.academicPlanItem.findFirst({
        where: {
          id: itemId,
          planId,
        },
      });

      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: "Academic plan item not found",
        });
      }

      const {
        date,
        title,
        description,
        type,
        priority,
      } = req.body;

      let parsedDate: Date | undefined;

      if (date !== undefined) {
        parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid plan item date",
          });
        }
      }

      if (
        title !== undefined &&
        !String(title).trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Plan item title cannot be empty",
        });
      }

      if (
        type !== undefined &&
        !validPlanItemTypes.includes(type)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid plan item type. Use TEACHING, REVISION, TEST, MOCK or PRACTICE",
        });
      }

      let parsedPriority: number | null | undefined = undefined;

      if (priority !== undefined) {
        if (priority === null || priority === "") {
          parsedPriority = null;
        } else {
          parsedPriority = Number(priority);

          if (!Number.isInteger(parsedPriority)) {
            return res.status(400).json({
              success: false,
              message: "Priority must be an integer",
            });
          }
        }
      }

      const item = await prisma.academicPlanItem.update({
        where: {
          id: itemId,
        },
        data: {
          ...(parsedDate !== undefined && {
            date: parsedDate,
          }),
          ...(title !== undefined && {
            title: String(title).trim(),
          }),
          ...(description !== undefined && {
            description: description || null,
          }),
          ...(type !== undefined && {
            type,
          }),
          ...(parsedPriority !== undefined && {
            priority: parsedPriority,
          }),
        },
      });

      return res.status(200).json({
        success: true,
        message: "Academic plan item updated successfully",
        data: item,
      });
    } catch (error) {
      console.error("Update academic plan item error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update academic plan item",
      });
    }
  }
);

/**
 * DELETE PLAN ITEM
 * DELETE /api/academic-plans/:planId/items/:itemId
 */
router.delete(
  "/:planId/items/:itemId",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const planId = String(req.params.planId);
      const itemId = String(req.params.itemId);

      const academicPlan = await prisma.academicPlan.findFirst({
        where: {
          id: planId,
          instituteId: req.instituteId,
        },
      });

      if (!academicPlan) {
        return res.status(404).json({
          success: false,
          message: "Academic plan not found",
        });
      }

      const existingItem = await prisma.academicPlanItem.findFirst({
        where: {
          id: itemId,
          planId,
        },
      });

      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: "Academic plan item not found",
        });
      }

      await prisma.academicPlanItem.delete({
        where: {
          id: itemId,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Academic plan item deleted successfully",
      });
    } catch (error) {
      console.error("Delete academic plan item error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete academic plan item",
      });
    }
  }
);

export default router;
import { Router, Response } from "express";
import prisma from "../lib/prisma";
import authMiddleware, {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

/* =========================
   CREATE BATCH
========================= */

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
        name,
        description,
        startDate,
        endDate,
      } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Batch name is required",
        });
      }

      const existingBatch = await prisma.batch.findFirst({
        where: {
          instituteId: req.instituteId,
          name,
        },
      });

      if (existingBatch) {
        return res.status(409).json({
          success: false,
          message: "A batch with this name already exists",
        });
      }

      const batch = await prisma.batch.create({
        data: {
          instituteId: req.instituteId,
          name,
          description: description || null,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Batch created successfully",
        batch,
      });
    } catch (error) {
      console.error("Creating batch failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to create batch",
      });
    }
  }
);

/* =========================
   GET ALL BATCHES
========================= */

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

      const batches = await prisma.batch.findMany({
        where: {
          instituteId: req.instituteId,
        },
        include: {
          students: {
            include: {
              student: true,
            },
          },
          teachers: {
            include: {
              teacher: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      return res.status(200).json({
        success: true,
        count: batches.length,
        batches,
      });
    } catch (error) {
      console.error("Fetching batches failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to fetch batches",
      });
    }
  }
);

/* =========================
   GET BATCH BY ID
========================= */

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

      const id = req.params.id;

      if (!id || Array.isArray(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch ID",
        });
      }

      const batch = await prisma.batch.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
        include: {
          students: {
            include: {
              student: {
                include: {
                  school: true,
                  standard: true,
                },
              },
            },
          },
          teachers: {
            include: {
              teacher: true,
            },
          },
        },
      });

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: "Batch not found",
        });
      }

      return res.status(200).json({
        success: true,
        batch,
      });
    } catch (error) {
      console.error("Fetching batch failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to fetch batch",
      });
    }
  }
);

/* =========================
   UPDATE BATCH
========================= */

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

      const id = req.params.id;

      if (!id || Array.isArray(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch ID",
        });
      }

      const {
        name,
        description,
        startDate,
        endDate,
      } = req.body;

      const existingBatch = await prisma.batch.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
      });

      if (!existingBatch) {
        return res.status(404).json({
          success: false,
          message: "Batch not found",
        });
      }

      if (name !== undefined && name !== existingBatch.name) {
        const duplicateBatch = await prisma.batch.findFirst({
          where: {
            instituteId: req.instituteId,
            name,
            NOT: {
              id,
            },
          },
        });

        if (duplicateBatch) {
          return res.status(409).json({
            success: false,
            message: "A batch with this name already exists",
          });
        }
      }

      const batch = await prisma.batch.update({
        where: {
          id,
        },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(startDate !== undefined && {
            startDate: startDate ? new Date(startDate) : null,
          }),
          ...(endDate !== undefined && {
            endDate: endDate ? new Date(endDate) : null,
          }),
        },
      });

      return res.status(200).json({
        success: true,
        message: "Batch updated successfully",
        batch,
      });
    } catch (error) {
      console.error("Updating batch failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to update batch",
      });
    }
  }
);

/* =========================
   DELETE BATCH
========================= */

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

      const id = req.params.id;

      if (!id || Array.isArray(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch ID",
        });
      }

      const existingBatch = await prisma.batch.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
      });

      if (!existingBatch) {
        return res.status(404).json({
          success: false,
          message: "Batch not found",
        });
      }

      await prisma.batch.delete({
        where: {
          id,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Batch deleted successfully",
      });
    } catch (error) {
      console.error("Deleting batch failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to delete batch",
      });
    }
  }
);

export default router;
import { Router, Response } from "express";
import prisma from "../lib/prisma";
import authMiddleware, {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

/* =========================
   CREATE STANDARD
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

      const { schoolId, name } = req.body;

      if (!schoolId || !name) {
        return res.status(400).json({
          success: false,
          message: "School ID and standard name are required",
        });
      }

      /* Make sure the school belongs to this institute */
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

      /* Prevent duplicate standard inside the same school */
      const existingStandard = await prisma.standard.findFirst({
        where: {
          schoolId,
          name,
        },
      });

      if (existingStandard) {
        return res.status(409).json({
          success: false,
          message: "This standard already exists for the school",
        });
      }

      const standard = await prisma.standard.create({
        data: {
          schoolId,
          name,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Standard created successfully",
        standard,
      });
    } catch (error) {
      console.error("Creating standard failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to create standard",
      });
    }
  }
);

/* =========================
   GET ALL STANDARDS
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

      const standards = await prisma.standard.findMany({
        where: {
          school: {
            instituteId: req.instituteId,
          },
        },
        include: {
          school: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      return res.status(200).json({
        success: true,
        count: standards.length,
        standards,
      });
    } catch (error) {
      console.error("Fetching standards failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to fetch standards",
      });
    }
  }
);

/* =========================
   GET STANDARD BY ID
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
          message: "Invalid standard ID",
        });
      }

      const standard = await prisma.standard.findFirst({
        where: {
          id,
          school: {
            instituteId: req.instituteId,
          },
        },
        include: {
          school: true,
        },
      });

      if (!standard) {
        return res.status(404).json({
          success: false,
          message: "Standard not found",
        });
      }

      return res.status(200).json({
        success: true,
        standard,
      });
    } catch (error) {
      console.error("Fetching standard failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to fetch standard",
      });
    }
  }
);

/* =========================
   UPDATE STANDARD
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
          message: "Invalid standard ID",
        });
      }

      const { name } = req.body;

      const existingStandard = await prisma.standard.findFirst({
        where: {
          id,
          school: {
            instituteId: req.instituteId,
          },
        },
      });

      if (!existingStandard) {
        return res.status(404).json({
          success: false,
          message: "Standard not found",
        });
      }

      if (name !== undefined) {
        const duplicateStandard = await prisma.standard.findFirst({
          where: {
            schoolId: existingStandard.schoolId,
            name,
            NOT: {
              id,
            },
          },
        });

        if (duplicateStandard) {
          return res.status(409).json({
            success: false,
            message: "This standard already exists for the school",
          });
        }
      }

      const standard = await prisma.standard.update({
        where: {
          id,
        },
        data: {
          ...(name !== undefined && { name }),
        },
      });

      return res.status(200).json({
        success: true,
        message: "Standard updated successfully",
        standard,
      });
    } catch (error) {
      console.error("Updating standard failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to update standard",
      });
    }
  }
);

/* =========================
   DELETE STANDARD
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
          message: "Invalid standard ID",
        });
      }

      const existingStandard = await prisma.standard.findFirst({
        where: {
          id,
          school: {
            instituteId: req.instituteId,
          },
        },
      });

      if (!existingStandard) {
        return res.status(404).json({
          success: false,
          message: "Standard not found",
        });
      }

      await prisma.standard.delete({
        where: {
          id,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Standard deleted successfully",
      });
    } catch (error) {
      console.error("Deleting standard failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to delete standard",
      });
    }
  }
);

export default router;
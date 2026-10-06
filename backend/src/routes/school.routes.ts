import { Router, Response } from "express";
import prisma from "../lib/prisma";
import authMiddleware, {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

/* =========================
   CREATE SCHOOL
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
        address,
        city,
        state,
      } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "School name is required",
        });
      }

      const existingSchool = await prisma.school.findFirst({
        where: {
          instituteId: req.instituteId,
          name,
        },
      });

      if (existingSchool) {
        return res.status(409).json({
          success: false,
          message: "A school with this name already exists",
        });
      }

      const school = await prisma.school.create({
        data: {
          instituteId: req.instituteId,
          name,
          address: address || null,
          city: city || null,
          state: state || null,
        },
      });

      return res.status(201).json({
        success: true,
        message: "School created successfully",
        school,
      });
    } catch (error) {
      console.error("Creating school failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to create school",
      });
    }
  }
);

/* =========================
   GET ALL SCHOOLS
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

      const schools = await prisma.school.findMany({
        where: {
          instituteId: req.instituteId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.status(200).json({
        success: true,
        count: schools.length,
        schools,
      });
    } catch (error) {
      console.error("Fetching schools failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to fetch schools",
      });
    }
  }
);

/* =========================
   GET SCHOOL BY ID
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
    message: "Invalid school ID",
  });
}

      const school = await prisma.school.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
      });

      if (!school) {
        return res.status(404).json({
          success: false,
          message: "School not found",
        });
      }

      return res.status(200).json({
        success: true,
        school,
      });
    } catch (error) {
      console.error("Fetching school failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to fetch school",
      });
    }
  }
);

/* =========================
   UPDATE SCHOOL
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
          message: "Invalid school ID",
        });
      }

      const {
        name,
        address,
        city,
        state,
      } = req.body;

      const existingSchool = await prisma.school.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
      });

      if (!existingSchool) {
        return res.status(404).json({
          success: false,
          message: "School not found",
        });
      }

      if (name) {
        const duplicateSchool = await prisma.school.findFirst({
          where: {
            instituteId: req.instituteId,
            name,
            NOT: {
              id,
            },
          },
        });

        if (duplicateSchool) {
          return res.status(409).json({
            success: false,
            message: "A school with this name already exists",
          });
        }
      }

      const school = await prisma.school.update({
        where: {
          id,
        },
        data: {
          ...(name !== undefined && { name }),
          ...(address !== undefined && { address }),
          ...(city !== undefined && { city }),
          ...(state !== undefined && { state }),
        },
      });

      return res.status(200).json({
        success: true,
        message: "School updated successfully",
        school,
      });
    } catch (error) {
      console.error("Updating school failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to update school",
      });
    }
  }
);

/* =========================
   DELETE SCHOOL
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
          message: "Invalid school ID",
        });
      }

      const existingSchool = await prisma.school.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
      });

      if (!existingSchool) {
        return res.status(404).json({
          success: false,
          message: "School not found",
        });
      }

      await prisma.school.delete({
        where: {
          id,
        },
      });

      return res.status(200).json({
        success: true,
        message: "School deleted successfully",
      });
    } catch (error) {
      console.error("Deleting school failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to delete school",
      });
    }
  }
);

export default router;
import { Router, Response } from "express";
import prisma from "../lib/prisma";
import authMiddleware, {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

/* =========================
   CREATE TEACHER
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
        email,
        phone,
        specialization,
      } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Teacher name is required",
        });
      }

      const teacher = await prisma.teacher.create({
        data: {
          instituteId: req.instituteId,
          name,
          email: email || null,
          phone: phone || null,
          specialization: specialization || null,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Teacher created successfully",
        teacher,
      });
    } catch (error) {
      console.error("Creating teacher failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to create teacher",
      });
    }
  }
);

/* =========================
   GET ALL TEACHERS
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

      const teachers = await prisma.teacher.findMany({
        where: {
          instituteId: req.instituteId,
        },
        include: {
          batches: {
            include: {
              batch: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.status(200).json({
        success: true,
        count: teachers.length,
        teachers,
      });
    } catch (error) {
      console.error("Fetching teachers failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to fetch teachers",
      });
    }
  }
);

/* =========================
   GET TEACHER BY ID
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
          message: "Invalid teacher ID",
        });
      }

      const teacher = await prisma.teacher.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
        include: {
          batches: {
            include: {
              batch: true,
            },
          },
        },
      });

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found",
        });
      }

      return res.status(200).json({
        success: true,
        teacher,
      });
    } catch (error) {
      console.error("Fetching teacher failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to fetch teacher",
      });
    }
  }
);

/* =========================
   UPDATE TEACHER
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
          message: "Invalid teacher ID",
        });
      }

      const {
        name,
        email,
        phone,
        specialization,
      } = req.body;

      const existingTeacher = await prisma.teacher.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
      });

      if (!existingTeacher) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found",
        });
      }

      const teacher = await prisma.teacher.update({
        where: {
          id,
        },
        data: {
          ...(name !== undefined && { name }),
          ...(email !== undefined && { email }),
          ...(phone !== undefined && { phone }),
          ...(specialization !== undefined && { specialization }),
        },
      });

      return res.status(200).json({
        success: true,
        message: "Teacher updated successfully",
        teacher,
      });
    } catch (error) {
      console.error("Updating teacher failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to update teacher",
      });
    }
  }
);

/* =========================
   DELETE TEACHER
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
          message: "Invalid teacher ID",
        });
      }

      const existingTeacher = await prisma.teacher.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
      });

      if (!existingTeacher) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found",
        });
      }

      await prisma.teacher.delete({
        where: {
          id,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Teacher deleted successfully",
      });
    } catch (error) {
      console.error("Deleting teacher failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to delete teacher",
      });
    }
  }
);

export default router;
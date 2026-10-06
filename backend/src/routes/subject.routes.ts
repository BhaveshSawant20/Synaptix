import { Router, Response } from "express";
import prisma from "../lib/prisma";
import authMiddleware, {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

/* =========================
   CREATE SUBJECT
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

      const instituteId = req.instituteId;
      const { name, code } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Subject name is required",
        });
      }

      const existingSubject = await prisma.subject.findFirst({
        where: {
          instituteId,
          name: name.trim(),
        },
      });

      if (existingSubject) {
        return res.status(409).json({
          success: false,
          message: "Subject with this name already exists",
        });
      }

      const subject = await prisma.subject.create({
        data: {
          instituteId,
          name: name.trim(),
          code: code?.trim() || null,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Subject created successfully",
        subject,
      });
    } catch (error) {
      console.error("Create subject error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create subject",
      });
    }
  }
);

/* =========================
   GET ALL SUBJECTS
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

      const subjects = await prisma.subject.findMany({
        where: {
          instituteId: req.instituteId,
        },
        orderBy: {
          name: "asc",
        },
      });

      return res.json({
        success: true,
        count: subjects.length,
        subjects,
      });
    } catch (error) {
      console.error("Get subjects error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to get subjects",
      });
    }
  }
);

/* =========================
   GET SUBJECT BY ID
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

      const subjectId = String(req.params.id);

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

      return res.json({
        success: true,
        subject,
      });
    } catch (error) {
      console.error("Get subject error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to get subject",
      });
    }
  }
);

/* =========================
   UPDATE SUBJECT
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

      const subjectId = String(req.params.id);
      const instituteId = req.instituteId;
      const { name, code } = req.body;

      const existingSubject = await prisma.subject.findFirst({
        where: {
          id: subjectId,
          instituteId,
        },
      });

      if (!existingSubject) {
        return res.status(404).json({
          success: false,
          message: "Subject not found",
        });
      }

      if (name !== undefined && !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Subject name cannot be empty",
        });
      }

      const newName =
        name !== undefined ? name.trim() : existingSubject.name;

      if (newName !== existingSubject.name) {
        const duplicateSubject = await prisma.subject.findFirst({
          where: {
            instituteId,
            name: newName,
            NOT: {
              id: subjectId,
            },
          },
        });

        if (duplicateSubject) {
          return res.status(409).json({
            success: false,
            message: "Subject with this name already exists",
          });
        }
      }

      const subject = await prisma.subject.update({
        where: {
          id: subjectId,
        },
        data: {
          name: newName,
          code: code !== undefined ? code?.trim() || null : existingSubject.code,
        },
      });

      return res.json({
        success: true,
        message: "Subject updated successfully",
        subject,
      });
    } catch (error) {
      console.error("Update subject error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update subject",
      });
    }
  }
);

/* =========================
   DELETE SUBJECT
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

      const subjectId = String(req.params.id);

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

      await prisma.subject.delete({
        where: {
          id: subjectId,
        },
      });

      return res.json({
        success: true,
        message: "Subject deleted successfully",
      });
    } catch (error) {
      console.error("Delete subject error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete subject",
      });
    }
  }
);

export default router;
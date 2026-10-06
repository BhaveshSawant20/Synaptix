import { Router, Response } from "express";
import prisma from "../lib/prisma";
import authMiddleware, {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

/* =========================
   ADD SUBJECT TO STANDARD
========================= */

router.post(
  "/:standardId/subjects",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const standardId = String(req.params.standardId);
      const { subjectId } = req.body;
      const instituteId = req.instituteId;

      if (!subjectId) {
        return res.status(400).json({
          success: false,
          message: "subjectId is required",
        });
      }

      const standard = await prisma.standard.findFirst({
        where: {
          id: standardId,
          school: {
            instituteId,
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

      const subject = await prisma.subject.findFirst({
        where: {
          id: subjectId,
          instituteId,
        },
      });

      if (!subject) {
        return res.status(404).json({
          success: false,
          message: "Subject not found",
        });
      }

      const existingMapping = await prisma.schoolSubject.findFirst({
        where: {
          standardId,
          subjectId,
        },
      });

      if (existingMapping) {
        return res.status(409).json({
          success: false,
          message: "Subject is already assigned to this standard",
        });
      }

      const mapping = await prisma.schoolSubject.create({
        data: {
          standardId,
          subjectId,
        },
        include: {
          subject: true,
          standard: {
            include: {
              school: true,
            },
          },
        },
      });

      return res.status(201).json({
        success: true,
        message: "Subject added to standard successfully",
        mapping,
      });
    } catch (error) {
      console.error("Add subject to standard error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to add subject to standard",
      });
    }
  }
);

/* =========================
   GET SUBJECTS OF STANDARD
========================= */

router.get(
  "/:standardId/subjects",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const standardId = String(req.params.standardId);
      const instituteId = req.instituteId;

      const standard = await prisma.standard.findFirst({
        where: {
          id: standardId,
          school: {
            instituteId,
          },
        },
      });

      if (!standard) {
        return res.status(404).json({
          success: false,
          message: "Standard not found",
        });
      }

      const mappings = await prisma.schoolSubject.findMany({
        where: {
          standardId,
        },
        include: {
          subject: true,
        },
        orderBy: {
          subject: {
            name: "asc",
          },
        },
      });

      return res.json({
        success: true,
        count: mappings.length,
        subjects: mappings,
      });
    } catch (error) {
      console.error("Get standard subjects error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to get standard subjects",
      });
    }
  }
);

/* =========================
   REMOVE SUBJECT FROM STANDARD
========================= */

router.delete(
  "/:standardId/subjects/:subjectId",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const standardId = String(req.params.standardId);
      const subjectId = String(req.params.subjectId);
      const instituteId = req.instituteId;

      const standard = await prisma.standard.findFirst({
        where: {
          id: standardId,
          school: {
            instituteId,
          },
        },
      });

      if (!standard) {
        return res.status(404).json({
          success: false,
          message: "Standard not found",
        });
      }

      const subject = await prisma.subject.findFirst({
        where: {
          id: subjectId,
          instituteId,
        },
      });

      if (!subject) {
        return res.status(404).json({
          success: false,
          message: "Subject not found",
        });
      }

      const mapping = await prisma.schoolSubject.findFirst({
        where: {
          standardId,
          subjectId,
        },
      });

      if (!mapping) {
        return res.status(404).json({
          success: false,
          message: "Subject is not assigned to this standard",
        });
      }

      await prisma.schoolSubject.delete({
        where: {
          id: mapping.id,
        },
      });

      return res.json({
        success: true,
        message: "Subject removed from standard successfully",
      });
    } catch (error) {
      console.error("Remove subject from standard error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to remove subject from standard",
      });
    }
  }
);

export default router;
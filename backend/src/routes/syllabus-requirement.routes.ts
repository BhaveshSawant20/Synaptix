import { Router, Response } from "express";
import prisma from "../lib/prisma";
import authMiddleware, {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

/* =========================
   CREATE SYLLABUS REQUIREMENT
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
        schoolId,
        standardId,
        subjectId,
        topicId,
        required,
      } = req.body;

      const instituteId = req.instituteId;

      if (!schoolId || !standardId || !subjectId || !topicId) {
        return res.status(400).json({
          success: false,
          message:
            "schoolId, standardId, subjectId and topicId are required",
        });
      }

      const school = await prisma.school.findFirst({
        where: {
          id: schoolId,
          instituteId,
        },
      });

      if (!school) {
        return res.status(404).json({
          success: false,
          message: "School not found",
        });
      }

      const standard = await prisma.standard.findFirst({
        where: {
          id: standardId,
          schoolId,
        },
      });

      if (!standard) {
        return res.status(404).json({
          success: false,
          message: "Standard not found for this school",
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

      const standardSubject = await prisma.schoolSubject.findFirst({
        where: {
          standardId,
          subjectId,
        },
      });

      if (!standardSubject) {
        return res.status(400).json({
          success: false,
          message: "Subject is not assigned to this standard",
        });
      }

      const topic = await prisma.topic.findFirst({
        where: {
          id: topicId,
          instituteId,
          subjectId,
        },
      });

      if (!topic) {
        return res.status(404).json({
          success: false,
          message: "Topic not found for this subject",
        });
      }

      const existingRequirement =
        await prisma.syllabusRequirement.findFirst({
          where: {
            schoolId,
            standardId,
            subjectId,
            topicId,
          },
        });

      if (existingRequirement) {
        return res.status(409).json({
          success: false,
          message: "Syllabus requirement already exists",
        });
      }

      const syllabusRequirement =
        await prisma.syllabusRequirement.create({
          data: {
            schoolId,
            standardId,
            subjectId,
            topicId,
            required:
              required !== undefined ? Boolean(required) : true,
          },
          include: {
            school: true,
            standard: true,
            subject: true,
            topic: true,
          },
        });

      return res.status(201).json({
        success: true,
        message: "Syllabus requirement created successfully",
        syllabusRequirement,
      });
    } catch (error) {
      console.error("Create syllabus requirement error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create syllabus requirement",
      });
    }
  }
);

/* =========================
   GET ALL SYLLABUS REQUIREMENTS
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

      const requirements =
        await prisma.syllabusRequirement.findMany({
          where: {
            school: {
              instituteId: req.instituteId,
            },
            subject: {
              instituteId: req.instituteId,
            },
            topic: {
              instituteId: req.instituteId,
            },
          },
          include: {
            school: true,
            standard: true,
            subject: true,
            topic: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      return res.json({
        success: true,
        count: requirements.length,
        requirements,
      });
    } catch (error) {
      console.error("Get syllabus requirements error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to get syllabus requirements",
      });
    }
  }
);

/* =========================
   GET REQUIREMENTS BY SCHOOL
========================= */

router.get(
  "/school/:schoolId",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const schoolId = String(req.params.schoolId);

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

      const requirements =
        await prisma.syllabusRequirement.findMany({
          where: {
            schoolId,
          },
          include: {
            school: true,
            standard: true,
            subject: true,
            topic: true,
          },
          orderBy: [
            {
              standard: {
                name: "asc",
              },
            },
            {
              subject: {
                name: "asc",
              },
            },
            {
              topic: {
                orderIndex: "asc",
              },
            },
            {
              topic: {
                name: "asc",
              },
            },
          ],
        });

      return res.json({
        success: true,
        count: requirements.length,
        school,
        requirements,
      });
    } catch (error) {
      console.error(
        "Get school syllabus requirements error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to get school syllabus requirements",
      });
    }
  }
);

/* =========================
   GET REQUIREMENT BY ID
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

      const id = String(req.params.id);

      const requirement =
        await prisma.syllabusRequirement.findFirst({
          where: {
            id,
            school: {
              instituteId: req.instituteId,
            },
          },
          include: {
            school: true,
            standard: true,
            subject: true,
            topic: true,
          },
        });

      if (!requirement) {
        return res.status(404).json({
          success: false,
          message: "Syllabus requirement not found",
        });
      }

      return res.json({
        success: true,
        requirement,
      });
    } catch (error) {
      console.error("Get syllabus requirement error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to get syllabus requirement",
      });
    }
  }
);

/* =========================
   UPDATE REQUIREMENT
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

      const id = String(req.params.id);

      const {
        schoolId,
        standardId,
        subjectId,
        topicId,
        required,
      } = req.body;

      const existingRequirement =
        await prisma.syllabusRequirement.findFirst({
          where: {
            id,
            school: {
              instituteId: req.instituteId,
            },
          },
        });

      if (!existingRequirement) {
        return res.status(404).json({
          success: false,
          message: "Syllabus requirement not found",
        });
      }

      if (
        !schoolId ||
        !standardId ||
        !subjectId ||
        !topicId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "schoolId, standardId, subjectId and topicId are required",
        });
      }

      /* Validate school */

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

      /* Validate standard belongs to school */

      const standard = await prisma.standard.findFirst({
        where: {
          id: standardId,
          schoolId,
        },
      });

      if (!standard) {
        return res.status(404).json({
          success: false,
          message: "Standard not found for this school",
        });
      }

      /* Validate subject belongs to institute */

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

      /* Validate subject is assigned to standard */

      const standardSubject =
        await prisma.schoolSubject.findFirst({
          where: {
            standardId,
            subjectId,
          },
        });

      if (!standardSubject) {
        return res.status(400).json({
          success: false,
          message: "Subject is not assigned to this standard",
        });
      }

      /* Validate topic belongs to subject */

      const topic = await prisma.topic.findFirst({
        where: {
          id: topicId,
          instituteId: req.instituteId,
          subjectId,
        },
      });

      if (!topic) {
        return res.status(404).json({
          success: false,
          message: "Topic not found for this subject",
        });
      }

      /* Prevent duplicate requirement */

      const duplicateRequirement =
        await prisma.syllabusRequirement.findFirst({
          where: {
            schoolId,
            standardId,
            subjectId,
            topicId,
            NOT: {
              id,
            },
          },
        });

      if (duplicateRequirement) {
        return res.status(409).json({
          success: false,
          message:
            "Another syllabus requirement already exists for this school, standard, subject and topic",
        });
      }

      const requirement =
        await prisma.syllabusRequirement.update({
          where: {
            id,
          },
          data: {
            schoolId,
            standardId,
            subjectId,
            topicId,
            required:
              required !== undefined
                ? Boolean(required)
                : existingRequirement.required,
          },
          include: {
            school: true,
            standard: true,
            subject: true,
            topic: true,
          },
        });

      return res.json({
        success: true,
        message: "Syllabus requirement updated successfully",
        requirement,
      });
    } catch (error) {
      console.error("Update syllabus requirement error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update syllabus requirement",
      });
    }
  }
);

/* =========================
   DELETE REQUIREMENT
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

      const id = String(req.params.id);

      const requirement =
        await prisma.syllabusRequirement.findFirst({
          where: {
            id,
            school: {
              instituteId: req.instituteId,
            },
          },
        });

      if (!requirement) {
        return res.status(404).json({
          success: false,
          message: "Syllabus requirement not found",
        });
      }

      await prisma.syllabusRequirement.delete({
        where: {
          id,
        },
      });

      return res.json({
        success: true,
        message: "Syllabus requirement deleted successfully",
      });
    } catch (error) {
      console.error("Delete syllabus requirement error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete syllabus requirement",
      });
    }
  }
);

export default router;
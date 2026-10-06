import { Router, Response } from "express";
import prisma from "../lib/prisma";
import authMiddleware, {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

/**
 * CREATE IMPORTANT QUESTION
 * POST /api/important-questions
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
        schoolName,
        standardName,
        subjectName,
        questionText,
        source,
        importance,
      } = req.body;

      if (!questionText || !String(questionText).trim()) {
        return res.status(400).json({
          success: false,
          message: "Question text is required",
        });
      }

      let parsedImportance: number | null = null;

      if (importance !== undefined && importance !== null && importance !== "") {
        parsedImportance = Number(importance);

        if (!Number.isInteger(parsedImportance)) {
          return res.status(400).json({
            success: false,
            message: "Importance must be an integer",
          });
        }
      }

      const importantQuestion = await prisma.importantQuestion.create({
        data: {
          instituteId: req.instituteId,
          schoolName: schoolName || null,
          standardName: standardName || null,
          subjectName: subjectName || null,
          questionText: String(questionText).trim(),
          source: source || null,
          importance: parsedImportance,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Important question created successfully",
        data: importantQuestion,
      });
    } catch (error) {
      console.error("Create important question error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create important question",
      });
    }
  }
);

/**
 * GET ALL IMPORTANT QUESTIONS
 * GET /api/important-questions
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

      const importantQuestions = await prisma.importantQuestion.findMany({
        where: {
          instituteId: req.instituteId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.status(200).json({
        success: true,
        count: importantQuestions.length,
        data: importantQuestions,
      });
    } catch (error) {
      console.error("Get important questions error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch important questions",
      });
    }
  }
);

/**
 * GET IMPORTANT QUESTION BY ID
 * GET /api/important-questions/:id
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

      const importantQuestion =
        await prisma.importantQuestion.findFirst({
          where: {
            id,
            instituteId: req.instituteId,
          },
        });

      if (!importantQuestion) {
        return res.status(404).json({
          success: false,
          message: "Important question not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: importantQuestion,
      });
    } catch (error) {
      console.error("Get important question by ID error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch important question",
      });
    }
  }
);

/**
 * UPDATE IMPORTANT QUESTION
 * PUT /api/important-questions/:id
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

      const existingQuestion =
        await prisma.importantQuestion.findFirst({
          where: {
            id,
            instituteId: req.instituteId,
          },
        });

      if (!existingQuestion) {
        return res.status(404).json({
          success: false,
          message: "Important question not found",
        });
      }

      const {
        schoolName,
        standardName,
        subjectName,
        questionText,
        source,
        importance,
      } = req.body;

      if (
        questionText !== undefined &&
        !String(questionText).trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Question text cannot be empty",
        });
      }

      let parsedImportance: number | null | undefined = undefined;

      if (importance !== undefined) {
        if (importance === null || importance === "") {
          parsedImportance = null;
        } else {
          parsedImportance = Number(importance);

          if (!Number.isInteger(parsedImportance)) {
            return res.status(400).json({
              success: false,
              message: "Importance must be an integer",
            });
          }
        }
      }

      const importantQuestion =
        await prisma.importantQuestion.update({
          where: {
            id,
          },
          data: {
            ...(schoolName !== undefined && {
              schoolName: schoolName || null,
            }),
            ...(standardName !== undefined && {
              standardName: standardName || null,
            }),
            ...(subjectName !== undefined && {
              subjectName: subjectName || null,
            }),
            ...(questionText !== undefined && {
              questionText: String(questionText).trim(),
            }),
            ...(source !== undefined && {
              source: source || null,
            }),
            ...(parsedImportance !== undefined && {
              importance: parsedImportance,
            }),
          },
        });

      return res.status(200).json({
        success: true,
        message: "Important question updated successfully",
        data: importantQuestion,
      });
    } catch (error) {
      console.error("Update important question error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update important question",
      });
    }
  }
);

/**
 * DELETE IMPORTANT QUESTION
 * DELETE /api/important-questions/:id
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

      const existingQuestion =
        await prisma.importantQuestion.findFirst({
          where: {
            id,
            instituteId: req.instituteId,
          },
        });

      if (!existingQuestion) {
        return res.status(404).json({
          success: false,
          message: "Important question not found",
        });
      }

      await prisma.importantQuestion.delete({
        where: {
          id,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Important question deleted successfully",
      });
    } catch (error) {
      console.error("Delete important question error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete important question",
      });
    }
  }
);

export default router;
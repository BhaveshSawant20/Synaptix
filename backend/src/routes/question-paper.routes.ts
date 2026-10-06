import { Router, Response } from "express";
import prisma from "../lib/prisma";
import authMiddleware, {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

/**
 * CREATE QUESTION PAPER
 * POST /api/question-papers
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
        academicYear,
        title,
        fileUrl,
        extractedText,
      } = req.body;

      if (!title) {
        return res.status(400).json({
          success: false,
          message: "Question paper title is required",
        });
      }

      const questionPaper = await prisma.questionPaper.create({
        data: {
          instituteId: req.instituteId,
          schoolName: schoolName || null,
          standardName: standardName || null,
          subjectName: subjectName || null,
          academicYear: academicYear || null,
          title,
          fileUrl: fileUrl || null,
          extractedText: extractedText || null,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Question paper created successfully",
        data: questionPaper,
      });
    } catch (error) {
      console.error("Create question paper error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create question paper",
      });
    }
  }
);

/**
 * GET ALL QUESTION PAPERS
 * GET /api/question-papers
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

      const questionPapers = await prisma.questionPaper.findMany({
        where: {
          instituteId: req.instituteId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.status(200).json({
        success: true,
        count: questionPapers.length,
        data: questionPapers,
      });
    } catch (error) {
      console.error("Get question papers error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch question papers",
      });
    }
  }
);

/**
 * GET QUESTION PAPER BY ID
 * GET /api/question-papers/:id
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

      const questionPaper = await prisma.questionPaper.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
      });

      if (!questionPaper) {
        return res.status(404).json({
          success: false,
          message: "Question paper not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: questionPaper,
      });
    } catch (error) {
      console.error("Get question paper by ID error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch question paper",
      });
    }
  }
);

/**
 * UPDATE QUESTION PAPER
 * PUT /api/question-papers/:id
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

      const existingQuestionPaper =
        await prisma.questionPaper.findFirst({
          where: {
            id,
            instituteId: req.instituteId,
          },
        });

      if (!existingQuestionPaper) {
        return res.status(404).json({
          success: false,
          message: "Question paper not found",
        });
      }

      const {
        schoolName,
        standardName,
        subjectName,
        academicYear,
        title,
        fileUrl,
        extractedText,
      } = req.body;

      const questionPaper =
        await prisma.questionPaper.update({
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
            ...(academicYear !== undefined && {
              academicYear: academicYear || null,
            }),
            ...(title !== undefined && {
              title,
            }),
            ...(fileUrl !== undefined && {
              fileUrl: fileUrl || null,
            }),
            ...(extractedText !== undefined && {
              extractedText: extractedText || null,
            }),
          },
        });

      return res.status(200).json({
        success: true,
        message: "Question paper updated successfully",
        data: questionPaper,
      });
    } catch (error) {
      console.error("Update question paper error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update question paper",
      });
    }
  }
);

/**
 * DELETE QUESTION PAPER
 * DELETE /api/question-papers/:id
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

      const existingQuestionPaper =
        await prisma.questionPaper.findFirst({
          where: {
            id,
            instituteId: req.instituteId,
          },
        });

      if (!existingQuestionPaper) {
        return res.status(404).json({
          success: false,
          message: "Question paper not found",
        });
      }

      await prisma.questionPaper.delete({
        where: {
          id,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Question paper deleted successfully",
      });
    } catch (error) {
      console.error("Delete question paper error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete question paper",
      });
    }
  }
);

export default router;

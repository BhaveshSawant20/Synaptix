import { Router, Response } from "express";
import prisma from "../lib/prisma";
import authMiddleware, {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

/* =========================
   CREATE TOPIC
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

      const { subjectId, name, description, orderIndex } = req.body;
      const instituteId = req.instituteId;

      if (!subjectId || !name) {
        return res.status(400).json({
          success: false,
          message: "subjectId and name are required",
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

      const existingTopic = await prisma.topic.findFirst({
        where: {
          subjectId,
          name,
        },
      });

      if (existingTopic) {
        return res.status(409).json({
          success: false,
          message: "Topic already exists for this subject",
        });
      }

      const topic = await prisma.topic.create({
        data: {
          instituteId,
          subjectId,
          name,
          description: description || null,
          orderIndex:
            orderIndex !== undefined && orderIndex !== null
              ? Number(orderIndex)
              : null,
        },
        include: {
          subject: true,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Topic created successfully",
        topic,
      });
    } catch (error) {
      console.error("Create topic error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create topic",
      });
    }
  }
);

/* =========================
   GET ALL TOPICS
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

      const topics = await prisma.topic.findMany({
        where: {
          instituteId: req.instituteId,
        },
        include: {
          subject: true,
        },
        orderBy: [
          {
            subject: {
              name: "asc",
            },
          },
          {
            orderIndex: "asc",
          },
          {
            name: "asc",
          },
        ],
      });

      return res.json({
        success: true,
        count: topics.length,
        topics,
      });
    } catch (error) {
      console.error("Get topics error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to get topics",
      });
    }
  }
);

/* =========================
   GET TOPICS BY SUBJECT
========================= */

router.get(
  "/subject/:subjectId",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const subjectId = String(req.params.subjectId);
      const instituteId = req.instituteId;

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

      const topics = await prisma.topic.findMany({
        where: {
          subjectId,
          instituteId,
        },
        orderBy: [
          {
            orderIndex: "asc",
          },
          {
            name: "asc",
          },
        ],
      });

      return res.json({
        success: true,
        count: topics.length,
        subject,
        topics,
      });
    } catch (error) {
      console.error("Get subject topics error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to get subject topics",
      });
    }
  }
);

/* =========================
   GET TOPIC BY ID
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

      const topic = await prisma.topic.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
        include: {
          subject: true,
        },
      });

      if (!topic) {
        return res.status(404).json({
          success: false,
          message: "Topic not found",
        });
      }

      return res.json({
        success: true,
        topic,
      });
    } catch (error) {
      console.error("Get topic error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to get topic",
      });
    }
  }
);

/* =========================
   UPDATE TOPIC
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
      const { name, description, orderIndex } = req.body;

      const existingTopic = await prisma.topic.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
      });

      if (!existingTopic) {
        return res.status(404).json({
          success: false,
          message: "Topic not found",
        });
      }

      if (name && name !== existingTopic.name) {
        const duplicateTopic = await prisma.topic.findFirst({
          where: {
            subjectId: existingTopic.subjectId,
            name,
            NOT: {
              id,
            },
          },
        });

        if (duplicateTopic) {
          return res.status(409).json({
            success: false,
            message: "Topic already exists for this subject",
          });
        }
      }

      const topic = await prisma.topic.update({
        where: {
          id,
        },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && {
            description: description || null,
          }),
          ...(orderIndex !== undefined && {
            orderIndex:
              orderIndex === null ? null : Number(orderIndex),
          }),
        },
        include: {
          subject: true,
        },
      });

      return res.json({
        success: true,
        message: "Topic updated successfully",
        topic,
      });
    } catch (error) {
      console.error("Update topic error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update topic",
      });
    }
  }
);

/* =========================
   DELETE TOPIC
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

      const topic = await prisma.topic.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
      });

      if (!topic) {
        return res.status(404).json({
          success: false,
          message: "Topic not found",
        });
      }

      await prisma.topic.delete({
        where: {
          id,
        },
      });

      return res.json({
        success: true,
        message: "Topic deleted successfully",
      });
    } catch (error) {
      console.error("Delete topic error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete topic",
      });
    }
  }
);

export default router;
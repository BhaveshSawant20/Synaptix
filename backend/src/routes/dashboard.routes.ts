import { Router, Response } from "express";
import prisma from "../lib/prisma";
import authMiddleware, {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

/**
 * Dashboard Overview
 */
router.get(
  "/overview",
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

      const [
        studentCount,
        schoolCount,
        teacherCount,
        batchCount,
        subjectCount,
        upcomingExamCount,
        activePlanCount,
        unreadRecommendationCount,
      ] = await Promise.all([
        prisma.student.count({
          where: { instituteId },
        }),

        prisma.school.count({
          where: { instituteId },
        }),

        prisma.teacher.count({
          where: { instituteId },
        }),

        prisma.batch.count({
          where: { instituteId },
        }),

        prisma.subject.count({
          where: { instituteId },
        }),

        prisma.examSchedule.count({
          where: {
            exam: {
              instituteId,
            },
            examDate: {
              gte: new Date(),
            },
          },
        }),

        prisma.academicPlan.count({
          where: {
            instituteId,
            status: "ACTIVE",
          },
        }),

        prisma.recommendation.count({
          where: {
            instituteId,
            isRead: false,
          },
        }),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          students: studentCount,
          schools: schoolCount,
          teachers: teacherCount,
          batches: batchCount,
          subjects: subjectCount,
          upcomingExams: upcomingExamCount,
          activeAcademicPlans: activePlanCount,
          unreadRecommendations: unreadRecommendationCount,
        },
      });
    } catch (error) {
      console.error("Dashboard overview error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch dashboard overview",
      });
    }
  }
);

/**
 * Upcoming Exams
 */
router.get(
  "/upcoming-exams",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const limitParam = Number(req.query.limit ?? 5);

      const limit =
        Number.isInteger(limitParam) && limitParam > 0
          ? Math.min(limitParam, 20)
          : 5;

      const schedules = await prisma.examSchedule.findMany({
        where: {
          exam: {
            instituteId: req.instituteId,
          },
          examDate: {
            gte: new Date(),
          },
        },
        orderBy: {
          examDate: "asc",
        },
        take: limit,
        include: {
          exam: {
            include: {
              school: true,
            },
          },
          subject: true,
        },
      });

      return res.status(200).json({
        success: true,
        count: schedules.length,
        data: schedules,
      });
    } catch (error) {
      console.error("Upcoming exams error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch upcoming exams",
      });
    }
  }
);

/**
 * Attendance Summary
 */
router.get(
  "/attendance",
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

      const [total, present, absent, late, excused] =
        await Promise.all([
          prisma.attendance.count({
            where: { instituteId },
          }),

          prisma.attendance.count({
            where: {
              instituteId,
              status: "PRESENT",
            },
          }),

          prisma.attendance.count({
            where: {
              instituteId,
              status: "ABSENT",
            },
          }),

          prisma.attendance.count({
            where: {
              instituteId,
              status: "LATE",
            },
          }),

          prisma.attendance.count({
            where: {
              instituteId,
              status: "EXCUSED",
            },
          }),
        ]);

      const attendancePercentage =
        total > 0 ? Number(((present / total) * 100).toFixed(2)) : 0;

      return res.status(200).json({
        success: true,
        data: {
          total,
          present,
          absent,
          late,
          excused,
          attendancePercentage,
        },
      });
    } catch (error) {
      console.error("Attendance summary error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch attendance summary",
      });
    }
  }
);

/**
 * Performance Summary
 */
router.get(
  "/performance",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const records = await prisma.performanceRecord.findMany({
        where: {
          instituteId: req.instituteId,
        },
        select: {
          marksObtained: true,
          percentage: true,
        },
      });

      const totalRecords = records.length;

      const percentages = records
        .map((record) => record.percentage)
        .filter(
          (percentage): percentage is number =>
            percentage !== null && Number.isFinite(percentage)
        );

      const averagePercentage =
        percentages.length > 0
          ? Number(
              (
                percentages.reduce(
                  (sum, percentage) => sum + percentage,
                  0
                ) / percentages.length
              ).toFixed(2)
            )
          : 0;

      return res.status(200).json({
        success: true,
        data: {
          totalRecords,
          recordsWithPercentage: percentages.length,
          averagePercentage,
        },
      });
    } catch (error) {
      console.error("Performance summary error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch performance summary",
      });
    }
  }
);

export default router;
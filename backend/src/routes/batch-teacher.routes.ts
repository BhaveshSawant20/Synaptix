import { Router, Response } from "express";

import prisma from "../lib/prisma";

import authMiddleware, {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

// ============================================================
// HELPERS
// ============================================================

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

function schedulesOverlap(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string
): boolean {
  const firstStartMinutes = timeToMinutes(firstStart);
  const firstEndMinutes = timeToMinutes(firstEnd);

  const secondStartMinutes = timeToMinutes(secondStart);
  const secondEndMinutes = timeToMinutes(secondEnd);

  return (
    firstStartMinutes < secondEndMinutes &&
    firstEndMinutes > secondStartMinutes
  );
}

function dayName(dayOfWeek: number): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return days[dayOfWeek] ?? "Unknown day";
}

// ============================================================
// ADD TEACHER TO BATCH
// ============================================================

router.post(
  "/:batchId/teachers",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const { batchId } = req.params;
      const { teacherId } = req.body;

      if (
        !batchId ||
        Array.isArray(batchId) ||
        !teacherId
      ) {
        return res.status(400).json({
          success: false,
          message: "Batch ID and teacher ID are required",
        });
      }

      // ======================================================
      // VERIFY BATCH
      // ======================================================

      const batch = await prisma.batch.findFirst({
        where: {
          id: batchId,
          instituteId: req.instituteId,
        },
      });

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: "Batch not found",
        });
      }

      // ======================================================
      // VERIFY TEACHER
      // ======================================================

      const teacher = await prisma.teacher.findFirst({
        where: {
          id: teacherId,
          instituteId: req.instituteId,
        },
      });

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found",
        });
      }

      // ======================================================
      // CHECK DUPLICATE ASSIGNMENT
      // ======================================================

      const existingAssignment =
        await prisma.batchTeacher.findUnique({
          where: {
            batchId_teacherId: {
              batchId,
              teacherId,
            },
          },
        });

      if (existingAssignment) {
        return res.status(409).json({
          success: false,
          code: "TEACHER_ALREADY_ASSIGNED",
          message:
            "Teacher is already assigned to this batch",
        });
      }

      // ======================================================
      // LOAD TARGET BATCH SCHEDULES FOR THIS TEACHER
      // ======================================================
      //
      // If this batch already has schedules assigned to this
      // teacher, those schedules must also be checked against
      // the teacher's schedules in other batches.
      //
      // ======================================================

      const targetBatchSchedules =
        await prisma.batchSchedule.findMany({
          where: {
            batchId,
            teacherId,
          },
          orderBy: [
            {
              dayOfWeek: "asc",
            },
            {
              startTime: "asc",
            },
          ],
        });

      // ======================================================
      // FIND TEACHER'S OTHER BATCHES
      // ======================================================

      const existingTeacherAssignments =
        await prisma.batchTeacher.findMany({
          where: {
            teacherId,
            batchId: {
              not: batchId,
            },
            batch: {
              instituteId: req.instituteId,
            },
          },
          include: {
            batch: {
              select: {
                id: true,
                name: true,
                schedules: {
                  where: {
                    teacherId,
                  },
                  orderBy: [
                    {
                      dayOfWeek: "asc",
                    },
                    {
                      startTime: "asc",
                    },
                  ],
                },
              },
            },
          },
        });

      // ======================================================
      // TEACHER SCHEDULE CONFLICT CHECK
      // ======================================================

      const conflicts: Array<{
        type: "teacher";
        teacherId: string;
        personName: string;

        existingBatchId: string;
        existingBatchName: string;
        existingDay: string;
        existingDayOfWeek: number;
        existingStartTime: string;
        existingEndTime: string;

        newBatchId: string;
        newBatchName: string;
        newDay: string;
        newDayOfWeek: number;
        newStartTime: string;
        newEndTime: string;
      }> = [];

      for (const assignment of existingTeacherAssignments) {
        for (const existingSchedule of assignment.batch
          .schedules) {
          for (const newSchedule of targetBatchSchedules) {
            if (
              existingSchedule.dayOfWeek !==
              newSchedule.dayOfWeek
            ) {
              continue;
            }

            if (
              !schedulesOverlap(
                existingSchedule.startTime,
                existingSchedule.endTime,
                newSchedule.startTime,
                newSchedule.endTime
              )
            ) {
              continue;
            }

            conflicts.push({
              type: "teacher",

              teacherId: teacher.id,
              personName: teacher.name,

              existingBatchId:
                assignment.batch.id,
              existingBatchName:
                assignment.batch.name,
              existingDay: dayName(
                existingSchedule.dayOfWeek
              ),
              existingDayOfWeek:
                existingSchedule.dayOfWeek,
              existingStartTime:
                existingSchedule.startTime,
              existingEndTime:
                existingSchedule.endTime,

              newBatchId: batch.id,
              newBatchName: batch.name,
              newDay: dayName(
                newSchedule.dayOfWeek
              ),
              newDayOfWeek:
                newSchedule.dayOfWeek,
              newStartTime:
                newSchedule.startTime,
              newEndTime:
                newSchedule.endTime,
            });
          }
        }
      }

      if (conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          code: "TEACHER_SCHEDULE_CONFLICT",
          message:
            "This teacher cannot be assigned because their schedule overlaps with another batch.",
          conflicts,
        });
      }

      // ======================================================
      // ASSIGN TEACHER
      // ======================================================

      const assignment =
        await prisma.batchTeacher.create({
          data: {
            batchId,
            teacherId,
          },
          include: {
            teacher: true,
            batch: true,
          },
        });

      return res.status(201).json({
        success: true,
        message:
          "Teacher added to batch successfully",
        assignment,
      });
    } catch (error) {
      console.error(
        "Adding teacher to batch failed:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Unable to add teacher to batch",
      });
    }
  }
);

// ============================================================
// GET TEACHERS IN BATCH
// ============================================================

router.get(
  "/:batchId/teachers",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const { batchId } = req.params;

      if (!batchId || Array.isArray(batchId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch ID",
        });
      }

      const batch = await prisma.batch.findFirst({
        where: {
          id: batchId,
          instituteId: req.instituteId,
        },
      });

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: "Batch not found",
        });
      }

      const assignments =
        await prisma.batchTeacher.findMany({
          where: {
            batchId,
            teacher: {
              instituteId: req.instituteId,
            },
          },
          include: {
            teacher: {
              include: {
                schedules: {
                  where: {
                    batchId,
                  },
                  orderBy: [
                    {
                      dayOfWeek: "asc",
                    },
                    {
                      startTime: "asc",
                    },
                  ],
                },
              },
            },
          },
        });

      return res.status(200).json({
        success: true,
        count: assignments.length,
        teachers: assignments,
      });
    } catch (error) {
      console.error(
        "Fetching batch teachers failed:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Unable to fetch batch teachers",
      });
    }
  }
);

// ============================================================
// REMOVE TEACHER FROM BATCH
// ============================================================

router.delete(
  "/:batchId/teachers/:teacherId",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const { batchId, teacherId } = req.params;

      if (
        !batchId ||
        Array.isArray(batchId) ||
        !teacherId ||
        Array.isArray(teacherId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid batch ID or teacher ID",
        });
      }

      // ======================================================
      // VERIFY BATCH
      // ======================================================

      const batch = await prisma.batch.findFirst({
        where: {
          id: batchId,
          instituteId: req.instituteId,
        },
      });

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: "Batch not found",
        });
      }

      // ======================================================
      // VERIFY TEACHER
      // ======================================================

      const teacher = await prisma.teacher.findFirst({
        where: {
          id: teacherId,
          instituteId: req.instituteId,
        },
      });

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found",
        });
      }

      // ======================================================
      // VERIFY ASSIGNMENT
      // ======================================================

      const assignment =
        await prisma.batchTeacher.findUnique({
          where: {
            batchId_teacherId: {
              batchId,
              teacherId,
            },
          },
        });

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message:
            "Teacher is not assigned to this batch",
        });
      }

      // ======================================================
      // REMOVE TEACHER ASSIGNMENT
      // ======================================================

      await prisma.batchTeacher.delete({
        where: {
          batchId_teacherId: {
            batchId,
            teacherId,
          },
        },
      });

      return res.status(200).json({
        success: true,
        message:
          "Teacher removed from batch successfully",
      });
    } catch (error) {
      console.error(
        "Removing teacher from batch failed:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to remove teacher from batch",
      });
    }
  }
);

// ============================================================
// GET ALL BATCHES FOR A TEACHER
// ============================================================

router.get(
  "/teacher/:teacherId/batches",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const { teacherId } = req.params;

      if (
        !teacherId ||
        Array.isArray(teacherId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid teacher ID",
        });
      }

      // ======================================================
      // VERIFY TEACHER
      // ======================================================

      const teacher = await prisma.teacher.findFirst({
        where: {
          id: teacherId,
          instituteId: req.instituteId,
        },
      });

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found",
        });
      }

      // ======================================================
      // LOAD TEACHER BATCHES
      // ======================================================

      const assignments =
        await prisma.batchTeacher.findMany({
          where: {
            teacherId,
            batch: {
              instituteId: req.instituteId,
            },
          },
          include: {
            batch: {
              include: {
                schedules: {
                  where: {
                    teacherId,
                  },
                  orderBy: [
                    {
                      dayOfWeek: "asc",
                    },
                    {
                      startTime: "asc",
                    },
                  ],
                },
              },
            },
          },
        });

      return res.status(200).json({
        success: true,
        count: assignments.length,
        batches: assignments,
      });
    } catch (error) {
      console.error(
        "Fetching teacher batches failed:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Unable to fetch teacher batches",
      });
    }
  }
);

export default router;
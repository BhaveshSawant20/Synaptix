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

// ============================================================
// ADD STUDENT TO BATCH
// ============================================================

router.post(
  "/:batchId/students",
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
      const { studentId } = req.body;

      if (
        !batchId ||
        Array.isArray(batchId) ||
        !studentId
      ) {
        return res.status(400).json({
          success: false,
          message: "Batch ID and student ID are required",
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
      // VERIFY STUDENT
      // ======================================================

      const student = await prisma.student.findFirst({
        where: {
          id: studentId,
          instituteId: req.instituteId,
        },
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      // ======================================================
      // CHECK DUPLICATE ASSIGNMENT
      // ======================================================

      const existingAssignment =
        await prisma.studentBatch.findUnique({
          where: {
            studentId_batchId: {
              studentId,
              batchId,
            },
          },
        });

      if (existingAssignment) {
        return res.status(409).json({
          success: false,
          code: "STUDENT_ALREADY_ASSIGNED",
          message: "Student is already assigned to this batch",
        });
      }

      // ======================================================
      // STUDENT SCHEDULE CONFLICT CHECK
      // ======================================================
      //
      // A student can belong to multiple batches.
      //
      // However, the student's schedules cannot overlap.
      //
      // Subject DOES NOT matter.
      //
      // Example:
      //
      // Batch A → Monday 4:00–5:00
      // Batch B → Monday 5:00–6:00
      //               ✅ Allowed
      //
      // Batch A → Monday 4:00–5:00
      // Batch C → Monday 4:30–5:30
      //               ❌ Conflict
      //
      // This works in both directions:
      // 1. Assigning student to a batch
      // 2. Creating/updating a schedule
      //
      // The second case will be handled in batch-schedule.routes.ts.
      // ======================================================

      const targetBatchSchedules =
        await prisma.batchSchedule.findMany({
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
        });

      if (targetBatchSchedules.length > 0) {
        // ----------------------------------------------------
        // Get all other batches this student belongs to.
        // ----------------------------------------------------

        const existingStudentAssignments =
          await prisma.studentBatch.findMany({
            where: {
              studentId,
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

        // ----------------------------------------------------
        // Find overlapping schedules.
        // ----------------------------------------------------

        const conflicts: Array<{
          type: "student";
          studentId: string;
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

        for (const assignment of existingStudentAssignments) {
          for (const existingSchedule of assignment.batch
            .schedules) {
            for (const newSchedule of targetBatchSchedules) {
              // Different days cannot conflict.
              if (
                existingSchedule.dayOfWeek !==
                newSchedule.dayOfWeek
              ) {
                continue;
              }

              // Check actual time overlap.
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
                type: "student",

                studentId: student.id,
                personName: student.name,

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

        // ----------------------------------------------------
        // Block assignment when a conflict exists.
        // ----------------------------------------------------

        if (conflicts.length > 0) {
          return res.status(409).json({
            success: false,
            code: "STUDENT_SCHEDULE_CONFLICT",
            message:
              "This student cannot be assigned because their schedule overlaps with another batch.",
            conflicts,
          });
        }
      }

      // ======================================================
      // CREATE ASSIGNMENT
      // ======================================================

      const assignment =
        await prisma.studentBatch.create({
          data: {
            studentId,
            batchId,
          },
          include: {
            student: {
              include: {
                school: true,
                standard: true,
              },
            },
            batch: true,
          },
        });

      return res.status(201).json({
        success: true,
        message:
          "Student added to batch successfully",
        assignment,
      });
    } catch (error) {
      console.error(
        "Adding student to batch failed:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Unable to add student to batch",
      });
    }
  }
);

// ============================================================
// GET STUDENTS IN BATCH
// ============================================================

router.get(
  "/:batchId/students",
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
        await prisma.studentBatch.findMany({
          where: {
            batchId,
            student: {
              instituteId: req.instituteId,
            },
          },
          include: {
            student: {
              include: {
                school: true,
                standard: true,
              },
            },
          },
          orderBy: {
            joinedAt: "desc",
          },
        });

      return res.status(200).json({
        success: true,
        count: assignments.length,
        students: assignments,
      });
    } catch (error) {
      console.error(
        "Fetching batch students failed:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Unable to fetch batch students",
      });
    }
  }
);

// ============================================================
// REMOVE STUDENT FROM BATCH
// ============================================================

router.delete(
  "/:batchId/students/:studentId",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const { batchId, studentId } = req.params;

      if (
        !batchId ||
        Array.isArray(batchId) ||
        !studentId ||
        Array.isArray(studentId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid batch ID or student ID",
        });
      }

      // ------------------------------------------------------
      // Verify batch
      // ------------------------------------------------------

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

      // ------------------------------------------------------
      // Verify student
      // ------------------------------------------------------

      const student = await prisma.student.findFirst({
        where: {
          id: studentId,
          instituteId: req.instituteId,
        },
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      // ------------------------------------------------------
      // Verify assignment
      // ------------------------------------------------------

      const assignment =
        await prisma.studentBatch.findUnique({
          where: {
            studentId_batchId: {
              studentId,
              batchId,
            },
          },
        });

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message:
            "Student is not assigned to this batch",
        });
      }

      // ------------------------------------------------------
      // Remove assignment
      // ------------------------------------------------------

      await prisma.studentBatch.delete({
        where: {
          studentId_batchId: {
            studentId,
            batchId,
          },
        },
      });

      return res.status(200).json({
        success: true,
        message:
          "Student removed from batch successfully",
      });
    } catch (error) {
      console.error(
        "Removing student from batch failed:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to remove student from batch",
      });
    }
  }
);

export default router;
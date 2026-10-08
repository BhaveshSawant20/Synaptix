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

function isValidTime(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

function schedulesOverlap(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
): boolean {
  const firstStartMinutes = timeToMinutes(firstStart);
  const firstEndMinutes = timeToMinutes(firstEnd);

  const secondStartMinutes = timeToMinutes(secondStart);
  const secondEndMinutes = timeToMinutes(secondEnd);

  return (
    firstStartMinutes < secondEndMinutes && firstEndMinutes > secondStartMinutes
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

async function enrichSchedulesWithSubjects<T extends { subjectId?: string | null }>(
  instituteId: string,
  schedules: T[]
): Promise<Array<T & { subject: { id: string; name: string; code: string | null } | null }>> {
  const subjectIds = Array.from(
    new Set(schedules.map((s) => s.subjectId).filter(Boolean) as string[])
  );

  const subjects =
    subjectIds.length > 0
      ? await prisma.subject.findMany({
          where: {
            id: { in: subjectIds },
            instituteId,
          },
          select: { id: true, name: true, code: true },
        })
      : [];

  const subjectMap = new Map(subjects.map((sub) => [sub.id, sub]));

  return schedules.map((schedule) => ({
    ...schedule,
    subject: schedule.subjectId ? subjectMap.get(schedule.subjectId) ?? null : null,
  }));
}

async function enrichScheduleWithSubject<T extends { subjectId?: string | null }>(
  instituteId: string,
  schedule: T
): Promise<T & { subject: { id: string; name: string; code: string | null } | null }> {
  const [enriched] = await enrichSchedulesWithSubjects(instituteId, [schedule]);
  return enriched;
}

// ============================================================
// POST /
// CREATE BATCH SCHEDULE
// ============================================================

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
        batchId,
        teacherId,
        dayOfWeek,
        startTime,
        endTime,
        subjectId,
        room,
      } = req.body;

      // ======================================================
      // BASIC VALIDATION
      // ======================================================

      if (!batchId) {
        return res.status(400).json({
          success: false,
          message: "Batch ID is required",
        });
      }

      if (
        dayOfWeek === undefined ||
        dayOfWeek === null ||
        Number.isNaN(Number(dayOfWeek))
      ) {
        return res.status(400).json({
          success: false,
          message: "Day of week is required",
        });
      }

      const numericDayOfWeek = Number(dayOfWeek);

      if (
        numericDayOfWeek < 0 ||
        numericDayOfWeek > 6 ||
        !Number.isInteger(numericDayOfWeek)
      ) {
        return res.status(400).json({
          success: false,
          message: "Day of week must be a number between 0 and 6",
        });
      }

      if (!startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: "Start time and end time are required",
        });
      }

      if (!isValidTime(startTime) || !isValidTime(endTime)) {
        return res.status(400).json({
          success: false,
          message: "Start time and end time must use HH:mm format",
        });
      }

      if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
        return res.status(400).json({
          success: false,
          message: "End time must be later than start time",
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

      if (teacherId) {
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

        // ----------------------------------------------------
        // Teacher must actually be assigned to this batch.
        // ----------------------------------------------------

        const teacherAssignment = await prisma.batchTeacher.findUnique({
          where: {
            batchId_teacherId: {
              batchId,
              teacherId,
            },
          },
        });

        if (!teacherAssignment) {
          await prisma.batchTeacher.create({
            data: {
              batchId,
              teacherId,
            },
          });
        }
      }

      // ======================================================
      // VERIFY SUBJECT
      // ======================================================

      if (subjectId) {
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
      }

      // ======================================================
      // BATCH SCHEDULE CONFLICT
      // ======================================================
      //
      // A batch cannot have two schedules at overlapping
      // times on the same day.
      //
      // 4:00–5:00 + 5:00–6:00 = allowed
      // 4:00–5:00 + 4:30–5:30 = conflict
      //
      // ======================================================

      const batchConflict = await prisma.batchSchedule.findFirst({
        where: {
          batchId,
          dayOfWeek: numericDayOfWeek,
        },
      });

      if (batchConflict) {
        const overlappingBatchSchedules = await prisma.batchSchedule.findMany({
          where: {
            batchId,
            dayOfWeek: numericDayOfWeek,
          },
          orderBy: {
            startTime: "asc",
          },
        });

        const conflict = overlappingBatchSchedules.find((existingSchedule) =>
          schedulesOverlap(
            existingSchedule.startTime,
            existingSchedule.endTime,
            startTime,
            endTime,
          ),
        );

        if (conflict) {
          return res.status(409).json({
            success: false,
            code: "BATCH_SCHEDULE_CONFLICT",
            message: "This batch already has a schedule at the selected time.",
            conflicts: [
              {
                type: "batch",
                batchId: batch.id,
                batchName: batch.name,

                existingDay: dayName(conflict.dayOfWeek),
                existingDayOfWeek: conflict.dayOfWeek,
                existingStartTime: conflict.startTime,
                existingEndTime: conflict.endTime,

                newDay: dayName(numericDayOfWeek),
                newDayOfWeek: numericDayOfWeek,
                newStartTime: startTime,
                newEndTime: endTime,
              },
            ],
          });
        }
      }

      // ======================================================
      // TEACHER SCHEDULE CONFLICT
      // ======================================================
      //
      // If a teacher is attached to this schedule, the teacher
      // cannot already be teaching another batch at the same
      // time.
      //
      // ======================================================

      if (teacherId) {
        const teacherSchedules = await prisma.batchSchedule.findMany({
          where: {
            teacherId,
            dayOfWeek: numericDayOfWeek,
          },
          include: {
            batch: {
              select: {
                id: true,
                name: true,
              },
            },
            teacher: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            startTime: "asc",
          },
        });

        const teacherConflict = teacherSchedules.find((existingSchedule) =>
          schedulesOverlap(
            existingSchedule.startTime,
            existingSchedule.endTime,
            startTime,
            endTime,
          ),
        );

        if (teacherConflict) {
          return res.status(409).json({
            success: false,
            code: "TEACHER_SCHEDULE_CONFLICT",
            message:
              "This teacher is already scheduled for another batch at the selected time.",
            conflicts: [
              {
                type: "teacher",
                teacherId,
                personName: teacherConflict.teacher?.name || "Teacher",

                existingBatchId: teacherConflict.batch.id,
                existingBatchName: teacherConflict.batch.name,

                existingDay: dayName(teacherConflict.dayOfWeek),
                existingDayOfWeek: teacherConflict.dayOfWeek,
                existingStartTime: teacherConflict.startTime,
                existingEndTime: teacherConflict.endTime,

                newBatchId: batch.id,
                newBatchName: batch.name,

                newDay: dayName(numericDayOfWeek),
                newDayOfWeek: numericDayOfWeek,
                newStartTime: startTime,
                newEndTime: endTime,
              },
            ],
          });
        }
      }

      // ======================================================
      // STUDENT SCHEDULE CONFLICT
      // ======================================================
      //
      // Every student already assigned to this batch inherits
      // this batch's schedule.
      //
      // Therefore, before creating the schedule we must check
      // every student against their schedules in other batches.
      //
      // Subject DOES NOT matter.
      //
      // ======================================================

      const studentsInBatch = await prisma.studentBatch.findMany({
        where: {
          batchId,
          student: {
            instituteId: req.instituteId,
          },
        },
        select: {
          studentId: true,
          student: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (studentsInBatch.length > 0) {
        const studentIds = studentsInBatch.map(
          (assignment) => assignment.studentId,
        );

        const otherStudentAssignments = await prisma.studentBatch.findMany({
          where: {
            studentId: {
              in: studentIds,
            },
            batchId: {
              not: batchId,
            },
            batch: {
              instituteId: req.instituteId,
            },
          },
          include: {
            student: {
              select: {
                id: true,
                name: true,
              },
            },
            batch: {
              select: {
                id: true,
                name: true,
                schedules: {
                  where: {
                    dayOfWeek: numericDayOfWeek,
                  },
                  orderBy: {
                    startTime: "asc",
                  },
                },
              },
            },
          },
        });

        const studentConflicts: Array<{
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

        for (const assignment of otherStudentAssignments) {
          for (const existingSchedule of assignment.batch.schedules) {
            if (
              schedulesOverlap(
                existingSchedule.startTime,
                existingSchedule.endTime,
                startTime,
                endTime,
              )
            ) {
              studentConflicts.push({
                type: "student",

                studentId: assignment.student.id,
                personName: assignment.student.name,

                existingBatchId: assignment.batch.id,
                existingBatchName: assignment.batch.name,

                existingDay: dayName(existingSchedule.dayOfWeek),
                existingDayOfWeek: existingSchedule.dayOfWeek,
                existingStartTime: existingSchedule.startTime,
                existingEndTime: existingSchedule.endTime,

                newBatchId: batch.id,
                newBatchName: batch.name,

                newDay: dayName(numericDayOfWeek),
                newDayOfWeek: numericDayOfWeek,
                newStartTime: startTime,
                newEndTime: endTime,
              });
            }
          }
        }

        if (studentConflicts.length > 0) {
          return res.status(409).json({
            success: false,
            code: "STUDENT_SCHEDULE_CONFLICT",
            message:
              "This schedule cannot be created because one or more students are already attending another batch at the selected time.",
            conflicts: studentConflicts,
          });
        }
      }

      // ======================================================
      // CREATE SCHEDULE
      // ======================================================

      const schedule = await prisma.batchSchedule.create({
        data: {
          batchId,
          teacherId: teacherId || null,
          dayOfWeek: numericDayOfWeek,
          startTime,
          endTime,
          subjectId: subjectId || null,
          room: room?.trim() || null,
        },
        include: {
          batch: true,
          teacher: true,
        },
      });

      const enrichedSchedule = await enrichScheduleWithSubject(
        req.instituteId,
        schedule
      );

      return res.status(201).json({
        success: true,
        message: "Batch schedule created successfully",
        schedule: enrichedSchedule,
      });
    } catch (error) {
      console.error("Creating batch schedule failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to create batch schedule",
      });
    }
  },
);

// ============================================================
// GET ALL BATCH SCHEDULES
// ============================================================

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

      const schedules = await prisma.batchSchedule.findMany({
        where: {
          batch: {
            instituteId: req.instituteId,
          },
        },
        include: {
          batch: true,
          teacher: true,
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

      const enrichedSchedules = await enrichSchedulesWithSubjects(
        req.instituteId,
        schedules
      );

      return res.status(200).json({
        success: true,
        count: enrichedSchedules.length,
        schedules: enrichedSchedules,
      });
    } catch (error) {
      console.error("Fetching batch schedules failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to fetch batch schedules",
      });
    }
  },
);

// ============================================================
// GET SCHEDULES FOR BATCH
// ============================================================

router.get(
  "/batch/:batchId",
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

      const schedules = await prisma.batchSchedule.findMany({
        where: {
          batchId,
        },
        include: {
          batch: true,
          teacher: true,
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

      const enrichedSchedules = await enrichSchedulesWithSubjects(
        req.instituteId,
        schedules
      );

      return res.status(200).json({
        success: true,
        count: enrichedSchedules.length,
        schedules: enrichedSchedules,
      });
    } catch (error) {
      console.error("Fetching batch schedules failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to fetch batch schedules",
      });
    }
  },
);

// ============================================================
// GET SCHEDULES FOR TEACHER
// ============================================================

router.get(
  "/teacher/:teacherId",
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

      if (!teacherId || Array.isArray(teacherId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid teacher ID",
        });
      }

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

      const schedules = await prisma.batchSchedule.findMany({
        where: {
          teacherId,
          batch: {
            instituteId: req.instituteId,
          },
        },
        include: {
          batch: true,
          teacher: true,
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

      const enrichedSchedules = await enrichSchedulesWithSubjects(
        req.instituteId,
        schedules
      );

      return res.status(200).json({
        success: true,
        count: enrichedSchedules.length,
        schedules: enrichedSchedules,
      });
    } catch (error) {
      console.error("Fetching teacher schedules failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to fetch teacher schedules",
      });
    }
  },
);

// ============================================================
// GET SINGLE SCHEDULE
// ============================================================

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

      const { id } = req.params;

      if (!id || Array.isArray(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid schedule ID",
        });
      }

      const schedule = await prisma.batchSchedule.findFirst({
        where: {
          id,
          batch: {
            instituteId: req.instituteId,
          },
        },
        include: {
          batch: true,
          teacher: true,
        },
      });

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: "Schedule not found",
        });
      }

      const enrichedSchedule = await enrichScheduleWithSubject(
        req.instituteId,
        schedule
      );

      return res.status(200).json({
        success: true,
        schedule: enrichedSchedule,
      });
    } catch (error) {
      console.error("Fetching batch schedule failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to fetch batch schedule",
      });
    }
  },
);

// ============================================================
// PUT /:id
// UPDATE BATCH SCHEDULE
// ============================================================

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

      const { id } = req.params;

      if (!id || Array.isArray(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid schedule ID",
        });
      }

      const existingSchedule = await prisma.batchSchedule.findFirst({
        where: {
          id,
          batch: {
            instituteId: req.instituteId,
          },
        },
        include: {
          batch: true,
        },
      });

      if (!existingSchedule) {
        return res.status(404).json({
          success: false,
          message: "Schedule not found",
        });
      }

      const {
        batchId,
        teacherId,
        dayOfWeek,
        startTime,
        endTime,
        subjectId,
        room,
      } = req.body;

      // ======================================================
      // RESOLVE VALUES
      // ======================================================

      const finalBatchId = batchId ?? existingSchedule.batchId;

      const finalTeacherId =
        teacherId !== undefined
          ? teacherId || null
          : existingSchedule.teacherId;

      const finalDayOfWeek =
        dayOfWeek !== undefined
          ? Number(dayOfWeek)
          : existingSchedule.dayOfWeek;

      const finalStartTime = startTime ?? existingSchedule.startTime;

      const finalEndTime = endTime ?? existingSchedule.endTime;

      const finalSubjectId =
        subjectId !== undefined
          ? subjectId || null
          : existingSchedule.subjectId;

      const finalRoom =
        room !== undefined ? room?.trim() || null : existingSchedule.room;

      // ======================================================
      // VALIDATE DAY
      // ======================================================

      if (
        !Number.isInteger(finalDayOfWeek) ||
        finalDayOfWeek < 0 ||
        finalDayOfWeek > 6
      ) {
        return res.status(400).json({
          success: false,
          message: "Day of week must be a number between 0 and 6",
        });
      }

      // ======================================================
      // VALIDATE TIME
      // ======================================================

      if (!isValidTime(finalStartTime) || !isValidTime(finalEndTime)) {
        return res.status(400).json({
          success: false,
          message: "Start time and end time must use HH:mm format",
        });
      }

      if (timeToMinutes(finalEndTime) <= timeToMinutes(finalStartTime)) {
        return res.status(400).json({
          success: false,
          message: "End time must be later than start time",
        });
      }

      // ======================================================
      // VERIFY BATCH
      // ======================================================

      const batch = await prisma.batch.findFirst({
        where: {
          id: finalBatchId,
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

      if (finalTeacherId) {
        const teacher = await prisma.teacher.findFirst({
          where: {
            id: finalTeacherId,
            instituteId: req.instituteId,
          },
        });

        if (!teacher) {
          return res.status(404).json({
            success: false,
            message: "Teacher not found",
          });
        }

        const teacherAssignment = await prisma.batchTeacher.findUnique({
          where: {
            batchId_teacherId: {
              batchId: finalBatchId,
              teacherId: finalTeacherId,
            },
          },
        });

        if (!teacherAssignment) {
          await prisma.batchTeacher.create({
            data: {
              batchId: finalBatchId,
              teacherId: finalTeacherId,
            },
          });
        }
      }

      // ======================================================
      // VERIFY SUBJECT
      // ======================================================

      if (finalSubjectId) {
        const subject = await prisma.subject.findFirst({
          where: {
            id: finalSubjectId,
            instituteId: req.instituteId,
          },
        });

        if (!subject) {
          return res.status(404).json({
            success: false,
            message: "Subject not found",
          });
        }
      }

      // ======================================================
      // BATCH SCHEDULE CONFLICT
      // ======================================================

      const batchSchedules = await prisma.batchSchedule.findMany({
        where: {
          batchId: finalBatchId,
          dayOfWeek: finalDayOfWeek,
          id: {
            not: id,
          },
        },
        orderBy: {
          startTime: "asc",
        },
      });

      const batchConflict = batchSchedules.find((schedule) =>
        schedulesOverlap(
          schedule.startTime,
          schedule.endTime,
          finalStartTime,
          finalEndTime,
        ),
      );

      if (batchConflict) {
        return res.status(409).json({
          success: false,
          code: "BATCH_SCHEDULE_CONFLICT",
          message: "This batch already has a schedule at the selected time.",
          conflicts: [
            {
              type: "batch",
              batchId: batch.id,
              batchName: batch.name,

              existingDay: dayName(batchConflict.dayOfWeek),
              existingDayOfWeek: batchConflict.dayOfWeek,
              existingStartTime: batchConflict.startTime,
              existingEndTime: batchConflict.endTime,

              newDay: dayName(finalDayOfWeek),
              newDayOfWeek: finalDayOfWeek,
              newStartTime: finalStartTime,
              newEndTime: finalEndTime,
            },
          ],
        });
      }

      // ======================================================
      // TEACHER SCHEDULE CONFLICT
      // ======================================================

      if (finalTeacherId) {
        const teacherSchedules = await prisma.batchSchedule.findMany({
          where: {
            teacherId: finalTeacherId,
            dayOfWeek: finalDayOfWeek,
            id: {
              not: id,
            },
          },
          include: {
            batch: {
              select: {
                id: true,
                name: true,
              },
            },
            teacher: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            startTime: "asc",
          },
        });

        const teacherConflict = teacherSchedules.find((schedule) =>
          schedulesOverlap(
            schedule.startTime,
            schedule.endTime,
            finalStartTime,
            finalEndTime,
          ),
        );

        if (teacherConflict) {
          return res.status(409).json({
            success: false,
            code: "TEACHER_SCHEDULE_CONFLICT",
            message:
              "This teacher is already scheduled for another batch at the selected time.",
            conflicts: [
              {
                type: "teacher",
                teacherId: finalTeacherId,
                personName: teacherConflict.teacher?.name || "Teacher",

                existingBatchId: teacherConflict.batch.id,
                existingBatchName: teacherConflict.batch.name,

                existingDay: dayName(teacherConflict.dayOfWeek),
                existingDayOfWeek: teacherConflict.dayOfWeek,
                existingStartTime: teacherConflict.startTime,
                existingEndTime: teacherConflict.endTime,

                newBatchId: batch.id,
                newBatchName: batch.name,

                newDay: dayName(finalDayOfWeek),
                newDayOfWeek: finalDayOfWeek,
                newStartTime: finalStartTime,
                newEndTime: finalEndTime,
              },
            ],
          });
        }
      }

      // ======================================================
      // STUDENT SCHEDULE CONFLICT
      // ======================================================
      //
      // Check all students currently assigned to this batch.
      //
      // IMPORTANT:
      // Subject is intentionally ignored.
      //
      // A student cannot attend:
      //
      // Batch A → Maths 4:00–5:00
      // Batch B → Physics 4:30–5:30
      //
      // because the times overlap.
      //
      // ======================================================

      const studentsInBatch = await prisma.studentBatch.findMany({
        where: {
          batchId: finalBatchId,
          student: {
            instituteId: req.instituteId,
          },
        },
        select: {
          studentId: true,
          student: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (studentsInBatch.length > 0) {
        const studentIds = studentsInBatch.map(
          (assignment) => assignment.studentId,
        );

        const otherStudentAssignments = await prisma.studentBatch.findMany({
          where: {
            studentId: {
              in: studentIds,
            },
            batchId: {
              not: finalBatchId,
            },
            batch: {
              instituteId: req.instituteId,
            },
          },
          include: {
            student: {
              select: {
                id: true,
                name: true,
              },
            },
            batch: {
              select: {
                id: true,
                name: true,
                schedules: {
                  where: {
                    dayOfWeek: finalDayOfWeek,
                  },
                  orderBy: {
                    startTime: "asc",
                  },
                },
              },
            },
          },
        });

        const studentConflicts: Array<{
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

        for (const assignment of otherStudentAssignments) {
          for (const existingStudentSchedule of assignment.batch.schedules) {
            if (
              schedulesOverlap(
                existingStudentSchedule.startTime,
                existingStudentSchedule.endTime,
                finalStartTime,
                finalEndTime,
              )
            ) {
              studentConflicts.push({
                type: "student",

                studentId: assignment.student.id,
                personName: assignment.student.name,

                existingBatchId: assignment.batch.id,
                existingBatchName: assignment.batch.name,

                existingDay: dayName(existingStudentSchedule.dayOfWeek),
                existingDayOfWeek: existingStudentSchedule.dayOfWeek,
                existingStartTime: existingStudentSchedule.startTime,
                existingEndTime: existingStudentSchedule.endTime,

                newBatchId: batch.id,
                newBatchName: batch.name,

                newDay: dayName(finalDayOfWeek),
                newDayOfWeek: finalDayOfWeek,
                newStartTime: finalStartTime,
                newEndTime: finalEndTime,
              });
            }
          }
        }

        if (studentConflicts.length > 0) {
          return res.status(409).json({
            success: false,
            code: "STUDENT_SCHEDULE_CONFLICT",
            message:
              "This schedule cannot be saved because one or more students are already attending another batch at the selected time.",
            conflicts: studentConflicts,
          });
        }
      }

      // ======================================================
      // UPDATE SCHEDULE
      // ======================================================

      const updatedSchedule = await prisma.batchSchedule.update({
        where: {
          id,
        },
        data: {
          batchId: finalBatchId,
          teacherId: finalTeacherId,
          dayOfWeek: finalDayOfWeek,
          startTime: finalStartTime,
          endTime: finalEndTime,
          subjectId: finalSubjectId,
          room: finalRoom,
        },
        include: {
          batch: true,
          teacher: true,
        },
      });

      const enrichedSchedule = await enrichScheduleWithSubject(
        req.instituteId,
        updatedSchedule
      );

      return res.status(200).json({
        success: true,
        message: "Batch schedule updated successfully",
        schedule: enrichedSchedule,
      });
    } catch (error) {
      console.error("Updating batch schedule failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to update batch schedule",
      });
    }
  },
);

// ============================================================
// DELETE /:id
// DELETE BATCH SCHEDULE
// ============================================================

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

      const { id } = req.params;

      if (!id || Array.isArray(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid schedule ID",
        });
      }

      const schedule = await prisma.batchSchedule.findFirst({
        where: {
          id,
          batch: {
            instituteId: req.instituteId,
          },
        },
      });

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: "Schedule not found",
        });
      }

      await prisma.batchSchedule.delete({
        where: {
          id,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Batch schedule deleted successfully",
      });
    } catch (error) {
      console.error("Deleting batch schedule failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to delete batch schedule",
      });
    }
  },
);

export default router;

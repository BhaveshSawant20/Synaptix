import { Router, Response } from "express";
import prisma from "../lib/prisma";
import authMiddleware, {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

/**
 * CREATE ATTENDANCE
 * POST /api/attendance
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

      const { studentId, date, status, remarks } = req.body;

      if (!studentId || !date || !status) {
        return res.status(400).json({
          success: false,
          message: "studentId, date and status are required",
        });
      }

      const validStatuses = [
        "PRESENT",
        "ABSENT",
        "LATE",
        "EXCUSED",
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid attendance status. Use PRESENT, ABSENT, LATE or EXCUSED",
        });
      }

      const attendanceDate = new Date(date);

      if (Number.isNaN(attendanceDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance date",
        });
      }

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

      const existingAttendance = await prisma.attendance.findUnique({
        where: {
          studentId_date: {
            studentId,
            date: attendanceDate,
          },
        },
      });

      if (existingAttendance) {
        return res.status(409).json({
          success: false,
          message: "Attendance already exists for this student and date",
        });
      }

      const attendance = await prisma.attendance.create({
        data: {
          instituteId: req.instituteId,
          studentId,
          date: attendanceDate,
          status,
          remarks: remarks || null,
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              studentCode: true,
              school: true,
              standard: true,
            },
          },
        },
      });

      return res.status(201).json({
        success: true,
        message: "Attendance created successfully",
        data: attendance,
      });
    } catch (error) {
      console.error("Create attendance error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create attendance",
      });
    }
  }
);

/**
 * GET ALL ATTENDANCE
 * GET /api/attendance
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

      const attendance = await prisma.attendance.findMany({
        where: {
          instituteId: req.instituteId,
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              studentCode: true,
              school: true,
              standard: true,
            },
          },
        },
        orderBy: {
          date: "desc",
        },
      });

      return res.status(200).json({
        success: true,
        count: attendance.length,
        data: attendance,
      });
    } catch (error) {
      console.error("Get attendance error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch attendance",
      });
    }
  }
);

/**
 * GET ATTENDANCE BY STUDENT
 * GET /api/attendance/student/:studentId
 */
router.get(
  "/student/:studentId",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const studentId = String(req.params.studentId);

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

      const attendance = await prisma.attendance.findMany({
        where: {
          studentId,
          instituteId: req.instituteId,
        },
        orderBy: {
          date: "desc",
        },
      });

      return res.status(200).json({
        success: true,
        count: attendance.length,
        data: attendance,
      });
    } catch (error) {
      console.error("Get student attendance error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch student attendance",
      });
    }
  }
);

/**
 * GET ATTENDANCE BY ID
 * GET /api/attendance/:id
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

      const attendance = await prisma.attendance.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              studentCode: true,
              school: true,
              standard: true,
            },
          },
        },
      });

      if (!attendance) {
        return res.status(404).json({
          success: false,
          message: "Attendance record not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: attendance,
      });
    } catch (error) {
      console.error("Get attendance by ID error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch attendance",
      });
    }
  }
);

/**
 * UPDATE ATTENDANCE
 * PUT /api/attendance/:id
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

      const { date, status, remarks } = req.body;

      const existingAttendance = await prisma.attendance.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
      });

      if (!existingAttendance) {
        return res.status(404).json({
          success: false,
          message: "Attendance record not found",
        });
      }

      const validStatuses = [
        "PRESENT",
        "ABSENT",
        "LATE",
        "EXCUSED",
      ];

      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid attendance status. Use PRESENT, ABSENT, LATE or EXCUSED",
        });
      }

      let attendanceDate: Date | undefined;

      if (date !== undefined) {
        attendanceDate = new Date(date);

        if (Number.isNaN(attendanceDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid attendance date",
          });
        }
      }

      if (
        attendanceDate &&
        attendanceDate.getTime() !== existingAttendance.date.getTime()
      ) {
        const duplicateDate = await prisma.attendance.findUnique({
          where: {
            studentId_date: {
              studentId: existingAttendance.studentId,
              date: attendanceDate,
            },
          },
        });

        if (duplicateDate && duplicateDate.id !== id) {
          return res.status(409).json({
            success: false,
            message:
              "Attendance already exists for this student and date",
          });
        }
      }

      const attendance = await prisma.attendance.update({
        where: {
          id,
        },
        data: {
          ...(attendanceDate && { date: attendanceDate }),
          ...(status && { status }),
          ...(remarks !== undefined && {
            remarks: remarks || null,
          }),
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              studentCode: true,
              school: true,
              standard: true,
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        message: "Attendance updated successfully",
        data: attendance,
      });
    } catch (error) {
      console.error("Update attendance error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update attendance",
      });
    }
  }
);

/**
 * DELETE ATTENDANCE
 * DELETE /api/attendance/:id
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

      const existingAttendance = await prisma.attendance.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
      });

      if (!existingAttendance) {
        return res.status(404).json({
          success: false,
          message: "Attendance record not found",
        });
      }

      await prisma.attendance.delete({
        where: {
          id,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Attendance deleted successfully",
      });
    } catch (error) {
      console.error("Delete attendance error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete attendance",
      });
    }
  }
);

export default router;
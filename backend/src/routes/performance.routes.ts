import { Router, Response } from "express";
import prisma from "../lib/prisma";
import authMiddleware, {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

/**
 * CREATE PERFORMANCE RECORD
 * POST /api/performance
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
        studentId,
        assessmentId,
        marksObtained,
        remarks,
      } = req.body;

      if (!studentId || !assessmentId || marksObtained === undefined) {
        return res.status(400).json({
          success: false,
          message:
            "studentId, assessmentId and marksObtained are required",
        });
      }

      if (
        typeof marksObtained !== "number" ||
        Number.isNaN(marksObtained) ||
        marksObtained < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "marksObtained must be a valid non-negative number",
        });
      }

      // Verify student belongs to current institute
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

      // Verify assessment belongs to current institute
      const assessment = await prisma.assessment.findFirst({
        where: {
          id: assessmentId,
          instituteId: req.instituteId,
        },
      });

      if (!assessment) {
        return res.status(404).json({
          success: false,
          message: "Assessment not found",
        });
      }

      // Validate marks against total marks
      if (
        assessment.totalMarks !== null &&
        marksObtained > assessment.totalMarks
      ) {
        return res.status(400).json({
          success: false,
          message: `marksObtained cannot be greater than total marks (${assessment.totalMarks})`,
        });
      }

      // Prevent duplicate student + assessment record
      const existingRecord = await prisma.performanceRecord.findUnique({
        where: {
          studentId_assessmentId: {
            studentId,
            assessmentId,
          },
        },
      });

      if (existingRecord) {
        return res.status(409).json({
          success: false,
          message: "Performance record already exists for this student",
        });
      }

      let percentage: number | null = null;

      if (
        assessment.totalMarks !== null &&
        assessment.totalMarks > 0
      ) {
        percentage =
          (marksObtained / assessment.totalMarks) * 100;
      }

      const performanceRecord =
        await prisma.performanceRecord.create({
          data: {
            instituteId: req.instituteId,
            studentId,
            assessmentId,
            marksObtained,
            percentage,
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
            assessment: {
              include: {
                batch: true,
              },
            },
          },
        });

      return res.status(201).json({
        success: true,
        message: "Performance record created successfully",
        data: performanceRecord,
      });
    } catch (error) {
      console.error("Create performance record error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create performance record",
      });
    }
  }
);

/**
 * GET ALL PERFORMANCE RECORDS
 * GET /api/performance
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

      const records = await prisma.performanceRecord.findMany({
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
          assessment: {
            include: {
              batch: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.status(200).json({
        success: true,
        count: records.length,
        data: records,
      });
    } catch (error) {
      console.error("Get performance records error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch performance records",
      });
    }
  }
);

/**
 * GET PERFORMANCE RECORDS BY STUDENT
 * GET /api/performance/student/:studentId
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

      const records = await prisma.performanceRecord.findMany({
        where: {
          studentId,
          instituteId: req.instituteId,
        },
        include: {
          assessment: {
            include: {
              batch: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.status(200).json({
        success: true,
        count: records.length,
        data: records,
      });
    } catch (error) {
      console.error(
        "Get student performance records error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch student performance records",
      });
    }
  }
);

/**
 * GET PERFORMANCE RECORDS BY ASSESSMENT
 * GET /api/performance/assessment/:assessmentId
 */
router.get(
  "/assessment/:assessmentId",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const assessmentId = String(req.params.assessmentId);

      const assessment = await prisma.assessment.findFirst({
        where: {
          id: assessmentId,
          instituteId: req.instituteId,
        },
      });

      if (!assessment) {
        return res.status(404).json({
          success: false,
          message: "Assessment not found",
        });
      }

      const records = await prisma.performanceRecord.findMany({
        where: {
          assessmentId,
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
          marksObtained: "desc",
        },
      });

      return res.status(200).json({
        success: true,
        count: records.length,
        data: records,
      });
    } catch (error) {
      console.error(
        "Get assessment performance records error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch assessment performance records",
      });
    }
  }
);

/**
 * GET PERFORMANCE RECORD BY ID
 * GET /api/performance/:id
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

      const record = await prisma.performanceRecord.findFirst({
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
          assessment: {
            include: {
              batch: true,
            },
          },
        },
      });

      if (!record) {
        return res.status(404).json({
          success: false,
          message: "Performance record not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: record,
      });
    } catch (error) {
      console.error(
        "Get performance record by ID error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch performance record",
      });
    }
  }
);

/**
 * UPDATE PERFORMANCE RECORD
 * PUT /api/performance/:id
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

      const existingRecord =
        await prisma.performanceRecord.findFirst({
          where: {
            id,
            instituteId: req.instituteId,
          },
          include: {
            assessment: true,
          },
        });

      if (!existingRecord) {
        return res.status(404).json({
          success: false,
          message: "Performance record not found",
        });
      }

      const { marksObtained, remarks } = req.body;

      if (marksObtained !== undefined) {
        if (
          typeof marksObtained !== "number" ||
          Number.isNaN(marksObtained) ||
          marksObtained < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "marksObtained must be a valid non-negative number",
          });
        }

        if (
          existingRecord.assessment.totalMarks !== null &&
          marksObtained > existingRecord.assessment.totalMarks
        ) {
          return res.status(400).json({
            success: false,
            message: `marksObtained cannot be greater than total marks (${existingRecord.assessment.totalMarks})`,
          });
        }
      }

      const finalMarks =
        marksObtained !== undefined
          ? marksObtained
          : existingRecord.marksObtained;

      let percentage: number | null = null;

      if (
        existingRecord.assessment.totalMarks !== null &&
        existingRecord.assessment.totalMarks > 0
      ) {
        percentage =
          (finalMarks / existingRecord.assessment.totalMarks) *
          100;
      }

      const updatedRecord =
        await prisma.performanceRecord.update({
          where: {
            id,
          },
          data: {
            ...(marksObtained !== undefined && {
              marksObtained,
            }),
            percentage,
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
            assessment: {
              include: {
                batch: true,
              },
            },
          },
        });

      return res.status(200).json({
        success: true,
        message: "Performance record updated successfully",
        data: updatedRecord,
      });
    } catch (error) {
      console.error("Update performance record error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update performance record",
      });
    }
  }
);

/**
 * DELETE PERFORMANCE RECORD
 * DELETE /api/performance/:id
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

      const existingRecord =
        await prisma.performanceRecord.findFirst({
          where: {
            id,
            instituteId: req.instituteId,
          },
        });

      if (!existingRecord) {
        return res.status(404).json({
          success: false,
          message: "Performance record not found",
        });
      }

      await prisma.performanceRecord.delete({
        where: {
          id,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Performance record deleted successfully",
      });
    } catch (error) {
      console.error("Delete performance record error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete performance record",
      });
    }
  }
);

export default router;
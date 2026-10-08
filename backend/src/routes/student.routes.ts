import { Router, Response } from "express";
import prisma from "../lib/prisma";
import authMiddleware, {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

/* =========================
   CREATE STUDENT
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
        studentCode,
        name,
        email,
        phone,
        dateOfBirth,
      } = req.body;

      if (!schoolId || !standardId || !name) {
        return res.status(400).json({
          success: false,
          message: "School ID, standard ID and student name are required",
        });
      }

      /* Verify school belongs to logged-in institute */
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

      /* Verify standard belongs to the selected school */
      const standard = await prisma.standard.findFirst({
        where: {
          id: standardId,
          schoolId,
        },
      });

      if (!standard) {
        return res.status(404).json({
          success: false,
          message: "Standard not found for the selected school",
        });
      }

      /* Prevent duplicate student code within institute */
      if (studentCode) {
        const existingStudent = await prisma.student.findFirst({
          where: {
            instituteId: req.instituteId,
            studentCode,
          },
        });

        if (existingStudent) {
          return res.status(409).json({
            success: false,
            message: "A student with this student code already exists",
          });
        }
      }

      const student = await prisma.student.create({
        data: {
          instituteId: req.instituteId,
          schoolId,
          standardId,
          studentCode: studentCode || null,
          name,
          email: email || null,
          phone: phone || null,
          dateOfBirth: dateOfBirth
            ? new Date(dateOfBirth)
            : null,
        },
        include: {
          school: true,
          standard: true,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Student created successfully",
        student,
      });
    } catch (error) {
      console.error("Creating student failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to create student",
      });
    }
  }
);

/* =========================
   GET ALL STUDENTS
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

      const students = await prisma.student.findMany({
        where: {
          instituteId: req.instituteId,
        },
        include: {
          school: true,
          standard: true,
          batches: {
            include: {
              batch: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      return res.status(200).json({
        success: true,
        count: students.length,
        students,
      });
    } catch (error) {
      console.error("Fetching students failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to fetch students",
      });
    }
  }
);

/* =========================
   GET STUDENT BY ID
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

      const id = req.params.id;

      if (!id || Array.isArray(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID",
        });
      }

      const student = await prisma.student.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
        include: {
          school: true,
          standard: true,
          batches: {
            include: {
              batch: true,
            },
          },
        },
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      return res.status(200).json({
        success: true,
        student,
      });
    } catch (error) {
      console.error("Fetching student failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to fetch student",
      });
    }
  }
);

/* =========================
   UPDATE STUDENT
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

      const id = req.params.id;

      if (!id || Array.isArray(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID",
        });
      }

      const {
        schoolId,
        standardId,
        studentCode,
        name,
        email,
        phone,
        dateOfBirth,
      } = req.body;

      const existingStudent = await prisma.student.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
      });

      if (!existingStudent) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      const finalSchoolId = schoolId ?? existingStudent.schoolId;
      const finalStandardId =
        standardId ?? existingStudent.standardId;

      /* Verify selected school belongs to institute */
      const school = await prisma.school.findFirst({
        where: {
          id: finalSchoolId,
          instituteId: req.instituteId,
        },
      });

      if (!school) {
        return res.status(404).json({
          success: false,
          message: "School not found",
        });
      }

      /* Verify selected standard belongs to selected school */
      const standard = await prisma.standard.findFirst({
        where: {
          id: finalStandardId,
          schoolId: finalSchoolId,
        },
      });

      if (!standard) {
        return res.status(404).json({
          success: false,
          message: "Standard not found for the selected school",
        });
      }

      /* Prevent duplicate student code */
      if (
        studentCode !== undefined &&
        studentCode !== null &&
        studentCode !== existingStudent.studentCode
      ) {
        const duplicateStudent = await prisma.student.findFirst({
          where: {
            instituteId: req.instituteId,
            studentCode,
            NOT: {
              id,
            },
          },
        });

        if (duplicateStudent) {
          return res.status(409).json({
            success: false,
            message: "A student with this student code already exists",
          });
        }
      }

      const student = await prisma.student.update({
        where: {
          id,
        },
        data: {
          ...(schoolId !== undefined && { schoolId }),
          ...(standardId !== undefined && { standardId }),
          ...(studentCode !== undefined && { studentCode }),
          ...(name !== undefined && { name }),
          ...(email !== undefined && { email }),
          ...(phone !== undefined && { phone }),
          ...(dateOfBirth !== undefined && {
            dateOfBirth: dateOfBirth
              ? new Date(dateOfBirth)
              : null,
          }),
        },
        include: {
          school: true,
          standard: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Student updated successfully",
        student,
      });
    } catch (error) {
      console.error("Updating student failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to update student",
      });
    }
  }
);

/* =========================
   DELETE STUDENT
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

      const id = req.params.id;

      if (!id || Array.isArray(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID",
        });
      }

      const existingStudent = await prisma.student.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
      });

      if (!existingStudent) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      await prisma.student.delete({
        where: {
          id,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Student deleted successfully",
      });
    } catch (error) {
      console.error("Deleting student failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to delete student",
      });
    }
  }
);

export default router;
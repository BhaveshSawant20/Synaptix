import { Router, Response } from "express";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import prisma from "../lib/prisma";

import authMiddleware, {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

/**
 * REGISTER
 * POST /api/auth/register
 */
router.post("/register", async (req, res) => {
  try {
    const { instituteName, adminName, email, password } = req.body;

    // Basic validation
    if (!instituteName || !adminName || !email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Institute name, admin name, email and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    // Check whether admin email already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: {
        email,
      },
    });

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create institute + admin together
    const result = await prisma.$transaction(async (tx) => {
      const institute = await tx.institute.create({
        data: {
          name: instituteName,
          email,
        },
      });

      const admin = await tx.admin.create({
        data: {
          instituteId: institute.id,
          name: adminName,
          email,
          passwordHash,
        },
      });

      return {
        institute,
        admin,
      };
    });

    return res.status(201).json({
      success: true,
      message: "Institute registered successfully",
      institute: {
        id: result.institute.id,
        name: result.institute.name,
        email: result.institute.email,
      },
      admin: {
        id: result.admin.id,
        name: result.admin.name,
        email: result.admin.email,
      },
    });
  } catch (error) {
    console.error("Registration failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to register institute",
    });
  }
});

/**
 * LOGIN
 * POST /api/auth/login
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find admin account
    const admin = await prisma.admin.findUnique({
      where: {
        email,
      },
      include: {
        institute: true,
      },
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Compare entered password with stored hash
    const passwordMatch = await bcrypt.compare(
      password,
      admin.passwordHash,
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Successful login
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not defined");
    }

    const token = jwt.sign(
      {
        adminId: admin.id,
        instituteId: admin.institute.id,
      },
      jwtSecret,
      {
        expiresIn: "7d",
      },
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
      },
      institute: {
        id: admin.institute.id,
        name: admin.institute.name,
        email: admin.institute.email,
        logoUrl: admin.institute.logoUrl,
        bannerUrl: admin.institute.bannerUrl,
      },
    });
  } catch (error) {
    console.error("Login failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to process login",
    });
  }
});

/**
 * GET CURRENT AUTHENTICATED ADMIN
 * GET /api/auth/me
 */
router.get(
  "/me",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.adminId || !req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Authentication information is missing",
        });
      }

      const admin = await prisma.admin.findFirst({
        where: {
          id: req.adminId,
          instituteId: req.instituteId,
        },
        include: {
          institute: true,
        },
      });

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin account not found",
        });
      }

      return res.status(200).json({
        success: true,
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
        },
        institute: {
          id: admin.institute.id,
          name: admin.institute.name,
          email: admin.institute.email,
          logoUrl: admin.institute.logoUrl,
          bannerUrl: admin.institute.bannerUrl,
        },
      });
    } catch (error) {
      console.error("Fetching authenticated admin failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to fetch authenticated user",
      });
    }
  },
);

/**
 * UPDATE ADMIN ACCOUNT
 * PATCH /api/auth/account
 *
 * Allows the authenticated admin to update:
 * - Admin name
 * - Admin email
 */
router.patch(
  "/account",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.adminId || !req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Authentication information is missing",
        });
      }

      const { name, email } = req.body;

      // Basic validation
      if (!name || !email) {
        return res.status(400).json({
          success: false,
          message: "Admin name and email are required",
        });
      }

      // Find current admin
      const currentAdmin = await prisma.admin.findFirst({
        where: {
          id: req.adminId,
          instituteId: req.instituteId,
        },
      });

      if (!currentAdmin) {
        return res.status(404).json({
          success: false,
          message: "Admin account not found",
        });
      }

      // Check whether another admin already uses this email
      const existingAdmin = await prisma.admin.findFirst({
        where: {
          email,
          NOT: {
            id: req.adminId,
          },
        },
      });

      if (existingAdmin) {
        return res.status(409).json({
          success: false,
          message: "Another account already uses this email address",
        });
      }

      // Update admin account
      const updatedAdmin = await prisma.admin.update({
        where: {
          id: req.adminId,
        },
        data: {
          name: name.trim(),
          email: email.trim(),
        },
      });

      return res.status(200).json({
        success: true,
        message: "Account updated successfully",
        admin: {
          id: updatedAdmin.id,
          name: updatedAdmin.name,
          email: updatedAdmin.email,
        },
      });
    } catch (error) {
      console.error("Updating admin account failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to update account",
      });
    }
  },
);

/**
 * CHANGE ADMIN PASSWORD
 * PATCH /api/auth/password
 *
 * Requires:
 * - Current password
 * - New password
 */
router.patch(
  "/password",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.adminId || !req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Authentication information is missing",
        });
      }

      const { currentPassword, newPassword } = req.body;

      // Basic validation
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password and new password are required",
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 8 characters long",
        });
      }

      // Find authenticated admin
      const admin = await prisma.admin.findFirst({
        where: {
          id: req.adminId,
          instituteId: req.instituteId,
        },
      });

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin account not found",
        });
      }

      // Verify current password
      const currentPasswordMatch = await bcrypt.compare(
        currentPassword,
        admin.passwordHash,
      );

      if (!currentPasswordMatch) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Prevent using the same password
      const samePassword = await bcrypt.compare(
        newPassword,
        admin.passwordHash,
      );

      if (samePassword) {
        return res.status(400).json({
          success: false,
          message: "New password must be different from the current password",
        });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      // Update password
      await prisma.admin.update({
        where: {
          id: admin.id,
        },
        data: {
          passwordHash: newPasswordHash,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Changing admin password failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to change password",
      });
    }
  },
);

/**
 * GET INSTITUTE
 * GET /api/auth/institute
 */
router.get(
  "/institute",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const institute = await prisma.institute.findUnique({
        where: {
          id: req.instituteId,
        },
      });

      if (!institute) {
        return res.status(404).json({
          success: false,
          message: "Institute not found",
        });
      }

      return res.status(200).json({
        success: true,
        institute: {
          id: institute.id,
          name: institute.name,
          email: institute.email,
          logoUrl: institute.logoUrl,
          bannerUrl: institute.bannerUrl,
        },
      });
    } catch (error) {
      console.error("Fetching institute failed:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to fetch institute",
      });
    }
  },
);

export default router;
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  adminId?: string;
  instituteId?: string;
}

interface JwtPayload {
  adminId: string;
  instituteId: string;
}

const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required",
      });
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error("JWT_SECRET is not defined");

      return res.status(500).json({
        success: false,
        message: "Server authentication configuration is missing",
      });
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    if (!decoded.adminId || !decoded.instituteId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    req.adminId = decoded.adminId;
    req.instituteId = decoded.instituteId;

    next();
  } catch (error) {
    console.error("Authentication failed:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
};

export default authMiddleware;
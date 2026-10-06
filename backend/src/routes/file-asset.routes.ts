import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";

import prisma from "../lib/prisma";

import authMiddleware, {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

import {
  uploadFileToSupabase,
  createSignedFileUrl,
  deleteFileFromSupabase,
} from "../services/supabase-storage.service";

const router = Router();

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      return callback(
        new Error("Only JPG, PNG, and PDF files are allowed."),
      );
    }

    callback(null, true);
  },
});

const uploadSingleFile = upload.single("file");

/**
 * Safely execute multer middleware so upload errors
 * are returned as normal API responses.
 */
function handleUpload(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  uploadSingleFile(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File size cannot exceed 15 MB.",
        });
      }

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error) {
      return res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "File upload failed.",
      });
    }

    next();
  });
}

/**
 * Add a temporary signed URL to a FileAsset.
 *
 * storageUrl in the database stores the Supabase storage path,
 * while signedUrl is generated only when the file is requested.
 */
async function withSignedUrl(fileAsset: any) {
  let signedUrl: string | null = null;

  if (
    fileAsset.storageUrl &&
    !String(fileAsset.storageUrl).startsWith("http")
  ) {
    try {
      signedUrl = await createSignedFileUrl(
        String(fileAsset.storageUrl),
        3600,
      );
    } catch (error) {
      console.error("Signed URL generation error:", error);
    }
  } else if (fileAsset.storageUrl) {
    // Preserve older metadata-only records that may contain
    // an external URL.
    signedUrl = String(fileAsset.storageUrl);
  }

  return {
    ...fileAsset,
    signedUrl,
  };
}

/**
 * Check whether a stored path belongs to this institute.
 *
 * This prevents accidentally deleting a file outside the
 * authenticated institute's storage folder.
 */
function isInstituteStoragePath(
  storagePath: string,
  instituteId: string,
) {
  return (
    !storagePath.startsWith("http") &&
    storagePath.startsWith(`${instituteId}/`)
  );
}

/**
 * CREATE FILE ASSET
 *
 * POST /api/file-assets
 *
 * Content-Type:
 * multipart/form-data
 *
 * Form field:
 * file
 *
 * Optional fields:
 * entityType
 * entityId
 */
router.post(
  "/",
  authMiddleware,
  handleUpload,
  async (req: AuthenticatedRequest, res: Response) => {
    let uploadedStoragePath: string | null = null;

    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "File is required.",
        });
      }

      const entityType = req.body.entityType
        ? String(req.body.entityType).trim()
        : null;

      const entityId = req.body.entityId
        ? String(req.body.entityId).trim()
        : null;

      const uploadedFile = await uploadFileToSupabase(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        req.instituteId,
      );

      uploadedStoragePath = uploadedFile.path;

      const fileAsset = await prisma.fileAsset.create({
        data: {
          instituteId: req.instituteId,

          // Do not trust uploadedById from the browser.
          // The current auth middleware does not expose an adminId
          // field in the established route contract, so this remains null.
          uploadedById: null,

          fileName: uploadedFile.fileName,

          fileType: req.file.mimetype,

          fileSize: req.file.size,

          // Store the private Supabase storage path,
          // not a permanent public URL.
          storageUrl: uploadedFile.path,

          entityType,

          entityId,
        },
      });

      const responseFile = await withSignedUrl(fileAsset);

      return res.status(201).json({
        success: true,
        message: "File uploaded successfully",
        data: responseFile,
      });
    } catch (error) {
      console.error("Create file asset error:", error);

      // If database creation fails after Supabase upload,
      // clean up the uploaded object.
      if (uploadedStoragePath && req.instituteId) {
        try {
          await deleteFileFromSupabase(uploadedStoragePath);
        } catch (cleanupError) {
          console.error(
            "Supabase cleanup error:",
            cleanupError,
          );
        }
      }

      return res.status(500).json({
        success: false,
        message: "Failed to upload file",
      });
    }
  },
);

/**
 * GET ALL FILE ASSETS
 *
 * GET /api/file-assets
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

      const fileAssets = await prisma.fileAsset.findMany({
        where: {
          instituteId: req.instituteId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const data = await Promise.all(
        fileAssets.map(withSignedUrl),
      );

      return res.status(200).json({
        success: true,
        count: data.length,
        data,
      });
    } catch (error) {
      console.error("Get file assets error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch file assets",
      });
    }
  },
);

/**
 * GET FILE ASSETS BY ENTITY
 *
 * GET /api/file-assets/entity/:entityType/:entityId
 */
router.get(
  "/entity/:entityType/:entityId",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message: "Institute information is missing",
        });
      }

      const entityType = String(req.params.entityType);
      const entityId = String(req.params.entityId);

      const fileAssets = await prisma.fileAsset.findMany({
        where: {
          instituteId: req.instituteId,
          entityType,
          entityId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const data = await Promise.all(
        fileAssets.map(withSignedUrl),
      );

      return res.status(200).json({
        success: true,
        count: data.length,
        data,
      });
    } catch (error) {
      console.error(
        "Get entity file assets error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch entity file assets",
      });
    }
  },
);

/**
 * GET FILE ASSET BY ID
 *
 * GET /api/file-assets/:id
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

      const fileAsset = await prisma.fileAsset.findFirst({
        where: {
          id,
          instituteId: req.instituteId,
        },
      });

      if (!fileAsset) {
        return res.status(404).json({
          success: false,
          message: "File asset not found",
        });
      }

      const data = await withSignedUrl(fileAsset);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error(
        "Get file asset by ID error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch file asset",
      });
    }
  },
);

/**
 * UPDATE FILE ASSET METADATA
 *
 * PUT /api/file-assets/:id
 *
 * This updates metadata only.
 * Actual file replacement will be handled separately.
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

      const existingFileAsset =
        await prisma.fileAsset.findFirst({
          where: {
            id,
            instituteId: req.instituteId,
          },
        });

      if (!existingFileAsset) {
        return res.status(404).json({
          success: false,
          message: "File asset not found",
        });
      }

      const {
        fileName,
        fileType,
        fileSize,
        entityType,
        entityId,
      } = req.body;

      if (
        fileSize !== undefined &&
        fileSize !== null &&
        fileSize !== "" &&
        (!Number.isInteger(Number(fileSize)) ||
          Number(fileSize) < 0)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "File size must be a non-negative integer",
        });
      }

      const fileAsset = await prisma.fileAsset.update({
        where: {
          id,
        },
        data: {
          ...(fileName !== undefined && {
            fileName: String(fileName).trim(),
          }),

          ...(fileType !== undefined && {
            fileType: String(fileType).trim(),
          }),

          ...(fileSize !== undefined && {
            fileSize:
              fileSize === null || fileSize === ""
                ? null
                : Number(fileSize),
          }),

          ...(entityType !== undefined && {
            entityType: entityType
              ? String(entityType).trim()
              : null,
          }),

          ...(entityId !== undefined && {
            entityId: entityId
              ? String(entityId).trim()
              : null,
          }),
        },
      });

      const data = await withSignedUrl(fileAsset);

      return res.status(200).json({
        success: true,
        message: "File asset updated successfully",
        data,
      });
    } catch (error) {
      console.error("Update file asset error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update file asset",
      });
    }
  },
);

/**
 * DELETE FILE ASSET
 *
 * DELETE /api/file-assets/:id
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

      const existingFileAsset =
        await prisma.fileAsset.findFirst({
          where: {
            id,
            instituteId: req.instituteId,
          },
        });

      if (!existingFileAsset) {
        return res.status(404).json({
          success: false,
          message: "File asset not found",
        });
      }

      // Delete the physical file from Supabase only when
      // the stored path belongs to this institute.
      if (
        existingFileAsset.storageUrl &&
        isInstituteStoragePath(
          existingFileAsset.storageUrl,
          req.instituteId,
        )
      ) {
        try {
          await deleteFileFromSupabase(
            existingFileAsset.storageUrl,
          );
        } catch (storageError) {
          console.error(
            "Supabase file deletion error:",
            storageError,
          );

          return res.status(500).json({
            success: false,
            message:
              "File could not be removed from storage",
          });
        }
      }

      await prisma.fileAsset.delete({
        where: {
          id,
        },
      });

      return res.status(200).json({
        success: true,
        message: "File asset deleted successfully",
      });
    } catch (error) {
      console.error("Delete file asset error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete file asset",
      });
    }
  },
);

export default router;
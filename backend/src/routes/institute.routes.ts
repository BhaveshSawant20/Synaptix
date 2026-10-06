import {
  Router,
  Request,
  Response,
  NextFunction,
} from "express";
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

const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15 MB

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_IMAGE_SIZE,
  },

  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return callback(
        new Error(
          "Only JPG, PNG, and WebP images are allowed.",
        ),
      );
    }

    callback(null, true);
  },
});

const uploadProfileImages = upload.fields([
  {
    name: "logo",
    maxCount: 1,
  },
  {
    name: "logoOriginal",
    maxCount: 1,
  },
  {
    name: "banner",
    maxCount: 1,
  },
  {
    name: "bannerOriginal",
    maxCount: 1,
  },
]);

function handleProfileUpload(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  uploadProfileImages(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Image size cannot exceed 15 MB.",
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
            : "Image upload failed.",
      });
    }

    next();
  });
}

/**
 * Generate a temporary signed URL for a private
 * Supabase storage path.
 */
async function getSignedUrl(
  storagePath: string | null,
) {
  if (!storagePath) {
    return null;
  }

  if (storagePath.startsWith("http")) {
    return storagePath;
  }

  try {
    return await createSignedFileUrl(
      storagePath,
      3600,
    );
  } catch (error) {
    console.error(
      "Institute profile signed URL error:",
      error,
    );

    return null;
  }
}

/**
 * Parse crop state safely.
 *
 * Crop state is stored as JSON in Prisma.
 */
function parseCropState(
  value: unknown,
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    throw new Error(
      "Invalid image crop state.",
    );
  }
}

/**
 * GET INSTITUTE PROFILE
 *
 * GET /api/institute/profile
 */
router.get(
  "/profile",
  authMiddleware,
  async (
    req: AuthenticatedRequest,
    res: Response,
  ) => {
    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message:
            "Institute information is missing",
        });
      }

      const institute =
        await prisma.institute.findUnique({
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

      const [
        logoSignedUrl,
        logoOriginalSignedUrl,
        bannerSignedUrl,
        bannerOriginalSignedUrl,
      ] = await Promise.all([
        getSignedUrl(institute.logoUrl),
        getSignedUrl(institute.logoOriginalUrl),
        getSignedUrl(institute.bannerUrl),
        getSignedUrl(
          institute.bannerOriginalUrl,
        ),
      ]);

      return res.status(200).json({
        success: true,

        institute: {
          id: institute.id,
          name: institute.name,
          email: institute.email,
          phone: institute.phone,

          logoUrl: institute.logoUrl,
          logoOriginalUrl:
            institute.logoOriginalUrl,
          logoCropState:
            institute.logoCropState,
          logoSignedUrl,
          logoOriginalSignedUrl,

          bannerUrl: institute.bannerUrl,
          bannerOriginalUrl:
            institute.bannerOriginalUrl,
          bannerCropState:
            institute.bannerCropState,
          bannerSignedUrl,
          bannerOriginalSignedUrl,

          address: institute.address,
          city: institute.city,
          state: institute.state,
        },
      });
    } catch (error) {
      console.error(
        "Get institute profile error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch institute profile",
      });
    }
  },
);

/**
 * PATCH INSTITUTE PROFILE
 *
 * PATCH /api/institute/profile
 *
 * multipart/form-data
 *
 * Text fields:
 * instituteName
 * email
 * phone
 * address
 * city
 * state
 * logoCropState
 * bannerCropState
 *
 * Files:
 * logo
 * logoOriginal
 * banner
 * bannerOriginal
 */
router.patch(
  "/profile",
  authMiddleware,
  handleProfileUpload,
  async (
    req: AuthenticatedRequest,
    res: Response,
  ) => {
    const uploadedPaths: string[] = [];

    try {
      if (!req.instituteId) {
        return res.status(401).json({
          success: false,
          message:
            "Institute information is missing",
        });
      }

      const instituteId = req.instituteId;

      const existingInstitute =
        await prisma.institute.findUnique({
          where: {
            id: instituteId,
          },
        });

      if (!existingInstitute) {
        return res.status(404).json({
          success: false,
          message: "Institute not found",
        });
      }

      const {
        instituteName,
        email,
        phone,
        address,
        city,
        state,
        logoCropState,
        bannerCropState,
      } = req.body;

      /*
       * Basic validation.
       */
      if (
        instituteName !== undefined &&
        !String(instituteName).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Institute name cannot be empty",
        });
      }

      if (
        email !== undefined &&
        !String(email).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Institute email cannot be empty",
        });
      }

      /*
       * Parse crop state.
       */
      let parsedLogoCropState;
      let parsedBannerCropState;

      try {
        parsedLogoCropState =
          parseCropState(logoCropState);

        parsedBannerCropState =
          parseCropState(
            bannerCropState,
          );
      } catch (error) {
        return res.status(400).json({
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Invalid image crop state.",
        });
      }

      /*
       * Get uploaded files.
       */
      const files = req.files as
        | {
            [fieldname: string]: Express.Multer.File[];
          }
        | undefined;

      const logoFile =
        files?.logo?.[0];

      const logoOriginalFile =
        files?.logoOriginal?.[0];

      const bannerFile =
        files?.banner?.[0];

      const bannerOriginalFile =
        files?.bannerOriginal?.[0];

      let newLogoPath: string | null =
        null;

      let newLogoOriginalPath:
        | string
        | null = null;

      let newBannerPath: string | null =
        null;

      let newBannerOriginalPath:
        | string
        | null = null;

      /*
       * Upload cropped logo.
       */
      if (logoFile) {
        const uploadedLogo =
          await uploadFileToSupabase(
            logoFile.buffer,
            logoFile.originalname,
            logoFile.mimetype,
            instituteId,
          );

        newLogoPath =
          uploadedLogo.path;

        uploadedPaths.push(
          uploadedLogo.path,
        );
      }

      /*
       * Upload original logo only when
       * a brand-new source image was supplied.
       */
      if (logoOriginalFile) {
        const uploadedLogoOriginal =
          await uploadFileToSupabase(
            logoOriginalFile.buffer,
            logoOriginalFile.originalname,
            logoOriginalFile.mimetype,
            instituteId,
          );

        newLogoOriginalPath =
          uploadedLogoOriginal.path;

        uploadedPaths.push(
          uploadedLogoOriginal.path,
        );
      }

      /*
       * Upload cropped banner.
       */
      if (bannerFile) {
        const uploadedBanner =
          await uploadFileToSupabase(
            bannerFile.buffer,
            bannerFile.originalname,
            bannerFile.mimetype,
            instituteId,
          );

        newBannerPath =
          uploadedBanner.path;

        uploadedPaths.push(
          uploadedBanner.path,
        );
      }

      /*
       * Upload original banner only when
       * a brand-new source image was supplied.
       */
      if (bannerOriginalFile) {
        const uploadedBannerOriginal =
          await uploadFileToSupabase(
            bannerOriginalFile.buffer,
            bannerOriginalFile.originalname,
            bannerOriginalFile.mimetype,
            instituteId,
          );

        newBannerOriginalPath =
          uploadedBannerOriginal.path;

        uploadedPaths.push(
          uploadedBannerOriginal.path,
        );
      }

      /*
       * Update institute.
       *
       * Important:
       *
       * logoUrl/bannerUrl
       * = current displayed crop
       *
       * logoOriginalUrl/bannerOriginalUrl
       * = untouched master source
       *
       * logoCropState/bannerCropState
       * = last saved editor state
       */
      const updatedInstitute =
        await prisma.institute.update({
          where: {
            id: instituteId,
          },

          data: {
            ...(instituteName !==
              undefined && {
              name: String(
                instituteName,
              ).trim(),
            }),

            ...(email !== undefined && {
              email: String(email).trim(),
            }),

            ...(phone !== undefined && {
              phone:
                String(phone).trim() ||
                null,
            }),

            ...(address !==
              undefined && {
              address:
                String(address).trim() ||
                null,
            }),

            ...(city !== undefined && {
              city:
                String(city).trim() ||
                null,
            }),

            ...(state !== undefined && {
              state:
                String(state).trim() ||
                null,
            }),

            ...(newLogoPath && {
              logoUrl: newLogoPath,
            }),

            ...(newLogoOriginalPath && {
              logoOriginalUrl:
                newLogoOriginalPath,
            }),

            ...(parsedLogoCropState !==
              undefined && {
              logoCropState:
                parsedLogoCropState,
            }),

            ...(newBannerPath && {
              bannerUrl: newBannerPath,
            }),

            ...(newBannerOriginalPath && {
              bannerOriginalUrl:
                newBannerOriginalPath,
            }),

            ...(parsedBannerCropState !==
              undefined && {
              bannerCropState:
                parsedBannerCropState,
            }),
          },
        });

      /*
       * New logo source uploaded:
       *
       * Delete both previous current crop and
       * previous original master.
       */
      if (
        newLogoOriginalPath
      ) {
        if (
          existingInstitute.logoUrl &&
          !existingInstitute.logoUrl.startsWith(
            "http",
          )
        ) {
          try {
            await deleteFileFromSupabase(
              existingInstitute.logoUrl,
            );
          } catch (error) {
            console.error(
              "Old institute logo cleanup failed:",
              error,
            );
          }
        }

        if (
          existingInstitute.logoOriginalUrl &&
          !existingInstitute.logoOriginalUrl.startsWith(
            "http",
          )
        ) {
          try {
            await deleteFileFromSupabase(
              existingInstitute.logoOriginalUrl,
            );
          } catch (error) {
            console.error(
              "Old institute original logo cleanup failed:",
              error,
            );
          }
        }
      } else if (
        newLogoPath &&
        existingInstitute.logoUrl &&
        !existingInstitute.logoUrl.startsWith(
          "http",
        )
      ) {
        /*
         * Existing original master remains.
         * Only replace the currently displayed crop.
         */
        try {
          await deleteFileFromSupabase(
            existingInstitute.logoUrl,
          );
        } catch (error) {
          console.error(
            "Old institute logo crop cleanup failed:",
            error,
          );
        }
      }

      /*
       * New banner source uploaded:
       *
       * Delete both previous current crop and
       * previous original master.
       */
      if (
        newBannerOriginalPath
      ) {
        if (
          existingInstitute.bannerUrl &&
          !existingInstitute.bannerUrl.startsWith(
            "http",
          )
        ) {
          try {
            await deleteFileFromSupabase(
              existingInstitute.bannerUrl,
            );
          } catch (error) {
            console.error(
              "Old institute banner cleanup failed:",
              error,
            );
          }
        }

        if (
          existingInstitute.bannerOriginalUrl &&
          !existingInstitute.bannerOriginalUrl.startsWith(
            "http",
          )
        ) {
          try {
            await deleteFileFromSupabase(
              existingInstitute.bannerOriginalUrl,
            );
          } catch (error) {
            console.error(
              "Old institute original banner cleanup failed:",
              error,
            );
          }
        }
      } else if (
        newBannerPath &&
        existingInstitute.bannerUrl &&
        !existingInstitute.bannerUrl.startsWith(
          "http",
        )
      ) {
        /*
         * Existing original master remains.
         * Only replace the currently displayed crop.
         */
        try {
          await deleteFileFromSupabase(
            existingInstitute.bannerUrl,
          );
        } catch (error) {
          console.error(
            "Old institute banner crop cleanup failed:",
            error,
          );
        }
      }

      /*
       * Generate signed URLs.
       */
      const [
        logoSignedUrl,
        logoOriginalSignedUrl,
        bannerSignedUrl,
        bannerOriginalSignedUrl,
      ] = await Promise.all([
        getSignedUrl(
          updatedInstitute.logoUrl,
        ),
        getSignedUrl(
          updatedInstitute.logoOriginalUrl,
        ),
        getSignedUrl(
          updatedInstitute.bannerUrl,
        ),
        getSignedUrl(
          updatedInstitute.bannerOriginalUrl,
        ),
      ]);

      return res.status(200).json({
        success: true,
        message:
          "Institute profile updated successfully",

        institute: {
          id: updatedInstitute.id,
          name: updatedInstitute.name,
          email: updatedInstitute.email,
          phone: updatedInstitute.phone,

          logoUrl:
            updatedInstitute.logoUrl,
          logoOriginalUrl:
            updatedInstitute.logoOriginalUrl,
          logoCropState:
            updatedInstitute.logoCropState,
          logoSignedUrl,
          logoOriginalSignedUrl,

          bannerUrl:
            updatedInstitute.bannerUrl,
          bannerOriginalUrl:
            updatedInstitute.bannerOriginalUrl,
          bannerCropState:
            updatedInstitute.bannerCropState,
          bannerSignedUrl,
          bannerOriginalSignedUrl,

          address:
            updatedInstitute.address,
          city: updatedInstitute.city,
          state: updatedInstitute.state,
        },
      });
    } catch (error: any) {
      console.error(
        "Update institute profile error:",
        error,
      );

      /*
       * If database update failed after Supabase
       * uploads, remove every newly uploaded file.
       */
      if (uploadedPaths.length > 0) {
        for (const storagePath of uploadedPaths) {
          try {
            await deleteFileFromSupabase(
              storagePath,
            );
          } catch (cleanupError) {
            console.error(
              "Institute profile upload cleanup failed:",
              cleanupError,
            );
          }
        }
      }

      /*
       * Prisma unique constraint violation.
       */
      if (error?.code === "P2002") {
        return res.status(409).json({
          success: false,
          message:
            "An institute with this email already exists.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Failed to update institute profile",
      });
    }
  },
);

export default router;
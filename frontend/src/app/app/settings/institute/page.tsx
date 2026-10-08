"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ImageCropModal from "../../components/ImageCropModal";

import { API_BASE_URL } from "@/lib/api";

type CropPosition = {
  x: number;
  y: number;
};

type CropState = {
  crop: CropPosition;
  zoom: number;
  croppedAreaPixels: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
};

const DEFAULT_CROP_STATE: CropState = {
  crop: {
    x: 0,
    y: 0,
  },
  zoom: 1,
  croppedAreaPixels: null,
};

type InstituteProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  address: string | null;
  city: string | null;
  state: string | null;

  logoSignedUrl: string | null;
  bannerSignedUrl: string | null;

  logoOriginalUrl: string | null;
  bannerOriginalUrl: string | null;

  logoOriginalSignedUrl: string | null;
  bannerOriginalSignedUrl: string | null;

  logoCropState: CropState | null;
  bannerCropState: CropState | null;
};

function getInitials(name: string) {
  if (!name.trim()) return "IN";

  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function normalizeCropState(
  value: CropState | null | undefined,
): CropState {
  if (!value) {
    return {
      ...DEFAULT_CROP_STATE,
      crop: {
        ...DEFAULT_CROP_STATE.crop,
      },
    };
  }

  return {
    crop: {
      x: Number(value.crop?.x ?? 0),
      y: Number(value.crop?.y ?? 0),
    },
    zoom: Number(value.zoom ?? 1),
    croppedAreaPixels: value.croppedAreaPixels
      ? {
          x: Number(value.croppedAreaPixels.x ?? 0),
          y: Number(value.croppedAreaPixels.y ?? 0),
          width: Number(value.croppedAreaPixels.width ?? 0),
          height: Number(value.croppedAreaPixels.height ?? 0),
        }
      : null,
  };
}

export default function InstituteProfilePage() {
  const router = useRouter();
  /*
   * FINAL CROPPED FILE
   *
   * This is the image that will be uploaded to logoUrl/bannerUrl.
   */
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  /*
   * PREVIEW
   *
   * This always shows the currently selected/saved crop.
   */
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  /*
   * ORIGINAL MASTER SOURCE
   *
   * IMPORTANT:
   * These are NEVER replaced by the cropped preview.
   *
   * Example:
   *
   * Original image
   *      ↓
   * Crop at 1.5x
   *      ↓
   * logoPreview = cropped result
   *
   * But:
   *
   * logoOriginalSource = original full image
   *
   * Therefore Edit always opens the original master.
   */
  const [logoOriginalSource, setLogoOriginalSource] = useState<string | null>(
    null,
  );

  const [bannerOriginalSource, setBannerOriginalSource] = useState<
    string | null
  >(null);

  /*
   * NEW ORIGINAL FILE
   *
   * Only populated when the user uploads a completely new image.
   *
   * It is sent to the backend separately from the final cropped file.
   */
  const [logoOriginalFile, setLogoOriginalFile] = useState<File | null>(null);
  const [bannerOriginalFile, setBannerOriginalFile] =
    useState<File | null>(null);

  /*
   * SAVED CROP STATE
   *
   * This stores the exact crop position and zoom used for the current
   * saved preview.
   */
  const [logoCropState, setLogoCropState] =
    useState<CropState>(DEFAULT_CROP_STATE);

  const [bannerCropState, setBannerCropState] =
    useState<CropState>(DEFAULT_CROP_STATE);

  const [cropType, setCropType] = useState<"logo" | "banner" | null>(null);
  const [cropImage, setCropImage] = useState<string | null>(null);

  const [instituteName, setInstituteName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("synaptix_token");

        if (!token) {
          router.push("/login");
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/api/institute/profile`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();

        if (response.status === 401) {
          localStorage.removeItem("synaptix_token");
          router.push("/login");
          return;
        }

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Failed to load institute profile",
          );
        }

        const institute: InstituteProfile = data.institute;

        setInstituteName(institute.name || "");
        setEmail(institute.email || "");
        setPhone(institute.phone || "");
        setAddress(institute.address || "");
        setCity(institute.city || "");
        setState(institute.state || "");

        /*
         * CURRENT SAVED CROPPED PREVIEW
         */
        const logoUrl = institute.logoSignedUrl || null;
        const bannerUrl = institute.bannerSignedUrl || null;

        setLogoPreview(logoUrl);
        setBannerPreview(bannerUrl);

        /*
         * ORIGINAL MASTER
         *
         * New backend:
         *   logoOriginalSignedUrl
         *
         * Legacy fallback:
         *   logoSignedUrl
         *
         * The fallback is necessary for institutes created before the
         * original-image system existed.
         */
        const logoOriginal =
          institute.logoOriginalSignedUrl || logoUrl;

        const bannerOriginal =
          institute.bannerOriginalSignedUrl || bannerUrl;

        setLogoOriginalSource(logoOriginal);
        setBannerOriginalSource(bannerOriginal);

        /*
         * Restore the previously saved crop position + zoom.
         */
        setLogoCropState(
          normalizeCropState(institute.logoCropState),
        );

        setBannerCropState(
          normalizeCropState(institute.bannerCropState),
        );
      } catch (err) {
        console.error("Failed to load institute profile:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load institute profile",
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  function handleLogoChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    /*
     * A completely new image becomes the new master source.
     */
    const originalUrl = URL.createObjectURL(file);

    /*
     * Clean up previous temporary logo master.
     */
    if (logoOriginalSource?.startsWith("blob:")) {
      URL.revokeObjectURL(logoOriginalSource);
    }

    /*
     * If there is a previous temporary cropped preview, clean it too.
     */
    if (logoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreview);
    }

    setLogoOriginalFile(file);
    setLogoOriginalSource(originalUrl);

    /*
     * New image always starts at 1x / center.
     */
    setLogoCropState({
      ...DEFAULT_CROP_STATE,
      crop: {
        ...DEFAULT_CROP_STATE.crop,
      },
    });

    setCropType("logo");
    setCropImage(originalUrl);

    setSuccess("");
    setError("");

    event.target.value = "";
  }

  function handleBannerChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    /*
     * A completely new image becomes the new master source.
     */
    const originalUrl = URL.createObjectURL(file);

    /*
     * Clean up previous temporary banner master.
     */
    if (bannerOriginalSource?.startsWith("blob:")) {
      URL.revokeObjectURL(bannerOriginalSource);
    }

    /*
     * Clean up previous temporary cropped preview.
     */
    if (bannerPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(bannerPreview);
    }

    setBannerOriginalFile(file);
    setBannerOriginalSource(originalUrl);

    /*
     * New image starts at 1x / center.
     */
    setBannerCropState({
      ...DEFAULT_CROP_STATE,
      crop: {
        ...DEFAULT_CROP_STATE.crop,
      },
    });

    setCropType("banner");
    setCropImage(originalUrl);

    setSuccess("");
    setError("");

    event.target.value = "";
  }

  function handleEditLogo() {
    if (!logoOriginalSource) return;

    /*
     * IMPORTANT:
     *
     * Edit ALWAYS opens the ORIGINAL MASTER.
     *
     * The previous crop + zoom are supplied separately.
     */
    setCropType("logo");
    setCropImage(logoOriginalSource);

    setSuccess("");
    setError("");
  }

  function handleEditBanner() {
    if (!bannerOriginalSource) return;

    /*
     * IMPORTANT:
     *
     * Edit ALWAYS opens the ORIGINAL MASTER.
     *
     * The previous crop + zoom are supplied separately.
     */
    setCropType("banner");
    setCropImage(bannerOriginalSource);

    setSuccess("");
    setError("");
  }

  function closeCropper() {
    /*
     * Do not revoke the original source here.
     *
     * It may be:
     * - the currently loaded original master
     * - a newly uploaded blob URL
     *
     * The original source must remain available for future Edit actions.
     */
    setCropImage(null);
    setCropType(null);
  }

  function handleCropApply(
    file: File,
    cropState: CropState,
  ) {
    const previewUrl = URL.createObjectURL(file);

    if (cropType === "logo") {
      /*
       * Clean up previous temporary cropped preview.
       */
      if (logoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview);
      }

      /*
       * Save the newly cropped result as the preview.
       */
      setLogoFile(file);
      setLogoPreview(previewUrl);

      /*
       * Save the crop state.
       *
       * This is what allows:
       *
       * Original
       *   ↓
       * 1.5x crop
       *   ↓
       * Save
       *   ↓
       * Edit
       *   ↓
       * Original opens at same 1.5x position
       */
      setLogoCropState(cropState);
    }

    if (cropType === "banner") {
      /*
       * Clean up previous temporary cropped preview.
       */
      if (bannerPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(bannerPreview);
      }

      setBannerFile(file);
      setBannerPreview(previewUrl);

      /*
       * Save the crop state.
       */
      setBannerCropState(cropState);
    }

    setSuccess("");
    setError("");

    /*
     * Do NOT revoke cropImage.
     *
     * If it is the original blob uploaded by the user, it is still
     * required as the master source for future Edit operations.
     */
    setCropImage(null);
    setCropType(null);
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const token = localStorage.getItem("synaptix_token");

      if (!token) {
        router.push("/login");
        return;
      }

      if (!instituteName.trim()) {
        setError("Institute name is required.");
        setSaving(false);
        return;
      }

      if (!email.trim()) {
        setError("Institute email is required.");
        setSaving(false);
        return;
      }

      const formData = new FormData();

      formData.append(
        "instituteName",
        instituteName.trim(),
      );

      formData.append("email", email.trim());
      formData.append("phone", phone.trim());
      formData.append("address", address.trim());
      formData.append("city", city.trim());
      formData.append("state", state.trim());

      /*
       * FINAL CROPPED FILE
       */
      if (logoFile) {
        formData.append("logo", logoFile);

        /*
         * NEW ORIGINAL MASTER
         *
         * Only send this when the user uploaded a new image.
         */
        if (logoOriginalFile) {
          formData.append("logoOriginal", logoOriginalFile);
        }

        /*
         * Send the crop state together with the cropped image.
         */
        formData.append(
          "logoCropState",
          JSON.stringify(logoCropState),
        );
      }

      if (bannerFile) {
        formData.append("banner", bannerFile);

        /*
         * NEW ORIGINAL MASTER
         */
        if (bannerOriginalFile) {
          formData.append(
            "bannerOriginal",
            bannerOriginalFile,
          );
        }

        /*
         * Send the crop state together with the cropped image.
         */
        formData.append(
          "bannerCropState",
          JSON.stringify(bannerCropState),
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/api/institute/profile`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        router.push("/login");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to update institute profile",
        );
      }

      const institute: InstituteProfile = data.institute;

      setInstituteName(institute.name || "");
      setEmail(institute.email || "");
      setPhone(institute.phone || "");
      setAddress(institute.address || "");
      setCity(institute.city || "");
      setState(institute.state || "");

      /*
       * SERVER-SAVED CURRENT CROPPED IMAGES
       */
      const newLogoUrl =
        institute.logoSignedUrl || null;

      const newBannerUrl =
        institute.bannerSignedUrl || null;

      /*
       * SERVER-SAVED ORIGINAL MASTER SOURCES
       */
      const newLogoOriginalUrl =
        institute.logoOriginalSignedUrl ||
        newLogoUrl;

      const newBannerOriginalUrl =
        institute.bannerOriginalSignedUrl ||
        newBannerUrl;

      /*
       * Clean up local blob URLs after the server has accepted
       * the changes.
       */
      if (logoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview);
      }

      if (bannerPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(bannerPreview);
      }

      if (logoOriginalSource?.startsWith("blob:")) {
        URL.revokeObjectURL(logoOriginalSource);
      }

      if (bannerOriginalSource?.startsWith("blob:")) {
        URL.revokeObjectURL(bannerOriginalSource);
      }

      /*
       * Replace local state with server-backed state.
       */
      setLogoPreview(newLogoUrl);
      setBannerPreview(newBannerUrl);

      setLogoOriginalSource(newLogoOriginalUrl);
      setBannerOriginalSource(newBannerOriginalUrl);

      setLogoCropState(
        normalizeCropState(institute.logoCropState),
      );

      setBannerCropState(
        normalizeCropState(institute.bannerCropState),
      );

      window.dispatchEvent(
        new CustomEvent("synaptix:institute-updated", {
          detail: {
            name: institute.name || "",
            logoSignedUrl: newLogoUrl,
            bannerSignedUrl: newBannerUrl,
          },
        }),
      );

      /*
       * Clear pending files.
       */
      setLogoFile(null);
      setBannerFile(null);

      setLogoOriginalFile(null);
      setBannerOriginalFile(null);

      setSuccess(
        "Institute profile updated successfully.",
      );
    } catch (err) {
      console.error(
        "Failed to save institute profile:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save institute profile",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="w-full px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" />
              <p className="mt-4 text-sm font-medium text-stone-500">
                Loading institute profile...
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const initials = getInitials(instituteName);

  return (
    <>
      {cropImage && cropType && (
        <ImageCropModal
          image={cropImage}
          aspect={cropType === "logo" ? 1 : 2.8}
          title={
            cropType === "logo"
              ? "Adjust institute logo"
              : "Adjust institute banner"
          }
          initialCrop={
            cropType === "logo"
              ? logoCropState.crop
              : bannerCropState.crop
          }
          initialZoom={
            cropType === "logo"
              ? logoCropState.zoom
              : bannerCropState.zoom
          }
          onCancel={closeCropper}
          onApply={handleCropApply}
        />
      )}

      <main className="w-full px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl space-y-6">
        {/* Back Link */}
        <Link
          href="/app/settings"
          className="group inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition duration-200 hover:text-orange-600"
        >
          <span className="transition-transform duration-200 group-hover:-translate-x-0.5">
            ←
          </span>
          Back to Settings
        </Link>

        {/* Header Banner */}
        <section className="relative overflow-hidden rounded-3xl border border-stone-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-8">
          <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-orange-100/50 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Institute Branding
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Customize Your Institute
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
              Configure your institute name, logo, hero banner, and operational address visible throughout your Synaptix workspace.
            </p>
          </div>
        </section>

        {/* Status messages */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            <span className="mt-0.5">!</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-700">
            <span className="mt-0.5">✓</span>
            <span>{success}</span>
          </div>
        )}

        <div className="grid w-full gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          {/* Main content */}
          <section className="min-w-0 space-y-6">
            {/* Branding */}
            <div className="overflow-hidden rounded-3xl border border-stone-200/80 bg-white/75 shadow-sm backdrop-blur-xl">
              <div className="border-b border-stone-100 px-6 py-6 sm:px-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-orange-600">
                    ✦
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600">
                      Branding
                    </p>

                    <h2 className="mt-1 text-xl font-semibold text-stone-900">
                      Institute identity
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-stone-500">
                      These images appear across your Synaptix
                      workspace.
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-7 sm:px-8">
                {/* Logo */}
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <label className="text-sm font-semibold text-stone-800">
                        Institute Logo
                      </label>

                      <p className="mt-1 text-xs text-stone-400">
                        Square PNG, JPG or WebP image.
                      </p>
                    </div>

                    {logoFile && (
                      <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-600">
                        Changes pending
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-stone-100 bg-stone-50/70 p-4 sm:flex-row sm:items-center">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Institute logo preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-bold text-orange-500">
                          {initials}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <label
                        htmlFor="logo"
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-stone-800"
                      >
                        <span>↑</span>
                        Upload Logo
                      </label>

                      <input
                        id="logo"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleLogoChange}
                      />

                      {logoOriginalSource && (
                        <button
                          type="button"
                          onClick={handleEditLogo}
                          className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-orange-700 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50"
                        >
                          <span>✎</span>
                          Edit Logo
                        </button>
                      )}

                      <div className="basis-full">
                        <p className="mt-1 text-xs text-stone-400">
                          Upload a new image or edit the currently
                          uploaded logo.
                        </p>

                        {logoFile && (
                          <p className="mt-1 max-w-[320px] truncate text-xs font-medium text-orange-600">
                            Selected: {logoFile.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Banner */}
                <div className="mt-8">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <label className="text-sm font-semibold text-stone-800">
                        Institute Banner
                      </label>

                      <p className="mt-1 text-xs text-stone-400">
                        Wide PNG, JPG or WebP image.
                      </p>
                    </div>

                    {bannerFile && (
                      <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-600">
                        Changes pending
                      </span>
                    )}
                  </div>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
                    <div className="relative h-48 overflow-hidden">
                      {bannerPreview ? (
                        <img
                          src={bannerPreview}
                          alt="Institute banner preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-orange-950">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-xl text-white backdrop-blur-md">
                                ▧
                              </div>

                              <p className="mt-3 text-sm font-semibold text-white/70">
                                No banner uploaded
                              </p>

                              <p className="mt-1 text-xs text-white/40">
                                Add a banner to personalize your workspace.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {bannerPreview && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      )}
                    </div>

                    <div className="border-t border-stone-200 bg-white p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <label
                          htmlFor="banner"
                          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-stone-800"
                        >
                          <span>↑</span>
                          Upload Banner
                        </label>

                        <input
                          id="banner"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={handleBannerChange}
                        />

                        {bannerOriginalSource && (
                          <button
                            type="button"
                            onClick={handleEditBanner}
                            className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-orange-700 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50"
                          >
                            <span>✎</span>
                            Edit Banner
                          </button>
                        )}

                        <div className="basis-full">
                          <p className="mt-1 text-xs text-stone-400">
                            Upload a new image or edit the currently
                            uploaded banner.
                          </p>

                          {bannerFile && (
                            <p className="mt-1 max-w-[420px] truncate text-xs font-medium text-orange-600">
                              Selected: {bannerFile.name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Institute details */}
            <div className="overflow-hidden rounded-3xl border border-stone-200/80 bg-white/75 shadow-sm backdrop-blur-xl">
              <div className="border-b border-stone-100 px-6 py-6 sm:px-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-orange-600">
                    ◉
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600">
                      Institute details
                    </p>

                    <h2 className="mt-1 text-xl font-semibold text-stone-900">
                      Basic information
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-stone-500">
                      Keep your institute information accurate and
                      up to date.
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-7 sm:px-8">
                <div className="grid gap-5 sm:grid-cols-2">
                  {/* Institute name */}
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="instituteName"
                      className="mb-2 block text-sm font-semibold text-stone-700"
                    >
                      Institute Name
                    </label>

                    <input
                      id="instituteName"
                      type="text"
                      value={instituteName}
                      onChange={(event) =>
                        setInstituteName(event.target.value)
                      }
                      placeholder="Enter institute name"
                      className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-300 hover:border-stone-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-semibold text-stone-700"
                    >
                      Institute Email
                    </label>

                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(event.target.value)
                      }
                      placeholder="institute@example.com"
                      className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-300 hover:border-stone-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label
                      htmlFor="phone"
                      className="mb-2 block text-sm font-semibold text-stone-700"
                    >
                      Phone Number
                    </label>

                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(event) =>
                        setPhone(event.target.value)
                      }
                      placeholder="Enter phone number"
                      className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-300 hover:border-stone-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  {/* Address */}
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="address"
                      className="mb-2 block text-sm font-semibold text-stone-700"
                    >
                      Address
                    </label>

                    <textarea
                      id="address"
                      value={address}
                      onChange={(event) =>
                        setAddress(event.target.value)
                      }
                      placeholder="Enter institute address"
                      rows={3}
                      className="w-full resize-none rounded-2xl border border-stone-200 bg-white px-4 py-3.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-300 hover:border-stone-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label
                      htmlFor="city"
                      className="mb-2 block text-sm font-semibold text-stone-700"
                    >
                      City
                    </label>

                    <input
                      id="city"
                      type="text"
                      value={city}
                      onChange={(event) =>
                        setCity(event.target.value)
                      }
                      placeholder="Mumbai"
                      className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-300 hover:border-stone-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  {/* State */}
                  <div>
                    <label
                      htmlFor="state"
                      className="mb-2 block text-sm font-semibold text-stone-700"
                    >
                      State
                    </label>

                    <input
                      id="state"
                      type="text"
                      value={state}
                      onChange={(event) =>
                        setState(event.target.value)
                      }
                      placeholder="Maharashtra"
                      className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-300 hover:border-stone-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>
                </div>

                {/* Save */}
                <div className="mt-7 flex flex-col gap-4 border-t border-stone-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-stone-400">
                    Changes apply across your Synaptix workspace.
                  </p>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-2xl bg-orange-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-orange-200/70 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    {saving ? "Saving Changes..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Preview */}
          <aside className="xl:sticky xl:top-6 xl:self-start">
            <div className="overflow-hidden rounded-3xl border border-stone-200/80 bg-white/75 shadow-sm backdrop-blur-xl">
              <div className="border-b border-stone-100 px-6 py-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-orange-600">
                    ◇
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600">
                      Preview
                    </p>

                    <h2 className="mt-1 text-xl font-semibold text-stone-900">
                      Workspace branding
                    </h2>
                  </div>
                </div>
              </div>

              {/* Banner */}
              <div className="relative h-44 overflow-hidden bg-stone-900">
                {bannerPreview ? (
                  <img
                    src={bannerPreview}
                    alt="Workspace banner preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-orange-950">
                    <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-orange-500/20 blur-3xl" />
                    <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-orange-500/10 blur-3xl" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
              </div>

              {/* Preview information */}
              <div className="relative px-6 pb-6">
                <div className="-mt-10 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-orange-50 shadow-lg">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Institute logo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold text-orange-600">
                      {initials}
                    </span>
                  )}
                </div>

                <h3 className="mt-4 text-lg font-semibold text-stone-900">
                  {instituteName || "Your Institute"}
                </h3>

                <p className="mt-1 text-sm text-stone-500">
                  {city || "City"}
                  {state ? `, ${state}` : ""}
                </p>

                <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-orange-500" />

                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-600">
                      Synaptix Workspace
                    </p>
                  </div>

                  <p className="mt-2 text-sm font-semibold text-stone-800">
                    Institute Admin
                  </p>

                  <p className="mt-1 text-xs leading-5 text-stone-500">
                    Your institute branding will appear throughout
                    the workspace.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
    </>
  );
}
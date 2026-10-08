"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { Area } from "react-easy-crop";

export type CropPosition = {
  x: number;
  y: number;
};

export type ImageCropState = {
  crop: CropPosition;
  zoom: number;
  croppedAreaPixels: Area | null;
};

type ImageCropModalProps = {
  image: string;
  aspect: number;
  title: string;

  initialCrop?: CropPosition;
  initialZoom?: number;

  onCancel: () => void;

  onApply: (
    file: File,
    cropState: ImageCropState,
  ) => void;
};

export default function ImageCropModal({
  image,
  aspect,
  title,
  initialCrop,
  initialZoom,
  onCancel,
  onApply,
}: ImageCropModalProps) {
  const [crop, setCrop] =
    useState<CropPosition>(
      initialCrop ?? {
        x: 0,
        y: 0,
      },
    );

  const [zoom, setZoom] =
    useState(
      initialZoom ?? 1,
    );

  const [
    croppedAreaPixels,
    setCroppedAreaPixels,
  ] = useState<Area | null>(null);

  const [processing, setProcessing] =
    useState(false);

  const [
    imageSource,
    setImageSource,
  ] = useState<string | null>(null);

  const [
    loadingImage,
    setLoadingImage,
  ] = useState(true);

  const [
    imageError,
    setImageError,
  ] = useState("");

  /*
   * Reset the editor whenever a new image/source
   * or saved crop state is supplied.
   */
  const [prevResetKey, setPrevResetKey] = useState(
    () => `${image}-${initialCrop?.x}-${initialCrop?.y}-${initialZoom}`
  );
  const currentResetKey = `${image}-${initialCrop?.x}-${initialCrop?.y}-${initialZoom}`;
  if (currentResetKey !== prevResetKey) {
    setPrevResetKey(currentResetKey);
    setCrop(
      initialCrop ?? {
        x: 0,
        y: 0,
      }
    );
    setZoom(initialZoom ?? 1);
    setCroppedAreaPixels(null);
  }

  /*
   * Load the image through a local object URL.
   *
   * This is important for existing Supabase
   * signed URLs and canvas processing.
   */
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function loadImage() {
      try {
        setLoadingImage(true);
        setImageError("");
        setImageSource(null);

        if (
          image.startsWith("blob:") ||
          image.startsWith("data:")
        ) {
          if (!cancelled) {
            setImageSource(image);
            setLoadingImage(false);
          }

          return;
        }

        const response = await fetch(image, {
          mode: "cors",
        });

        if (!response.ok) {
          throw new Error(
            "Failed to load image.",
          );
        }

        const blob =
          await response.blob();

        if (cancelled) return;

        objectUrl =
          URL.createObjectURL(blob);

        setImageSource(objectUrl);
        setLoadingImage(false);
      } catch (error) {
        console.error(
          "Failed to load image for cropping:",
          error,
        );

        if (cancelled) return;

        setImageSource(image);
        setLoadingImage(false);
        setImageError("");
      }
    }

    loadImage();

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(
          objectUrl,
        );
      }
    };
  }, [image]);

  const onCropComplete =
    useCallback(
      (
        _croppedArea: Area,
        croppedAreaPixels: Area,
      ) => {
        setCroppedAreaPixels(
          croppedAreaPixels,
        );
      },
      [],
    );

  async function createCroppedImage(): Promise<File> {
    if (!croppedAreaPixels) {
      throw new Error(
        "Please adjust the image before applying the crop.",
      );
    }

    if (!imageSource) {
      throw new Error(
        "Image is not ready.",
      );
    }

    const imageElement =
      new Image();

    imageElement.crossOrigin =
      "anonymous";

    imageElement.src =
      imageSource;

    await new Promise<void>(
      (resolve, reject) => {
        imageElement.onload = () =>
          resolve();

        imageElement.onerror = () =>
          reject(
            new Error(
              "Failed to load image for cropping.",
            ),
          );
      },
    );

    const canvas =
      document.createElement(
        "canvas",
      );

    const context =
      canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Unable to process the image.",
      );
    }

    canvas.width =
      croppedAreaPixels.width;

    canvas.height =
      croppedAreaPixels.height;

    /*
     * White background prevents
     * transparent/empty pixels.
     */
    context.fillStyle =
      "#ffffff";

    context.fillRect(
      0,
      0,
      canvas.width,
      canvas.height,
    );

    context.imageSmoothingEnabled =
      true;

    context.imageSmoothingQuality =
      "high";

    context.drawImage(
      imageElement,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
    );

    const blob =
      await new Promise<Blob | null>(
        (resolve) => {
          canvas.toBlob(
            resolve,
            "image/jpeg",
            0.92,
          );
        },
      );

    if (!blob) {
      throw new Error(
        "Failed to create cropped image.",
      );
    }

    const fileName =
      title
        .toLowerCase()
        .includes("logo")
        ? "synaptix-logo.jpg"
        : "synaptix-banner.jpg";

    return new File(
      [blob],
      fileName,
      {
        type: "image/jpeg",
      },
    );
  }

  async function handleApply() {
    try {
      setProcessing(true);
      setImageError("");

      const croppedFile =
        await createCroppedImage();

      const cropState: ImageCropState =
        {
          crop,
          zoom,
          croppedAreaPixels,
        };

      onApply(
        croppedFile,
        cropState,
      );
    } catch (error) {
      console.error(
        "Image crop failed:",
        error,
      );

      setImageError(
        error instanceof Error
          ? error.message
          : "Failed to process image.",
      );
    } finally {
      setProcessing(false);
    }
  }

  function handleReset() {
    setCrop({
      x: 0,
      y: 0,
    });

    setZoom(1);
    setCroppedAreaPixels(null);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/70 p-4 lg:pl-72 backdrop-blur-sm">
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-white px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600">
              Image Editor
            </p>

            <h2 className="mt-1 text-lg font-semibold text-stone-900">
              {title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-lg text-stone-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-50"
            aria-label="Close image editor"
          >
            ×
          </button>
        </div>

        {/* Editor */}
        <div className="min-h-0 flex-1 overflow-auto bg-stone-100 p-4 sm:p-6">
          {imageError ? (
            <div className="flex min-h-[360px] items-center justify-center">
              <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-center">
                <p className="text-sm font-semibold text-red-700">
                  Unable to edit image
                </p>

                <p className="mt-1 text-xs leading-5 text-red-600">
                  {imageError}
                </p>
              </div>
            </div>
          ) : loadingImage ||
            !imageSource ? (
            <div className="flex min-h-[360px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" />

                <p className="mt-4 text-sm font-medium text-stone-500">
                  Loading image...
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5">
              {/* Cropper */}
              <div className="relative h-[52vh] min-h-[320px] w-full overflow-hidden rounded-2xl border border-stone-300 bg-stone-900 shadow-inner">
                <Cropper
                  image={imageSource}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspect}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={
                    onCropComplete
                  }
                  restrictPosition={true}
                  showGrid={true}
                  classes={{
                    containerClassName:
                      "rounded-2xl",
                    cropAreaClassName:
                      "rounded-xl",
                  }}
                />
              </div>

              <p className="text-center text-xs text-stone-500">
                Drag the image to reposition it ·
                Use the slider to zoom
              </p>

              {/* Controls */}
              <div className="w-full max-w-xl rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setZoom(
                        (current) =>
                          Math.max(
                            1,
                            Number(
                              (
                                current -
                                0.1
                              ).toFixed(
                                2,
                              ),
                            ),
                          ),
                      )
                    }
                    disabled={zoom <= 1}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-lg font-semibold text-stone-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    −
                  </button>

                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={zoom}
                    onChange={(
                      event,
                    ) =>
                      setZoom(
                        Number(
                          event.target
                            .value,
                        ),
                      )
                    }
                    className="h-2 flex-1 cursor-pointer accent-orange-500"
                    aria-label="Zoom"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setZoom(
                        (current) =>
                          Math.min(
                            3,
                            Number(
                              (
                                current +
                                0.1
                              ).toFixed(
                                2,
                              ),
                            ),
                          ),
                      )
                    }
                    disabled={zoom >= 3}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-lg font-semibold text-stone-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    +
                  </button>

                  <span className="w-14 text-right text-xs font-semibold text-stone-500">
                    {Math.round(
                      zoom * 100,
                    )}
                    %
                  </span>
                </div>

                <div className="mt-3 flex justify-center">
                  <button
                    type="button"
                    onClick={
                      handleReset
                    }
                    className="text-xs font-semibold text-orange-600 transition hover:text-orange-700"
                  >
                    Reset position
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-3 border-t border-stone-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-stone-400">
            {aspect === 1
              ? "Square crop · Ideal for institute logos"
              : "Wide crop · Ideal for institute banners"}
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={processing}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={
                handleApply
              }
              disabled={
                loadingImage ||
                !imageSource ||
                processing ||
                Boolean(imageError)
              }
              className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing
                ? "Applying..."
                : "Apply Crop"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
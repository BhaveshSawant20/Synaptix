"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

interface FileAsset {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number | null;
  storageUrl: string;
  signedUrl?: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
}

import { API_BASE } from "@/lib/api";

const MAX_FILE_SIZE = 15 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
];

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("synaptix_token") || "";
}

function formatFileSize(bytes: number | null) {
  if (bytes === null || bytes === undefined) return "—";

  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value: string) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isPdf(file: FileAsset) {
  return file.fileType === "application/pdf";
}

function isImage(file: FileAsset) {
  return (
    file.fileType === "image/jpeg" ||
    file.fileType === "image/png"
  );
}

function getFileLabel(file: FileAsset) {
  if (isPdf(file)) return "PDF";
  if (file.fileType === "image/png") return "PNG";
  if (file.fileType === "image/jpeg") return "JPG";
  return file.fileType || "File";
}

export default function FileAssetsPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileAsset[]>([]);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");

  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const [selectedUpload, setSelectedUpload] = useState<File | null>(null);

  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [viewerFile, setViewerFile] = useState<FileAsset | null>(null);

  const [imageZoom, setImageZoom] = useState(1);

  const [imagePosition, setImagePosition] = useState({
    x: 0,
    y: 0,
  });

  const [isDraggingImage, setIsDraggingImage] = useState(false);

  const imageDragStart = useRef({
    x: 0,
    y: 0,
  });

  const imagePositionStart = useRef({
    x: 0,
    y: 0,
  });

  const pinchStartDistance = useRef<number | null>(null);
  const pinchStartZoom = useRef(1);

  const [deleteFile, setDeleteFile] = useState<FileAsset | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadFiles(isInitial = false) {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    try {
      if (!isInitial) {
        setLoading(true);
        setError("");
      }

      const response = await fetch(`${API_BASE}/file-assets`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        router.push("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to load file assets.",
        );
      }

      const items = Array.isArray(data?.data) ? data.data : [];

      setFiles(items);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load file assets.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    async function init() {
      if (!ignore) {
        await loadFiles(true);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  const fileTypes = useMemo(() => {
    return Array.from(
      new Set(files.map((file) => file.fileType).filter(Boolean)),
    ).sort();
  }, [files]);

  const filteredFiles = useMemo(() => {
    const query = search.trim().toLowerCase();

    return files.filter((file) => {
      const matchesSearch =
        !query ||
        [
          file.fileName,
          file.fileType,
          file.entityType || "",
          file.entityId || "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesType = !typeFilter || file.fileType === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [files, search, typeFilter]);

  const stats = useMemo(() => {
    const totalBytes = files.reduce(
      (sum, file) => sum + (file.fileSize || 0),
      0,
    );

    const linked = files.filter(
      (file) => file.entityType || file.entityId,
    ).length;

    return {
      total: files.length,
      types: fileTypes.length,
      linked,
      size: formatFileSize(totalBytes),
    };
  }, [files, fileTypes]);

  function openUploadModal() {
    setSelectedUpload(null);
    setEntityType("");
    setEntityId("");
    setUploadError("");
    setUploadModalOpen(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function closeUploadModal() {
    if (uploading) return;

    setUploadModalOpen(false);
    setSelectedUpload(null);
    setEntityType("");
    setEntityId("");
    setUploadError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setSelectedUpload(null);
      return;
    }

    setUploadError("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      setSelectedUpload(null);
      setUploadError("Only JPG, PNG and PDF files are supported.");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedUpload(null);
      setUploadError("File size must be 15 MB or smaller.");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    setSelectedUpload(file);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedUpload) {
      setUploadError("Please select a file.");
      return;
    }

    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    try {
      setUploading(true);
      setUploadError("");

      const formData = new FormData();

      formData.append("file", selectedUpload);

      if (entityType.trim()) {
        formData.append("entityType", entityType.trim());
      }

      if (entityId.trim()) {
        formData.append("entityId", entityId.trim());
      }

      const response = await fetch(`${API_BASE}/file-assets`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        router.push("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to upload file.",
        );
      }

      await loadFiles();
      closeUploadModal();
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload file.",
      );
    } finally {
      setUploading(false);
    }
  }

  function openViewer(file: FileAsset) {
    if (!file.signedUrl) {
      setError("A secure viewing URL could not be generated for this file.");
      return;
    }

    setViewerFile(file);
    setImageZoom(1);
    setImagePosition({ x: 0, y: 0 });
  }

  function closeViewer() {
    setViewerFile(null);
    setImageZoom(1);
    setImagePosition({ x: 0, y: 0 });
  }

  function clampZoom(value: number) {
    return Math.min(5, Math.max(0.5, value));
  }

  function zoomImage(amount: number) {
    setImageZoom((current) => clampZoom(current + amount));
  }

  function resetImageView() {
    setImageZoom(1);
    setImagePosition({ x: 0, y: 0 });
  }

  function handleImageWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();

    const direction = event.deltaY > 0 ? -0.15 : 0.15;

    setImageZoom((current) => clampZoom(current + direction));
  }

  function handleImagePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    setIsDraggingImage(true);

    imageDragStart.current = {
      x: event.clientX,
      y: event.clientY,
    };

    imagePositionStart.current = {
      ...imagePosition,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleImagePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingImage) return;

    const deltaX = event.clientX - imageDragStart.current.x;
    const deltaY = event.clientY - imageDragStart.current.y;

    setImagePosition({
      x: imagePositionStart.current.x + deltaX,
      y: imagePositionStart.current.y + deltaY,
    });
  }

  function handleImagePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    setIsDraggingImage(false);

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released.
    }
  }

  function getTouchDistance(touches: React.TouchList) {
    if (touches.length < 2) return 0;

    const first = touches[0];
    const second = touches[1];

    const dx = second.clientX - first.clientX;
    const dy = second.clientY - first.clientY;

    return Math.sqrt(dx * dx + dy * dy);
  }

  function handleImageTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length === 2) {
      const distance = getTouchDistance(event.touches);
      pinchStartDistance.current = distance;
      pinchStartZoom.current = imageZoom;
    }
  }

  function handleImageTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 2) return;
    event.preventDefault();

    const distance = getTouchDistance(event.touches);
    if (!pinchStartDistance.current) return;

    const scale = distance / pinchStartDistance.current;
    setImageZoom(clampZoom(pinchStartZoom.current * scale));
  }

  function handleImageTouchEnd() {
    pinchStartDistance.current = null;
  }

  function openDeleteModal(file: FileAsset) {
    setDeleteFile(file);
  }

  function closeDeleteModal() {
    if (deletingId) return;
    setDeleteFile(null);
  }

  async function confirmDelete() {
    if (!deleteFile) return;

    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    try {
      setDeletingId(deleteFile.id);
      setError("");

      const response = await fetch(
        `${API_BASE}/file-assets/${deleteFile.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.status === 401) {
        localStorage.removeItem("synaptix_token");
        router.push("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to delete file.");
      }

      setFiles((current) =>
        current.filter((item) => item.id !== deleteFile.id),
      );

      setDeleteFile(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete file.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="w-full px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-stone-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-8">
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-orange-100/50 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Question Intelligence
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              File Assets
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
              Securely store and preview exam papers, diagrams, and question media files using temporary authenticated URLs.
            </p>
          </div>

          <button
            type="button"
            onClick={openUploadModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0 active:scale-[0.98]"
          >
            <span>+</span> Upload File
          </button>
        </div>
      </section>

      {/* Alerts */}
      {error && !uploadModalOpen && !deleteFile && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
            Total Files
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
            {stats.total}
          </p>
          <p className="mt-1 text-xs text-stone-400">Archived documents</p>
        </div>

        <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
            File Formats
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
            {stats.types}
          </p>
          <p className="mt-1 text-xs text-stone-400">PDF, JPG, PNG types</p>
        </div>

        <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
            Linked Assets
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-orange-600">
            {stats.linked}
          </p>
          <p className="mt-1 text-xs text-stone-400">Linked to papers / tests</p>
        </div>

        <div className="glass rounded-2xl border border-stone-200/70 p-5 transition duration-200 hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
            Storage Footprint
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
            {stats.size}
          </p>
          <p className="mt-1 text-xs text-stone-400">Total bytes uploaded</p>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="glass rounded-2xl border border-stone-200/70 p-5 sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex-1">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search file names, entities or IDs..."
              className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-11 rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 md:w-56"
          >
            <option value="">All file types</option>
            {fileTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Security Tip Banner */}
      <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50/70 px-5 py-3.5 text-xs text-stone-700">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 font-bold">
          🔒
        </span>
        <p>
          <span className="font-semibold text-stone-900">Encrypted Cloud Storage:</span> Files are protected inside Synaptix private storage and delivered through temporary cryptographic signed tokens.
        </p>
      </div>

      {/* Table Section */}
      <section className="glass overflow-hidden rounded-2xl border border-stone-200/70">
        {loading ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-orange-100 border-t-orange-500" />
            <p className="mt-3 text-sm text-stone-500">Loading file assets...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-2xl text-orange-500">
              📁
            </div>
            <h3 className="mt-4 text-base font-semibold text-stone-900">
              {files.length === 0
                ? "No files uploaded yet"
                : "No matching files found"}
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">
              {files.length === 0
                ? "Upload your first question paper image or PDF document to begin storing question intelligence files."
                : "Try adjusting your search criteria or type filters."}
            </p>
            {files.length === 0 && (
              <button
                type="button"
                onClick={openUploadModal}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 active:translate-y-0"
              >
                <span>+</span> Upload File
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead className="border-b border-stone-200/80 bg-stone-50/50">
                  <tr className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    <th className="px-6 py-3.5">File Name</th>
                    <th className="px-6 py-3.5">Format</th>
                    <th className="px-6 py-3.5">Size</th>
                    <th className="px-6 py-3.5">Linked Context</th>
                    <th className="px-6 py-3.5">Uploaded</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-stone-100">
                  {filteredFiles.map((file) => (
                    <tr
                      key={file.id}
                      className="border-b border-stone-100 transition duration-150 last:border-b-0 hover:bg-orange-50/30"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-xs font-bold text-orange-600 border border-orange-100">
                            {isPdf(file) ? "PDF" : "IMG"}
                          </div>

                          <div className="min-w-0">
                            <p className="max-w-[280px] truncate text-sm font-semibold text-stone-900">
                              {file.fileName}
                            </p>
                            <p className="max-w-[280px] truncate text-[11px] text-stone-400">
                              {file.storageUrl}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-xs font-semibold text-stone-600">
                          {getFileLabel(file)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm font-medium text-stone-700">
                        {formatFileSize(file.fileSize)}
                      </td>

                      <td className="px-6 py-4">
                        {file.entityType || file.entityId ? (
                          <div>
                            <p className="text-xs font-semibold text-stone-800">
                              {file.entityType || "Entity"}
                            </p>
                            {file.entityId && (
                              <p className="text-[11px] text-stone-400">
                                {file.entityId}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-stone-400">
                            Standalone
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-sm text-stone-500">
                        {formatDate(file.createdAt)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openViewer(file)}
                            className="inline-flex items-center justify-center rounded-xl border border-orange-100 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-600 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-100 active:translate-y-0"
                          >
                            View
                          </button>

                          <a
                            href={file.signedUrl || "#"}
                            download={file.fileName}
                            className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 transition duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-50 active:translate-y-0"
                          >
                            Download
                          </a>

                          <button
                            type="button"
                            onClick={() => openDeleteModal(file)}
                            disabled={deletingId === file.id}
                            className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 transition duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-100 active:translate-y-0 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="divide-y divide-stone-100 md:hidden">
              {filteredFiles.map((file) => (
                <article key={file.id} className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-xs font-bold text-orange-600 border border-orange-100">
                      {isPdf(file) ? "PDF" : "IMG"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-semibold text-stone-900">
                        {file.fileName}
                      </h4>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {getFileLabel(file)} · {formatFileSize(file.fileSize)}
                      </p>
                      <p className="mt-1 text-[11px] text-stone-400">
                        Added {formatDate(file.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openViewer(file)}
                      className="flex-1 rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-600 transition hover:bg-orange-100"
                    >
                      View
                    </button>

                    <a
                      href={file.signedUrl || "#"}
                      download={file.fileName}
                      className="flex-1 text-center rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
                    >
                      Download
                    </a>

                    <button
                      type="button"
                      onClick={() => openDeleteModal(file)}
                      className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4 lg:pl-72 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-stone-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:p-7">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Question Intelligence
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
                  Upload File Asset
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  Upload question papers, handwritten scans, or test PDFs.
                </p>
              </div>

              <button
                type="button"
                onClick={closeUploadModal}
                disabled={uploading}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-500 transition hover:bg-stone-200 hover:text-stone-900 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpload} className="mt-6 space-y-4">
              {uploadError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {uploadError}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                  Choose File *
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                  onChange={handleFileChange}
                  className="block w-full cursor-pointer rounded-2xl border border-dashed border-orange-200 bg-orange-50/30 p-4 text-sm text-stone-600 file:mr-4 file:rounded-xl file:border-0 file:bg-orange-500 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-orange-600"
                />

                <p className="mt-1.5 text-xs text-stone-400">
                  JPG, PNG or PDF format · Maximum file size 15 MB
                </p>
              </div>

              {selectedUpload && (
                <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-3.5">
                  <p className="text-sm font-semibold text-stone-900">
                    {selectedUpload.name}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {selectedUpload.type} · {formatFileSize(selectedUpload.size)}
                  </p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-stone-700">
                    Entity Type
                  </span>
                  <input
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                    placeholder="e.g. PreviousPaper"
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-stone-700">
                    Entity ID
                  </span>
                  <input
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    placeholder="Optional reference ID"
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5 text-xs leading-relaxed text-stone-500">
                Uploaded files are stored within Synaptix protected cloud storage with signed URL access tokens.
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeUploadModal}
                  disabled={uploading}
                  className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={uploading || !selectedUpload}
                  className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition duration-200 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload File"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Paper Viewer */}
      {viewerFile && viewerFile.signedUrl && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-stone-950/90 backdrop-blur-md">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-stone-950/80 px-5 py-3.5">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-400">
                Synaptix Paper Viewer
              </p>
              <h3 className="mt-0.5 truncate text-sm font-bold text-white sm:text-base">
                {viewerFile.fileName}
              </h3>
            </div>

            <div className="ml-4 flex shrink-0 items-center gap-2">
              {isImage(viewerFile) && (
                <>
                  <button
                    type="button"
                    onClick={() => zoomImage(-0.25)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-base font-bold text-white transition hover:bg-white/20"
                  >
                    −
                  </button>

                  <span className="hidden min-w-[50px] text-center text-xs font-semibold text-white/70 sm:block">
                    {Math.round(imageZoom * 100)}%
                  </span>

                  <button
                    type="button"
                    onClick={() => zoomImage(0.25)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-base font-bold text-white transition hover:bg-white/20"
                  >
                    +
                  </button>

                  <button
                    type="button"
                    onClick={resetImageView}
                    className="hidden rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 sm:block"
                  >
                    Fit
                  </button>
                </>
              )}

              <a
                href={viewerFile.signedUrl}
                download={viewerFile.fileName}
                className="rounded-xl border border-white/10 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
              >
                Download
              </a>

              <button
                type="button"
                onClick={closeViewer}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-lg font-bold text-white shadow-md shadow-orange-950/40 transition hover:bg-orange-600"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto bg-stone-900/70 p-4 sm:p-8">
            {isImage(viewerFile) && (
              <div
                className={`relative flex min-h-full min-w-full select-none items-center justify-center overflow-hidden ${isDraggingImage ? "cursor-grabbing" : "cursor-grab"
                  }`}
                onWheel={handleImageWheel}
                onPointerDown={handleImagePointerDown}
                onPointerMove={handleImagePointerMove}
                onPointerUp={handleImagePointerUp}
                onPointerCancel={handleImagePointerUp}
                onTouchStart={handleImageTouchStart}
                onTouchMove={handleImageTouchMove}
                onTouchEnd={handleImageTouchEnd}
                onDoubleClick={() => zoomImage(0.5)}
                style={{ touchAction: "none" }}
              >
                <img
                  src={viewerFile.signedUrl}
                  alt={viewerFile.fileName}
                  draggable={false}
                  className="max-h-[85vh] max-w-[90vw] rounded-xl shadow-2xl will-change-transform"
                  style={{
                    transform: `translate3d(${imagePosition.x}px, ${imagePosition.y}px, 0) scale(${imageZoom})`,
                    transformOrigin: "center center",
                    transition: isDraggingImage
                      ? "none"
                      : "transform 120ms ease-out",
                  }}
                />

                {imageZoom === 1 && !isDraggingImage && (
                  <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-stone-950/70 px-4 py-1.5 text-xs font-medium text-white/80 shadow-lg backdrop-blur-md">
                    Scroll to zoom · Drag to pan · Double-click to zoom
                  </div>
                )}
              </div>
            )}

            {isPdf(viewerFile) && (
              <div className="mx-auto h-full min-h-[75vh] max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                <iframe
                  src={viewerFile.signedUrl}
                  title={viewerFile.fileName}
                  className="h-full min-h-[75vh] w-full border-0"
                />
              </div>
            )}

            {!isImage(viewerFile) && !isPdf(viewerFile) && (
              <div className="flex min-h-full items-center justify-center">
                <div className="rounded-3xl bg-white p-8 text-center max-w-sm">
                  <p className="text-base font-bold text-stone-900">
                    Preview unavailable
                  </p>
                  <p className="mt-1.5 text-xs text-stone-500">
                    This file format cannot be rendered directly in the browser viewer.
                  </p>
                  <a
                    href={viewerFile.signedUrl}
                    download={viewerFile.fileName}
                    className="mt-5 inline-flex rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-semibold text-white"
                  >
                    Download File
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteFile && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-950/45 p-4 lg:pl-72 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-stone-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-2xl text-red-600">
              🗑️
            </div>

            <h3 className="mt-4 text-xl font-bold tracking-tight text-stone-900">
              Delete File Asset?
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              Permanently remove this file and its metadata record from Synaptix cloud storage.
            </p>

            <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50/70 p-4">
              <p className="truncate text-sm font-semibold text-stone-900">
                {deleteFile.fileName}
              </p>
              <p className="mt-0.5 text-xs text-stone-500">
                {getFileLabel(deleteFile)} · {formatFileSize(deleteFile.fileSize)}
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={Boolean(deletingId)}
                className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                disabled={Boolean(deletingId)}
                className="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-200 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingId ? "Deleting..." : "Delete File"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
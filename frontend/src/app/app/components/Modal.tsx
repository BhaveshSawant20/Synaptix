"use client";

import { ReactNode, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const emptySubscribe = () => () => {};

export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  badge?: string;
  description?: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  className?: string;
  closeOnBackdrop?: boolean;
};

const MAX_WIDTH_MAP: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  badge,
  description,
  subtitle,
  children,
  footer,
  maxWidth = "xl",
  size,
  className = "",
  closeOnBackdrop = true,
}: ModalProps) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const effectiveDescription = description || subtitle;
  const effectiveWidthKey = size || maxWidth;
  const maxWidthClass = MAX_WIDTH_MAP[effectiveWidthKey] || "max-w-xl";

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] overflow-hidden"
    >
      {/* Full-viewport backdrop dims entire screen including sidebar */}
      <div
        className="fixed inset-0 bg-stone-950/50 backdrop-blur-sm transition-opacity duration-200"
        onMouseDown={() => {
          if (closeOnBackdrop) {
            onClose();
          }
        }}
      />

      {/* Main Application Area Centering Container (strictly bounded to main area right of sidebar) */}
      <div className="fixed inset-0 lg:left-72 flex items-center justify-center p-4 sm:p-6 overflow-hidden pointer-events-none">
        <div
          className={`pointer-events-auto flex max-h-[88vh] w-full ${maxWidthClass} flex-col overflow-hidden rounded-3xl border border-stone-200/90 bg-[#fffdfa] shadow-2xl transition-all duration-200 ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sticky Header */}
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-stone-100 bg-white px-6 py-5 sm:px-7">
            <div className="min-w-0">
              {badge && (
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  {badge}
                </p>
              )}

              <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
                {title}
              </h2>

              {effectiveDescription && (
                <p className="mt-1 text-sm text-stone-500">{effectiveDescription}</p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 active:scale-95"
            >
              ✕
            </button>
          </div>

          {/* Scrollable Modal Content Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 overscroll-contain sm:px-7">
            {children}
          </div>

          {/* Sticky Footer (if provided) */}
          {footer && (
            <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-stone-100 bg-stone-50/90 px-6 py-4 sm:flex-row sm:justify-end sm:px-7">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

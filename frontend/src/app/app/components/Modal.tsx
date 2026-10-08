"use client";

import { ReactNode, useEffect } from "react";

export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  badge?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  className?: string;
  closeOnBackdrop?: boolean;
};

const MAX_WIDTH_MAP: Record<NonNullable<ModalProps["maxWidth"]>, string> = {
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
  children,
  footer,
  maxWidth = "xl",
  className = "",
  closeOnBackdrop = true,
}: ModalProps) {
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

  if (!isOpen) return null;

  const maxWidthClass = MAX_WIDTH_MAP[maxWidth] || "max-w-xl";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] overflow-hidden"
    >
      {/* Full-viewport backdrop dims entire screen including sidebar */}
      <div
        className="fixed inset-0 bg-stone-950/45 backdrop-blur-sm transition-opacity duration-200"
        onMouseDown={() => {
          if (closeOnBackdrop) {
            onClose();
          }
        }}
      />

      {/* Main Application Area Centering Container (excluding left sidebar on desktop) */}
      <div className="fixed inset-0 lg:left-72 flex items-center justify-center p-4 sm:p-6 overflow-hidden pointer-events-none">
        <div
          className={`pointer-events-auto flex max-h-[92vh] w-full ${maxWidthClass} flex-col overflow-hidden rounded-3xl border border-orange-100 bg-[#fffdf9] shadow-2xl transition-all duration-200 ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sticky Header */}
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-stone-100 bg-white/95 px-6 py-5 sm:px-7">
            <div className="min-w-0">
              {badge && (
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  {badge}
                </p>
              )}

              <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900">
                {title}
              </h2>

              {description && (
                <p className="mt-1 text-sm text-stone-500">{description}</p>
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

          {/* Scrollable Modal Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6 overscroll-contain sm:px-7">
            {children}
          </div>

          {/* Sticky Footer */}
          {footer && (
            <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-stone-100 bg-white/95 px-6 py-4 sm:flex-row sm:justify-end sm:px-7">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

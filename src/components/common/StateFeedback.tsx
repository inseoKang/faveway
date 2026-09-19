"use client";

import type { ReactNode } from "react";

type StateTone = "neutral" | "error" | "warning";

type StateFeedbackProps = {
  title: string;
  description?: string;
  tone?: StateTone;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  children?: ReactNode;
};

function toneClass(tone: StateTone) {
  if (tone === "error") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-border bg-white text-foreground";
}

export default function StateFeedback({
  title,
  description,
  tone = "neutral",
  actionLabel,
  onAction,
  className = "",
  children,
}: StateFeedbackProps) {
  const role = tone === "error" ? "alert" : "status";

  return (
    <div
      className={`rounded-2xl border p-5 ${toneClass(tone)} ${className}`}
      role={role}
      aria-live={tone === "error" ? "assertive" : "polite"}
    >
      <p className="font-semibold">{title}</p>

      {description && (
        <p className="mt-1 text-sm leading-6 opacity-80">{description}</p>
      )}

      {children}

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 min-h-11 rounded-xl border border-current/20 bg-white px-4 py-2 text-sm font-semibold"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

"use client";

type InlineWarningProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export default function InlineWarning({
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: InlineWarningProps) {
  return (
    <div
      className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{title}</p>

          {description && (
            <p className="mt-1 text-sm leading-6 text-amber-800">
              {description}
            </p>
          )}
        </div>

        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="min-h-9 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-semibold"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
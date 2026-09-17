"use client";

import { useRouter } from "next/navigation";

type BackButtonProps = {
  label?: string;
  className?: string;
};

export default function BackButton({
  label = "이전",
  className = "",
}: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={`fw-back ${className}`}
    >
      <span aria-hidden="true">←</span>
      <span>{label}</span>
    </button>
  );
}

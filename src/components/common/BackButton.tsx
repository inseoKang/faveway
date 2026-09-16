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
      className={`inline-flex items-center gap-1 text-sm text-gray-500 transition hover:text-black ${className}`}
    >
      <span aria-hidden="true">←</span>
      <span>{label}</span>
    </button>
  );
}

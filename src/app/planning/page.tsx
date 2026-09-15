"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const durations = [
  {
    label: "3시간",
    value: 180,
  },
  {
    label: "4시간",
    value: 240,
  },
  {
    label: "5시간",
    value: 300,
  },
];

const walkingOptions = [
  {
    label: "10분 이내",
    description: "짧게 걷고 싶어요",
    value: 10,
  },
  {
    label: "20분 이내",
    description: "적당히 걸을 수 있어요",
    value: 20,
  },
  {
    label: "30분 이내",
    description: "걷는 여행도 괜찮아요",
    value: 30,
  },
  {
    label: "상관없음",
    description: "도보 시간 제한이 없어요",
    value: null,
  },
];

type PlanningInput = {
  contentId: number;
  durationMinutes: number;
  maxWalkingMinutes: number | null;
};

function PlanningContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const contentId = searchParams.get("contentId");
  const contentTitle = searchParams.get("title");

  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);

  // undefined = 아직 선택하지 않음
  // null = "상관없음" 선택
  const [maxWalkingMinutes, setMaxWalkingMinutes] = useState<
    number | null | undefined
  >(undefined);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleCreateCourse() {
    if (!contentId || !durationMinutes || maxWalkingMinutes === undefined) {
      return;
    }

    const planningInput: PlanningInput = {
      contentId: Number(contentId),
      durationMinutes,
      maxWalkingMinutes,
    };

    try {
      setIsSubmitting(true);
      setError("");

      const response = await fetch("/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(planningInput),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "코스를 생성하지 못했습니다.");
      }

      const courseData = encodeURIComponent(JSON.stringify(result.data));

      router.push(
        `/course?data=${courseData}&title=${encodeURIComponent(
          contentTitle ?? "",
        )}`,
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md p-6">
      <header className="mb-10">
        <p className="text-sm font-medium text-gray-500">FAVEWAY</p>

        <h1 className="mt-2 text-2xl font-bold">여행 조건을 알려주세요</h1>

        {contentTitle && (
          <p className="mt-3 text-sm text-gray-500">
            선택한 작품: {contentTitle}
          </p>
        )}
      </header>

      <section>
        <h2 className="mb-1 font-semibold">얼마나 여행할까요?</h2>

        <p className="mb-4 text-sm text-gray-500">
          전체 여행 가능 시간을 선택해주세요.
        </p>

        <div className="grid grid-cols-3 gap-3">
          {durations.map((duration) => {
            const selected = durationMinutes === duration.value;

            return (
              <button
                key={duration.value}
                type="button"
                onClick={() => setDurationMinutes(duration.value)}
                disabled={isSubmitting}
                className={`rounded-2xl border px-4 py-4 text-sm font-medium transition ${
                  selected
                    ? "border-black bg-black text-white"
                    : "border-gray-200 bg-white text-black"
                }`}
              >
                {duration.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-1 font-semibold">한 번에 얼마나 걸을 수 있나요?</h2>

        <p className="mb-4 text-sm text-gray-500">
          장소와 장소 사이의 최대 도보 시간을 선택해주세요.
        </p>

        <div className="space-y-3">
          {walkingOptions.map((option) => {
            const selected = maxWalkingMinutes === option.value;

            return (
              <button
                key={option.label}
                type="button"
                onClick={() => setMaxWalkingMinutes(option.value)}
                disabled={isSubmitting}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selected
                    ? "border-black bg-black text-white"
                    : "border-gray-200 bg-white text-black"
                }`}
              >
                <p className="font-semibold">{option.label}</p>

                <p
                  className={`mt-1 text-sm ${
                    selected ? "text-gray-300" : "text-gray-500"
                  }`}
                >
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {error && (
        <p className="mt-6 rounded-xl bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={
          !contentId ||
          !durationMinutes ||
          maxWalkingMinutes === undefined ||
          isSubmitting
        }
        onClick={handleCreateCourse}
        className="mt-10 w-full rounded-2xl bg-black py-4 font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {isSubmitting ? "코스를 만드는 중..." : "코스 만들기"}
      </button>
    </main>
  );
}

export default function PlanningPage() {
  return (
    <Suspense
      fallback={<main className="p-6">여행 정보를 불러오는 중...</main>}
    >
      <PlanningContent />
    </Suspense>
  );
}

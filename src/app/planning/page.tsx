"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

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

type PlanningInput = {
  contentId: number;
  durationMinutes: number;
};

function PlanningContent() {
  const searchParams = useSearchParams();

  const contentId = searchParams.get("contentId");
  const contentTitle = searchParams.get("title");

  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);

  function handleCreateCourse() {
    if (!contentId || !durationMinutes) {
      return;
    }

    const planningInput: PlanningInput = {
      contentId: Number(contentId),
      durationMinutes,
    };

    console.log("PlanningInput:", planningInput);

    // 다음 단계에서 이 부분을
    // POST /api/trips 호출로 변경할 예정
  }

  return (
    <main className="mx-auto min-h-screen max-w-md p-6">
      <header className="mb-10">
        <p className="text-sm font-medium text-gray-500">FAVEWAY</p>

        <h1 className="mt-2 text-2xl font-bold">얼마나 여행할까요?</h1>

        {contentTitle && (
          <p className="mt-3 text-sm text-gray-500">
            선택한 작품: {contentTitle}
          </p>
        )}
      </header>

      <section>
        <h2 className="mb-4 font-semibold">여행 가능 시간</h2>

        <div className="grid grid-cols-3 gap-3">
          {durations.map((duration) => {
            const selected = durationMinutes === duration.value;

            return (
              <button
                key={duration.value}
                type="button"
                onClick={() => setDurationMinutes(duration.value)}
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

      <button
        type="button"
        disabled={!contentId || !durationMinutes}
        onClick={handleCreateCourse}
        className="mt-10 w-full rounded-2xl bg-black py-4 font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        코스 만들기
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

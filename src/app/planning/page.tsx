"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import BackButton from "@/components/common/BackButton";

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
  contentIds: number[];
  actorIds: number[];
  durationMinutes: number;
  maxWalkingMinutes: number | null;
};

function parseIds(value: string | null): number[] {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  );
}

function PlanningContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const contentTitle = searchParams.get("title");

  const contentIds = parseIds(searchParams.get("contentIds"));

  const actorIds = parseIds(searchParams.get("actorIds"));

  const actorNames =
    searchParams
      .get("actorNames")
      ?.split(",")
      .map((name) => name.trim())
      .filter(Boolean) ?? [];

  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);

  /**
   * undefined
   * = 아직 선택하지 않음
   *
   * null
   * = "상관없음", 즉 도보 시간 제한 없음
   */
  const [maxWalkingMinutes, setMaxWalkingMinutes] = useState<
    number | null | undefined
  >(undefined);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState("");

  async function handleCreateCourse() {
    /**
     * contentIds가 하나 이상 있어야 함
     * durationMinutes가 선택되어 있어야 함
     * maxWalkingMinutes는
     * - undefined: 미선택
     * - null: 제한 없음
     */
    if (
      contentIds.length === 0 ||
      !durationMinutes ||
      maxWalkingMinutes === undefined
    ) {
      return;
    }

    const planningInput: PlanningInput = {
      contentIds,
      actorIds,
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

      const params = new URLSearchParams({
        data: courseData,
        title: contentTitle ?? "나의 여행 코스",
      });

      if (actorNames.length > 0) {
        params.set("actorNames", actorNames.join(","));
      }

      router.push(`/course?${params.toString()}`);
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

  /**
   * 작품 정보 자체가 없다면
   * planning 페이지에 잘못 진입한 상태
   */
  if (contentIds.length === 0) {
    return (
      <main className="mx-auto min-h-screen max-w-md p-6">
        <p className="text-sm text-red-600">선택된 작품 정보가 없습니다.</p>

        <button
          type="button"
          onClick={() => router.push("/plan")}
          className="mt-4 text-sm font-semibold"
        >
          ← 다시 선택하기
        </button>
      </main>
    );
  }

  const canCreateCourse =
    durationMinutes !== null &&
    maxWalkingMinutes !== undefined &&
    !isSubmitting;

  return (
    <main className="mx-auto min-h-screen max-w-md p-6">
      <header className="mb-10">
        <BackButton className="mb-5" />

        <p className="text-sm font-medium text-gray-500">FAVEWAY</p>

        <h1 className="mt-2 text-2xl font-bold">여행 조건을 알려주세요</h1>

        {contentTitle && (
          <p className="mt-3 text-sm text-gray-500">선택: {contentTitle}</p>
        )}

        {actorNames.length > 0 ? (
          <div className="mt-3">
            <p className="text-sm text-gray-500">선택한 배우</p>

            <div className="mt-2 flex flex-wrap gap-2">
              {actorNames.map((actorName) => (
                <span
                  key={actorName}
                  className="rounded-full bg-gray-100 px-3 py-1 text-sm"
                >
                  {actorName}
                </span>
              ))}
            </div>

            <p className="mt-2 text-xs leading-5 text-gray-500">
              선택한 배우 중 한 명 이상이 등장한 장면의 촬영지를 기준으로 코스를
              생성합니다.
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">
            배우 선택 없음 · 작품 전체 촬영지를 기준으로 코스를 생성합니다.
          </p>
        )}

        {contentIds.length > 1 && (
          <p className="mt-2 text-xs text-gray-500">
            {contentIds.length}개 작품의 촬영지를 함께 고려합니다.
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
        disabled={!canCreateCourse}
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

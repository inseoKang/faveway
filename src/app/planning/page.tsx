"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import PageHeader from "@/components/common/PageHeader";

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
      <main className="fw-page">
        <p className="fw-state fw-error">선택된 작품 정보가 없습니다.</p>

        <button
          type="button"
          onClick={() => router.push("/plan")}
          className="fw-secondary-button mt-4"
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
    <main className="fw-page">
      <PageHeader
        eyebrow="PLAN YOUR WALK"
        title="나에게 맞는 여행의 속도"
        description="머무는 시간과 걷는 시간을 정해볼까요?"
        step={2}
      >
        <div className="fw-selection-summary">
          {contentTitle && (
            <p className="mt-3 text-sm text-muted-foreground">
              선택: {contentTitle}
            </p>
          )}

          {actorNames.length > 0 ? (
            <div className="mt-3">
              <p className="text-sm text-muted-foreground">선택한 배우</p>

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

              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                선택한 배우 중 한 명 이상이 등장한 장면의 촬영지를 기준으로
                코스를 생성합니다.
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              배우 선택 없음 · 작품 전체 촬영지를 기준으로 코스를 생성합니다.
            </p>
          )}

          {contentIds.length > 1 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {contentIds.length}개 작품의 촬영지를 함께 고려합니다.
            </p>
          )}
        </div>
      </PageHeader>

      <section className="fw-panel">
        <h2 className="mb-1 font-semibold">얼마나 여행할까요?</h2>

        <p className="mb-4 text-sm text-muted-foreground">
          이동과 장소 체류를 포함한 전체 시간이에요.
        </p>

        <div className="grid grid-cols-3 gap-3">
          {durations.map((duration) => {
            const selected = durationMinutes === duration.value;

            return (
              <button
                key={duration.value}
                type="button"
                onClick={() => setDurationMinutes(duration.value)}
                aria-pressed={selected}
                disabled={isSubmitting}
                className={`fw-duration rounded-2xl border px-4 py-4 text-sm font-medium transition ${
                  selected
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-white text-foreground"
                }`}
              >
                {duration.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="fw-panel mt-6">
        <h2 className="mb-1 font-semibold">한 번에 얼마나 걸을 수 있나요?</h2>

        <p className="mb-4 text-sm text-muted-foreground">
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
                aria-pressed={selected}
                disabled={isSubmitting}
                className={`fw-choice w-full rounded-2xl border p-4 text-left transition ${
                  selected
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-white text-foreground"
                }`}
              >
                <p className="font-semibold">{option.label}</p>

                <p
                  className={`mt-1 text-sm ${
                    selected ? "text-blue-100" : "text-muted-foreground"
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
        <p className="fw-state fw-error mt-6" role="alert">
          {error}
        </p>
      )}

      <div className="fw-action-bar">
        <p className="fw-action-summary">
          {durationMinutes === null
            ? "여행 시간을 선택해 주세요"
            : `${durationMinutes / 60}시간 여행`}
          {maxWalkingMinutes === undefined
            ? " · 도보 조건 미선택"
            : maxWalkingMinutes === null
              ? " · 도보 제한 없음"
              : ` · 한 구간 ${maxWalkingMinutes}분 이내`}
        </p>
        <button
          type="button"
          disabled={!canCreateCourse}
          onClick={handleCreateCourse}
          className="fw-primary-button"
          aria-busy={isSubmitting}
        >
          {isSubmitting ? "코스를 만드는 중…" : "나의 코스 만들기"}
        </button>
      </div>
    </main>
  );
}

export default function PlanningPage() {
  return (
    <Suspense
      fallback={
        <main className="fw-page">
          <p className="fw-state" role="status">
            여행 정보를 불러오는 중...
          </p>
        </main>
      }
    >
      <PlanningContent />
    </Suspense>
  );
}

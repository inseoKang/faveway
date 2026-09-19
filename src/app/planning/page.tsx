"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import PageHeader from "@/components/common/PageHeader";
import StateFeedback from "@/components/common/StateFeedback";

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

type TripErrorCode =
  | "INVALID_TRIP_CONDITIONS"
  | "TRIP_CANDIDATES_FETCH_FAILED"
  | "NO_FILMING_LOCATIONS"
  | "NO_COORDINATED_FILMING_LOCATIONS"
  | "NO_AVAILABLE_ROUTE"
  | "TRIP_CREATION_FAILED";

type TripApiResponse = {
  data?: unknown;
  code?: TripErrorCode;
  message?: string;
};

type SubmitFeedback = {
  type: "empty" | "error";
  title: string;
  description: string;
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

function isEmptyTripResult(code?: TripErrorCode) {
  return (
    code === "NO_FILMING_LOCATIONS" ||
    code === "NO_COORDINATED_FILMING_LOCATIONS" ||
    code === "NO_AVAILABLE_ROUTE"
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

  const [submitFeedback, setSubmitFeedback] =
    useState<SubmitFeedback | null>(null);

  function clearSubmitFeedback() {
    if (submitFeedback) {
      setSubmitFeedback(null);
    }
  }

  function selectDuration(value: number) {
    clearSubmitFeedback();
    setDurationMinutes(value);
  }

  function selectWalkingMinutes(value: number | null) {
    clearSubmitFeedback();
    setMaxWalkingMinutes(value);
  }

  async function handleCreateCourse() {
    /**
     * 함수 레벨에서도 중복 요청을 방어한다.
     *
     * 버튼 disabled만으로도 대부분 막을 수 있지만
     * 빠른 이벤트나 다른 호출 경로가 생길 경우를 대비한다.
     */
    if (isSubmitting) {
      return;
    }

    /**
     * contentIds가 하나 이상 있어야 함
     * durationMinutes가 선택되어 있어야 함
     *
     * maxWalkingMinutes
     * - undefined: 미선택
     * - null: 제한 없음
     */
    if (
      contentIds.length === 0 ||
      durationMinutes === null ||
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
      setSubmitFeedback(null);

      const response = await fetch("/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(planningInput),
      });

      let result: TripApiResponse | null = null;

      try {
        result = (await response.json()) as TripApiResponse;
      } catch {
        result = null;
      }

      if (!response.ok) {
        const message =
          result?.message ?? "코스를 생성하지 못했습니다. 다시 시도해 주세요.";

        if (isEmptyTripResult(result?.code)) {
          setSubmitFeedback({
            type: "empty",
            title: "현재 조건에 맞는 코스를 찾지 못했어요.",
            description: message,
          });

          return;
        }

        setSubmitFeedback({
          type: "error",
          title: "코스를 생성하지 못했어요.",
          description: message,
        });

        return;
      }

      if (!result?.data) {
        setSubmitFeedback({
          type: "error",
          title: "코스 정보를 확인하지 못했어요.",
          description:
            "코스 생성 결과가 올바르지 않습니다. 잠시 후 다시 시도해 주세요.",
        });

        return;
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
    } catch {
      setSubmitFeedback({
        type: "error",
        title: "코스 생성 요청에 실패했어요.",
        description:
          "네트워크 상태를 확인한 뒤 다시 시도해 주세요. 선택한 여행 조건은 그대로 유지됩니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * 작품 정보 자체가 없다면
   * Planning 페이지에 잘못 진입한 상태다.
   */
  if (contentIds.length === 0) {
    return (
      <main className="fw-page">
        <StateFeedback
          tone="error"
          title="선택된 작품 정보가 없어요."
          description="코스를 만들 작품을 다시 선택해 주세요."
          actionLabel="다시 선택하기"
          onAction={() => router.push("/plan")}
        />
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
                onClick={() => selectDuration(duration.value)}
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
                onClick={() => selectWalkingMinutes(option.value)}
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

      {submitFeedback?.type === "empty" && (
        <StateFeedback
          title={submitFeedback.title}
          description={`${submitFeedback.description} 여행 시간이나 도보 조건을 바꿔 다시 만들어 보세요.`}
          className="mt-6"
        />
      )}

      {submitFeedback?.type === "error" && (
        <StateFeedback
          tone="error"
          title={submitFeedback.title}
          description={submitFeedback.description}
          actionLabel="다시 시도"
          onAction={() => void handleCreateCourse()}
          className="mt-6"
        />
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
          onClick={() => void handleCreateCourse()}
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
          <StateFeedback
            title="여행 정보를 불러오고 있어요."
            description="선택한 작품과 배우 정보를 확인하고 있습니다."
          />
        </main>
      }
    >
      <PlanningContent />
    </Suspense>
  );
}
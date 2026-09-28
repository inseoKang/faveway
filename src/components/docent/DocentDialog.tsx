"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { DocentMockStop, MockDocentResult } from "@/lib/ai/docent-mock";

type DocentMode = "course" | "place";

type Props = {
  mode: DocentMode;
  stops: DocentMockStop[];
  placeStop?: DocentMockStop | null;
  onClose: () => void;
};

type LoadState = "loading" | "success" | "empty" | "error";

type DocentApiError = {
  code?: string;
  message?: string;
};

type DocentApiResponse = {
  data?: {
    title: string;
    narration: string;
  };
  code?: string;
  message?: string;
};

async function readResponseBody(
  response: Response,
): Promise<DocentApiResponse> {
  try {
    return (await response.json()) as DocentApiResponse;
  } catch {
    return {};
  }
}

export default function DocentDialog({
  mode,
  stops,
  placeStop,
  onClose,
}: Props) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const [state, setState] = useState<LoadState>("loading");
  const [docent, setDocent] = useState<MockDocentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPlaceDocent = useCallback(
    async (stop: DocentMockStop): Promise<MockDocentResult | null> => {
      const response = await fetch("/api/docents/place", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentId: stop.contentId,
          placeId: stop.placeId,
          language: "ko",
        }),
      });

      const body = await readResponseBody(response);

      if (
        response.status === 422 &&
        body.code === "DOCENT_CONTEXT_INSUFFICIENT"
      ) {
        return null;
      }

      if (!response.ok) {
        const error: DocentApiError = body;

        throw new Error(
          error.message ??
            "AI 도슨트를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      }

      if (!body.data?.title || !body.data.narration) {
        throw new Error("AI 도슨트 응답을 확인하지 못했습니다.");
      }

      return {
        title: body.data.title,
        narration: body.data.narration,
      };
    },
    [],
  );

  const loadCourseDocent = useCallback(
    async (courseStops: DocentMockStop[]): Promise<MockDocentResult | null> => {
      if (courseStops.length === 0) {
        return null;
      }

      const response = await fetch("/api/docents/course", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stops: courseStops.map((stop) => ({
            contentId: stop.contentId,
            placeId: stop.placeId,
            order: stop.order,
          })),
          language: "ko",
        }),
      });

      const body = await readResponseBody(response);

      if (
        response.status === 422 &&
        body.code === "DOCENT_CONTEXT_INSUFFICIENT"
      ) {
        return null;
      }

      if (!response.ok) {
        const error: DocentApiError = body;

        throw new Error(
          error.message ??
            "코스 AI 도슨트를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      }

      if (!body.data?.title || !body.data.narration) {
        throw new Error("코스 AI 도슨트 응답을 확인하지 못했습니다.");
      }

      return {
        title: body.data.title,
        narration: body.data.narration,
      };
    },
    [],
  );

  const loadDocent = useCallback(async () => {
    setState("loading");
    setDocent(null);
    setErrorMessage(null);

    try {
      const result =
        mode === "course"
          ? await loadCourseDocent(stops)
          : placeStop
            ? await loadPlaceDocent(placeStop)
            : null;

      if (!result) {
        setState("empty");
        return;
      }

      setDocent(result);
      setState("success");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "AI 도슨트를 준비하지 못했습니다.",
      );

      setState("error");
    }
  }, [loadCourseDocent, loadPlaceDocent, mode, placeStop, stops]);

  useEffect(() => {
    previousActiveElementRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    document.body.style.overflow = "hidden";

    closeButtonRef.current?.focus();

    const loadTimer = window.setTimeout(() => {
      void loadDocent();
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);

      document.body.style.overflow = "";

      previousActiveElementRef.current?.focus();
    };
  }, [loadDocent]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const eyebrow = mode === "course" ? "COURSE AI DOCENT" : "PLACE AI DOCENT";

  const description =
    mode === "course"
      ? "이 코스를 따라 걸으며 들을 수 있는 이야기를 준비했어요."
      : "작품 속 장면과 촬영지 정보를 바탕으로 만든 현장 이야기예요.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-0 sm:items-center sm:px-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="docent-dialog-title"
        className="max-h-[88dvh] w-full overflow-y-auto rounded-t-[28px] bg-white px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-5 shadow-2xl sm:max-w-[560px] sm:rounded-[28px] sm:p-7"
      >
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-[0.16em] text-primary">
              {eyebrow}
            </p>

            <h2
              id="docent-dialog-title"
              className="mt-2 text-[22px] font-bold leading-8 tracking-[-0.035em] text-foreground"
            >
              {mode === "course"
                ? "이 코스의 이야기를 들어볼까요?"
                : (placeStop?.place.name ?? "이 장소의 이야기를 들어볼까요?")}
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            aria-label="AI 도슨트 닫기"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xl text-slate-600 transition hover:bg-slate-50"
          >
            ×
          </button>
        </header>

        <div className="mt-6">
          {state === "loading" && (
            <div
              className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-7"
              role="status"
            >
              <p className="font-semibold text-foreground">
                AI 도슨트를 준비하고 있어요.
              </p>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                DB에 저장된 작품과 촬영지 정보를 확인해 현장에서 들을 이야기를
                만들고 있습니다.
              </p>
            </div>
          )}

          {state === "empty" && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6">
              <p className="font-semibold text-foreground">
                아직 들려드릴 이야기가 충분하지 않아요.
              </p>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                장면 또는 검증된 촬영 정보가 충분하지 않아 도슨트를 생성하지
                않았어요.
              </p>
            </div>
          )}

          {state === "error" && (
            <div
              className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6"
              role="alert"
            >
              <p className="font-semibold text-red-700">
                도슨트를 준비하지 못했어요.
              </p>

              <p className="mt-2 text-sm leading-6 text-red-600">
                {errorMessage}
              </p>

              <button
                type="button"
                onClick={() => void loadDocent()}
                className="mt-4 min-h-11 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm ring-1 ring-inset ring-red-200"
              >
                다시 시도
              </button>
            </div>
          )}

          {state === "success" && docent && (
            <>
              <div className="rounded-3xl bg-[#f4f7fb] px-5 py-6">
                <p className="text-xs font-semibold text-primary">
                  AI가 들려주는 이야기
                </p>

                <h3 className="mt-2 text-lg font-bold leading-7 text-foreground">
                  {docent.title}
                </h3>

                <p className="mt-4 whitespace-pre-line text-[15px] leading-7 text-foreground">
                  {docent.narration}
                </p>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 px-4 py-4">
                <p className="text-xs leading-5 text-muted-foreground">
                  FAVEWAY는 DB에 저장된 장면과 검증된 촬영지 정보를 바탕으로 AI
                  도슨트를 생성합니다. 정보가 충분하지 않은 경우 내용을 임의로
                  만들어내지 않습니다.
                </p>
              </div>

              <button
                type="button"
                disabled
                className="mt-5 min-h-12 w-full cursor-not-allowed rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white opacity-50"
              >
                ▶ 음성으로 듣기 · 준비 중
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

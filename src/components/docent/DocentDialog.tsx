"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createMockCourseDocent,
  createMockPlaceDocent,
  type DocentMockStop,
  type MockDocentResult,
} from "@/lib/ai/docent-mock";

type DocentMode = "course" | "place";

type Props = {
  mode: DocentMode;
  courseTitle: string;
  stops: DocentMockStop[];
  placeStop?: DocentMockStop | null;
  onClose: () => void;
};

type LoadState = "loading" | "success" | "empty" | "error";

export default function DocentDialog({
  mode,
  courseTitle,
  stops,
  placeStop,
  onClose,
}: Props) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const [state, setState] = useState<LoadState>("loading");
  const [docent, setDocent] = useState<MockDocentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDocent = useCallback(async () => {
    setState("loading");
    setDocent(null);
    setErrorMessage(null);

    try {
      const result =
        mode === "course"
          ? await createMockCourseDocent(stops, courseTitle)
          : placeStop
            ? await createMockPlaceDocent(placeStop)
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
  }, [courseTitle, mode, placeStop, stops]);

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

  const eyebrow =
    mode === "course" ? "COURSE AI DOCENT" : "PLACE AI DOCENT";

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
                : placeStop?.place.name ?? "이 장소의 이야기를 들어볼까요?"}
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
                작품과 촬영지 정보를 바탕으로 현장에서 들을 이야기를 만들고
                있습니다.
              </p>
            </div>
          )}

          {state === "empty" && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6">
              <p className="font-semibold text-foreground">
                아직 들려드릴 이야기가 충분하지 않아요.
              </p>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                검증된 장면과 촬영지 정보가 더 준비되면 AI 도슨트를 제공할
                예정입니다.
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
                  현재는 AI Docent UX 확인을 위한 Mock 콘텐츠예요. 실제
                  서비스에서는 DB에 저장된 검증 정보만 서버에서 조회한 뒤 AI
                  도슨트를 생성합니다.
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
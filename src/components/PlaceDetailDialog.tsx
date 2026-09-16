"use client";

import { useEffect, useRef, useState } from "react";

type Detail = {
  place: {
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  content: { title: string };
  scenes: { id: number; episode: string | null; description: string | null }[];
  sources: {
    verification_status: string;
    source_type: string | null;
    source_url: string | null;
    verified_fact: string | null;
    verified_at: string | null;
  }[];
};

function sourceUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export default function PlaceDetailDialog({
  contentId,
  placeId,
  placeName,
  onClose,
}: {
  contentId: number;
  placeId: number;
  placeName: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(
          `/api/contents/${contentId}/places/${placeId}`,
          { signal: controller.signal },
        );
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.message || "장소 설명을 불러오지 못했습니다.");
        if (!controller.signal.aborted) setData(result.data);
      } catch (reason) {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "장소 설명을 불러오지 못했습니다.",
          );
      }
    }
    void load();
    return () => controller.abort();
  }, [contentId, placeId, retry]);

  const mapQuery =
    data?.place.address ||
    (data?.place.latitude != null && data?.place.longitude != null
      ? `${data.place.latitude},${data.place.longitude}`
      : null);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="place-detail-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-3xl bg-[#faf8f3] p-0 text-stone-900 shadow-2xl backdrop:bg-black/50"
    >
      <div className="min-h-60" onClick={(event) => event.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-[#faf8f3] px-6 py-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">
            FAVEWAY · 장소 이야기
          </p>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            aria-label="장소 설명 닫기"
            className="rounded-full border border-stone-300 px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            닫기 ×
          </button>
        </header>
        <div className="space-y-8 p-6 sm:p-8">
          <div>
            <p className="mb-3 text-xs font-semibold tracking-widest text-stone-500">
              LOCATION STORY
            </p>
            <h2
              id="place-detail-title"
              className="text-3xl font-bold leading-tight"
            >
              {data?.place.name || placeName}
            </h2>
            {data && (
              <p className="mt-3 text-sm text-stone-600">
                {data.content.title} 속 촬영지
              </p>
            )}
          </div>
          {!data && !error && (
            <p role="status" className="py-8 text-stone-500">
              장소 이야기를 불러오는 중이에요…
            </p>
          )}
          {error && (
            <div role="alert" className="rounded-2xl bg-white p-5">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setData(null);
                  setRetry((value) => value + 1);
                }}
                className="mt-4 rounded-full bg-stone-900 px-5 py-3 text-sm text-white"
              >
                다시 시도
              </button>
            </div>
          )}
          {data && (
            <>
              <section aria-labelledby="place-scenes-title">
                <p className="text-xs font-semibold tracking-widest text-stone-500">
                  01 / 어떤 장면인가요
                </p>
                <h3
                  id="place-scenes-title"
                  className="mt-2 text-xl font-semibold"
                >
                  이곳에 담긴 이야기
                </h3>
                <p className="mt-2 text-xs leading-5 text-stone-500">
                  등록된 자료의 설명입니다. 장면과 촬영 사실의 외부 검증 여부는
                  별도 확인이 필요합니다.
                </p>
                <div className="mt-5 space-y-3">
                  {data.scenes.length ? (
                    data.scenes.map((scene) => (
                      <article
                        key={scene.id}
                        className="rounded-2xl border border-stone-200 bg-white p-5"
                      >
                        <p className="mb-3 text-xs font-semibold text-stone-500">
                          {scene.episode?.trim()
                            ? `${scene.episode}회`
                            : "회차 미상"}
                        </p>
                        <p className="whitespace-pre-line text-sm leading-7">
                          {scene.description?.trim() ||
                            "이 장면의 설명은 아직 준비 중이에요."}
                        </p>
                      </article>
                    ))
                  ) : (
                    <p className="rounded-2xl bg-white p-5 text-sm text-stone-500">
                      등록된 장면 설명이 아직 없어요.
                    </p>
                  )}
                </div>
              </section>
              <section>
                <p className="text-xs font-semibold tracking-widest text-stone-500">
                  02 / 실제 위치
                </p>
                <p className="mt-3 text-base leading-7">
                  {data.place.address || "주소 정보가 아직 없어요."}
                </p>
                {mapQuery && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white"
                  >
                    지도에서 위치 보기 ↗
                  </a>
                )}
              </section>
              <details className="border-t border-stone-200 pt-5">
                <summary className="cursor-pointer text-sm font-semibold">
                  이 장소의 자료와 확인 상태
                </summary>
                <div className="mt-4 space-y-4 text-xs leading-6 text-stone-600">
                  {data.sources.length ? (
                    data.sources.map((source, index) => (
                      <div key={index} className="rounded-xl bg-white p-4">
                        <p>
                          {source.source_type === "USER_PROVIDED_CSV"
                            ? "사용자가 제공한 촬영지 자료"
                            : source.source_type === "KCCF_PUBLIC_DATA"
                              ? "공공자료로 분류된 기록"
                              : "등록된 촬영지 자료"}
                        </p>
                        <p>
                          {source.verification_status === "UNVERIFIED"
                            ? "외부 검증 전"
                            : source.verification_status === "PUBLIC_DATA"
                              ? "공공자료 분류 · 분류만으로 검증 완료를 뜻하지 않아요."
                              : "확인 상태는 등록된 근거를 참고해 주세요."}
                        </p>
                        {source.verified_fact && (
                          <p className="mt-2 whitespace-pre-line">
                            등록된 확인 메모: {source.verified_fact}
                          </p>
                        )}
                        {sourceUrl(source.source_url) && (
                          <a
                            className="mt-2 inline-block underline"
                            href={sourceUrl(source.source_url)!}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            등록된 출처 보기 ↗
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <p>연결된 출처 정보가 아직 없어요.</p>
                  )}
                </div>
              </details>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}

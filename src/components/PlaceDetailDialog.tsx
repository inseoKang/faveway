"use client";

import { useEffect, useRef, useState } from "react";

type Actor = {
  id: number;
  name: string;
};

type Detail = {
  place: {
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  };

  content: {
    id: number;
    title: string;
  };

  scenes: {
    id: number;
    episode: string | null;
    description: string | null;
    actors: Actor[];
  }[];

  actors: Actor[];

  sources: {
    verification_status: string;
    source_type: string | null;
    source_url: string | null;
    verified_fact: string | null;
    verified_at: string | null;
  }[];
};

function safeSourceUrl(value: string | null) {
  if (!value) {
    return null;
  }

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

    const previousOverflow = document.body.style.overflow;

    element?.showModal();

    document.body.style.overflow = "hidden";

    return () => {
      element?.close();

      document.body.style.overflow = previousOverflow;

      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setError("");

        const response = await fetch(
          `/api/contents/${contentId}/places/${placeId}`,
          {
            signal: controller.signal,
          },
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message ?? "장소 정보를 불러오지 못했습니다.");
        }

        if (!controller.signal.aborted) {
          setData(result.data);
        }
      } catch (reason) {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error
              ? reason.message
              : "장소 정보를 불러오지 못했습니다.",
          );
        }
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

  const verifiedDescriptions =
    data?.sources
      .map((source) => source.verified_fact?.trim())
      .filter((value): value is string => Boolean(value)) ?? [];

  return (
    <dialog
      ref={dialog}
      aria-labelledby="place-detail-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-3xl bg-white p-0 text-gray-900 shadow-2xl backdrop:bg-black/50"
    >
      <div className="min-h-60" onClick={(event) => event.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-gray-500">
            FAVEWAY · PLACE
          </p>

          <button
            type="button"
            autoFocus
            onClick={onClose}
            aria-label="닫기"
            className="rounded-full border border-gray-200 px-4 py-2 text-sm"
          >
            닫기 ×
          </button>
        </header>

        <div className="space-y-9 p-6">
          <section>
            <p className="text-xs font-semibold text-gray-400">LOCATION</p>

            <h2 id="place-detail-title" className="mt-2 text-3xl font-bold">
              {data?.place.name || placeName}
            </h2>

            {data && (
              <p className="mt-2 text-sm text-gray-500">
                {data.content.title} 촬영지
              </p>
            )}
          </section>

          {!data && !error && (
            <p className="py-8 text-sm text-gray-500">
              장소 정보를 불러오는 중...
            </p>
          )}

          {error && (
            <div className="rounded-2xl bg-red-50 p-5">
              <p className="text-sm text-red-600">{error}</p>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  setData(null);
                  setRetry((value) => value + 1);
                }}
                className="mt-4 rounded-full bg-black px-5 py-3 text-sm text-white"
              >
                다시 시도
              </button>
            </div>
          )}

          {data && (
            <>
              <section>
                <p className="text-xs font-semibold text-gray-400">
                  01 · 작품과 배우
                </p>

                <h3 className="mt-2 text-xl font-bold">{data.content.title}</h3>

                {data.actors.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {data.actors.map((actor) => (
                      <span
                        key={actor.id}
                        className="rounded-full bg-gray-100 px-3 py-1 text-sm"
                      >
                        {actor.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-gray-500">
                    등록된 등장 배우 정보가 없습니다.
                  </p>
                )}
              </section>

              <section>
                <p className="text-xs font-semibold text-gray-400">
                  02 · 장면 설명
                </p>

                <div className="mt-4 space-y-3">
                  {data.scenes.length > 0 ? (
                    data.scenes.map((scene) => (
                      <article
                        key={scene.id}
                        className="rounded-2xl border border-gray-200 p-5"
                      >
                        <p className="text-xs font-semibold text-gray-400">
                          {scene.episode?.trim()
                            ? `${scene.episode}회`
                            : "회차 정보 없음"}
                        </p>

                        <p className="mt-3 whitespace-pre-line text-sm leading-7">
                          {scene.description?.trim() ||
                            "장면 설명이 아직 등록되지 않았습니다."}
                        </p>

                        {scene.actors.length > 0 && (
                          <p className="mt-3 text-xs text-gray-500">
                            등장 배우:{" "}
                            {scene.actors.map((actor) => actor.name).join(", ")}
                          </p>
                        )}
                      </article>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">
                      등록된 장면 정보가 없습니다.
                    </p>
                  )}
                </div>
              </section>

              <section>
                <p className="text-xs font-semibold text-gray-400">
                  03 · 장소 정보
                </p>

                {verifiedDescriptions.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {verifiedDescriptions.map((description, index) => (
                      <p
                        key={`${description}-${index}`}
                        className="whitespace-pre-line text-sm leading-7"
                      >
                        {description}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-gray-500">
                    등록된 장소 설명이 아직 없습니다.
                  </p>
                )}
              </section>

              <section>
                <p className="text-xs font-semibold text-gray-400">
                  04 · 실제 위치
                </p>

                <p className="mt-3 text-sm leading-7">
                  {data.place.address || "주소 정보가 아직 없습니다."}
                </p>

                {mapQuery && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      mapQuery,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex rounded-full bg-black px-5 py-3 text-sm font-semibold text-white"
                  >
                    지도에서 위치 보기 ↗
                  </a>
                )}
              </section>

              <details className="border-t border-gray-200 pt-5">
                <summary className="cursor-pointer text-sm font-semibold">
                  등록 자료와 확인 상태
                </summary>

                <div className="mt-4 space-y-3">
                  {data.sources.length > 0 ? (
                    data.sources.map((source, index) => {
                      const url = safeSourceUrl(source.source_url);

                      return (
                        <div
                          key={index}
                          className="rounded-xl bg-gray-50 p-4 text-xs leading-6 text-gray-600"
                        >
                          <p>상태: {source.verification_status}</p>

                          {url && (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-block underline"
                            >
                              출처 보기 ↗
                            </a>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-gray-500">
                      연결된 출처 정보가 없습니다.
                    </p>
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

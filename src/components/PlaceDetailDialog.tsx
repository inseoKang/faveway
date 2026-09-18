"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

type VerificationTone = "verified" | "partial" | "pending";

function safeSourceUrl(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function formatEpisode(value: string | null) {
  const episode = value?.trim();

  if (!episode) return "회차 정보 없음";
  if (/회$|화$/.test(episode) || /episode/i.test(episode)) return episode;

  return `${episode}회`;
}

function formatVerifiedAt(value: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getVerificationMeta(status: string): {
  label: string;
  tone: VerificationTone;
} {
  const normalized = status.trim().toLowerCase();

  if (
    ["verified", "approved", "confirmed", "complete", "completed"].includes(
      normalized,
    )
  ) {
    return { label: "검증 완료", tone: "verified" };
  }

  if (
    ["partial", "partially_verified", "partially-verified"].includes(normalized)
  ) {
    return { label: "부분 검증", tone: "partial" };
  }

  return {
    label: "확인 필요",
    tone: "pending",
  };
}

function sourceTypeLabel(value: string) {
  const labels: Record<string, string> = {
    USER_PROVIDED_CSV: "제공받은 촬영지 자료",
    OFFICIAL: "공식 자료",
    BLOG: "블로그 자료",
    PUBLIC_DATA: "공공데이터",
  };
  return labels[value.trim().toUpperCase()] ?? "참고 자료";
}

function verificationBadgeClass(tone: VerificationTone) {
  if (tone === "verified") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (tone === "partial") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-600";
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
          { signal: controller.signal },
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

  const kakaoMapUrl =
    data?.place.latitude != null && data?.place.longitude != null
      ? `https://map.kakao.com/link/map/${encodeURIComponent(
          data.place.name,
        )},${data.place.latitude},${data.place.longitude}`
      : data?.place.address
        ? `https://map.kakao.com/link/search/${encodeURIComponent(
            data.place.address,
          )}`
        : null;

  const verifiedDescriptions = useMemo(() => {
    if (!data) return [];

    return Array.from(
      new Set(
        data.sources
          .map((source) => source.verified_fact?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    );
  }, [data]);

  const sourceSummary = useMemo(() => {
    if (!data || data.sources.length === 0) return null;

    const metas = data.sources.map((source) =>
      getVerificationMeta(source.verification_status),
    );

    if (metas.some((meta) => meta.tone === "verified")) {
      return { label: "검증 완료", tone: "verified" as const };
    }

    if (metas.some((meta) => meta.tone === "partial")) {
      return { label: "부분 검증", tone: "partial" as const };
    }

    return { label: "출처 확인 필요", tone: "pending" as const };
  }, [data]);

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
      className="fw-dialog"
    >
      <div className="min-h-60" onClick={(event) => event.stopPropagation()}>
        <header className="fw-dialog-header">
          <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">
            FAVEWAY · PLACE
          </p>

          <button
            type="button"
            autoFocus
            onClick={onClose}
            aria-label="닫기"
            className="fw-dialog-close"
          >
            닫기 ×
          </button>
        </header>

        <div className="fw-dialog-body">
          <section>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold text-muted-foreground">
                LOCATION
              </p>

              {sourceSummary && (
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${verificationBadgeClass(
                    sourceSummary.tone,
                  )}`}
                >
                  {sourceSummary.label}
                </span>
              )}
            </div>

            <h2
              id="place-detail-title"
              className="mt-2 text-2xl font-bold leading-snug"
            >
              {data?.place.name || placeName}
            </h2>

            {data && (
              <p className="mt-2 text-sm text-muted-foreground">
                {data.content.title} 촬영지
              </p>
            )}
          </section>

          {!data && !error && (
            <div className="py-8" role="status" aria-live="polite">
              <p className="text-sm font-medium">
                장소 정보를 불러오고 있어요.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                작품, 장면, 배우와 출처 정보를 확인하고 있습니다.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
              <p className="text-sm font-semibold text-red-700">
                장소 정보를 불러오지 못했어요.
              </p>
              <p className="mt-1 text-sm text-red-600">{error}</p>

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
                <p className="text-xs font-semibold text-muted-foreground">
                  01 · 작품과 배우
                </p>

                <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-xs text-muted-foreground">작품</p>
                  <h3 className="mt-1 text-xl font-bold">
                    {data.content.title}
                  </h3>

                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <p className="text-xs font-semibold text-muted-foreground">
                      관련 배우
                    </p>

                    {data.actors.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {data.actors.map((actor) => (
                          <span key={actor.id} className="fw-badge">
                            {actor.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        아직 연결된 배우 정보가 없습니다.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-end justify-between gap-4">
                  <p className="text-xs font-semibold text-muted-foreground">
                    02 · 촬영 장면
                  </p>

                  {data.scenes.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {data.scenes.length}개 장면
                    </p>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  {data.scenes.length > 0 ? (
                    data.scenes.map((scene) => (
                      <article key={scene.id} className="fw-scene-card">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-primary shadow-sm">
                            {formatEpisode(scene.episode)}
                          </span>

                          {scene.actors.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {scene.actors
                                .map((actor) => actor.name)
                                .join(" · ")}
                            </span>
                          )}
                        </div>

                        <p className="mt-3 whitespace-pre-line text-sm leading-7">
                          {scene.description?.trim() ||
                            "이 장면의 설명은 아직 등록되지 않았습니다."}
                        </p>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4">
                      <p className="text-sm font-medium">
                        등록된 장면 정보가 없어요.
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        이 작품과 연결된 장소입니다. 회차와 장면 설명은 아직
                        준비되지 않았습니다.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <p className="text-xs font-semibold text-muted-foreground">
                  03 · 검증된 장소 정보
                </p>

                {verifiedDescriptions.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {verifiedDescriptions.map((description, index) => (
                      <div
                        key={`${description}-${index}`}
                        className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4"
                      >
                        <p className="text-xs font-semibold text-emerald-700">
                          검증된 정보
                        </p>
                        <p className="mt-2 whitespace-pre-line text-sm leading-7">
                          {description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-medium">
                      추가로 정리된 검증 정보가 없어요.
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      촬영 장면은 위에서, 출처와 확인 상태는 아래에서 볼 수
                      있습니다.
                    </p>
                  </div>
                )}
              </section>

              <section>
                <p className="text-xs font-semibold text-muted-foreground">
                  04 · 실제 위치
                </p>

                <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-xs font-semibold text-muted-foreground">
                    주소
                  </p>
                  <p className="mt-2 text-sm leading-7">
                    {data.place.address || "주소 정보가 아직 없습니다."}
                  </p>

                  {kakaoMapUrl && (
                    <a
                      href={kakaoMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fw-primary-button mt-4 inline-flex"
                    >
                      카카오맵에서 위치 보기 ↗
                    </a>
                  )}
                </div>
              </section>

              <section>
                <div className="flex items-end justify-between gap-4">
                  <p className="text-xs font-semibold text-muted-foreground">
                    05 · 출처와 확인 상태
                  </p>

                  {data.sources.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {data.sources.length}개 자료
                    </p>
                  )}
                </div>

                {data.sources.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {data.sources.map((source, index) => {
                      const url = safeSourceUrl(source.source_url);
                      const meta = getVerificationMeta(
                        source.verification_status,
                      );
                      const verifiedAt = formatVerifiedAt(source.verified_at);

                      return (
                        <article
                          key={`${source.source_url ?? "source"}-${index}`}
                          className="rounded-2xl border border-gray-200 bg-white p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${verificationBadgeClass(
                                  meta.tone,
                                )}`}
                              >
                                {meta.label}
                              </span>

                              {source.source_type?.trim() && (
                                <span className="text-xs text-muted-foreground">
                                  {sourceTypeLabel(source.source_type)}
                                </span>
                              )}
                            </div>

                            {verifiedAt && (
                              <span className="text-xs text-muted-foreground">
                                확인 {verifiedAt}
                              </span>
                            )}
                          </div>

                          {source.verified_fact?.trim() && (
                            <p className="mt-3 text-xs leading-6 text-muted-foreground">
                              {source.verified_fact.trim()}
                            </p>
                          )}

                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-primary underline underline-offset-4"
                            >
                              출처 보기 ↗
                            </a>
                          ) : (
                            <p className="mt-3 text-xs text-muted-foreground">
                              연결된 외부 링크가 없습니다.
                            </p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-medium">
                      연결된 출처 정보가 없어요.
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      출처가 추가되기 전까지는 이 장소의 검증 상태를 확정해서
                      표시하지 않습니다.
                    </p>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}

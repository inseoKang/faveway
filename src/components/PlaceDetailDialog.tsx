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

function formatEpisode(value: string | null) {
  const episode = value?.trim();

  if (!episode) {
    return "회차 정보 없음";
  }

  if (/회$|화$/.test(episode) || /episode/i.test(episode)) {
    return episode;
  }

  return `${episode}회`;
}

function formatVerifiedAt(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

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
    return {
      label: "검증 완료",
      tone: "verified",
    };
  }

  if (
    ["partial", "partially_verified", "partially-verified"].includes(normalized)
  ) {
    return {
      label: "부분 검증",
      tone: "partial",
    };
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

function hasMeaningfulSource(source: Detail["sources"][number]) {
  const hasVerifiedFact = Boolean(source.verified_fact?.trim());
  const hasValidUrl = Boolean(safeSourceUrl(source.source_url));
  const hasVerifiedAt = Boolean(source.verified_at?.trim());

  return hasVerifiedFact || hasValidUrl || hasVerifiedAt;
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
          throw new Error(
            result.message ?? "장소 정보를 불러오지 못했습니다.",
          );
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

  const displaySources = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.sources.filter(hasMeaningfulSource);
  }, [data]);

  const sourceSummary = useMemo(() => {
    if (displaySources.length === 0) {
      return null;
    }

    const metas = displaySources.map((source) =>
      getVerificationMeta(source.verification_status),
    );

    if (metas.some((meta) => meta.tone === "verified")) {
      return {
        label: "검증 완료",
        tone: "verified" as const,
      };
    }

    if (metas.some((meta) => meta.tone === "partial")) {
      return {
        label: "부분 검증",
        tone: "partial" as const,
      };
    }

    return {
      label: "출처 확인 필요",
      tone: "pending" as const,
    };
  }, [displaySources]);

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
              {data && <span className="fw-badge">{data.content.title}</span>}

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
              className="mt-4 text-[28px] font-bold leading-tight tracking-[-0.04em]"
            >
              {data?.place.name || placeName}
            </h2>

            {data?.place.address && (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {data.place.address}
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
                  01 / 어떤 장면인가요?
                </p>

                <div className="mt-5 space-y-7">
                  {data.scenes.length > 0 ? (
                    data.scenes.map((scene) => (
                      <article key={scene.id}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-primary">
                            {formatEpisode(scene.episode)}
                          </span>

                          {scene.actors.map((actor) => (
                            <span key={actor.id} className="fw-badge">
                              {actor.name}
                            </span>
                          ))}
                        </div>

                        <p className="mt-4 whitespace-pre-line text-[15px] leading-7 text-foreground">
                          {scene.description?.trim() ||
                            "이 장면의 설명은 아직 등록되지 않았습니다."}
                        </p>

                        {scene.actors.length === 0 && (
                          <p className="mt-3 text-xs leading-5 text-muted-foreground">
                            이 장면과 연결된 배우 정보는 아직 등록되지 않았습니다.
                          </p>
                        )}
                      </article>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4">
                      <p className="text-sm font-medium">
                        구체적인 장면 정보가 아직 등록되지 않았어요.
                      </p>

                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        이 작품과 장소의 연결 근거는 확인할 수 있지만, 회차와
                        장면 설명은 아직 준비되지 않았습니다.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <p className="text-xs font-semibold text-muted-foreground">
                  02 / 이곳은 어떤 곳인가요?
                </p>

                <div className="mt-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-medium">
                    장소 소개가 아직 준비되지 않았어요.
                  </p>

                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    실제 장소 자체에 대한 설명은 추후 검증된 정보를 기반으로
                    추가될 예정입니다.
                  </p>
                </div>
              </section>

              {/*
                추후 AI Docent 위치

                Scene과 장소 소개를 먼저 보여준 뒤,
                검증된 DB 정보를 기반으로 만든 AI Docent를 이 위치에 배치한다.

                DB 검증 정보와 AI 생성 설명은 UI에서도 구분한다.
              */}

              <section>
                <p className="text-xs font-semibold text-muted-foreground">
                  03 / 실제 위치
                </p>

                <div className="mt-5">
                  <p className="text-base font-semibold leading-7">
                    {data.place.address || "주소 정보가 아직 없습니다."}
                  </p>

                  {kakaoMapUrl ? (
                    <a
                      href={kakaoMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fw-primary-button mt-5"
                    >
                      카카오맵에서 위치 보기
                      <span aria-hidden="true">↗</span>
                    </a>
                  ) : (
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      현재 지도에서 확인할 수 있는 주소나 좌표가 없습니다.
                    </p>
                  )}
                </div>
              </section>

              <section>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      이 장소의 연결 근거
                    </p>

                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      작품과 촬영지의 연결을 확인한 자료입니다.
                    </p>
                  </div>

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

                {displaySources.length > 0 ? (
                  <div className="mt-5 divide-y divide-gray-100">
                    {displaySources.map((source, index) => {
                      const url = safeSourceUrl(source.source_url);

                      const meta = getVerificationMeta(
                        source.verification_status,
                      );

                      const verifiedAt = formatVerifiedAt(source.verified_at);

                      return (
                        <article
                          key={`${source.source_url ?? "source"}-${index}`}
                          className="py-5 first:pt-0 last:pb-0"
                        >
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

                          {source.verified_fact?.trim() && (
                            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-foreground">
                              {source.verified_fact.trim()}
                            </p>
                          )}

                          {verifiedAt && (
                            <p className="mt-3 text-xs text-muted-foreground">
                              마지막 확인 {verifiedAt}
                            </p>
                          )}

                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-primary underline underline-offset-4"
                            >
                              원문 출처 보기
                              <span aria-hidden="true">↗</span>
                            </a>
                          ) : (
                            <p className="mt-3 text-xs leading-5 text-muted-foreground">
                              연결된 외부 링크가 없습니다.
                            </p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-medium">
                      확인할 수 있는 연결 근거가 아직 없어요.
                    </p>

                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      촬영지와 작품의 연결을 확인할 수 있는 설명이나 출처가
                      등록되면 이곳에 표시됩니다.
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
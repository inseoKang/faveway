"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import PageHeader from "@/components/common/PageHeader";
import StateFeedback from "@/components/common/StateFeedback";
import ExploreMap, { type ExploreMapPlace } from "@/components/map/ExploreMap";
import PlaceDetailDialog from "@/components/PlaceDetailDialog";

type SearchMode = "CONTENT" | "ACTOR";

type Content = {
  id: number;
  title: string;
  media_type: string;
  release_year: number | null;
  description: string | null;
  character_name?: string | null;
};

type Actor = {
  id: number;
  name: string;
};

type Place = {
  id: number;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  place_type: string | null;
  is_active: boolean;
};

type PlaceRelation = {
  id: number;
  content_id?: number;
  relation_type: string;
  verification_status: string;
  verified_fact: string | null;
  isActorScenePlace: boolean;

  places: Place;

  content?: {
    id: number;
    title: string;
  };
};

type DetailTarget = {
  contentId: number;
  place: Place;
};

export default function ExplorePage() {
  const [mode, setMode] = useState<SearchMode>("CONTENT");

  const [contents, setContents] = useState<Content[]>([]);
  const [contentQuery, setContentQuery] = useState("");

  const [selectedContent, setSelectedContent] = useState<Content | null>(null);

  const [actors, setActors] = useState<Actor[]>([]);
  const [actorQuery, setActorQuery] = useState("");

  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);

  const [contentActors, setContentActors] = useState<Actor[]>([]);

  const [selectedActors, setSelectedActors] = useState<Actor[]>([]);

  const [selectedActorContentIds, setSelectedActorContentIds] = useState<
    number[]
  >([]);

  const [places, setPlaces] = useState<PlaceRelation[]>([]);

  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);

  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);

  const [actorLoading, setActorLoading] = useState(false);

  const [placesLoading, setPlacesLoading] = useState(false);

  const [pageError, setPageError] = useState("");
  const [actorError, setActorError] = useState("");
  const [placesError, setPlacesError] = useState("");

  /**
   * 작품 전체 목록 조회
   *
   * 사용자 액션(changeMode)에서도 다시 호출해야 하므로
   * 별도 함수로 유지한다.
   */
  async function fetchAllContents() {
    try {
      setLoading(true);
      setPageError("");
      setPlacesError("");

      const response = await fetch("/api/contents");

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "작품을 불러오지 못했습니다.");
      }

      setContents(result.data ?? []);
    } catch (reason) {
      setPageError(
        reason instanceof Error
          ? reason.message
          : "작품을 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * 첫 화면 진입 시 작품 목록 조회
   *
   * effect 안에서 fetchAllContents()를 호출하면
   * 해당 함수 내부의 동기적인 setState 때문에
   * react-hooks/set-state-in-effect 규칙에 걸릴 수 있으므로
   * 비동기 fetch 완료 후 상태를 변경한다.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadInitialContents() {
      try {
        const response = await fetch("/api/contents");

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message ?? "작품을 불러오지 못했습니다.");
        }

        if (!cancelled) {
          setContents(result.data ?? []);
        }
      } catch (reason) {
        if (!cancelled) {
          setPageError(
            reason instanceof Error
              ? reason.message
              : "작품을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitialContents();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * 배우 이름 검색
   *
   * actorQuery가 비었을 때 actors를 비우는 작업은
   * effect 안이 아니라 input onChange에서 처리한다.
   */
  useEffect(() => {
    if (mode !== "ACTOR") {
      return;
    }

    const query = actorQuery.trim();

    if (!query) {
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      try {
        setActorLoading(true);
        setActorError("");

        const response = await fetch(
          `/api/actors/search?q=${encodeURIComponent(query)}`,
          {
            signal: controller.signal,
          },
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message ?? "배우를 검색하지 못했습니다.");
        }

        if (!controller.signal.aborted) {
          setActors(result.data ?? []);
        }
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") {
          return;
        }

        if (!controller.signal.aborted) {
          setActorError(
            reason instanceof Error
              ? reason.message
              : "배우를 검색하지 못했습니다.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setActorLoading(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [actorQuery, mode]);

  async function fetchContentActors(contentId: number) {
    const response = await fetch(`/api/contents/${contentId}/actors`);

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message ?? "출연 배우를 불러오지 못했습니다.");
    }

    setContentActors(result.data ?? []);
  }

  async function fetchContentPlaces(contentId: number, actorIds: number[]) {
    try {
      setPlacesLoading(true);
      setPlacesError("");

      const params = new URLSearchParams();

      if (actorIds.length > 0) {
        params.set("actorIds", actorIds.join(","));
      }

      const query = params.toString();

      const response = await fetch(
        query
          ? `/api/contents/${contentId}/places?${query}`
          : `/api/contents/${contentId}/places`,
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "촬영지를 불러오지 못했습니다.");
      }

      setPlaces(result.data ?? []);
      setSelectedPlaceId(null);
    } catch (reason) {
      setPlaces([]);
      setSelectedPlaceId(null);

      setPlacesError(
        reason instanceof Error
          ? reason.message
          : "촬영지를 불러오지 못했습니다.",
      );
    } finally {
      setPlacesLoading(false);
    }
  }

  async function fetchActorPlaces(actorId: number, contentIds: number[]) {
    try {
      setPlacesLoading(true);
      setPlacesError("");

      const params = new URLSearchParams();

      if (contentIds.length > 0) {
        params.set("contentIds", contentIds.join(","));
      }

      const query = params.toString();

      const response = await fetch(
        query
          ? `/api/actors/${actorId}/places?${query}`
          : `/api/actors/${actorId}/places`,
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "촬영지를 불러오지 못했습니다.");
      }

      setPlaces(result.data ?? []);
      setSelectedPlaceId(null);
    } catch (reason) {
      setPlaces([]);
      setSelectedPlaceId(null);

      setPlacesError(
        reason instanceof Error
          ? reason.message
          : "촬영지를 불러오지 못했습니다.",
      );
    } finally {
      setPlacesLoading(false);
    }
  }

  async function selectContent(content: Content) {
    try {
      setSelectedContent(content);
      setSelectedActors([]);
      setPlaces([]);
      setSelectedPlaceId(null);

      await Promise.all([
        fetchContentActors(content.id),

        fetchContentPlaces(content.id, []),
      ]);
    } catch (reason) {
      setPageError(
        reason instanceof Error
          ? reason.message
          : "정보를 불러오지 못했습니다.",
      );
    }
  }

  function toggleContentActor(actor: Actor) {
    if (!selectedContent) {
      return;
    }

    const exists = selectedActors.some((item) => item.id === actor.id);

    const nextActors = exists
      ? selectedActors.filter((item) => item.id !== actor.id)
      : [...selectedActors, actor];

    setSelectedActors(nextActors);

    void fetchContentPlaces(
      selectedContent.id,
      nextActors.map((item) => item.id),
    );
  }

  async function selectActor(actor: Actor) {
    try {
      setSelectedActor(actor);
      setSelectedActorContentIds([]);

      setContents([]);
      setPlaces([]);
      setSelectedPlaceId(null);

      setLoading(true);
      setPageError("");
      setPlacesError("");

      const response = await fetch(`/api/actors/${actor.id}/contents`);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ?? "배우의 출연 작품을 불러오지 못했습니다.",
        );
      }

      setContents(result.data ?? []);

      await fetchActorPlaces(actor.id, []);
    } catch (reason) {
      setPageError(
        reason instanceof Error
          ? reason.message
          : "정보를 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleActorContent(contentId: number) {
    if (!selectedActor) {
      return;
    }

    const nextIds = selectedActorContentIds.includes(contentId)
      ? selectedActorContentIds.filter((id) => id !== contentId)
      : [...selectedActorContentIds, contentId];

    setSelectedActorContentIds(nextIds);

    void fetchActorPlaces(selectedActor.id, nextIds);
  }

  async function changeMode(nextMode: SearchMode) {
    setMode(nextMode);

    setSelectedContent(null);
    setSelectedActor(null);

    setSelectedActors([]);
    setSelectedActorContentIds([]);

    setContentActors([]);
    setPlaces([]);
    setSelectedPlaceId(null);

    setActorQuery("");
    setActors([]);

    setContentQuery("");
    setPageError("");
    setActorError("");
    setPlacesError("");

    if (nextMode === "CONTENT") {
      await fetchAllContents();
    } else {
      setContents([]);
    }
  }

  const filteredContents = useMemo(() => {
    const query = contentQuery.trim().toLowerCase();

    if (!query) {
      return contents;
    }

    return contents.filter((content) =>
      content.title.toLowerCase().includes(query),
    );
  }, [contents, contentQuery]);

  function placeContentId(relation: PlaceRelation): number | null {
    if (relation.content?.id) {
      return relation.content.id;
    }

    if (relation.content_id) {
      return relation.content_id;
    }

    if (selectedContent) {
      return selectedContent.id;
    }

    return null;
  }

  const mapPlaces = useMemo<ExploreMapPlace[]>(() => {
    const uniquePlaces = new Map<number, ExploreMapPlace>();

    places.forEach((relation) => {
      const place = relation.places;

      if (
        place.latitude == null ||
        place.longitude == null ||
        !Number.isFinite(place.latitude) ||
        !Number.isFinite(place.longitude)
      ) {
        return;
      }

      if (!uniquePlaces.has(place.id)) {
        uniquePlaces.set(place.id, {
          placeId: place.id,
          name: place.name,
          latitude: place.latitude,
          longitude: place.longitude,
        });
      }
    });

    return Array.from(uniquePlaces.values());
  }, [places]);

  const selectPlaceFromMap = useCallback((placeId: number) => {
    setSelectedPlaceId(placeId);

    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`[data-explore-place-id="${placeId}"]`)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    });
  }, []);

  return (
    <main className="fw-page">
      <PageHeader
        eyebrow="DISCOVER THE SCENE"
        title="이야기 속 장소를 찾아요"
        description="작품과 배우에 연결된 촬영지를 지도에서 만나보세요."
      />

      <section className="fw-tabs" aria-label="탐색 기준">
        <button
          type="button"
          onClick={() => void changeMode("CONTENT")}
          aria-pressed={mode === "CONTENT"}
          className={`fw-tab rounded-2xl border py-3 text-sm font-semibold ${
            mode === "CONTENT"
              ? "border-primary bg-primary text-white"
              : "border-border bg-white"
          }`}
        >
          작품으로 찾기
        </button>

        <button
          type="button"
          onClick={() => void changeMode("ACTOR")}
          aria-pressed={mode === "ACTOR"}
          className={`fw-tab rounded-2xl border py-3 text-sm font-semibold ${
            mode === "ACTOR"
              ? "border-primary bg-primary text-white"
              : "border-border bg-white"
          }`}
        >
          배우로 찾기
        </button>
      </section>

      {loading && (
        <StateFeedback
          title="정보를 불러오고 있어요."
          description="작품과 배우 정보를 준비하고 있습니다."
          className="mb-5"
        />
      )}

      {pageError && (
        <StateFeedback
          tone="error"
          title="기본 정보를 불러오지 못했어요."
          description={pageError}
          actionLabel="다시 시도"
          onAction={() => void fetchAllContents()}
          className="mb-5"
        />
      )}

      {mode === "CONTENT" && (
        <>
          <input
            type="search"
            value={contentQuery}
            onChange={(event) => setContentQuery(event.target.value)}
            placeholder="작품 제목을 입력해 주세요"
            aria-label="작품 검색"
            className="fw-search mb-5"
          />

          {!loading && !pageError && filteredContents.length === 0 && (
            <p className="fw-state">
              {contentQuery.trim()
                ? "일치하는 작품이 없어요. 다른 제목으로 검색해 보세요."
                : "등록된 작품이 아직 없어요."}
            </p>
          )}

          {!loading && (
            <div className="space-y-2">
              {filteredContents.map((content) => (
                <button
                  key={content.id}
                  type="button"
                  onClick={() => void selectContent(content)}
                  aria-pressed={selectedContent?.id === content.id}
                  className={`fw-choice w-full rounded-2xl border p-4 text-left ${
                    selectedContent?.id === content.id
                      ? "border-primary bg-blue-50"
                      : "border-border"
                  }`}
                >
                  <p className="font-semibold">{content.title}</p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {content.media_type}
                  </p>
                </button>
              ))}
            </div>
          )}

          {selectedContent && (
            <section className="mt-8">
              <h2 className="font-semibold">배우로 좁혀보기</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                선택하지 않으면 작품의 모든 촬영지를 보여줍니다.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {contentActors.map((actor) => {
                  const selected = selectedActors.some(
                    (item) => item.id === actor.id,
                  );

                  return (
                    <button
                      key={actor.id}
                      type="button"
                      onClick={() => toggleContentActor(actor)}
                      aria-pressed={selected}
                      className={`fw-chip rounded-full border px-4 py-2 text-sm ${
                        selected
                          ? "border-primary bg-primary text-white"
                          : "border-border"
                      }`}
                    >
                      {actor.name}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {mode === "ACTOR" && (
        <>
          <input
            type="search"
            value={actorQuery}
            onChange={(event) => {
              const value = event.target.value;

              setActorQuery(value);

              if (!value.trim()) {
                setActors([]);
              }
            }}
            placeholder="배우 이름을 입력해 주세요"
            aria-label="배우 검색"
            className="fw-search"
          />

          {actorLoading && (
            <StateFeedback
              title="배우를 검색하고 있어요."
              className="mt-3"
            />
          )}

          {actorError && (
            <StateFeedback
              tone="error"
              title="배우 검색에 실패했어요."
              description={actorError}
              className="mt-3"
            />
          )}

          {!actorLoading &&
            !actorError &&
            actorQuery.trim() &&
            actors.length === 0 && (
              <StateFeedback
                title="일치하는 배우가 없어요."
                description="다른 이름이나 더 짧은 검색어로 다시 찾아보세요."
                className="mt-3"
              />
            )}

          {actors.length > 0 && (
            <div className="mt-3 space-y-2">
              {actors.map((actor) => (
                <button
                  key={actor.id}
                  type="button"
                  onClick={() => void selectActor(actor)}
                  aria-pressed={selectedActor?.id === actor.id}
                  className="fw-choice w-full rounded-2xl border border-border p-4 text-left"
                >
                  {actor.name}
                </button>
              ))}
            </div>
          )}

          {selectedActor && (
            <section className="mt-8">
              <h2 className="font-semibold">작품으로 좁혀보기</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                아무 작품도 선택하지 않으면 {selectedActor.name}의 전체 작품
                촬영지를 보여줍니다.
              </p>

              <div className="mt-4 space-y-2">
                {contents.map((content) => {
                  const selected = selectedActorContentIds.includes(content.id);

                  return (
                    <button
                      key={content.id}
                      type="button"
                      onClick={() => toggleActorContent(content.id)}
                      aria-pressed={selected}
                      className={`fw-choice w-full rounded-2xl border p-4 text-left ${
                        selected ? "border-primary bg-blue-50" : "border-border"
                      }`}
                    >
                      <p className="font-semibold">{content.title}</p>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {placesError && (
        <StateFeedback
          tone="error"
          title="촬영지를 불러오지 못했어요."
          description={placesError}
          actionLabel="다시 시도"
          onAction={() => {
            if (selectedContent) {
              void fetchContentPlaces(
                selectedContent.id,
                selectedActors.map((actor) => actor.id),
              );
              return;
            }

            if (selectedActor) {
              void fetchActorPlaces(selectedActor.id, selectedActorContentIds);
            }
          }}
          className="mt-6"
        />
      )}

      {placesLoading && (
        <StateFeedback
          title="촬영지를 불러오고 있어요."
          description="선택한 작품과 배우 조건에 맞는 장소를 확인하고 있습니다."
          className="mt-8"
        />
      )}

      {!placesLoading && places.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground">FILMING LOCATIONS</p>

              <h2 className="mt-1 text-xl font-bold">
                촬영지 {places.length}곳
              </h2>
            </div>
          </div>

          <ExploreMap
            places={mapPlaces}
            selectedPlaceId={selectedPlaceId}
            onSelectPlace={selectPlaceFromMap}
          />

          <div className="mt-5 space-y-3">
            {places.map((relation) => {
              const contentId = placeContentId(relation);
              const selected = selectedPlaceId === relation.places.id;

              return (
                <button
                  key={`${contentId}-${relation.id}`}
                  data-explore-place-id={relation.places.id}
                  type="button"
                  disabled={!contentId}
                  onClick={() => {
                    if (!contentId) {
                      return;
                    }

                    setSelectedPlaceId(relation.places.id);

                    setDetailTarget({
                      contentId,
                      place: relation.places,
                    });
                  }}
                  aria-haspopup="dialog"
                  aria-pressed={selected}
                  className={`fw-place-card w-full rounded-2xl border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    selected
                      ? "border-primary bg-blue-50 ring-1 ring-primary"
                      : "border-border bg-white hover:border-primary"
                  }`}
                >
                  {relation.content && (
                    <p className="fw-badge mb-2">{relation.content.title}</p>
                  )}

                  <h3 className="font-bold">{relation.places.name}</h3>
                  {(relation.places.latitude == null ||
                    relation.places.longitude == null ||
                    !Number.isFinite(relation.places.latitude) ||
                    !Number.isFinite(relation.places.longitude)) && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      지도 위치 미등록
                    </p>
                  )}

                  {relation.places.address && (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {relation.places.address}
                    </p>
                  )}

                  {relation.verified_fact && (
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {relation.verified_fact}
                    </p>
                  )}

                  <p className="mt-4 text-xs font-semibold text-primary">
                    장면과 장소 살펴보기 ↗
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {!placesLoading &&
        (selectedContent || selectedActor) &&
        places.length === 0 &&
        !placesError && (
          <StateFeedback
            title="조건에 맞는 촬영지가 없어요."
            description="배우 또는 작품 선택 범위를 넓혀 다시 확인해 보세요."
            className="mt-8"
          />
        )}

      {detailTarget && (
        <PlaceDetailDialog
          key={`${detailTarget.contentId}-${detailTarget.place.id}`}
          contentId={detailTarget.contentId}
          placeId={detailTarget.place.id}
          placeName={detailTarget.place.name}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </main>
  );
}

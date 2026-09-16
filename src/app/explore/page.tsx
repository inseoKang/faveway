"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  relation_type: string;
  verification_status: string;
  verified_fact: string | null;
  isActorScenePlace: boolean;
  places: Place;
};

export default function ExplorePage() {
  const router = useRouter();
  const [detailPlace, setDetailPlace] = useState<Place | null>(null);

  const [mode, setMode] = useState<SearchMode>("CONTENT");

  const [contents, setContents] = useState<Content[]>([]);

  const [selectedContent, setSelectedContent] = useState<Content | null>(null);

  /**
   * 배우로 찾기
   */
  const [actors, setActors] = useState<Actor[]>([]);

  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);

  const [actorQuery, setActorQuery] = useState("");

  /**
   * 작품으로 찾기에서 사용하는
   * 작품 출연 배우 목록
   */
  const [contentActors, setContentActors] = useState<Actor[]>([]);

  const [selectedActors, setSelectedActors] = useState<Actor[]>([]);

  /**
   * 촬영지
   */
  const [places, setPlaces] = useState<PlaceRelation[]>([]);

  /**
   * Loading
   */
  const [contentsLoading, setContentsLoading] = useState(true);

  const [actorLoading, setActorLoading] = useState(false);

  const [contentActorsLoading, setContentActorsLoading] = useState(false);

  const [placesLoading, setPlacesLoading] = useState(false);

  /**
   * Error
   */
  const [contentsError, setContentsError] = useState("");

  const [actorError, setActorError] = useState("");

  const [contentActorsError, setContentActorsError] = useState("");

  const [placesError, setPlacesError] = useState("");

  /**
   * 작품 전체 목록 조회
   */
  async function fetchAllContents() {
    try {
      setContentsLoading(true);
      setContentsError("");

      const response = await fetch("/api/contents");

      if (!response.ok) {
        throw new Error("콘텐츠를 불러오지 못했습니다.");
      }

      const result = await response.json();

      setContents(result.data ?? []);
    } catch (error) {
      setContentsError(
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setContentsLoading(false);
    }
  }

  /**
   * 최초 진입 시 콘텐츠 목록 조회
   */
  useEffect(() => {
    let cancelled = false;

    async function loadContents() {
      try {
        const response = await fetch("/api/contents");

        if (!response.ok) {
          throw new Error("콘텐츠를 불러오지 못했습니다.");
        }

        const result = await response.json();

        if (!cancelled) {
          setContents(result.data ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setContentsError(
            error instanceof Error
              ? error.message
              : "알 수 없는 오류가 발생했습니다.",
          );
        }
      } finally {
        if (!cancelled) {
          setContentsLoading(false);
        }
      }
    }

    void loadContents();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * 배우 이름 부분 검색
   */
  useEffect(() => {
    if (mode !== "ACTOR") {
      return;
    }

    const query = actorQuery.trim();

    if (!query) {
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setActorLoading(true);
        setActorError("");

        const response = await fetch(
          `/api/actors/search?q=${encodeURIComponent(query)}`,
        );

        if (!response.ok) {
          throw new Error("배우를 검색하지 못했습니다.");
        }

        const result = await response.json();

        setActors(result.data ?? []);
      } catch (error) {
        setActorError(
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
        );
      } finally {
        setActorLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [actorQuery, mode]);

  /**
   * 작품의 출연 배우 조회
   */
  async function fetchContentActors(contentId: number) {
    try {
      setContentActorsLoading(true);
      setContentActorsError("");

      const response = await fetch(`/api/contents/${contentId}/actors`);

      if (!response.ok) {
        const result = await response.json();

        throw new Error(result.message ?? "출연 배우를 불러오지 못했습니다.");
      }

      const result = await response.json();

      setContentActors(result.data ?? []);
    } catch (error) {
      setContentActorsError(
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다.",
      );

      setContentActors([]);
    } finally {
      setContentActorsLoading(false);
    }
  }

  /**
   * 작품 + 선택 배우 기준 촬영지 조회
   *
   * actorIds = []
   * → 작품 전체 촬영지
   *
   * actorIds = [1, 2]
   * → 배우 1 또는 배우 2가 등장한 Scene의 촬영지
   */
  async function fetchPlaces(contentId: number, actorIds: number[]) {
    try {
      setPlacesLoading(true);
      setPlacesError("");

      const searchParams = new URLSearchParams();

      if (actorIds.length > 0) {
        searchParams.set("actorIds", actorIds.join(","));
      }

      const queryString = searchParams.toString();

      const url = queryString
        ? `/api/contents/${contentId}/places?${queryString}`
        : `/api/contents/${contentId}/places`;

      const response = await fetch(url);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "촬영지를 불러오지 못했습니다.");
      }

      setPlaces(result.data ?? []);
    } catch (error) {
      setPlaces([]);

      setPlacesError(
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setPlacesLoading(false);
    }
  }

  function resetSelection() {
    setSelectedActor(null);
    setSelectedActors([]);
    setSelectedContent(null);

    setContentActors([]);
    setPlaces([]);

    setPlacesError("");
    setContentActorsError("");
  }

  async function handleChangeMode(nextMode: SearchMode) {
    setMode(nextMode);

    resetSelection();

    setActorQuery("");
    setActors([]);
    setActorError("");

    if (nextMode === "CONTENT") {
      await fetchAllContents();
    } else {
      setContents([]);
      setContentsError("");
      setContentsLoading(false);
    }
  }

  /**
   * 배우로 찾기에서 배우 선택
   */
  async function handleSelectActor(actor: Actor) {
    setSelectedActor(actor);

    setSelectedActors([]);
    setSelectedContent(null);

    setPlaces([]);
    setContents([]);

    setContentsError("");

    try {
      setContentsLoading(true);

      const response = await fetch(`/api/actors/${actor.id}/contents`);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ?? "배우의 출연 작품을 불러오지 못했습니다.",
        );
      }

      setContents(result.data ?? []);
    } catch (error) {
      setContentsError(
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setContentsLoading(false);
    }
  }

  /**
   * 작품 선택
   */
  async function handleSelectContent(content: Content) {
    setSelectedContent(content);

    setPlaces([]);
    setPlacesError("");

    /**
     * 작품으로 찾기
     *
     * 작품을 선택하면
     * 전체 촬영지 + 등장 배우를 조회한다.
     *
     * 초기 배우 선택은 0명.
     */
    if (mode === "CONTENT") {
      setSelectedActors([]);

      await Promise.all([
        fetchContentActors(content.id),
        fetchPlaces(content.id, []),
      ]);

      return;
    }

    /**
     * 배우로 찾기
     *
     * 선택한 배우 한 명의 Scene 촬영지만 조회한다.
     */
    if (selectedActor) {
      await fetchPlaces(content.id, [selectedActor.id]);
    }
  }

  /**
   * 작품으로 찾기에서 배우 선택 / 해제
   */
  function handleToggleContentActor(actor: Actor) {
    if (!selectedContent) {
      return;
    }

    const alreadySelected = selectedActors.some(
      (selected) => selected.id === actor.id,
    );

    const nextActors = alreadySelected
      ? selectedActors.filter((selected) => selected.id !== actor.id)
      : [...selectedActors, actor];

    setSelectedActors(nextActors);

    /**
     * 중요:
     * nextActors를 이용해야 한다.
     *
     * setSelectedActors는 비동기이기 때문에
     * 기존 selectedActors를 그대로 보내면
     * 한 단계 이전 선택값이 API로 전달될 수 있다.
     */
    void fetchPlaces(
      selectedContent.id,
      nextActors.map((selected) => selected.id),
    );
  }

  /**
   * Planning으로 이동
   */
  function handleStartPlanning() {
    if (!selectedContent) {
      return;
    }

    const params = new URLSearchParams({
      contentId: selectedContent.id.toString(),
      title: selectedContent.title,
    });

    let actorsForPlanning: Actor[] = [];

    /**
     * 배우로 찾기
     */
    if (mode === "ACTOR" && selectedActor) {
      actorsForPlanning = [selectedActor];
    }

    /**
     * 작품으로 찾기
     */
    if (mode === "CONTENT") {
      actorsForPlanning = selectedActors;
    }

    /**
     * 배우를 한 명 이상 선택했을 때만
     * actorIds / actorNames를 URL에 포함한다.
     */
    if (actorsForPlanning.length > 0) {
      params.set(
        "actorIds",
        actorsForPlanning.map((actor) => actor.id).join(","),
      );

      params.set(
        "actorNames",
        actorsForPlanning.map((actor) => actor.name).join(","),
      );
    }

    router.push(`/planning?${params.toString()}`);
  }

  const selectedActorNames =
    mode === "ACTOR" && selectedActor
      ? [selectedActor.name]
      : selectedActors.map((actor) => actor.name);

  return (
    <main className="mx-auto min-h-screen max-w-md p-6">
      <header className="mb-8">
        <p className="text-sm font-medium text-gray-500">FAVEWAY</p>

        <h1 className="mt-2 text-2xl font-bold">
          어떤 콘텐츠를 따라
          <br />
          여행하고 싶나요?
        </h1>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => void handleChangeMode("CONTENT")}
          className={`rounded-2xl border py-3 text-sm font-semibold ${
            mode === "CONTENT"
              ? "border-black bg-black text-white"
              : "border-gray-200 bg-white"
          }`}
        >
          작품으로 찾기
        </button>

        <button
          type="button"
          onClick={() => void handleChangeMode("ACTOR")}
          className={`rounded-2xl border py-3 text-sm font-semibold ${
            mode === "ACTOR"
              ? "border-black bg-black text-white"
              : "border-gray-200 bg-white"
          }`}
        >
          배우로 찾기
        </button>
      </section>

      {mode === "ACTOR" && (
        <section className="mb-8">
          <label htmlFor="actor-search" className="mb-2 block font-semibold">
            좋아하는 배우를 검색해보세요
          </label>

          <input
            id="actor-search"
            type="search"
            value={actorQuery}
            onChange={(event) => {
              const value = event.target.value;

              setActorQuery(value);

              if (!value.trim()) {
                setActors([]);
                setActorError("");
              }
            }}
            placeholder="예: 공유"
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-black"
          />

          {actorLoading && (
            <p className="mt-3 text-sm text-gray-500">배우를 검색하는 중...</p>
          )}

          {actorError && (
            <p className="mt-3 text-sm text-red-600">{actorError}</p>
          )}

          {!actorLoading &&
            actorQuery.trim() &&
            actors.length === 0 &&
            !actorError && (
              <p className="mt-3 text-sm text-gray-500">
                검색 결과가 없습니다.
              </p>
            )}

          {actors.length > 0 && (
            <div className="mt-4 space-y-2">
              {actors.map((actor) => {
                const selected = selectedActor?.id === actor.id;

                return (
                  <button
                    key={actor.id}
                    type="button"
                    onClick={() => void handleSelectActor(actor)}
                    className={`w-full rounded-2xl border p-4 text-left ${
                      selected ? "border-black bg-gray-50" : "border-gray-200"
                    }`}
                  >
                    <p className="font-semibold">{actor.name}</p>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {selectedActor && (
        <section className="mb-6 rounded-2xl bg-gray-50 p-4">
          <p className="text-xs text-gray-500">선택한 배우</p>

          <p className="mt-1 font-semibold">{selectedActor.name}</p>

          <p className="mt-1 text-sm text-gray-500">
            어떤 작품 속 {selectedActor.name}을 따라가 볼까요?
          </p>
        </section>
      )}

      {contentsLoading && (
        <p className="text-sm text-gray-500">작품을 불러오는 중...</p>
      )}

      {contentsError && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
          {contentsError}
        </p>
      )}

      {!contentsLoading &&
        !contentsError &&
        contents.length === 0 &&
        (mode === "CONTENT" || selectedActor) && (
          <p className="text-sm text-gray-500">등록된 작품이 없습니다.</p>
        )}

      {!contentsLoading && contents.length > 0 && (
        <section className="space-y-3">
          {contents.map((content) => {
            const selected = selectedContent?.id === content.id;

            return (
              <button
                key={content.id}
                type="button"
                onClick={() => void handleSelectContent(content)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selected
                    ? "border-black bg-gray-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <p className="font-semibold">{content.title}</p>

                <div className="mt-1 flex flex-wrap gap-2 text-sm text-gray-500">
                  <span>{content.media_type}</span>

                  {content.release_year && <span>{content.release_year}</span>}

                  {content.character_name && (
                    <span>배역: {content.character_name}</span>
                  )}
                </div>
              </button>
            );
          })}
        </section>
      )}

      {selectedContent && mode === "CONTENT" && (
        <section className="mt-8">
          <h2 className="font-semibold">등장 배우</h2>

          <p className="mt-1 text-sm leading-6 text-gray-500">
            원하는 배우를 선택해주세요.
            <br />
            아무도 선택하지 않으면 작품 전체 촬영지를 보여드립니다.
          </p>

          {contentActorsLoading && (
            <p className="mt-4 text-sm text-gray-500">
              출연 배우를 불러오는 중...
            </p>
          )}

          {contentActorsError && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {contentActorsError}
            </p>
          )}

          {!contentActorsLoading &&
            !contentActorsError &&
            contentActors.length === 0 && (
              <p className="mt-4 text-sm text-gray-500">
                등록된 출연 배우가 없습니다.
              </p>
            )}

          {contentActors.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {contentActors.map((actor) => {
                const selected = selectedActors.some(
                  (selectedActor) => selectedActor.id === actor.id,
                );

                return (
                  <button
                    key={actor.id}
                    type="button"
                    onClick={() => handleToggleContentActor(actor)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      selected
                        ? "border-black bg-black text-white"
                        : "border-gray-200 bg-white text-black"
                    }`}
                  >
                    {actor.name}
                  </button>
                );
              })}
            </div>
          )}

          {selectedActors.length > 0 && (
            <p className="mt-3 text-xs leading-5 text-gray-500">
              {selectedActors.length}명 선택됨 · 선택한 배우 중 한 명 이상이
              등장한 장면의 촬영지를 보여드립니다.
            </p>
          )}
        </section>
      )}

      {selectedContent && (
        <section className="mt-10">
          <div className="mb-4">
            <p className="text-sm text-gray-500">선택한 작품</p>

            <h2 className="mt-1 text-xl font-bold">
              {selectedContent.title} 촬영지
            </h2>

            {selectedActorNames.length > 0 ? (
              <p className="mt-1 text-sm leading-6 text-gray-500">
                {selectedActorNames.join(", ")}
                이(가) 등장한 장면의 촬영지만 표시합니다.
              </p>
            ) : (
              <p className="mt-1 text-sm text-gray-500">
                작품의 전체 촬영지를 표시합니다.
              </p>
            )}
          </div>

          {placesLoading && (
            <p className="text-sm text-gray-500">촬영지를 불러오는 중...</p>
          )}

          {!placesLoading && placesError && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {placesError}
            </p>
          )}

          {!placesLoading && !placesError && places.length === 0 && (
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-sm font-medium">
                조건에 맞는 촬영지가 없습니다.
              </p>

              {selectedActorNames.length > 0 && (
                <p className="mt-1 text-sm leading-6 text-gray-500">
                  다른 배우를 선택하거나 배우 선택을 모두 해제하면 더 많은
                  촬영지를 확인할 수 있습니다.
                </p>
              )}
            </div>
          )}

          {!placesLoading && !placesError && places.length > 0 && (
            <div className="space-y-3">
              {places.map((relation) => (
                <button
                  type="button"
                  key={relation.id}
                  onClick={() => setDetailPlace(relation.places)}
                  aria-label={`${relation.places.name} 장소 설명 보기`}
                  className="w-full rounded-2xl border border-gray-200 p-4 text-left transition hover:border-stone-500 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">{relation.places.name}</p>

                    {relation.isActorScenePlace && (
                      <span className="shrink-0 rounded-full bg-black px-2 py-1 text-xs text-white">
                        배우 등장 장면
                      </span>
                    )}
                  </div>

                  {relation.places.address && (
                    <p className="mt-1 text-sm text-gray-500">
                      {relation.places.address}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-gray-100 px-2 py-1">
                      {relation.relation_type}
                    </span>

                    <span className="rounded-full bg-gray-100 px-2 py-1">
                      {relation.verification_status}
                    </span>
                  </div>

                  {relation.verified_fact && (
                    <p className="mt-3 text-sm leading-6 text-gray-700">
                      {relation.verified_fact}
                    </p>
                  )}
                  <span className="mt-4 block text-xs font-semibold text-stone-600">
                    장면·장소 이야기 보기 ↗
                  </span>
                </button>
              ))}
            </div>
          )}

          {!placesLoading && !placesError && places.length > 0 && (
            <button
              type="button"
              onClick={handleStartPlanning}
              className="mt-6 w-full rounded-2xl bg-black py-4 font-semibold text-white"
            >
              이 조건으로 여행하기
            </button>
          )}
        </section>
      )}
      {detailPlace && selectedContent && (
        <PlaceDetailDialog
          key={`${selectedContent.id}/${detailPlace.id}`}
          contentId={selectedContent.id}
          placeId={detailPlace.id}
          placeName={detailPlace.name}
          onClose={() => setDetailPlace(null)}
        />
      )}
    </main>
  );
}

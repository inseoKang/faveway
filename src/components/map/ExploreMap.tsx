"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";

import StateFeedback from "@/components/common/StateFeedback";

export type ExploreMapPlace = {
  placeId: number;
  name: string;
  latitude: number;
  longitude: number;
};

type ExploreMapProps = {
  places: ExploreMapPlace[];
  selectedPlaceId?: number | null;
  onSelectPlace?: (placeId: number) => void;
};

const SEOUL_CENTER = {
  latitude: 37.5665,
  longitude: 126.978,
};

export default function ExploreMap({
  places,
  selectedPlaceId,
  onSelectPlace,
}: ExploreMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState(false);

  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_JAVASCRIPT_KEY;

  const validPlaces = useMemo(
    () =>
      places.filter(
        (place) =>
          Number.isFinite(place.latitude) && Number.isFinite(place.longitude),
      ),
    [places],
  );

  function handleSdkReady() {
    const kakao = window.kakao;

    if (!kakao?.maps) {
      setSdkError(true);
      return;
    }

    kakao.maps.load(() => {
      setSdkReady(true);
      setSdkError(false);
    });
  }

  useEffect(() => {
    if (!sdkReady || !containerRef.current) {
      return;
    }

    const kakao = window.kakao;

    if (!kakao?.maps) {
      return;
    }

    const firstPlace = validPlaces[0];

    const initialCenter = firstPlace
      ? new kakao.maps.LatLng(firstPlace.latitude, firstPlace.longitude)
      : new kakao.maps.LatLng(SEOUL_CENTER.latitude, SEOUL_CENTER.longitude);

    const map = new kakao.maps.Map(containerRef.current, {
      center: initialCenter,
      level: 7,
    });

    if (validPlaces.length === 0) {
      return;
    }

    const bounds = new kakao.maps.LatLngBounds();

    const overlays = validPlaces.map((place) => {
      const position = new kakao.maps.LatLng(place.latitude, place.longitude);

      bounds.extend(position);

      const marker = document.createElement("button");
      const isSelected = selectedPlaceId === place.placeId;

      marker.type = "button";
      marker.title = place.name;
      marker.setAttribute("aria-label", `${place.name} 촬영지 선택`);

      marker.setAttribute("aria-pressed", String(isSelected));

      marker.style.width = isSelected ? "48px" : "44px";
      marker.style.height = isSelected ? "48px" : "44px";
      marker.style.borderRadius = "9999px";
      marker.style.border = "3px solid white";
      marker.style.background = isSelected ? "#10243A" : "#1769E0";
      marker.style.color = "white";
      marker.style.fontSize = isSelected ? "13px" : "12px";
      marker.style.fontWeight = "800";
      marker.style.boxShadow = isSelected
        ? "0 7px 20px rgba(17, 24, 39, 0.35)"
        : "0 4px 12px rgba(0, 0, 0, 0.22)";
      marker.style.display = "flex";
      marker.style.alignItems = "center";
      marker.style.justifyContent = "center";
      marker.style.cursor = "pointer";
      marker.style.transition = "all 0.2s ease";
      marker.textContent = "●";

      marker.addEventListener("click", () => {
        onSelectPlace?.(place.placeId);
      });

      return new kakao.maps.CustomOverlay({
        map,
        position,
        content: marker,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: isSelected ? 4 : 3,
      });
    });

    if (validPlaces.length === 1) {
      map.setCenter(initialCenter);
    } else {
      map.setBounds(bounds);
    }

    return () => {
      overlays.forEach((overlay) => {
        overlay.setMap(null);
      });
    };
  }, [sdkReady, validPlaces, selectedPlaceId, onSelectPlace]);

  if (!appKey) {
    return (
      <StateFeedback
        tone="error"
        title="지도를 표시할 수 없어요."
        description="Kakao Map 설정을 확인해 주세요. 촬영지 목록은 계속 이용할 수 있습니다."
      />
    );
  }

  if (validPlaces.length === 0) {
    return (
      <StateFeedback
        title="지도에 표시할 위치가 없어요."
        description="좌표 정보가 없는 촬영지도 아래 목록에서는 계속 확인할 수 있습니다."
      />
    );
  }

  return (
    <>
      <Script
        id="kakao-map-sdk"
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`}
        strategy="afterInteractive"
        onLoad={handleSdkReady}
        onReady={handleSdkReady}
        onError={() => setSdkError(true)}
      />

      <div className="overflow-hidden rounded-[20px] border border-gray-200 bg-gray-100">
        {!sdkReady && !sdkError && (
          <StateFeedback
            title="촬영지 지도를 불러오고 있어요."
            description="장소 목록은 먼저 확인할 수 있습니다."
            className="m-4"
          />
        )}

        {sdkError && (
          <StateFeedback
            tone="error"
            title="지도를 불러오지 못했어요."
            description="촬영지 목록은 계속 이용할 수 있습니다."
            actionLabel="다시 시도"
            onAction={() => window.location.reload()}
            className="m-4"
          />
        )}

        <div
          ref={containerRef}
          className={sdkReady && !sdkError ? "h-60 sm:h-72 w-full" : "hidden"}
          aria-label="촬영지 탐색 지도"
        />
      </div>
    </>
  );
}

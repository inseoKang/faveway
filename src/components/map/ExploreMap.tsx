"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";

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
      <div className="flex h-60 sm:h-72 items-center justify-center rounded-[20px] border border-red-200 bg-red-50 p-6 text-center">
        <div>
          <p className="font-semibold text-red-700">지도를 표시할 수 없어요.</p>

          <p className="mt-2 text-sm leading-6 text-red-600">
            아래 목록에서 촬영지 정보를 확인해 주세요.
          </p>
        </div>
      </div>
    );
  }

  if (validPlaces.length === 0) {
    return (
      <div className="flex h-60 sm:h-72 items-center justify-center rounded-[20px] border border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-sm leading-6 text-gray-500">
          지도에 표시할 수 있는 좌표가 없습니다.
        </p>
      </div>
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
          <div className="flex h-60 sm:h-72 items-center justify-center text-sm text-gray-500">
            촬영지 지도를 불러오는 중...
          </div>
        )}

        {sdkError && (
          <div className="flex h-60 sm:h-72 items-center justify-center p-6 text-center text-sm leading-6 text-red-600">
            지도를 불러오지 못했습니다.
            <br />
            잠시 후 다시 접속해 주세요. 촬영지 목록은 계속 이용할 수 있어요.
          </div>
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

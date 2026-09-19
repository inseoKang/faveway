"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";

import StateFeedback from "@/components/common/StateFeedback";

export type CourseMapStop = {
  placeId: number;
  order: number;
  name: string;
  latitude: number;
  longitude: number;
};

export type CourseMapRoutePoint = {
  latitude: number;
  longitude: number;
};

export type CourseMapRouteSegment = {
  fromPlaceId: number;
  toPlaceId: number;
  path: CourseMapRoutePoint[];
  isFallback: boolean;
};

type CourseMapProps = {
  stops: CourseMapStop[];
  routeSegments?: CourseMapRouteSegment[];
  selectedPlaceId?: number | null;
  onSelectPlace?: (placeId: number) => void;
};

const SEOUL_CENTER = {
  latitude: 37.5665,
  longitude: 126.978,
};

export default function CourseMap({
  stops,
  routeSegments = [],
  selectedPlaceId,
  onSelectPlace,
}: CourseMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState(false);

  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_JAVASCRIPT_KEY;

  const validStops = useMemo(
    () =>
      stops.filter(
        (stop) =>
          Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude),
      ),
    [stops],
  );

  const validRouteSegments = useMemo(
    () =>
      routeSegments
        .map((segment) => ({
          ...segment,
          path: segment.path.filter(
            (point) =>
              Number.isFinite(point.latitude) &&
              Number.isFinite(point.longitude),
          ),
        }))
        .filter((segment) => segment.path.length >= 2),
    [routeSegments],
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

    const firstStop = validStops[0];

    const initialCenter = firstStop
      ? new kakao.maps.LatLng(firstStop.latitude, firstStop.longitude)
      : new kakao.maps.LatLng(SEOUL_CENTER.latitude, SEOUL_CENTER.longitude);

    const map = new kakao.maps.Map(containerRef.current, {
      center: initialCenter,
      level: 7,
    });

    if (validStops.length === 0) {
      return;
    }

    const bounds = new kakao.maps.LatLngBounds();

    const stopPositions = validStops.map((stop) => {
      const position = new kakao.maps.LatLng(stop.latitude, stop.longitude);

      bounds.extend(position);

      return position;
    });

    const overlays = validStops.map((stop, index) => {
      const position = stopPositions[index];

      const marker = document.createElement("button");

      marker.type = "button";
      marker.textContent = String(stop.order);
      marker.title = `${stop.order}. ${stop.name}`;
      marker.setAttribute(
        "aria-label",
        `${stop.order}번째 방문 장소 ${stop.name}`,
      );

      const isSelected = selectedPlaceId === stop.placeId;

      marker.setAttribute("aria-pressed", String(isSelected));

      marker.style.width = isSelected ? "48px" : "44px";
      marker.style.height = isSelected ? "48px" : "44px";
      marker.style.borderRadius = "9999px";
      marker.style.border = "3px solid white";
      marker.style.background = isSelected ? "#10243A" : "#1769E0";
      marker.style.color = "white";
      marker.style.fontSize = "14px";
      marker.style.fontWeight = "700";
      marker.style.boxShadow = isSelected
        ? "0 6px 18px rgba(16, 36, 58, 0.28)"
        : "0 4px 12px rgba(0, 0, 0, 0.2)";
      marker.style.display = "flex";
      marker.style.alignItems = "center";
      marker.style.justifyContent = "center";
      marker.style.cursor = "pointer";
      marker.style.transition = "all 0.2s ease";

      marker.addEventListener("click", () => {
        onSelectPlace?.(stop.placeId);
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

    const polylines: kakao.maps.Polyline[] = [];

    if (validRouteSegments.length > 0) {
      validRouteSegments.forEach((segment) => {
        const path = segment.path.map((point) => {
          const position = new kakao.maps.LatLng(
            point.latitude,
            point.longitude,
          );

          bounds.extend(position);

          return position;
        });

        polylines.push(
          new kakao.maps.Polyline({
            map,
            path,
            strokeWeight: 4,
            strokeColor: segment.isFallback ? "#9CA3AF" : "#1769E0",
            strokeOpacity: segment.isFallback ? 0.7 : 0.85,
            strokeStyle: segment.isFallback ? "shortdash" : "solid",
          }),
        );
      });
    } else if (stopPositions.length >= 2) {
      polylines.push(
        new kakao.maps.Polyline({
          map,
          path: stopPositions,
          strokeWeight: 4,
          strokeColor: "#9CA3AF",
          strokeOpacity: 0.7,
          strokeStyle: "shortdash",
        }),
      );
    }

    if (validStops.length === 1) {
      map.setCenter(initialCenter);
    } else {
      map.setBounds(bounds);
    }

    return () => {
      overlays.forEach((overlay) => {
        overlay.setMap(null);
      });

      polylines.forEach((polyline) => {
        polyline.setMap(null);
      });
    };
  }, [
    sdkReady,
    validStops,
    validRouteSegments,
    selectedPlaceId,
    onSelectPlace,
  ]);

  if (!appKey) {
    return (
      <StateFeedback
        tone="error"
        title="지도를 표시할 수 없어요."
        description="Kakao Map 설정을 확인해 주세요. 아래 방문 목록은 계속 이용할 수 있습니다."
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
            title="코스 지도를 불러오고 있어요."
            description="방문 목록과 코스 정보는 먼저 확인할 수 있습니다."
            className="m-4"
          />
        )}

        {sdkError && (
          <StateFeedback
            tone="error"
            title="지도를 불러오지 못했어요."
            description="방문 목록과 코스 정보는 계속 이용할 수 있습니다."
            actionLabel="다시 시도"
            onAction={() => window.location.reload()}
            className="m-4"
          />
        )}

        <div
          ref={containerRef}
          className={sdkReady && !sdkError ? "h-60 sm:h-72 w-full" : "hidden"}
          aria-label="여행 코스 지도"
        />
      </div>
    </>
  );
}

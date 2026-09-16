"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";

export type CourseMapStop = {
  placeId: number;
  order: number;
  name: string;
  latitude: number;
  longitude: number;
};

type CourseMapProps = {
  stops: CourseMapStop[];
};

const SEOUL_CENTER = {
  latitude: 37.5665,
  longitude: 126.978,
};

export default function CourseMap({ stops }: CourseMapProps) {
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

    const path = validStops.map((stop) => {
      const position = new kakao.maps.LatLng(stop.latitude, stop.longitude);

      bounds.extend(position);

      return position;
    });

    const overlays = validStops.map((stop, index) => {
      const position = path[index];

      const marker = document.createElement("button");

      marker.type = "button";
      marker.textContent = String(stop.order);
      marker.title = `${stop.order}. ${stop.name}`;

      marker.style.width = "38px";
      marker.style.height = "38px";
      marker.style.borderRadius = "9999px";
      marker.style.border = "3px solid white";
      marker.style.background = "#4F46E5";
      marker.style.color = "white";
      marker.style.fontSize = "14px";
      marker.style.fontWeight = "700";
      marker.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
      marker.style.display = "flex";
      marker.style.alignItems = "center";
      marker.style.justifyContent = "center";
      marker.style.cursor = "default";

      return new kakao.maps.CustomOverlay({
        map,
        position,
        content: marker,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: 3,
      });
    });

    const polyline =
      path.length >= 2
        ? new kakao.maps.Polyline({
            map,
            path,
            strokeWeight: 4,
            strokeColor: "#4F46E5",
            strokeOpacity: 0.75,
            strokeStyle: "shortdash",
          })
        : null;

    if (validStops.length === 1) {
      map.setCenter(initialCenter);
    } else {
      map.setBounds(bounds);
    }

    return () => {
      overlays.forEach((overlay) => {
        overlay.setMap(null);
      });

      polyline?.setMap(null);
    };
  }, [sdkReady, validStops]);

  if (!appKey) {
    return (
      <div className="flex h-72 items-center justify-center rounded-3xl border border-red-200 bg-red-50 p-6 text-center">
        <div>
          <p className="font-semibold text-red-700">
            Kakao Map API Key가 설정되지 않았습니다.
          </p>

          <p className="mt-2 text-sm leading-6 text-red-600">
            .env.local의 NEXT_PUBLIC_KAKAO_MAP_JAVASCRIPT_KEY를 확인해 주세요.
          </p>
        </div>
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

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-gray-100">
        {!sdkReady && !sdkError && (
          <div className="flex h-80 items-center justify-center text-sm text-gray-500">
            코스 지도를 불러오는 중...
          </div>
        )}

        {sdkError && (
          <div className="flex h-80 items-center justify-center p-6 text-center text-sm leading-6 text-red-600">
            지도를 불러오지 못했습니다.
            <br />
            Kakao JavaScript Key와 등록 도메인을 확인해 주세요.
          </div>
        )}

        <div
          ref={containerRef}
          className={sdkReady && !sdkError ? "h-80 w-full" : "hidden"}
          aria-label="여행 코스 지도"
        />
      </div>
    </>
  );
}

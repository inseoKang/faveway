declare namespace kakao.maps {
  class LatLng {
    constructor(latitude: number, longitude: number);
  }

  class LatLngBounds {
    constructor();

    extend(latlng: LatLng): void;
  }

  class Map {
    constructor(
      container: HTMLElement,
      options: {
        center: LatLng;
        level?: number;
      },
    );

    setCenter(latlng: LatLng): void;

    setBounds(bounds: LatLngBounds): void;
  }

  class Marker {
    constructor(options: { position: LatLng; map?: Map; image?: MarkerImage });

    setMap(map: Map | null): void;
  }

  class MarkerImage {
    constructor(
      src: string,
      size: Size,
      options?: {
        offset?: Point;
      },
    );
  }

  class Size {
    constructor(width: number, height: number);
  }

  class Point {
    constructor(x: number, y: number);
  }

  class Polyline {
    constructor(options: {
      map?: Map;
      path: LatLng[];
      strokeWeight?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeStyle?: string;
    });

    setMap(map: Map | null): void;
  }

  class CustomOverlay {
    constructor(options: {
      position: LatLng;
      content: HTMLElement | string;
      map?: Map;
      xAnchor?: number;
      yAnchor?: number;
      zIndex?: number;
    });

    setMap(map: Map | null): void;
  }

  function load(callback: () => void): void;
}

interface Window {
  kakao?: {
    maps: typeof kakao.maps;
  };
}

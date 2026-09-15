export type Coordinate = {
  latitude: number;
  longitude: number;
};

/**
 * 두 좌표 사이의 직선거리를 km 단위로 계산한다.
 * Haversine Formula 사용.
 */
export function calculateDistanceKm(from: Coordinate, to: Coordinate): number {
  const earthRadiusKm = 6371;

  const toRadians = (degree: number) => (degree * Math.PI) / 180;

  const latitudeDifference = toRadians(to.latitude - from.latitude);

  const longitudeDifference = toRadians(to.longitude - from.longitude);

  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDifference / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

/**
 * 직선거리를 기반으로 예상 도보 시간을 계산한다.
 *
 * 실제 도보 경로는 도로 구조에 따라 더 길어질 수 있으므로
 * 1.25배 보정값을 적용한다.
 */
export function estimateWalkingMinutes(distanceKm: number): number {
  const walkingSpeedKmPerHour = 4;
  const routeCorrection = 1.25;

  const estimatedRouteKm = distanceKm * routeCorrection;

  return Math.ceil((estimatedRouteKm / walkingSpeedKmPerHour) * 60);
}

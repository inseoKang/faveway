import type { CourseData } from '../../../src/lib/course/course-state';
export const places = ['A', 'B', 'C', 'D'].map((name, index) => ({
  id: 9001 + index, name: `테스트 ${name}`, address: null,
  latitude: 37.5, longitude: 127 + index * 0.001,
  place_type: null, region: '서울', is_active: true,
}));
export const course: CourseData = {
  contentIds: [9000], actorIds: [], durationMinutes: 180, maxWalkingMinutes: 60,
  totalDistanceKm: 0, totalWalkingMinutes: 0,
  stops: places.slice(0, 3).map((place, index) => ({
    contentId: 9000, contentTitle: '가짜 작품', placeId: place.id,
    order: index + 1, stayMinutes: 60, distanceFromPreviousKm: 0,
    walkingMinutesFromPrevious: 0, relationType: 'FILMING_LOCATION',
    verificationStatus: 'VERIFIED', verifiedFact: null, place,
  })),
};
export const courseUrl = '/course?' + new URLSearchParams({
  title: '브라우저 테스트', data: JSON.stringify(course),
});
export const storageKey = 'faveway:course:contents=9000:actors=none:duration=180:walking=60:route=9001-9002-9003';
export type RouteStop = { placeId: number; name: string; latitude: number; longitude: number };
export function routeResponse(stops: RouteStop[], minutes = 7) {
  return { data: { segments: stops.slice(1).map((stop, index) => ({
    fromPlaceId: stops[index].placeId, toPlaceId: stop.placeId,
    distanceMeters: 500, durationSeconds: minutes * 60, success: true,
    path: [stops[index], stop].map(({ latitude, longitude }) => ({ latitude, longitude })),
  })) } };
}

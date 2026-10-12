import { describe, expect, it } from "vitest";
import {
  findAvailableRoute,
  getMaxStopsByDuration,
  getRouteSelectionReason,
  type CoordinatePlaceRelation,
} from "@/lib/recommendation/route-selection";

// Synthetic coordinates only: no CSV, database or external route service.
function candidate(id: number, longitude = 0): CoordinatePlaceRelation {
  return {
    id,
    content_id: 1,
    relation_type: "FILMING_LOCATION",
    verification_status: "PUBLIC_DATA",
    verified_fact: null,
    places: {
      id,
      name: `Place ${id}`,
      address: null,
      latitude: 0,
      longitude,
      place_type: null,
      region: "서울",
      is_active: true,
    },
  };
}

const nearbyPair = [candidate(1), candidate(2, 0.0045)]; // 10 walking minutes
const longerPair = [candidate(1), candidate(2, 0.0048)]; // 11 walking minutes

describe("getMaxStopsByDuration", () => {
  it.each([
    [179, 2], [180, 2], [181, 3],
    [239, 3], [240, 3], [241, 4], [300, 4],
  ])("caps a %i-minute course at %i stops", (minutes, stops) => {
    expect(getMaxStopsByDuration(minutes)).toBe(stops);
  });
});

describe("findAvailableRoute", () => {
  it.each([[180, 2], [240, 3], [300, 4]])(
    "caps a %i-minute course at %i stops even with extra candidates",
    (minutes, stops) => {
      const candidates = [1, 2, 3, 4, 5].map((id) => candidate(id));
      expect(findAvailableRoute(candidates, minutes, null)).toHaveLength(stops);
    },
  );

  it("never exceeds the number of candidates", () => {
    expect(findAvailableRoute(nearbyPair, 300, null)).toHaveLength(2);
  });

  it("returns null for no candidates", () => {
    expect(findAvailableRoute([], 180, null)).toBeNull();
  });

  it("allows one stop at exactly 45 minutes with no travel", () => {
    expect(findAvailableRoute([candidate(1)], 45, 10)).toEqual([
      { relation: candidate(1), distanceFromPreviousKm: 0, walkingMinutesFromPrevious: 0 },
    ]);
  });

  it("returns null below the minimum stay even for one stop", () => {
    expect(findAvailableRoute([candidate(1)], 44, null)).toBeNull();
  });

  it.each([[99, 1], [100, 2], [101, 2]])(
    "counts 90 minutes of stay plus 10 walking minutes at duration %i",
    (minutes, stops) => {
      expect(findAvailableRoute(nearbyPair, minutes, null)).toHaveLength(stops);
    },
  );

  it("allows a segment exactly at the walking limit", () => {
    const route = findAvailableRoute(nearbyPair, 180, 10);
    expect(route).toHaveLength(2);
    expect(route?.[1].walkingMinutesFromPrevious).toBe(10);
  });

  it("reduces to one stop when a segment exceeds the walking limit", () => {
    expect(findAvailableRoute(longerPair, 180, 10)).toHaveLength(1);
  });

  it("removes only the walking constraint when the limit is null", () => {
    const route = findAvailableRoute(longerPair, 101, null);
    expect(route).toHaveLength(2);
    expect(route?.[1].walkingMinutesFromPrevious).toBe(11);
    expect(findAvailableRoute(longerPair, 100, null)).toHaveLength(1);
  });

  it("applies the walking limit per segment rather than to the total", () => {
    const route = findAvailableRoute(
      [candidate(1), candidate(2, 0.0045), candidate(3, 0.009)], 240, 10,
    );
    expect(route).toHaveLength(3);
    expect(route?.map((stop) => stop.walkingMinutesFromPrevious)).toEqual([0, 10, 10]);
  });

  it("tries fewer stops when the largest course cannot fit the duration", () => {
    // Adjacent steps each take 63 minutes: three stops need 261, two need 153.
    const route = findAvailableRoute(
      [candidate(1), candidate(2, 0.03), candidate(3, 0.06)], 240, null,
    );
    expect(route).toHaveLength(2);
  });

  it("prefers more feasible stops over a shorter route with fewer stops", () => {
    expect(findAvailableRoute(
      [candidate(1), candidate(2, 0.0045), candidate(3, 0.009)], 240, null,
    )).toHaveLength(3);
  });

  it("selects the closest pair rather than the first pair", () => {
    const route = findAvailableRoute(
      [candidate(1), candidate(2, 0.02), candidate(3, 0.0201)], 180, null,
    );
    expect(route?.map((stop) => stop.relation.places.id)).toEqual([2, 3]);
  });

  it("optimizes the visit order without mutating candidate data", () => {
    const candidates = [candidate(1), candidate(3, 0.009), candidate(2, 0.0045)];
    const original = structuredClone(candidates);
    const route = findAvailableRoute(candidates, 240, null);
    expect(route?.map((stop) => stop.relation.places.id)).toEqual([1, 2, 3]);
    expect(candidates).toEqual(original);
  });

  it("preserves the first encountered route when distances tie", () => {
    const route = findAvailableRoute([candidate(3), candidate(1), candidate(2)], 180, null);
    expect(route?.map((stop) => stop.relation.places.id)).toEqual([3, 1]);
  });
});

describe("getRouteSelectionReason", () => {
  it.each([
    { candidates: nearbyPair, minutes: 180, limit: 10, reason: "NORMAL" },
    { candidates: [candidate(1)], minutes: 180, limit: 10, reason: "ONLY_ONE_CANDIDATE" },
    { candidates: longerPair, minutes: 180, limit: 10, reason: "WALKING_LIMIT" },
    { candidates: nearbyPair, minutes: 99, limit: 10, reason: "DURATION_LIMIT" },
    { candidates: nearbyPair, minutes: 99, limit: null, reason: "DURATION_LIMIT" },
    { candidates: longerPair, minutes: 100, limit: 10, reason: "MULTIPLE_CONSTRAINTS" },
  ])("explains $reason without changing the chosen course", ({ candidates, minutes, limit, reason }) => {
    const route = findAvailableRoute(candidates, minutes, limit);
    expect(route).not.toBeNull();
    const original = structuredClone(route);
    expect(getRouteSelectionReason(candidates, route!, minutes, limit)).toBe(reason);
    expect(route).toEqual(original);
  });
});

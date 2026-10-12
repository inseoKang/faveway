import { describe, expect, it } from "vitest";
import {
  createCourseStorageKey,
  createWalkingRouteKey,
  isValidCourseData,
  isValidCourseStop,
  rebuildCourse,
  restoreStoredCourse,
  type CourseData,
  type CourseStop,
} from "@/lib/course/course-state";

// Synthetic fixtures independent of service data and external APIs.
function stop(id: number, longitude = 0): CourseStop {
  return {
    contentId: 1, contentTitle: "Test work", placeId: id, order: 99,
    stayMinutes: 999, distanceFromPreviousKm: 999,
    walkingMinutesFromPrevious: 999, relationType: "FILMING_LOCATION",
    verificationStatus: "PUBLIC_DATA", verifiedFact: null,
    place: { id, name: `Test ${id}`, address: null, latitude: 0, longitude,
      place_type: null, region: "서울", is_active: true },
  };
}
function course(): CourseData {
  return {
    contentIds: [2, 1], actorIds: [4, 3], durationMinutes: 180,
    maxWalkingMinutes: 10, totalDistanceKm: 999, totalWalkingMinutes: 999,
    stops: [stop(1), stop(2, 0.0045)],
  };
}

describe("rebuildCourse after editing", () => {
  it("recalculates appended stops, visit order and equal stays", () => {
    const initial = course();
    const result = rebuildCourse(initial, [...initial.stops, stop(3, 0.009)]);
    expect(result.stops.map((s) => s.placeId)).toEqual([1, 2, 3]);
    expect(result.stops.map((s) => s.order)).toEqual([1, 2, 3]);
    expect(result.stops.map((s) => s.walkingMinutesFromPrevious)).toEqual([0, 10, 10]);
    expect(result.totalDistanceKm).toBe(1);
    expect(result.totalWalkingMinutes).toBe(20);
    expect(result.stops.map((s) => s.stayMinutes)).toEqual([53, 53, 53]);
  });

  it("reconnects neighbors after removing the middle stop", () => {
    const initial = course();
    const edited = [stop(1), stop(2, 0.0045), stop(3, 0.009)].filter((s) => s.placeId !== 2);
    const result = rebuildCourse(initial, edited);
    expect(result.stops.map((s) => s.placeId)).toEqual([1, 3]);
    expect(result.stops.map((s) => s.order)).toEqual([1, 2]);
    expect(result.totalDistanceKm).toBe(1);
    expect(result.totalWalkingMinutes).toBe(19);
    expect(result.stops.map((s) => s.stayMinutes)).toEqual([80, 80]);
  });

  it("uses the edited array order rather than stale order fields", () => {
    const initial = course();
    const result = rebuildCourse(initial, [initial.stops[1], initial.stops[0]]);
    expect(result.stops.map((s) => s.placeId)).toEqual([2, 1]);
    expect(result.stops.map((s) => s.order)).toEqual([1, 2]);
    expect(result.stops[0].distanceFromPreviousKm).toBe(0);
    expect(result.stops[0].walkingMinutesFromPrevious).toBe(0);
    expect(result.stops[1].walkingMinutesFromPrevious).toBe(10);
  });

  it("assigns all time to the remaining single stop", () => {
    const result = rebuildCourse(course(), [stop(2, 0.0045)]);
    expect(result.totalWalkingMinutes).toBe(0);
    expect(result.totalDistanceKm).toBe(0);
    expect(result.stops[0].stayMinutes).toBe(180);
  });

  it("keeps zero estimates for a segment with missing coordinates", () => {
    const stops = [stop(1), stop(2)];
    stops[1].place.latitude = null;
    const result = rebuildCourse(course(), stops);
    expect(result.totalDistanceKm).toBe(0);
    expect(result.totalWalkingMinutes).toBe(0);
  });

  it("clamps stays to zero when walking exceeds the available duration", () => {
    const result = rebuildCourse({ ...course(), durationMinutes: 5 }, course().stops);
    expect(result.totalWalkingMinutes).toBe(10);
    expect(result.stops.map((s) => s.stayMinutes)).toEqual([0, 0]);
  });

  it("preserves editing behavior without enforcing the generation minimum stay", () => {
    const result = rebuildCourse({ ...course(), durationMinutes: 60 }, course().stops);
    expect(result.stops.map((s) => s.stayMinutes)).toEqual([25, 25]);
  });

  it("does not mutate the source course or edited stops", () => {
    const initial = course();
    const edited = [stop(3, 0.009), ...initial.stops];
    const before = structuredClone({ initial, edited });
    rebuildCourse(initial, edited);
    expect({ initial, edited }).toEqual(before);
  });
});

describe("createCourseStorageKey", () => {
  it("preserves the existing key format and sorts selection IDs without mutation", () => {
    const initial = course();
    expect(createCourseStorageKey(initial)).toBe(
      "faveway:course:contents=1,2:actors=3,4:duration=180:walking=10:route=1-2",
    );
    expect(initial.contentIds).toEqual([2, 1]);
    expect(initial.actorIds).toEqual([4, 3]);
    expect(createCourseStorageKey({ ...initial, contentIds: [1, 2], actorIds: [3, 4] })).toBe(createCourseStorageKey(initial));
  });

  it("distinguishes travel conditions and initial route order", () => {
    const initial = course();
    for (const changed of [
      { ...initial, durationMinutes: 240 },
      { ...initial, maxWalkingMinutes: null },
      { ...initial, contentIds: [3] },
      { ...initial, actorIds: [] },
      { ...initial, stops: [...initial.stops].reverse() },
    ]) expect(createCourseStorageKey(changed)).not.toBe(createCourseStorageKey(initial));
  });

  it("uses none for missing selections and unlimited walking", () => {
    expect(createCourseStorageKey({ ...course(), contentIds: [], actorIds: [], maxWalkingMinutes: null })).toContain(
      "contents=none:actors=none:duration=180:walking=none",
    );
  });
});

describe("stored course decoding", () => {
  it("round-trips the page's JSON serialization and keeps edited stop order", () => {
    const initial = course();
    const edited = rebuildCourse(initial, [stop(3, 0.009), stop(1)]);
    expect(restoreStoredCourse(initial, JSON.stringify(edited))).toEqual(edited);
  });

  it("restores only stops using original travel conditions, not saved summaries", () => {
    const initial = course();
    const saved = { ...initial, durationMinutes: 9999, maxWalkingMinutes: 999,
      contentIds: [99], actorIds: [99], stops: [...initial.stops].reverse() };
    const restored = restoreStoredCourse(initial, JSON.stringify(saved));
    expect(restored.durationMinutes).toBe(180);
    expect(restored.maxWalkingMinutes).toBe(10);
    expect(restored.contentIds).toEqual([2, 1]);
    expect(restored.actorIds).toEqual([4, 3]);
    expect(restored.totalWalkingMinutes).toBe(10);
    expect(restored.stops.map((s) => s.stayMinutes)).toEqual([85, 85]);
    expect(restored.stops.map((s) => s.placeId)).toEqual([2, 1]);
  });

  it("accepts legacy saved data containing just valid stops", () => {
    expect(restoreStoredCourse(course(), JSON.stringify({ stops: [stop(1)] })).stops).toHaveLength(1);
  });

  it.each(["{", "null", "[]", "{}", '{"stops":[]}', '{"stops":"invalid"}', '{"stops":[null]}']) (
    "rejects invalid saved data %s for the page's existing recovery catch", (raw) => {
      expect(() => restoreStoredCourse(course(), raw)).toThrow();
    },
  );

  it.each([
    { placeId: "1" }, { order: null }, { stayMinutes: "45" }, { place: null },
  ])("rejects a malformed saved stop %j", (patch) => {
    expect(() => restoreStoredCourse(course(), JSON.stringify({ stops: [{ ...stop(1), ...patch }] }))).toThrow();
  });

  it("does not modify the initial course when decoding fails", () => {
    const initial = course(); const before = structuredClone(initial);
    expect(() => restoreStoredCourse(initial, "{")).toThrow();
    expect(initial).toEqual(before);
  });
});

describe("course data validation", () => {
  it("accepts current data and optional legacy metadata", () => {
    expect(isValidCourseData(course())).toBe(true);
    expect(isValidCourseData({ ...course(), candidateCount: 2, routeSelectionReason: "NORMAL" })).toBe(true);
  });

  it.each([{ candidateCount: 0 }, { routeSelectionReason: "UNKNOWN" }, { stops: [] }, { durationMinutes: 0 }])(
    "rejects invalid initial course fields %j", (patch) => {
      expect(isValidCourseData({ ...course(), ...patch })).toBe(false);
    },
  );

  it("keeps nullable coordinates valid but rejects non-finite coordinates", () => {
    const item = stop(1); item.place.latitude = null;
    expect(isValidCourseStop(item)).toBe(true);
    item.place.latitude = Infinity;
    expect(isValidCourseStop(item)).toBe(false);
  });
});

describe("walking route identity", () => {
  it("uses restored array order and coordinates for the next route request", () => {
    const initial = course();
    const restored = restoreStoredCourse(initial, JSON.stringify({ stops: [...initial.stops].reverse() }));
    expect(JSON.parse(createWalkingRouteKey(restored))).toEqual([
      { placeId: 2, name: "Test 2", latitude: 0, longitude: 0.0045 },
      { placeId: 1, name: "Test 1", latitude: 0, longitude: 0 },
    ]);
    expect(createWalkingRouteKey(restored)).not.toBe(createWalkingRouteKey(initial));
  });

  it("does not change route identity when TMAP updates derived totals and stays", () => {
    const initial = course();
    const calculated = rebuildCourse(initial, initial.stops);
    expect(createWalkingRouteKey(calculated)).toBe(createWalkingRouteKey(initial));
  });

  it("changes identity on add, delete or coordinate changes", () => {
    const initial = course();
    for (const stops of [[...initial.stops, stop(3)], [initial.stops[0]], [stop(1, 0.01), initial.stops[1]]]) {
      expect(createWalkingRouteKey({ ...initial, stops })).not.toBe(createWalkingRouteKey(initial));
    }
  });
});

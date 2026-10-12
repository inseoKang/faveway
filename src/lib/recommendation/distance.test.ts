import { describe, expect, it } from "vitest";
import {
  calculateDistanceKm,
  estimateWalkingMinutes,
} from "@/lib/recommendation/distance";

describe("calculateDistanceKm", () => {
  it("returns kilometers for one degree along the equator", () => {
    expect(
      calculateDistanceKm(
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 1 },
      ),
    ).toBeCloseTo(111.194927, 5);
  });

  it("returns the same distance in both directions", () => {
    const from = { latitude: 37.5, longitude: 127 };
    const to = { latitude: 37.6, longitude: 126.9 };

    expect(calculateDistanceKm(from, to)).toBeCloseTo(
      calculateDistanceKm(to, from),
      10,
    );
  });

  it("returns zero for identical coordinates", () => {
    const point = { latitude: 37.5, longitude: 127 };
    expect(calculateDistanceKm(point, point)).toBe(0);
  });

  it("takes the short distance across the international date line", () => {
    expect(
      calculateDistanceKm(
        { latitude: 0, longitude: 179.9 },
        { latitude: 0, longitude: -179.9 },
      ),
    ).toBeCloseTo(22.238985, 5);
  });

  // Coordinate validation belongs to callers; preserve current propagation.
  it.each([NaN, Infinity])("returns NaN for a non-finite coordinate (%s)", (latitude) => {
    expect(
      calculateDistanceKm(
        { latitude, longitude: 0 },
        { latitude: 0, longitude: 1 },
      ),
    ).toBeNaN();
  });
});

describe("estimateWalkingMinutes", () => {
  it.each([
    { distanceKm: 1, minutes: 19 },
    { distanceKm: 0, minutes: 0 },
    { distanceKm: 0.01, minutes: 1 },
    { distanceKm: 0.8, minutes: 15 },
    { distanceKm: 0.8001, minutes: 16 },
  ])("estimates $minutes minutes for $distanceKm km", ({ distanceKm, minutes }) => {
    expect(estimateWalkingMinutes(distanceKm)).toBe(minutes);
  });

  it("propagates NaN rather than treating it as zero distance", () => {
    expect(estimateWalkingMinutes(NaN)).toBeNaN();
  });
});

import { describe, it, expect } from "vitest";
import { snapToTrail, distAlongTrailM, isNearPct } from "./pct-filter";

describe("snapToTrail", () => {
	it("snaps a coordinate near the trail to the trail", () => {
		const result = snapToTrail(32.6666468847167, -116.538309629814);
		// Should snap very close to the input (< 100m)
		expect(result.lat).toBeCloseTo(32.6666, 3);
		expect(result.lon).toBeCloseTo(-116.5383, 3);
	});

	it("returns a point on the trail for the start (Campo)", () => {
		const result = snapToTrail(32.59, -116.467);
		expect(result.lat).toBeCloseTo(32.59, 1);
		expect(result.lon).toBeCloseTo(-116.467, 1);
	});
});

describe("distAlongTrailM", () => {
	it("returns ~14.5 miles for the reported bug coordinate (NOBO)", () => {
		const snapped = snapToTrail(32.6666468847167, -116.538309629814);
		const dist = distAlongTrailM(snapped.lat, snapped.lon, "NOBO");
		const miles = dist / 1609.34;
		// Should be ~14.5 miles, not ~5.7 miles (the old buggy value)
		expect(miles).toBeGreaterThan(12);
		expect(miles).toBeLessThan(17);
	});

	it("returns ~0 miles at the southern terminus (Campo)", () => {
		const snapped = snapToTrail(32.5897, -116.467);
		const dist = distAlongTrailM(snapped.lat, snapped.lon, "NOBO");
		const miles = dist / 1609.34;
		expect(miles).toBeLessThan(1);
	});

	it("SOBO distance is complement of NOBO distance", () => {
		const snapped = snapToTrail(32.6666468847167, -116.538309629814);
		const nobo = distAlongTrailM(snapped.lat, snapped.lon, "NOBO");
		const sobo = distAlongTrailM(snapped.lat, snapped.lon, "SOBO");
		const totalMiles = (nobo + sobo) / 1609.34;
		// The GeoJSON representation of the PCT totals ~2,493 miles
		expect(totalMiles).toBeGreaterThan(2400);
		expect(totalMiles).toBeLessThan(2600);
	});

	it("returns a larger distance for a point further north", () => {
		const snap1 = snapToTrail(32.6666468847167, -116.538309629814); // ~mile 14.5
		const snap2 = snapToTrail(33.28, -116.64); // further north
		const dist1 = distAlongTrailM(snap1.lat, snap1.lon, "NOBO");
		const dist2 = distAlongTrailM(snap2.lat, snap2.lon, "NOBO");
		expect(dist2).toBeGreaterThan(dist1);
	});
});

describe("isNearPct", () => {
	it("returns true for a point on the PCT", () => {
		expect(isNearPct(32.6666468847167, -116.538309629814)).toBe(true);
	});

	it("returns false for a point far from the PCT", () => {
		expect(isNearPct(40.0, -74.0)).toBe(false); // New York area
	});
});

import { describe, it, expect } from "vitest";
import { snapToTrail, distAlongTrailM, isNearPct } from "./pct-filter";

describe("snapToTrail", () => {
	it("snaps a coordinate near the trail to the trail", () => {
		const result = snapToTrail(32.6666468847167, -116.538309629814);
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
	it("returns ~16 miles for the original bug coordinate (NOBO)", () => {
		const snapped = snapToTrail(32.6666468847167, -116.538309629814);
		const dist = distAlongTrailM(snapped.lat, snapped.lon, "NOBO");
		const miles = dist / 1609.34;
		// GeoJSON raw distance is 14.5mi, calibrated should be ~16mi
		expect(miles).toBeGreaterThan(14);
		expect(miles).toBeLessThan(19);
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
		// Calibrated total should be ~2,652 (official PCT length)
		expect(totalMiles).toBeCloseTo(2652, -1);
	});

	it("returns a larger distance for a point further north", () => {
		const snap1 = snapToTrail(32.6666468847167, -116.538309629814);
		const snap2 = snapToTrail(33.28, -116.64);
		const dist1 = distAlongTrailM(snap1.lat, snap1.lon, "NOBO");
		const dist2 = distAlongTrailM(snap2.lat, snap2.lon, "NOBO");
		expect(dist2).toBeGreaterThan(dist1);
	});

	it("matches known PCT mile markers within 5 miles", () => {
		// Warner Springs is at PCT mile ~109.5
		const ws = snapToTrail(33.2817, -116.635);
		const wsMi = distAlongTrailM(ws.lat, ws.lon, "NOBO") / 1609.34;
		expect(wsMi).toBeGreaterThan(104);
		expect(wsMi).toBeLessThan(115);

		// Big Bear Lake area is at PCT mile ~266
		const bb = snapToTrail(34.2640, -116.896);
		const bbMi = distAlongTrailM(bb.lat, bb.lon, "NOBO") / 1609.34;
		expect(bbMi).toBeGreaterThan(261);
		expect(bbMi).toBeLessThan(271);

		// Tuolumne Meadows is at PCT mile ~942
		const tm = snapToTrail(37.873, -119.338);
		const tmMi = distAlongTrailM(tm.lat, tm.lon, "NOBO") / 1609.34;
		expect(tmMi).toBeGreaterThan(937);
		expect(tmMi).toBeLessThan(947);

		// Cascade Locks is at PCT mile ~2147
		const cl = snapToTrail(45.669, -121.896);
		const clMi = distAlongTrailM(cl.lat, cl.lon, "NOBO") / 1609.34;
		expect(clMi).toBeGreaterThan(2142);
		expect(clMi).toBeLessThan(2152);
	});

	it("uses trailIndex when provided", () => {
		const snapped = snapToTrail(32.6666468847167, -116.538309629814);
		const withIndex = distAlongTrailM(snapped.lat, snapped.lon, "NOBO", snapped.index);
		const withoutIndex = distAlongTrailM(snapped.lat, snapped.lon, "NOBO");
		expect(withIndex).toBe(withoutIndex);
	});
});

describe("isNearPct", () => {
	it("returns true for a point on the PCT", () => {
		expect(isNearPct(32.6666468847167, -116.538309629814)).toBe(true);
	});

	it("returns false for a point far from the PCT", () => {
		expect(isNearPct(40.0, -74.0)).toBe(false);
	});
});

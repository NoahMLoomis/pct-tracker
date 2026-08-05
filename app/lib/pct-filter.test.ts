import { describe, expect, it } from "vitest";
import { distAlongTrailM, isNearPct, snapToTrail } from "./pct-filter";

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
		const dist = distAlongTrailM(32.6666468847167, -116.538309629814, "NOBO");
		const miles = dist / 1609.34;
		expect(miles).toBeGreaterThan(14);
		expect(miles).toBeLessThan(19);
	});

	it("returns ~0 miles at the southern terminus (Campo)", () => {
		const dist = distAlongTrailM(32.5897, -116.467, "NOBO");
		const miles = dist / 1609.34;
		expect(miles).toBeLessThan(1);
	});

	it("SOBO distance is complement of NOBO distance", () => {
		const nobo = distAlongTrailM(32.6666468847167, -116.538309629814, "NOBO");
		const sobo = distAlongTrailM(32.6666468847167, -116.538309629814, "SOBO");
		const totalMiles = (nobo + sobo) / 1609.34;
		// Total should be ~2,650 (official PCT length)
		expect(totalMiles).toBeCloseTo(2650, -1);
	});

	it("returns a larger distance for a point further north", () => {
		const dist1 = distAlongTrailM(32.6666468847167, -116.538309629814, "NOBO");
		const dist2 = distAlongTrailM(33.28, -116.64, "NOBO");
		expect(dist2).toBeGreaterThan(dist1);
	});

	it("matches known PCT mile markers within 5 miles", () => {
		// Warner Springs is at PCT mile ~109.5
		const wsMi = distAlongTrailM(33.2817, -116.635, "NOBO") / 1609.34;
		expect(wsMi).toBeGreaterThan(104);
		expect(wsMi).toBeLessThan(115);

		// Big Bear Lake area is at PCT mile ~266
		const bbMi = distAlongTrailM(34.264, -116.896, "NOBO") / 1609.34;
		expect(bbMi).toBeGreaterThan(261);
		expect(bbMi).toBeLessThan(276);

		// Tuolumne Meadows is at PCT mile ~942
		const tmMi = distAlongTrailM(37.873, -119.338, "NOBO") / 1609.34;
		expect(tmMi).toBeGreaterThan(937);
		expect(tmMi).toBeLessThan(947);

		// Cascade Locks is at PCT mile ~2147
		const clMi = distAlongTrailM(45.669, -121.896, "NOBO") / 1609.34;
		expect(clMi).toBeGreaterThan(2142);
		expect(clMi).toBeLessThan(2152);

		// Seiad Valley is at PCT mile ~1656
		const svMi = distAlongTrailM(41.848, -123.239, "NOBO") / 1609.34;
		expect(svMi).toBeGreaterThan(1651);
		expect(svMi).toBeLessThan(1661);
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

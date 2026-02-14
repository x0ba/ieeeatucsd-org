import { describe, expect, it } from "vitest";
import { createAiDisabledResponse, isAiEnabledForUser } from "./auth";

describe("isAiEnabledForUser", () => {
	it("returns true when user is undefined", () => {
		expect(isAiEnabledForUser(undefined)).toBe(true);
	});

	it("returns true when user has no aiFeaturesEnabled flag", () => {
		expect(isAiEnabledForUser({})).toBe(true);
	});

	it("returns true when aiFeaturesEnabled is true", () => {
		expect(isAiEnabledForUser({ aiFeaturesEnabled: true })).toBe(true);
	});

	it("returns false when aiFeaturesEnabled is false", () => {
		expect(isAiEnabledForUser({ aiFeaturesEnabled: false })).toBe(false);
	});
});

describe("createAiDisabledResponse", () => {
	it("returns a 403 with the expected API contract", async () => {
		const response = createAiDisabledResponse();
		const body = await response.json();

		expect(response.status).toBe(403);
		expect(body).toEqual({
			error: "AI features are disabled for this account",
			code: "AI_DISABLED_BY_USER",
		});
	});
});

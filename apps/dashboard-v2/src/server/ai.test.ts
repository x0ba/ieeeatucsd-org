import { describe, expect, it } from "vitest";
import { resolveAgentConfig } from "./ai";

describe("resolveAgentConfig", () => {
	it("prefers ANTHROPIC_AUTH_TOKEN when set", () => {
		const config = resolveAgentConfig({
			ANTHROPIC_AUTH_TOKEN: "anthropic-token",
			OPENROUTER_API_KEY: "openrouter-token",
		});

		expect(config.anthropicAuthToken).toBe("anthropic-token");
	});

	it("falls back to OPENROUTER_API_KEY", () => {
		const config = resolveAgentConfig({
			OPENROUTER_API_KEY: "openrouter-token",
		});

		expect(config.anthropicAuthToken).toBe("openrouter-token");
		expect(config.anthropicBaseUrl).toBe("https://openrouter.ai/api/anthropic");
		expect(config.anthropicApiKey).toBe("openrouter");
	});

	it("throws when both auth token env vars are missing", () => {
		expect(() => resolveAgentConfig({})).toThrow(
			"Missing ANTHROPIC_AUTH_TOKEN or OPENROUTER_API_KEY",
		);
	});
});

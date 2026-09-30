import { describe, expect, it } from "vitest";
import {
	EVENT_CODE_INPUT_ATTRS,
	EVENT_CODE_INPUT_CLASS,
	submittedEventCode,
} from "./eventCodeInput";

describe("event code input", () => {
	it("keeps LTR start-aligned text so keystrokes are not prepended", () => {
		expect(EVENT_CODE_INPUT_ATTRS.dir).toBe("ltr");
		expect(EVENT_CODE_INPUT_CLASS.split(/\s+/)).toContain("text-start");
		expect(EVENT_CODE_INPUT_CLASS.split(/\s+/)).not.toContain("text-center");
		expect(EVENT_CODE_INPUT_CLASS.split(/\s+/)).not.toContain("uppercase");
	});

	it("uppercases on submit without reversing", () => {
		expect(submittedEventCode("  ieee2024  ")).toBe("IEEE2024");
		expect(submittedEventCode("4202EEEI")).toBe("4202EEEI");
	});
});

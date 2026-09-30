/**
 * Centered, RTL, or CSS-uppercase text fields prepend each keystroke on iOS
 * and some desktop browsers, so the submitted code is reversed. Keep this
 * field LTR and start-aligned; uppercase only on submit.
 */
export const EVENT_CODE_INPUT_ATTRS = {
	dir: "ltr",
	autoCapitalize: "characters",
	autoCorrect: "off",
	spellCheck: false,
	autoComplete: "off",
	inputMode: "text",
} as const;

export const EVENT_CODE_INPUT_CLASS =
	"h-12 text-start text-lg font-mono tracking-wider";

export function submittedEventCode(rawValue: string): string {
	return rawValue.trim().toUpperCase();
}

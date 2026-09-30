/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { CheckInModal } from "./CheckInModal";

vi.mock("@/components/mobile", () => ({
	ResponsiveOverlay: ({
		children,
		footer,
		title,
	}: {
		children: ReactNode;
		footer?: ReactNode;
		title?: ReactNode;
	}) => (
		<div>
			<h2>{title}</h2>
			{children}
			<div>{footer}</div>
		</div>
	),
}));

describe("CheckInModal event code input", () => {
	it("submits the code in typed order, not reversed", () => {
		const onSubmit = vi.fn();
		render(
			<CheckInModal
				isOpen
				onClose={() => {}}
				onSubmit={onSubmit}
				eventHasFood={false}
				eventName="GBM"
			/>,
		);

		const input = screen.getByLabelText("Event Code") as HTMLInputElement;
		expect(input.dir).toBe("ltr");
		expect(input.className.split(/\s+/)).not.toContain("text-center");
		expect(input.className.split(/\s+/)).not.toContain("uppercase");

		for (const character of "IEEE2024") {
			fireEvent.change(input, { target: { value: input.value + character } });
		}

		expect(input.value).toBe("IEEE2024");
		fireEvent.click(screen.getByRole("button", { name: /continue/i }));
		expect(onSubmit).toHaveBeenCalledWith("IEEE2024");
	});
});

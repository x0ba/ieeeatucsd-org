import { createRoot } from "react-dom/client";
import { CheckInModal } from "@/components/events/CheckInModal";
import "./repro.css";

declare global {
	interface Window {
		__submittedCode?: string;
	}
}

function App() {
	return (
		<CheckInModal
			isOpen
			onClose={() => {}}
			onSubmit={(code) => {
				window.__submittedCode = code;
			}}
			eventHasFood={false}
			eventName="Repro Event"
		/>
	);
}

createRoot(document.getElementById("root")!).render(<App />);

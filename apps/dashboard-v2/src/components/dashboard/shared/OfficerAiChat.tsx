import {
	AlertCircle,
	Bot,
	Check,
	ChevronDown,
	Copy,
	Loader2,
	Send,
	Sparkles,
	User as UserIcon,
	X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type ChatMeta = {
	status?: string;
	locale?: string;
	timeZone?: string;
	currentDateTime?: string;
	currentUser?: {
		name?: string;
		role?: string;
		position?: string;
		team?: string;
	};
	totalMatches?: number;
	scannedTables?: number;
};

type StreamEvent =
	| { type: "status"; message: string }
	| { type: "token"; content: string }
	| { type: "done"; reply: string; steps: string[]; meta: ChatMeta }
	| { type: "error"; error: string };

const PACIFIC_TIME_ZONE = "America/Los_Angeles";

interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
	steps?: string[];
	meta?: ChatMeta;
	createdAt: number;
}

let messageCounter = 0;

function nextMessageId() {
	messageCounter += 1;
	return `msg-${Date.now()}-${messageCounter}`;
}

function createMessage(params: Omit<Message, "id" | "createdAt">): Message {
	return {
		id: nextMessageId(),
		createdAt: Date.now(),
		...params,
	};
}

function getClientLocale() {
	const locale =
		typeof navigator !== "undefined" ? navigator.language : "en-US";
	return locale;
}

function formatPacificNow() {
	const now = new Date();
	const locale = getClientLocale();

	try {
		return new Intl.DateTimeFormat(locale, {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
			timeZone: PACIFIC_TIME_ZONE,
			timeZoneName: "short",
		}).format(now);
	} catch {
		try {
			return new Intl.DateTimeFormat(locale, {
				year: "numeric",
				month: "short",
				day: "numeric",
				hour: "numeric",
				minute: "2-digit",
				timeZone: PACIFIC_TIME_ZONE,
			}).format(now);
		} catch {
			return now.toLocaleString();
		}
	}
}

function renderInlineMarkdown(text: string, keyPrefix: string) {
	const tokenRegex =
		/(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
	const parts = text.split(tokenRegex);

	return parts.map((part, idx) => {
		const key = `${keyPrefix}-${idx}-${part.slice(0, 16)}`;

		const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
		if (linkMatch) {
			const [, label, href] = linkMatch;
			return (
				<a
					key={key}
					href={href}
					target="_blank"
					rel="noreferrer"
					className="underline decoration-blue-500/60 underline-offset-2 hover:text-blue-600"
				>
					{label}
				</a>
			);
		}

		if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
			return (
				<code
					key={key}
					className="rounded bg-gray-200 dark:bg-gray-700 px-1 py-0.5 text-xs font-mono text-gray-900 dark:text-gray-100"
				>
					{part.slice(1, -1)}
				</code>
			);
		}

		if (
			(part.startsWith("**") && part.endsWith("**")) ||
			(part.startsWith("__") && part.endsWith("__"))
		) {
			return <strong key={key}>{part.slice(2, -2)}</strong>;
		}

		if (
			(part.startsWith("*") && part.endsWith("*")) ||
			(part.startsWith("_") && part.endsWith("_"))
		) {
			return <em key={key}>{part.slice(1, -1)}</em>;
		}

		return <React.Fragment key={key}>{part}</React.Fragment>;
	});
}

function CodeBlock({
	inline,
	className,
	children,
}: {
	inline?: boolean;
	className?: string;
	children: React.ReactNode;
}) {
	const [copied, setCopied] = useState(false);
	const codeText = String(children).replace(/\n$/, "");
	const language = className?.replace("language-", "") || "";

	const handleCopy = async () => {
		try {
			if (navigator?.clipboard?.writeText) {
				await navigator.clipboard.writeText(codeText);
			} else {
				const textarea = document.createElement("textarea");
				textarea.value = codeText;
				textarea.style.position = "fixed";
				textarea.style.opacity = "0";
				document.body.appendChild(textarea);
				textarea.focus();
				textarea.select();
				document.execCommand("copy");
				document.body.removeChild(textarea);
			}
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1200);
		} catch (error) {
			console.error("Failed to copy code block:", error);
		}
	};

	if (inline) {
		return (
			<code className="rounded bg-gray-200 dark:bg-gray-700 px-1 py-0.5 text-xs font-mono text-gray-900 dark:text-gray-100">
				{children}
			</code>
		);
	}

	return (
		<div className="relative my-2 w-full max-w-full">
			<div className="absolute right-2 top-2 flex items-center gap-2">
				{language && (
					<span className="text-[10px] uppercase tracking-wide text-gray-300">
						{language}
					</span>
				)}
				<button
					type="button"
					onClick={handleCopy}
					className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-gray-700 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-gray-600"
					aria-label="Copy code"
				>
					{copied ? (
						<Check className="h-3 w-3" />
					) : (
						<Copy className="h-3 w-3" />
					)}
					{copied ? "Copied" : "Copy"}
				</button>
			</div>
			<pre className="max-w-full overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
				<code className={className}>{codeText}</code>
			</pre>
		</div>
	);
}

function MarkdownRenderer({ content }: { content: string }) {
	const lines = content.split("\n");
	const rendered: React.ReactNode[] = [];
	let i = 0;

	while (i < lines.length) {
		const rawLine = lines[i];
		const line = rawLine.trimEnd();

		if (line.startsWith("```")) {
			const language = line.slice(3).trim();
			const blockLines: string[] = [];
			i += 1;
			while (i < lines.length && !lines[i].startsWith("```")) {
				blockLines.push(lines[i]);
				i += 1;
			}
			rendered.push(
				<CodeBlock
					key={`code-${i}-${blockLines.length}`}
					className={`language-${language}`}
				>
					{blockLines.join("\n")}
				</CodeBlock>,
			);
			i += 1;
			continue;
		}

		if (!line.trim()) {
			rendered.push(<div key={`space-${i}`} className="h-2" />);
			i += 1;
			continue;
		}

		if (/^#{1,3}\s+/.test(line)) {
			const level = line.match(/^#{1,3}/)?.[0].length || 1;
			const text = line.replace(/^#{1,3}\s+/, "");
			const className =
				level === 1
					? "text-base font-semibold"
					: level === 2
						? "text-sm font-semibold"
						: "text-sm font-medium";

			rendered.push(
				<p key={`heading-${i}`} className={cn("mb-1", className)}>
					{renderInlineMarkdown(text, `h-${i}`)}
				</p>,
			);
			i += 1;
			continue;
		}

		if (/^[-*]\s+/.test(line)) {
			const items: string[] = [];
			while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
				items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
				i += 1;
			}

			rendered.push(
				<ul key={`ul-${i}`} className="mb-2 list-disc space-y-1 pl-4">
					{items.map((item) => (
						<li key={`uli-${i}-${item.slice(0, 20)}`}>
							{renderInlineMarkdown(item, `uli-${i}`)}
						</li>
					))}
				</ul>,
			);
			continue;
		}

		if (/^\d+\.\s+/.test(line)) {
			const items: string[] = [];
			while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
				items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
				i += 1;
			}

			rendered.push(
				<ol key={`ol-${i}`} className="mb-2 list-decimal space-y-1 pl-4">
					{items.map((item) => (
						<li key={`oli-${i}-${item.slice(0, 20)}`}>
							{renderInlineMarkdown(item, `oli-${i}`)}
						</li>
					))}
				</ol>,
			);
			continue;
		}

		if (line.startsWith(">")) {
			rendered.push(
				<blockquote
					key={`quote-${i}`}
					className="mb-2 border-l-2 border-blue-300 pl-3 text-gray-700 dark:text-gray-300"
				>
					{renderInlineMarkdown(line.replace(/^>\s?/, ""), `q-${i}`)}
				</blockquote>,
			);
			i += 1;
			continue;
		}

		if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
			rendered.push(
				<hr
					key={`hr-${i}`}
					className="my-2 border-gray-300 dark:border-gray-700"
				/>,
			);
			i += 1;
			continue;
		}

		rendered.push(
			<p key={`p-${i}`} className="mb-2 last:mb-0">
				{renderInlineMarkdown(rawLine, `p-${i}`)}
			</p>,
		);
		i += 1;
	}

	return (
		<div className="prose dark:prose-invert prose-sm max-w-none break-words [&>p]:m-0 [&>p]:leading-normal">
			{rendered}
		</div>
	);
}

function appendStep(existing: string[] | undefined, next: string) {
	const current = existing || [];
	if (current[current.length - 1] === next) return current;
	if (current.includes(next)) return current;
	return [...current, next];
}

export function OfficerAiChat() {
	const { logtoId, userRole, user } = useAuth();
	const [isOpen, setIsOpen] = useState(false);
	const [messages, setMessages] = useState<Message[]>([
		createMessage({
			role: "assistant",
			content:
				"Hello! I can search Convex data across events, sponsors, users, finances, and more. Ask me anything.",
		}),
	]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [loadingStep, setLoadingStep] = useState("Ready");
	const [chatStatus, setChatStatus] = useState("Ready");
	const [lastMeta, setLastMeta] = useState<ChatMeta | null>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const scrollTrigger = `${messages.length}-${isOpen ? "1" : "0"}-${isLoading ? "1" : "0"}`;

	useEffect(() => {
		void scrollTrigger;
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [scrollTrigger]);

	const updateAssistantMessage = (
		assistantId: string,
		updater: (message: Message) => Message,
	) => {
		setMessages((prev) =>
			prev.map((msg) =>
				msg.id === assistantId && msg.role === "assistant" ? updater(msg) : msg,
			),
		);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!input.trim() || isLoading) return;

		if (!logtoId) {
			setMessages((prev) => [
				...prev,
				createMessage({
					role: "assistant",
					content:
						"Your session is still loading. Please try again in a moment.",
				}),
			]);
			return;
		}

		const userMsg = input.trim();
		const locale = getClientLocale();
		const assistantId = nextMessageId();

		setInput("");
		setMessages((prev) => [
			...prev,
			createMessage({ role: "user", content: userMsg }),
			{
				id: assistantId,
				role: "assistant",
				content: "Gathering context...",
				steps: [],
				createdAt: Date.now(),
			},
		]);

		setIsLoading(true);
		setChatStatus("Thinking");
		setLoadingStep("Submitting query...");

		try {
			const response = await fetch("/api/ai/query", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					query: userMsg,
					logtoId,
					locale,
					stream: true,
					messages: messages
						.slice(-5)
						.map((m) => ({ role: m.role, content: m.content })),
				}),
			});

			if (!response.ok) {
				const err = await response.json().catch(() => null);
				const parts = [err?.error, err?.details].filter(
					(part): part is string => typeof part === "string" && part.length > 0,
				);
				throw new Error(
					parts.length > 0
						? parts.join(": ")
						: `Failed to get response (${response.status})`,
				);
			}

			const contentType = response.headers.get("Content-Type") || "";
			const isStreamingResponse = contentType.includes("application/x-ndjson");
			if (!isStreamingResponse) {
				const data = (await response.json().catch(() => null)) as {
					reply?: string;
					steps?: string[];
					meta?: ChatMeta;
				} | null;

				if (!data?.reply) {
					throw new Error("No response from AI");
				}

				updateAssistantMessage(assistantId, (msg) => ({
					...msg,
					content: data.reply,
					steps: data.steps || msg.steps,
					meta: data.meta || msg.meta,
				}));
				if (data.meta) {
					setLastMeta(data.meta);
				}
				setChatStatus("Ready");
				setLoadingStep("Ready");
				return;
			}

			if (!response.body) {
				throw new Error("Streaming response unavailable");
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";
			let sawFirstToken = false;

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				let lineBreakIndex = buffer.indexOf("\n");

				while (lineBreakIndex >= 0) {
					const rawLine = buffer.slice(0, lineBreakIndex);
					buffer = buffer.slice(lineBreakIndex + 1);
					lineBreakIndex = buffer.indexOf("\n");

					const line = rawLine.trim();
					if (!line) continue;

					const event = JSON.parse(line) as StreamEvent;

					if (event.type === "status") {
						setLoadingStep(event.message);
						setChatStatus("Thinking");
						updateAssistantMessage(assistantId, (msg) => ({
							...msg,
							content: sawFirstToken ? msg.content : event.message,
							steps: appendStep(msg.steps, event.message),
						}));
						continue;
					}

					if (event.type === "token") {
						if (!sawFirstToken) {
							sawFirstToken = true;
							setChatStatus("Writing");
							setLoadingStep("Streaming answer tokens...");
							updateAssistantMessage(assistantId, (msg) => ({
								...msg,
								content: event.content,
							}));
							continue;
						}
						updateAssistantMessage(assistantId, (msg) => ({
							...msg,
							content: `${msg.content}${event.content}`,
						}));
						continue;
					}

					if (event.type === "done") {
						updateAssistantMessage(assistantId, (msg) => ({
							...msg,
							content: event.reply || msg.content,
							steps: event.steps,
							meta: event.meta,
						}));
						setLastMeta(event.meta);
						setChatStatus("Ready");
						setLoadingStep("Ready");
						continue;
					}

					if (event.type === "error") {
						throw new Error(event.error || "Streaming error");
					}
				}
			}
		} catch (error) {
			console.error("Chat error:", error);
			const message =
				error instanceof Error && error.message
					? error.message
					: "Sorry, I encountered an error. Please try again.";
			updateAssistantMessage(assistantId, (msg) => ({
				...msg,
				content: msg.content || message,
			}));
			setChatStatus("Error");
			setLoadingStep(message);
		} finally {
			setIsLoading(false);
		}
	};

	const hasOfficerAccess = [
		"General Officer",
		"Executive Officer",
		"Administrator",
	].includes(userRole || "");

	if (!hasOfficerAccess) {
		return null;
	}

	const currentStatusText = isLoading ? loadingStep : chatStatus;

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
					title="AI Assistant"
				>
					<Sparkles className="h-4 w-4" />
					<span className="sr-only">AI Assistant</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent
				side="right"
				className="w-[450px] h-[600px] p-0 flex flex-col shadow-2xl mr-2"
				align="end"
			>
				<div className="flex items-center justify-between p-3 border-b bg-sidebar-accent/50">
					<div className="flex items-center gap-2">
						<Bot className="w-5 h-5 text-blue-500" />
						<h4 className="font-semibold text-sm">Officer Assistant</h4>
						<Badge
							variant="secondary"
							className="h-5 px-1.5 text-[10px] tracking-wider font-bold"
						>
							BETA
						</Badge>
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="h-6 w-6"
						onClick={() => setIsOpen(false)}
					>
						<X className="w-4 h-4" />
					</Button>
				</div>

				<div className="bg-blue-50/50 dark:bg-blue-900/10 px-4 py-2 border-b border-blue-100 dark:border-blue-900/20 flex gap-2 items-start">
					<AlertCircle className="w-3 h-3 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
					<p className="text-[11px] text-blue-700 dark:text-blue-300 leading-tight">
						This tool is in <span className="font-semibold">beta</span>. Please
						double check all info & report issues to the webmaster.
					</p>
				</div>

				<div className="px-4 py-2 border-b text-[11px] text-muted-foreground flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<span className="inline-flex items-center gap-1">
							{isLoading ? (
								<Loader2 className="w-3 h-3 animate-spin" />
							) : (
								<Bot className="w-3 h-3" />
							)}
							Status: {currentStatusText}
						</span>
						<span>{lastMeta?.currentDateTime || formatPacificNow()}</span>
					</div>
					<div>
						Context: {lastMeta?.currentUser?.name || user?.name || "Officer"}
						{lastMeta?.currentUser?.role
							? ` (${lastMeta.currentUser.role})`
							: userRole
								? ` (${userRole})`
								: ""}
						{typeof lastMeta?.scannedTables === "number" &&
						typeof lastMeta?.totalMatches === "number"
							? ` · ${lastMeta.scannedTables} tables / ${lastMeta.totalMatches} matches`
							: ""}
					</div>
				</div>

				<div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
					{messages.map((msg) => (
						<div key={msg.id} className="flex flex-col gap-1">
							<div
								className={cn(
									"flex w-full gap-3",
									msg.role === "user" ? "justify-end" : "justify-start",
								)}
							>
								{msg.role === "assistant" && (
									<div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0 mt-1">
										<Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
									</div>
								)}

								<div
									className={cn(
										"rounded-lg p-3 text-sm max-w-[85%]",
										msg.role === "user"
											? "bg-blue-600 text-white"
											: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100",
									)}
								>
									<MarkdownRenderer content={msg.content} />
								</div>

								{msg.role === "user" && (
									<div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 mt-1">
										<UserIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
									</div>
								)}
							</div>

							{msg.role === "assistant" &&
								msg.steps &&
								msg.steps.length > 0 && (
									<div className="ml-11 max-w-[85%]">
										<details className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer group">
											<summary className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 select-none">
												<span className="font-medium">Execution Trace</span>
												<ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
											</summary>
											<div className="mt-1 pl-2 border-l-2 border-gray-200 dark:border-gray-700 flex flex-col gap-1 py-1">
												{msg.steps.map((step) => (
													<span
														key={`${msg.id}-${step}`}
														className="flex items-start gap-2"
													>
														<span>{step}</span>
													</span>
												))}
											</div>
										</details>
									</div>
								)}
						</div>
					))}
				</div>

				<div className="p-3 border-t bg-background">
					<form onSubmit={handleSubmit} className="flex gap-2">
						<Input
							value={input}
							onChange={(e) => setInput(e.target.value)}
							placeholder="Ask about events, budgets, etc..."
							className="flex-1"
							autoFocus
						/>
						<Button
							type="submit"
							size="icon"
							disabled={isLoading || !input.trim()}
						>
							<Send className="w-4 h-4" />
						</Button>
					</form>
				</div>
			</PopoverContent>
		</Popover>
	);
}

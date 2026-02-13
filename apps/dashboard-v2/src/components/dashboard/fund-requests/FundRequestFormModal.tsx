import {
	Check,
	DollarSign,
	FileText,
	Landmark,
	Link as LinkIcon,
	ListChecks,
	Loader2,
	Tags,
	X,
} from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	CATEGORY_LABELS,
	DEPARTMENT_LABELS,
	type FundRequestCategory,
	type FundRequestDepartment,
	formatCurrency,
} from "@/types/fund-requests";

interface VendorLink {
	id: string;
	url: string;
	itemName?: string;
	quantity?: number;
}

interface FundRequestFormData {
	title: string;
	purpose: string;
	category: FundRequestCategory;
	department: FundRequestDepartment;
	amount: string;
	vendorLinks: VendorLink[];
}

interface FundRequestFormModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
	initialData?: Partial<FundRequestFormData> & { amount?: string | number };
	isEditMode?: boolean;
	showHeader?: boolean;
}

const STEPS = [
	{ id: 1, title: "Basic Info" },
	{ id: 2, title: "Budget" },
	{ id: 3, title: "Review" },
];

export function FundRequestFormModal({
	isOpen,
	onClose,
	onSuccess,
	initialData,
	isEditMode = false,
	showHeader = true,
}: FundRequestFormModalProps) {
	const [currentStep, setCurrentStep] = useState(1);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const stepTrackInset = `${100 / (STEPS.length * 2)}%`;
	const stepTrackProgress =
		STEPS.length > 1 ? ((currentStep - 1) / (STEPS.length - 1)) * 100 : 100;

	const titleId = useId();
	const purposeId = useId();
	const departmentId = useId();
	const categoryId = useId();
	const amountId = useId();

	// Form state
	const [title, setTitle] = useState("");
	const [purpose, setPurpose] = useState("");
	const [category, setCategory] = useState<FundRequestCategory>("event");
	const [department, setDepartment] = useState<FundRequestDepartment>("events");
	const [amount, setAmount] = useState("");
	const [vendorLinks, setVendorLinks] = useState<VendorLink[]>([]);

	// Validation state
	const [errors, setErrors] = useState<Record<string, string>>({});

	const resetForm = useCallback(() => {
		setTitle("");
		setPurpose("");
		setCategory("event");
		setDepartment("events");
		setAmount("");
		setVendorLinks([
			{ id: crypto.randomUUID(), url: "", itemName: "", quantity: 1 },
		]);
		setErrors({});
		setCurrentStep(1);
	}, []);

	// Initialize form with existing data
	useEffect(() => {
		if (isOpen) {
			if (initialData) {
				setTitle(initialData.title || "");
				setPurpose(initialData.purpose || "");
				setCategory(initialData.category || "event");
				setDepartment(initialData.department || "events");
				setAmount(initialData.amount ? String(initialData.amount) : "");
				setVendorLinks(initialData.vendorLinks || []);
			} else {
				resetForm();
			}
			setCurrentStep(1);
		}
	}, [isOpen, initialData, resetForm]);

	const validateStep = (step: number): boolean => {
		const newErrors: Record<string, string> = {};

		switch (step) {
			case 1:
				if (!title.trim()) newErrors.title = "Title is required";
				if (!purpose.trim())
					newErrors.purpose = "Purpose/justification is required";
				break;
			case 2:
				if (!amount || parseFloat(amount) <= 0) {
					newErrors.amount = "Valid budget amount is required";
				}
				break;
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleNextStep = () => {
		if (validateStep(currentStep)) {
			setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
		}
	};

	const handlePrevStep = () => {
		setCurrentStep((prev) => Math.max(prev - 1, 1));
	};

	// Initialize with one empty row if needed
	useEffect(() => {
		if (!isOpen) return;

		setVendorLinks((prev) => {
			if (prev.length === 0) {
				return [
					{ id: crypto.randomUUID(), url: "", itemName: "", quantity: 1 },
				];
			}
			const lastLink = prev[prev.length - 1];
			if (lastLink.url?.trim() || lastLink.itemName?.trim()) {
				return [
					...prev,
					{ id: crypto.randomUUID(), url: "", itemName: "", quantity: 1 },
				];
			}
			return prev;
		});
	}, [isOpen]);

	const handleLinkChange = (
		id: string,
		field: "itemName" | "url" | "quantity",
		value: unknown,
	) => {
		setVendorLinks((prev) => {
			const index = prev.findIndex((l) => l.id === id);
			if (index === -1) return prev;

			const updated = [...prev];
			updated[index] = {
				...updated[index],
				[field]:
					field === "quantity" ? Number(value as number) : (value as string),
			};

			if (index === prev.length - 1) {
				const currentLink = updated[index];
				if (currentLink.itemName?.trim() || currentLink.url?.trim()) {
					updated.push({
						id: crypto.randomUUID(),
						url: "",
						itemName: "",
						quantity: 1,
					});
				}
			}

			return updated;
		});

		if (errors.link || errors[`link_${id}`]) {
			setErrors((prev) => {
				const { link, [`link_${id}`]: _removed, ...rest } = prev;
				void link;
				return rest;
			});
		}
	};

	const handleLinkBlur = (id: string) => {
		setVendorLinks((prev) => {
			const link = prev.find((l) => l.id === id);
			if (!link) return prev;

			if (link.url?.trim() && !isValidUrl(link.url)) {
				setErrors((e) => ({
					...e,
					[`link_${id}`]: "Please enter a valid URL",
				}));
			}
			return prev;
		});
	};

	const handleRemoveLink = (id: string) => {
		setVendorLinks((prev) => {
			if (prev.length <= 1) {
				return [
					{ id: crypto.randomUUID(), url: "", itemName: "", quantity: 1 },
				];
			}
			return prev.filter((link) => link.id !== id);
		});
		setErrors((prev) => {
			const { [`link_${id}`]: removedError, ...rest } = prev;
			void removedError;
			return rest;
		});
	};

	const isValidUrl = (string: string): boolean => {
		try {
			new URL(string);
			return true;
		} catch {
			return false;
		}
	};

	const handleSubmit = async () => {
		if (!validateStep(1) || !validateStep(2)) {
			return;
		}

		setIsSubmitting(true);

		try {
			// Remove empty vendor links
			const cleanedVendorLinks = vendorLinks.filter(
				(link) => link.url?.trim() || link.itemName?.trim(),
			);
			void cleanedVendorLinks;

			// Here you would call the Convex mutation to create/update the fund request
			// await createFundRequestMutation({ ... });

			onSuccess();
			resetForm();
		} catch (error) {
			console.error("Error saving fund request:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const renderStepContent = () => {
		switch (currentStep) {
			case 1:
				return (
					<div className="space-y-4">
						<div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
							<Card className="border-border/60 shadow-sm">
								<CardContent className="space-y-4 p-5">
									<div className="flex items-center gap-2">
										<FileText className="h-4 w-4 text-primary" />
										<h3 className="text-sm font-semibold tracking-wide">
											Request Details
										</h3>
									</div>

									<div className="space-y-2">
										<Label htmlFor={titleId}>
											Title <span className="text-destructive">*</span>
										</Label>
										<Input
											id={titleId}
											placeholder="Enter a descriptive title for your request"
											value={title}
											onChange={(e) => setTitle(e.target.value)}
											maxLength={100}
										/>
										<div className="flex items-center justify-between text-xs text-muted-foreground">
											<span>Use a short, clear request title.</span>
											<span>{title.length}/100</span>
										</div>
										{errors.title && (
											<p className="text-sm text-destructive">{errors.title}</p>
										)}
									</div>

									<div className="space-y-2">
										<Label htmlFor={purposeId}>
											Purpose / Justification{" "}
											<span className="text-destructive">*</span>
										</Label>
										<Textarea
											id={purposeId}
											placeholder="Explain why you need this funding and how it will be used..."
											value={purpose}
											onChange={(e) => setPurpose(e.target.value)}
											rows={7}
										/>
										{errors.purpose && (
											<p className="text-sm text-destructive">
												{errors.purpose}
											</p>
										)}
									</div>
								</CardContent>
							</Card>

							<Card className="border-border/60 shadow-sm">
								<CardContent className="space-y-4 p-5">
									<div className="flex items-center gap-2">
										<Tags className="h-4 w-4 text-primary" />
										<h3 className="text-sm font-semibold tracking-wide">
											Classification
										</h3>
									</div>

									<div className="space-y-2">
										<Label htmlFor={departmentId}>
											Department <span className="text-destructive">*</span>
										</Label>
										<Select
											value={department}
											onValueChange={(v) =>
												setDepartment(v as FundRequestDepartment)
											}
										>
											<SelectTrigger id={departmentId}>
												<SelectValue placeholder="Select Department" />
											</SelectTrigger>
											<SelectContent>
												{Object.entries(DEPARTMENT_LABELS).map(
													([key, label]) => (
														<SelectItem key={key} value={key}>
															{label}
														</SelectItem>
													),
												)}
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-2">
										<Label htmlFor={categoryId}>
											Category <span className="text-destructive">*</span>
										</Label>
										<Select
											value={category}
											onValueChange={(v) =>
												setCategory(v as FundRequestCategory)
											}
										>
											<SelectTrigger id={categoryId}>
												<SelectValue placeholder="Select Category" />
											</SelectTrigger>
											<SelectContent>
												{Object.entries(CATEGORY_LABELS).map(([key, label]) => (
													<SelectItem key={key} value={key}>
														{label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="rounded-lg border border-dashed bg-muted/20 p-3">
										<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
											Current selection
										</p>
										<div className="flex flex-wrap gap-2">
											<Badge variant="secondary">
												{DEPARTMENT_LABELS[department]}
											</Badge>
											<Badge variant="secondary">
												{CATEGORY_LABELS[category]}
											</Badge>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				);

			case 2:
				return (
					<div className="space-y-4">
						<div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
							<Card className="border-border/60 shadow-sm">
								<CardContent className="space-y-5 p-5">
									<div className="flex items-center gap-2">
										<DollarSign className="h-4 w-4 text-primary" />
										<h3 className="text-sm font-semibold tracking-wide">
											Budget
										</h3>
									</div>

									<div className="space-y-2">
										<Label htmlFor={amountId}>
											Total Budget Amount{" "}
											<span className="text-destructive">*</span>
										</Label>
										<div className="relative">
											<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
												$
											</span>
											<Input
												id={amountId}
												type="text"
												inputMode="decimal"
												placeholder="0.00"
												value={amount}
												onChange={(e) => {
													const sanitized = e.target.value.replace(
														/[^0-9.]/g,
														"",
													);
													const parts = sanitized.split(".");
													if (parts.length > 2) return;
													if (parts[1] && parts[1].length > 2) return;
													setAmount(sanitized);
												}}
												onBlur={() => {
													if (amount) {
														const num = parseFloat(
															amount.replace(/[^0-9.]/g, ""),
														);
														setAmount(num ? num.toFixed(2) : "");
													}
												}}
												className="pl-7"
											/>
										</div>
										{errors.amount && (
											<p className="text-sm text-destructive">
												{errors.amount}
											</p>
										)}
										<p className="text-xs text-muted-foreground">
											Enter the total amount requested in USD.
										</p>
									</div>

									<div className="rounded-lg border bg-muted/20 p-3">
										<div className="flex items-center justify-between">
											<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
												Requested total
											</p>
											<p className="text-lg font-semibold">
												${formatCurrency(parseFloat(amount) || 0)}
											</p>
										</div>
									</div>
								</CardContent>
							</Card>

							<Card className="border-border/60 shadow-sm">
								<CardContent className="space-y-3 p-5">
									<div className="flex items-center gap-2">
										<Landmark className="h-4 w-4 text-primary" />
										<h3 className="text-sm font-semibold tracking-wide">
											Request Snapshot
										</h3>
									</div>
									<div className="space-y-2 text-sm">
										<div className="flex items-center justify-between">
											<span className="text-muted-foreground">Department</span>
											<span className="font-medium">
												{DEPARTMENT_LABELS[department]}
											</span>
										</div>
										<div className="flex items-center justify-between">
											<span className="text-muted-foreground">Category</span>
											<span className="font-medium">
												{CATEGORY_LABELS[category]}
											</span>
										</div>
										<div className="flex items-center justify-between">
											<span className="text-muted-foreground">Line Items</span>
											<span className="font-medium">
												{
													vendorLinks.filter(
														(l) => l.url?.trim() || l.itemName?.trim(),
													).length
												}
											</span>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>

						<Card className="border-border/60 shadow-sm">
							<CardContent className="space-y-4 p-5">
								<div className="flex items-center gap-2">
									<ListChecks className="h-4 w-4 text-primary" />
									<div>
										<Label>Purchase Links / Line Items</Label>
										<p className="text-xs text-muted-foreground">
											Add item details and URLs. A blank row appears
											automatically.
										</p>
									</div>
								</div>

								<div className="rounded-lg border bg-background">
									<ScrollArea className="max-h-64">
										<div className="space-y-3 p-3">
											{vendorLinks.length > 0 && (
												<div className="flex gap-2 px-1 text-xs text-muted-foreground font-medium uppercase tracking-wide">
													<span className="flex-1">Item Name</span>
													<span className="w-20">Qty</span>
													<span className="flex-[2]">URL</span>
													<span className="w-8"></span>
												</div>
											)}

											{vendorLinks.map((link) => (
												<div
													key={link.id}
													className="group flex gap-2 items-center"
												>
													<Input
														placeholder="Item name"
														value={link.itemName || ""}
														onChange={(e) =>
															handleLinkChange(
																link.id,
																"itemName",
																e.target.value,
															)
														}
														onBlur={() => handleLinkBlur(link.id)}
														className="flex-1 h-8 text-sm"
													/>
													<Input
														placeholder="1"
														type="number"
														min={1}
														value={link.quantity ?? 1}
														onChange={(e) => {
															const num = parseInt(e.target.value, 10) || 1;
															handleLinkChange(
																link.id,
																"quantity",
																Math.max(1, num),
															);
														}}
														className="w-20 h-8 text-sm"
													/>
													<Input
														placeholder="https://..."
														value={link.url || ""}
														onChange={(e) =>
															handleLinkChange(link.id, "url", e.target.value)
														}
														onBlur={() => handleLinkBlur(link.id)}
														className="flex-[2] h-8 text-sm"
													/>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														onClick={() => handleRemoveLink(link.id)}
														className="opacity-0 group-hover:opacity-100 w-8 h-8 p-0"
													>
														<X className="w-4 h-4 text-destructive" />
													</Button>
												</div>
											))}
										</div>
									</ScrollArea>
								</div>
							</CardContent>
						</Card>
					</div>
				);

			case 3: {
				const cleanedLinks = vendorLinks.filter(
					(l) => l.url?.trim() || l.itemName?.trim(),
				);

				return (
					<div className="space-y-4">
						<Card className="border-border/60 shadow-sm">
							<CardContent className="p-5 space-y-4">
								<div className="flex flex-wrap items-start justify-between gap-4">
									<div className="space-y-1">
										<h4 className="text-xl font-semibold">
											{title || "Untitled request"}
										</h4>
										<div className="flex flex-wrap gap-2">
											<Badge variant="secondary">
												{DEPARTMENT_LABELS[department]}
											</Badge>
											<Badge variant="secondary">
												{CATEGORY_LABELS[category]}
											</Badge>
										</div>
									</div>
									<p className="text-2xl font-bold text-green-600 dark:text-green-400">
										${formatCurrency(parseFloat(amount) || 0)}
									</p>
								</div>

								<div className="border-t pt-4 space-y-2">
									<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
										Purpose
									</span>
									<p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
										{purpose}
									</p>
								</div>

								<div className="rounded-lg border bg-muted/20 p-3">
									<div className="flex items-center gap-2 mb-2">
										<LinkIcon className="w-4 h-4 text-primary" />
										<span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
											Items / Links ({cleanedLinks.length})
										</span>
									</div>
									{cleanedLinks.length === 0 ? (
										<p className="text-sm text-muted-foreground">
											No line items added.
										</p>
									) : (
										<div className="space-y-2">
											{cleanedLinks.map((link) => (
												<div
													key={link.id}
													className="flex items-start justify-between gap-3 rounded-md bg-background p-2"
												>
													<div className="min-w-0">
														<p className="text-sm font-medium truncate">
															{link.itemName || "Untitled item"}
														</p>
														<p className="text-xs text-muted-foreground truncate">
															{link.url || "No URL provided"}
														</p>
													</div>
													<Badge variant="outline">
														Qty {link.quantity || 1}
													</Badge>
												</div>
											))}
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					</div>
				);
			}

			default:
				return null;
		}
	};

	if (!isOpen) return null;

	return (
		<Card className="border-border/60 shadow-sm overflow-hidden">
			{showHeader && (
				<div className="border-b bg-muted/20 px-6 py-4">
					<h2 className="text-xl font-semibold">
						{isEditMode ? "Edit Fund Request" : "New Fund Request"}
					</h2>
					<p className="text-sm text-muted-foreground">
						Complete each step to submit a clear, review-ready request.
					</p>
				</div>
			)}

			{/* Stepper */}
			<div className="px-6 pt-4">
				<div className="relative">
					<div
						className="absolute top-4 h-0.5 bg-muted"
						style={{ left: stepTrackInset, right: stepTrackInset }}
					/>
					<div
						className="absolute top-4 h-0.5 bg-primary transition-all duration-300"
						style={{
							left: stepTrackInset,
							width: `calc((100% - (${stepTrackInset} * 2)) * ${stepTrackProgress / 100})`,
						}}
					/>

					<div
						className="relative grid gap-3"
						style={{
							gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))`,
						}}
					>
						{STEPS.map((step) => {
							const isCompleted = currentStep > step.id;
							const isCurrent = currentStep === step.id;

							return (
								<div key={step.id} className="flex flex-col items-center">
									<div
										className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 border-2 relative z-10
                      ${isCompleted || isCurrent ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-muted bg-background text-muted-foreground"}
                    `}
									>
										{isCompleted ? <Check className="w-4 h-4" /> : step.id}
									</div>
									<span
										className={`hidden sm:block text-xs font-semibold mt-2 ${isCurrent ? "text-primary" : "text-muted-foreground"}`}
									>
										{step.title}
									</span>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			<ScrollArea className="max-h-[70vh] px-6">
				<div className="py-4">{renderStepContent()}</div>
			</ScrollArea>

			<div className="flex-col sm:flex-row sm:justify-between sm:items-center gap-3 px-6 py-4 border-t bg-background flex">
				<Button
					variant="outline"
					onClick={onClose}
					disabled={isSubmitting}
					className="w-full sm:w-auto"
				>
					Cancel
				</Button>

				<div className="flex gap-3 w-full sm:w-auto">
					{currentStep > 1 && (
						<Button
							type="button"
							variant="outline"
							onClick={handlePrevStep}
							disabled={isSubmitting}
							className="flex-1 sm:flex-none"
						>
							Back
						</Button>
					)}

					{currentStep < STEPS.length ? (
						<Button onClick={handleNextStep} className="flex-1 sm:flex-none">
							Next Step
						</Button>
					) : (
						<Button
							onClick={handleSubmit}
							disabled={isSubmitting}
							className="flex-1 sm:flex-none"
						>
							{isSubmitting && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							{isEditMode ? "Update Request" : "Submit Request"}
						</Button>
					)}
				</div>
			</div>
		</Card>
	);
}

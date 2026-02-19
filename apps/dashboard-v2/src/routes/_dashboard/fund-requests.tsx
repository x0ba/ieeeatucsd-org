import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import { useAuthedQuery, useAuthedMutation } from "@/hooks/useAuthedConvex";
import {
	AlertCircle,
	CheckCircle,
	Clock,
	Edit,
	FileText,
	Plus,
	Search,
	Trash2,
	TrendingUp,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BudgetLogModal } from "@/components/dashboard/fund-requests/BudgetLogModal";
import { BudgetTrackingCard } from "@/components/dashboard/fund-requests/BudgetTrackingCard";
import { FundRequestDetailModal } from "@/components/dashboard/fund-requests/FundRequestDetailModal";
import { FundRequestFormModal } from "@/components/dashboard/fund-requests/FundRequestFormModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import {
	CATEGORY_LABELS,
	type FundRequestDepartment,
	type FundRequestStatus,
	STATUS_LABELS,
} from "@/types/fund-requests";
import { formatCurrency, formatDate } from "@/types/fund-requests";

export const Route = createFileRoute("/_dashboard/fund-requests")({
	component: FundRequestsPage,
});

const ITEMS_PER_PAGE = 6;

const statusColors: Record<string, string> = {
	draft: "bg-gray-100 text-gray-800",
	submitted: "bg-blue-100 text-blue-800",
	needs_info:
		"bg-yellow-100 text-yellow-800",
	approved:
		"bg-green-100 text-green-800",
	denied: "bg-red-100 text-red-800",
	completed:
		"bg-purple-100 text-purple-800",
};

const statusBorderColors: Record<string, string> = {
	draft: "bg-gray-300",
	submitted: "bg-blue-500",
	needs_info: "bg-yellow-500",
	approved: "bg-green-500",
	denied: "bg-red-500",
	completed: "bg-purple-500",
};

const getStatusIcon = (status: FundRequestStatus) => {
	switch (status) {
		case "draft":
			return <FileText className="w-3.5 h-3.5" />;
		case "submitted":
			return <Clock className="w-3.5 h-3.5" />;
		case "needs_info":
			return <AlertCircle className="w-3.5 h-3.5" />;
		case "approved":
			return <CheckCircle className="w-3.5 h-3.5" />;
		case "denied":
			return <XCircle className="w-3.5 h-3.5" />;
		case "completed":
			return <CheckCircle className="w-3.5 h-3.5" />;
		default:
			return <FileText className="w-3.5 h-3.5" />;
	}
};

type FilterTab = "all" | FundRequestStatus;
type FundRequestRecord = Doc<"fundRequests">;

function FundRequestsPage() {
	const { logtoId } = useAuth();
	const { hasOfficerAccess } = usePermissions();
	const requests = useAuthedQuery(
		api.fundRequests.listMine,
		logtoId ? { logtoId } : "skip",
	);
	const deleteFundRequest = useAuthedMutation(api.fundRequests.deleteRequest);

	const [isFormModalOpen, setIsFormModalOpen] = useState(false);
	const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
	const [isBudgetLogOpen, setIsBudgetLogOpen] = useState(false);
	const [selectedRequest, setSelectedRequest] =
		useState<FundRequestRecord | null>(null);
	const [isEditMode, setIsEditMode] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedTab, setSelectedTab] = useState<FilterTab>("all");
	const [page, setPage] = useState(1);
	const [isDeleting, setIsDeleting] = useState(false);

	// Budget stats queries
	const budgetStatsEvents = useAuthedQuery(
		api.fundRequests.getBudgetStats,
		hasOfficerAccess && logtoId ? { logtoId, department: "events" } : "skip",
	);
	const budgetStatsProjects = useAuthedQuery(
		api.fundRequests.getBudgetStats,
		hasOfficerAccess && logtoId ? { logtoId, department: "projects" } : "skip",
	);
	const budgetStatsInternal = useAuthedQuery(
		api.fundRequests.getBudgetStats,
		hasOfficerAccess && logtoId ? { logtoId, department: "internal" } : "skip",
	);

	// Budget adjustments queries
	const adjustmentsEvents = useAuthedQuery(
		api.fundRequests.getBudgetAdjustments,
		hasOfficerAccess && logtoId ? { logtoId, department: "events" } : "skip",
	);
	const adjustmentsProjects = useAuthedQuery(
		api.fundRequests.getBudgetAdjustments,
		hasOfficerAccess && logtoId ? { logtoId, department: "projects" } : "skip",
	);
	const adjustmentsInternal = useAuthedQuery(
		api.fundRequests.getBudgetAdjustments,
		hasOfficerAccess && logtoId ? { logtoId, department: "internal" } : "skip",
	);

	// Fund requests by department for budget log
	const requestsEvents = useAuthedQuery(
		api.fundRequests.listByDepartment,
		hasOfficerAccess && logtoId && budgetStatsEvents?.startDate
			? {
				logtoId,
				department: "events",
				startDate: budgetStatsEvents.startDate,
			}
			: "skip",
	);
	const requestsProjects = useAuthedQuery(
		api.fundRequests.listByDepartment,
		hasOfficerAccess && logtoId && budgetStatsProjects?.startDate
			? {
				logtoId,
				department: "projects",
				startDate: budgetStatsProjects.startDate,
			}
			: "skip",
	);
	const requestsInternal = useAuthedQuery(
		api.fundRequests.listByDepartment,
		hasOfficerAccess && logtoId && budgetStatsInternal?.startDate
			? {
				logtoId,
				department: "internal",
				startDate: budgetStatsInternal.startDate,
			}
			: "skip",
	);

	// Budget log modal data
	const [selectedBudgetDepartment] = useState<FundRequestDepartment>("events");

	const getFilteredRequests = () => {
		if (!requests) return [];

		let filtered = requests;

		// Filter by status tab
		if (selectedTab !== "all") {
			filtered = filtered.filter((r) => r.status === selectedTab);
		}

		// Filter by search query
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(r) =>
					r.title.toLowerCase().includes(query) ||
					r.purpose.toLowerCase().includes(query) ||
					CATEGORY_LABELS[r.category as keyof typeof CATEGORY_LABELS]
						?.toLowerCase()
						.includes(query),
			);
		}

		return filtered;
	};

	const filteredRequests = getFilteredRequests();
	const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
	const paginatedRequests = filteredRequests.slice(
		(page - 1) * ITEMS_PER_PAGE,
		page * ITEMS_PER_PAGE,
	);

	const getStats = () => {
		if (!requests)
			return {
				total: 0,
				draft: 0,
				submitted: 0,
				needsInfo: 0,
				approved: 0,
				denied: 0,
				completed: 0,
				totalAmount: 0,
			};
		return {
			total: requests.length,
			draft: requests.filter((r) => r.status === "draft").length,
			submitted: requests.filter((r) => r.status === "submitted").length,
			needsInfo: requests.filter((r) => r.status === "needs_info").length,
			approved: requests.filter((r) => r.status === "approved").length,
			denied: requests.filter((r) => r.status === "denied").length,
			completed: requests.filter((r) => r.status === "completed").length,
			totalAmount: requests
				.filter((r) => r.status === "approved" || r.status === "completed")
				.reduce((sum, r) => sum + r.amount, 0),
		};
	};

	const stats = getStats();

	const handleNewRequest = () => {
		setSelectedRequest(null);
		setIsEditMode(false);
		setIsFormModalOpen(true);
	};

	const handleEditRequest = (request: FundRequestRecord) => {
		setSelectedRequest(request);
		setIsEditMode(true);
		setIsDetailModalOpen(false);
		setIsFormModalOpen(true);
	};

	const handleViewRequest = (request: FundRequestRecord) => {
		setSelectedRequest(request);
		setIsDetailModalOpen(true);
	};

	const handleDeleteRequest = async (request: FundRequestRecord) => {
		if (!logtoId) return;
		setIsDeleting(true);
		try {
			await deleteFundRequest({ logtoId, id: request._id });
			toast.success("Fund request deleted successfully");
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to delete fund request";
			toast.error(message);
		} finally {
			setIsDeleting(false);
		}
	};

	const handleFormClose = () => {
		setIsFormModalOpen(false);
		setSelectedRequest(null);
		setIsEditMode(false);
	};

	const handleFormSuccess = () => {
		handleFormClose();
		toast.success(
			isEditMode
				? "Fund request updated successfully"
				: "Fund request created successfully",
		);
	};

	const getBudgetRequestsForLog = (dept: FundRequestDepartment) => {
		switch (dept) {
			case "events":
				return requestsEvents || [];
			case "projects":
				return requestsProjects || [];
			case "internal":
				return requestsInternal || [];
			default:
				return [];
		}
	};

	const getBudgetAdjustmentsForLog = (dept: FundRequestDepartment) => {
		switch (dept) {
			case "events":
				return adjustmentsEvents || [];
			case "projects":
				return adjustmentsProjects || [];
			case "internal":
				return adjustmentsInternal || [];
			default:
				return [];
		}
	};

	return (
		<>
			<div className="p-6 max-w-[1600px] mx-auto space-y-8">
				{/* Header */}
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
					<div>
						<h1 className="text-3xl font-bold tracking-tight text-foreground">
							Fund Requests
						</h1>
						<p className="text-muted-foreground mt-1 max-w-2xl">
							Manage your funding requests for events, equipment, and travel.
							Track status and budget usage in real-time.
						</p>
					</div>
					<Button
						onClick={handleNewRequest}
						size="lg"
						className="font-medium shadow-md shadow-primary/20"
					>
						<Plus className="h-5 w-5 mr-2" />
						New Request
					</Button>
				</div>

				{/* Budget Tracking Section */}
				{hasOfficerAccess && (
					<div className="space-y-4">
						<div className="flex items-center gap-2 px-1">
							<TrendingUp className="w-5 h-5 text-primary" />
							<h2 className="text-lg font-semibold text-foreground">
								Department Budgets
							</h2>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
							{(["events", "projects", "internal"] as FundRequestDepartment[]).map(
								(dept) => {
									const budgetStats =
										dept === "events"
											? budgetStatsEvents
											: dept === "projects"
												? budgetStatsProjects
												: budgetStatsInternal;

									return (
										<BudgetTrackingCard
											key={dept}
											department={dept}
											totalBudget={budgetStats?.totalBudget || 0}
											remainingBudget={budgetStats?.remainingBudget || 0}
											pendingBudget={budgetStats?.pendingBudget || 0}
											percentUsed={budgetStats?.percentUsed || 0}
											isConfigured={budgetStats?.isConfigured || false}
											onClick={() => {
												setIsBudgetLogOpen(true);
											}}
										/>
									);
								},
							)}
						</div>
					</div>
				)}

				{/* Filters and Search */}
				<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between sticky top-0 z-20 bg-background/95 backdrop-blur-sm py-2 -mx-2 px-2 border-b border-border/50">
					<Tabs
						value={selectedTab}
						onValueChange={(v) => {
							setSelectedTab(v as FilterTab);
							setPage(1);
						}}
						className="w-full sm:w-auto"
					>
						<TabsList>
							<TabsTrigger value="all" className="gap-2">
								<span>All Requests</span>
								<Badge variant="secondary">{stats.total}</Badge>
							</TabsTrigger>
							<TabsTrigger value="draft" className="gap-2">
								<span>Draft</span>
								{stats.draft > 0 && (
									<Badge variant="secondary">{stats.draft}</Badge>
								)}
							</TabsTrigger>
							<TabsTrigger value="submitted" className="gap-2">
								<span>Submitted</span>
								{stats.submitted > 0 && (
									<Badge
										variant="secondary"
										className="bg-blue-500/10 text-blue-700"
									>
										{stats.submitted}
									</Badge>
								)}
							</TabsTrigger>
							<TabsTrigger value="needs_info" className="gap-2">
								<span>Needs Info</span>
								{stats.needsInfo > 0 && (
									<Badge
										variant="secondary"
										className="bg-yellow-500/10 text-yellow-700"
									>
										{stats.needsInfo}
									</Badge>
								)}
							</TabsTrigger>
							<TabsTrigger value="approved" className="gap-2">
								<span>Approved</span>
								{stats.approved > 0 && (
									<Badge
										variant="secondary"
										className="bg-green-500/10 text-green-700"
									>
										{stats.approved}
									</Badge>
								)}
							</TabsTrigger>
							<TabsTrigger value="denied" className="gap-2">
								<span>Denied</span>
								{stats.denied > 0 && (
									<Badge
										variant="secondary"
										className="bg-red-500/10 text-red-700"
									>
										{stats.denied}
									</Badge>
								)}
							</TabsTrigger>
							<TabsTrigger value="completed" className="gap-2">
								<span>Completed</span>
								{stats.completed > 0 && (
									<Badge
										variant="secondary"
										className="bg-purple-500/10 text-purple-700"
									>
										{stats.completed}
									</Badge>
								)}
							</TabsTrigger>
						</TabsList>
					</Tabs>
					<div className="relative w-full sm:max-w-xs">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
						<Input
							placeholder="Search requests..."
							value={searchQuery}
							onChange={(e) => {
								setSearchQuery(e.target.value);
								setPage(1);
							}}
							className="pl-10"
						/>
					</div>
				</div>

				{/* Request List - Card Grid */}
				{!requests ? (
					<div className="grid grid-cols-1 gap-4">
						{[1, 2, 3, 4, 5, 6].map((i) => (
							<Skeleton key={i} className="h-32 w-full rounded-xl" />
						))}
					</div>
				) : filteredRequests.length === 0 ? (
					<Card className="border-dashed border-2 border-border/50 bg-muted/30">
						<CardContent className="py-12 text-center">
							<div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
								<FileText className="w-8 h-8" />
							</div>
							<h3 className="text-xl font-semibold text-foreground mb-2">
								{requests.length === 0
									? "No fund requests yet"
									: "No matching requests found"}
							</h3>
							<p className="text-muted-foreground max-w-sm mx-auto mb-6">
								{requests.length === 0
									? "Create your first fund request to get started with your project funding."
									: "Try adjusting your filters or search query to find what you are looking for."}
							</p>
							{requests.length === 0 && (
								<Button onClick={handleNewRequest}>
									<Plus className="h-4 w-4 mr-2" />
									New Fund Request
								</Button>
							)}
						</CardContent>
					</Card>
				) : (
					<div className="grid grid-cols-1 gap-4">
						{paginatedRequests.map((r) => (
							<Card
								key={r._id}
								className="group w-full border border-border/50 shadow-sm hover:border-primary/50 hover:shadow-md hover:bg-accent/50 transition-all duration-200 cursor-pointer"
								onClick={() => handleViewRequest(r)}
							>
								<CardContent className="p-3">
									<div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
										{/* Status Indicator Bar */}
										<div
											className={`
										hidden md:block w-1 self-stretch rounded-full
										${statusBorderColors[r.status] || "bg-gray-300"}
									`}
										/>

										{/* Main Content */}
										<div className="flex-1 min-w-0 space-y-1 w-full">
											<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
												<h3 className="text-base font-bold text-foreground truncate max-w-full">
													{r.title}
												</h3>
												<Badge
													className={`${statusColors[r.status] || ""} px-2 py-0.5 h-5 text-[10px]`}
													variant="secondary"
												>
													<span className="flex items-center gap-1.5">
														{getStatusIcon(r.status as FundRequestStatus)}
														<span className="font-medium">
															{STATUS_LABELS[
																r.status as keyof typeof STATUS_LABELS
															] || r.status}
														</span>
													</span>
												</Badge>
											</div>

											<p className="text-sm text-muted-foreground line-clamp-1">
												{r.purpose}
											</p>

											<div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
												<div className="flex items-center gap-1.5 bg-muted px-2 py-0.5 rounded">
													<span className="font-semibold text-foreground text-xs">
														{formatCurrency(r.amount)}
													</span>
												</div>
												<div className="flex items-center gap-1.5">
													<div className="w-1 h-1 rounded-full bg-muted-foreground" />
													<span className="text-xs">
														{CATEGORY_LABELS[
															r.category as keyof typeof CATEGORY_LABELS
														] || r.category}
													</span>
												</div>
												<div className="flex items-center gap-1.5">
													<Clock className="w-3.5 h-3.5" />
													<span className="text-xs">{formatDate(r.createdAt)}</span>
												</div>
											</div>

											{r.status === "needs_info" && r.infoRequestNotes && (
												<div className="mt-2 p-2 bg-yellow-50/50 rounded border border-yellow-200/50 flex items-start gap-2">
													<AlertCircle className="w-3.5 h-3.5 text-yellow-600 flex-shrink-0 mt-0.5" />
													<div>
														<span className="text-xs font-semibold text-yellow-700 block mb-0.5">
															Action Required
														</span>
														<p className="text-xs text-yellow-800 line-clamp-1">
															{r.infoRequestNotes}
														</p>
													</div>
												</div>
											)}
										</div>

										{/* Actions */}
										<div className="flex items-center gap-1 self-end md:self-center flex-shrink-0 border-t md:border-t-0 border-border pt-2 md:pt-0 w-full md:w-auto justify-end">
											{(r.status === "draft" || r.status === "needs_info") && (
												<Button
													variant="ghost"
													size="icon"
													onClick={(e) => {
														e.stopPropagation();
														handleEditRequest(r);
													}}
													className="h-7 w-7 bg-primary/10 text-primary hover:bg-primary/20"
												>
													<Edit className="w-3.5 h-3.5" />
												</Button>
											)}
											{r.status === "draft" && (
												<Button
													variant="ghost"
													size="icon"
													onClick={(e) => {
														e.stopPropagation();
														handleDeleteRequest(r);
													}}
													disabled={isDeleting}
													className="h-7 w-7 bg-destructive/10 text-destructive hover:bg-destructive/20"
												>
													<Trash2 className="w-3.5 h-3.5" />
												</Button>
											)}
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}

				{/* Pagination */}
				{filteredRequests.length > ITEMS_PER_PAGE && (
					<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
						<p className="text-sm text-muted-foreground">
							Showing {(page - 1) * ITEMS_PER_PAGE + 1} to{" "}
							{Math.min(page * ITEMS_PER_PAGE, filteredRequests.length)} of{" "}
							{filteredRequests.length} requests
						</p>
						<Pagination
							currentPage={page}
							totalPages={totalPages}
							onPageChange={setPage}
						/>
					</div>
				)}
			</div>

			{/* Fund Request Form Modal (Create/Edit) */}
			<FundRequestFormModal
				isOpen={isFormModalOpen}
				onClose={handleFormClose}
				onSuccess={handleFormSuccess}
				initialData={selectedRequest ? {
					title: selectedRequest.title,
					purpose: selectedRequest.purpose,
					category: selectedRequest.category as any,
					department: selectedRequest.department as any,
					amount: String(selectedRequest.amount),
					vendorLinks: selectedRequest.vendorLinks as any,
					_id: selectedRequest._id,
				} : undefined}
				isEditMode={isEditMode}
				logtoId={logtoId ?? undefined}
				editRequestId={selectedRequest?._id}
			/>

			{/* Fund Request Detail Modal (View Only) */}
			<FundRequestDetailModal
				isOpen={isDetailModalOpen}
				onClose={() => setIsDetailModalOpen(false)}
				request={selectedRequest}
				onEdit={
					selectedRequest && (selectedRequest.status === "draft" || selectedRequest.status === "needs_info")
						? () => handleEditRequest(selectedRequest)
						: undefined
				}
			/>

			{/* Budget Log Modal (Officer Only) */}
			{hasOfficerAccess && (
				<BudgetLogModal
					isOpen={isBudgetLogOpen}
					onClose={() => setIsBudgetLogOpen(false)}
					department={selectedBudgetDepartment}
					requests={getBudgetRequestsForLog(selectedBudgetDepartment)}
					adjustments={getBudgetAdjustmentsForLog(selectedBudgetDepartment)}
					budgetStartDate={
						selectedBudgetDepartment === "events"
							? budgetStatsEvents?.startDate
								? new Date(budgetStatsEvents.startDate)
								: undefined
							: selectedBudgetDepartment === "projects"
								? budgetStatsProjects?.startDate
									? new Date(budgetStatsProjects.startDate)
									: undefined
								: budgetStatsInternal?.startDate
									? new Date(budgetStatsInternal.startDate)
									: undefined
					}
				/>
			)}
		</>
	);
}

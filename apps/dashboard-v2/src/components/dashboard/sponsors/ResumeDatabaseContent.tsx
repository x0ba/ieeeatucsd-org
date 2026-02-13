import { useState, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Search, FileText, Users, GraduationCap, Briefcase, Filter, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
	normalizeMajorName,
	getUniqueNormalizedMajors,
	getMajorNormalizationMap,
} from "@/lib/majorNormalization";
import type { UserWithResume } from "./types";

export default function ResumeDatabaseContent() {
	const { logtoId } = useAuth();
	const [users, setUsers] = useState<UserWithResume[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedMajors, setSelectedMajors] = useState<Set<string>>(new Set());
	const [selectedYears, setSelectedYears] = useState<Set<string>>(new Set());
	const [selectedOfficerStatus, setSelectedOfficerStatus] = useState<string>("all");
	const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
	const [showResumeModal, setShowResumeModal] = useState(false);
	const [selectedUserForModal, setSelectedUserForModal] = useState<UserWithResume | null>(null);

	// Pagination state
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);

	// Fetch all users from Convex - requires logtoId for admin access
	const allUsers = useQuery(
		api.users.list,
		logtoId ? { logtoId } : "skip",
	);

	// Convert Convex users to UserWithResume format
	useEffect(() => {
		if (!allUsers) return;

		setLoading(true);
		setError(null);

		// Filter users to include only those with resumes
		const usersWithResumes: UserWithResume[] = allUsers
			.filter((u) => u.resume)
			.map((u) => ({
				...u,
				id: u._id,
			}));

		setUsers(usersWithResumes);
		setLoading(false);
	}, [allUsers]);

	// Memoize major normalization map for efficient lookups
	const majorNormalizationMap = useMemo(() => {
		const allMajors = users.map((u) => u.major).filter((m): m is string => !!m);
		return getMajorNormalizationMap(allMajors, 0.8);
	}, [users]);

	// Get normalized major for a user
	const getNormalizedMajor = (major: string | undefined): string => {
		if (!major) return "";
		const normalized = normalizeMajorName(major);
		return majorNormalizationMap.get(normalized) || normalized;
	};

	// Filter users based on search and filters
	const filteredUsers = useMemo(() => {
		let filtered = [...users];

		// Search filter - search against normalized major names
		if (searchTerm) {
			filtered = filtered.filter((u) => {
				const normalizedMajor = getNormalizedMajor(u.major);
				return (
					u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
					u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
					normalizedMajor.toLowerCase().includes(searchTerm.toLowerCase())
				);
			});
		}

		// Major filter - compare normalized major names (multi-select)
		if (selectedMajors.size > 0) {
			filtered = filtered.filter((u) => {
				const normalizedMajor = getNormalizedMajor(u.major);
				return selectedMajors.has(normalizedMajor);
			});
		}

		// Graduation year filter (multi-select)
		if (selectedYears.size > 0) {
			filtered = filtered.filter((u) => {
				return u.graduationYear && selectedYears.has(u.graduationYear.toString());
			});
		}

		// Officer status filter
		if (selectedOfficerStatus === "officers") {
			filtered = filtered.filter(
				(u) => u.role !== "Member" && u.role !== "Sponsor",
			);
		} else if (selectedOfficerStatus === "members") {
			filtered = filtered.filter((u) => u.role === "Member");
		}

		return filtered;
	}, [searchTerm, selectedMajors, selectedYears, selectedOfficerStatus, users, majorNormalizationMap]);

	// Get unique normalized majors for filter dropdown
	const uniqueMajors = useMemo(() => {
		return getUniqueNormalizedMajors(users.map((u) => u.major), 0.8);
	}, [users]);

	// Get unique graduation years for filter dropdown
	const uniqueYears = useMemo(() => {
		const years = users
			.map((u) => u.graduationYear)
			.filter((year): year is number => !!year)
			.sort((a, b) => b - a); // Sort descending (most recent first)
		// Remove duplicates by converting to Set and back to array
		return Array.from(new Set(years));
	}, [users]);

	// Pagination calculations
	const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

	// Reset to first page when filters change
	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, selectedMajors, selectedYears, selectedOfficerStatus]);

	// Pagination handlers
	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	const handleItemsPerPageChange = (value: string) => {
		setItemsPerPage(Number(value));
		setCurrentPage(1);
	};

	// Selection handlers
	const handleSelectAll = (isSelected: boolean) => {
		if (isSelected) {
			// Select all on current page
			const newSelected = new Set(selectedUsers);
			paginatedUsers.forEach((u) => newSelected.add(u.id));
			setSelectedUsers(newSelected);
		} else {
			// Deselect all on current page
			const newSelected = new Set(selectedUsers);
			paginatedUsers.forEach((u) => newSelected.delete(u.id));
			setSelectedUsers(newSelected);
		}
	};

	const handleSelectUser = (userId: string) => {
		const newSelected = new Set(selectedUsers);
		if (newSelected.has(userId)) {
			newSelected.delete(userId);
		} else {
			newSelected.add(userId);
		}
		setSelectedUsers(newSelected);
	};

	const handleRowClick = (user: UserWithResume) => {
		setSelectedUserForModal(user);
		setShowResumeModal(true);
	};

	const handleCloseModal = () => {
		setShowResumeModal(false);
		setSelectedUserForModal(null);
	};

	const generateCSV = (usersToExport: UserWithResume[]): string => {
		const headers = ["Name", "Email", "Major", "Year Graduating", "Firebase Resume Link"];

		const csvData = usersToExport.map((user) => {
			const name = user.name || "";
			const email = user.email || "";
			const major = getNormalizedMajor(user.major) || "";
			const year = user.graduationYear?.toString() || "";
			const resumeLink = user.resume || "";

			// Escape CSV fields by wrapping in quotes if they contain commas, quotes, or newlines
			const escapeField = (field: string): string => {
				if (field.includes(",") || field.includes('"') || field.includes("\n")) {
					return `"${field.replace(/"/g, '""')}"`;
				}
				return field;
			};

			return [
				escapeField(name),
				escapeField(email),
				escapeField(major),
				escapeField(year),
				escapeField(resumeLink),
			].join(",");
		});

		return [headers.join(","), ...csvData].join("\n");
	};

	const downloadCSV = (csvContent: string, filename: string) => {
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute("download", filename);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	const handleDownloadSelected = () => {
		const selectedUsersList = filteredUsers.filter((u) => selectedUsers.has(u.id));

		if (selectedUsersList.length === 0) return;

		if (selectedUsersList.length === 1) {
			// Download single PDF
			const user = selectedUsersList[0];
			if (user.resume) {
				const link = document.createElement("a");
				link.href = user.resume;
				link.download = `${user.name.replace(/\s+/g, "_")}_Resume.pdf`;
				link.target = "_blank";
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
			}
		} else {
			// Download CSV for 2+ users
			try {
				const csvContent = generateCSV(selectedUsersList);
				const filename = `Resume_Database_${selectedUsersList.length}_users.csv`;
				downloadCSV(csvContent, filename);
			} catch (err) {
				console.error("Failed to generate CSV:", err);
			}
		}
	};

	const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
		switch (role) {
			case "Member":
				return "secondary";
			case "General Officer":
				return "default";
			case "Executive Officer":
				return "outline";
			case "Administrator":
				return "destructive";
			default:
				return "secondary";
		}
	};

	return (
		<div className="flex-1 overflow-auto">
			<div className="p-6 space-y-6">
				{/* Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="bg-white rounded-2xl shadow p-6">
						<div className="flex items-center">
							<div className="p-3 bg-blue-100 rounded-xl">
								<FileText className="w-6 h-6 text-blue-600" />
							</div>
							<div className="ml-4">
								<p className="text-sm text-gray-600">Total Resumes</p>
								<p className="text-2xl font-bold text-gray-900">{users.length}</p>
							</div>
						</div>
					</div>
					<div className="bg-white rounded-2xl shadow p-6">
						<div className="flex items-center">
							<div className="p-3 bg-green-100 rounded-lg">
								<GraduationCap className="w-6 h-6 text-green-600" />
							</div>
							<div className="ml-4">
								<p className="text-sm text-gray-600">Unique Majors</p>
								<p className="text-2xl font-bold text-gray-900">{uniqueMajors.length}</p>
							</div>
						</div>
					</div>
					<div className="bg-white rounded-2xl shadow p-6">
						<div className="flex items-center">
							<div className="p-3 bg-purple-100 rounded-lg">
								<Briefcase className="w-6 h-6 text-purple-600" />
							</div>
							<div className="ml-4">
								<p className="text-sm text-gray-600">Officers</p>
								<p className="text-2xl font-bold text-gray-900">
									{users.filter((u) => u.role !== "Member" && u.role !== "Sponsor").length}
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Search and Filters */}
				<div className="bg-white rounded-2xl shadow p-6">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						{/* Search */}
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
							<Input
								type="text"
								placeholder="Search by name, email, or major..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full h-12 pl-10"
							/>
						</div>

						{/* Major Filter */}
						<Select
							value={Array.from(selectedMajors)[0] || ""}
							onValueChange={(value) => {
								if (value === "") {
									setSelectedMajors(new Set());
								} else {
									setSelectedMajors(new Set([value]));
								}
							}}
						>
							<SelectTrigger className="h-12">
								<div className="flex items-center gap-2 flex-1">
									<Filter className="w-4 h-4 text-gray-400" />
									<SelectValue placeholder="Select majors..." />
								</div>
							</SelectTrigger>
							<SelectContent>
								{uniqueMajors.map((major) => (
									<SelectItem key={major} value={major}>
										{major}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						{/* Graduation Year Filter */}
						<Select
							value={Array.from(selectedYears)[0] || ""}
							onValueChange={(value) => {
								if (value === "") {
									setSelectedYears(new Set());
								} else {
									setSelectedYears(new Set([value]));
								}
							}}
						>
							<SelectTrigger className="h-12">
								<div className="flex items-center gap-2 flex-1">
									<GraduationCap className="w-4 h-4 text-gray-400" />
									<SelectValue placeholder="Select years..." />
								</div>
							</SelectTrigger>
							<SelectContent>
								{uniqueYears.map((year) => (
									<SelectItem key={year.toString()} value={year.toString()}>
										Class of {year}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						{/* Officer Status Filter */}
						<Select
							value={selectedOfficerStatus}
							onValueChange={setSelectedOfficerStatus}
						>
							<SelectTrigger className="h-12">
								<div className="flex items-center gap-2 flex-1">
									<Users className="w-4 h-4 text-gray-400" />
									<SelectValue placeholder="Select member type..." />
								</div>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Members</SelectItem>
								<SelectItem value="officers">Officers Only</SelectItem>
								<SelectItem value="members">General Members</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				{/* Results */}
				{loading ? (
					<div className="bg-white rounded-2xl shadow p-12 text-center">
						<div className="flex flex-col items-center justify-center space-y-4">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
							<p className="text-gray-600">Loading resumes...</p>
						</div>
					</div>
				) : error ? (
					<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
						<p className="text-red-800 font-semibold">Error</p>
						<p className="text-red-600">{error}</p>
					</div>
				) : filteredUsers.length === 0 ? (
					<div className="bg-white rounded-2xl shadow p-12 text-center">
						<FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
						<h3 className="text-lg font-semibold text-gray-900 mb-2">No Resumes Found</h3>
						<p className="text-gray-600">
							{searchTerm || selectedMajors.size > 0 || selectedYears.size > 0 || selectedOfficerStatus !== "all"
								? "Try adjusting your filters"
								: "No members have opted in to share their resumes yet"}
						</p>
					</div>
				) : (
					<>
						{/* Selection Actions */}
						{selectedUsers.size > 0 && (
							<div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
								<div className="flex items-center justify-between">
									<p className="text-sm text-blue-700">
										<strong>{selectedUsers.size}</strong> user{selectedUsers.size !== 1 ? "s" : ""} selected
									</p>
									<div className="flex items-center gap-3">
										<Button
											onClick={handleDownloadSelected}
											size="sm"
											className="gap-2"
										>
											<Download className="w-4 h-4" />
											Download {selectedUsers.size === 1 ? "Resume" : "as CSV"}
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setSelectedUsers(new Set())}
										>
											Clear Selection
										</Button>
									</div>
								</div>
							</div>
						)}

						<div className="bg-white rounded-2xl shadow overflow-hidden">
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow className="bg-gray-50 hover:bg-gray-50">
											<TableHead className="px-6 py-3">
												<Checkbox
													checked={paginatedUsers.length > 0 && paginatedUsers.every((u) => selectedUsers.has(u.id))}
													onCheckedChange={handleSelectAll}
													aria-label="Select all users"
												/>
											</TableHead>
											<TableHead className="px-6 py-3">Name</TableHead>
											<TableHead className="px-6 py-3">Email</TableHead>
											<TableHead className="px-6 py-3">Major</TableHead>
											<TableHead className="px-6 py-3">Graduation Year</TableHead>
											<TableHead className="px-6 py-3">Role</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{paginatedUsers.map((user) => (
											<TableRow
												key={user.id}
												className="hover:bg-gray-50 cursor-pointer transition-colors"
											>
												<TableCell
													className="px-6 py-4 whitespace-nowrap cursor-pointer"
													onClick={(e) => {
														e.stopPropagation();
														handleSelectUser(user.id);
													}}
												>
													<div className="flex items-center justify-center">
														<Checkbox
															checked={selectedUsers.has(user.id)}
															onCheckedChange={() => handleSelectUser(user.id)}
															aria-label={`Select ${user.name}`}
														/>
													</div>
												</TableCell>
												<TableCell
													className="px-6 py-4 whitespace-nowrap"
													onClick={() => handleRowClick(user)}
												>
													<div className="text-sm font-medium text-gray-900">{user.name}</div>
												</TableCell>
												<TableCell
													className="px-6 py-4 whitespace-nowrap"
													onClick={() => handleRowClick(user)}
												>
													<div className="text-sm text-gray-600">{user.email}</div>
												</TableCell>
												<TableCell
													className="px-6 py-4 whitespace-nowrap"
													onClick={() => handleRowClick(user)}
												>
													<div
														className="text-sm text-gray-900 max-w-[200px] truncate"
														title={getNormalizedMajor(user.major) || "N/A"}
													>
														{getNormalizedMajor(user.major) || "N/A"}
													</div>
												</TableCell>
												<TableCell
													className="px-6 py-4 whitespace-nowrap"
													onClick={() => handleRowClick(user)}
												>
													<div className="text-sm text-gray-900">{user.graduationYear || "N/A"}</div>
												</TableCell>
												<TableCell
													className="px-6 py-4 whitespace-nowrap"
													onClick={() => handleRowClick(user)}
												>
													<Badge variant={getRoleBadgeVariant(user.role)}>
														{user.position || user.role}
													</Badge>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>

							{/* Pagination Controls */}
							{totalPages > 1 && (
								<div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
									<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
										{/* Results info and items per page selector */}
										<div className="flex flex-col sm:flex-row items-center gap-4">
											<p className="text-sm text-gray-700">
												Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
												<span className="font-medium">{Math.min(endIndex, filteredUsers.length)}</span> of{" "}
												<span className="font-medium">{filteredUsers.length}</span> results
											</p>

											{/* Items per page selector */}
											<div className="flex items-center gap-2">
												<label className="text-sm text-gray-700">
													Per page:
												</label>
												<Select
													value={itemsPerPage.toString()}
													onValueChange={handleItemsPerPageChange}
												>
													<SelectTrigger className="w-20 h-8">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="10">10</SelectItem>
														<SelectItem value="25">25</SelectItem>
														<SelectItem value="50">50</SelectItem>
														<SelectItem value="100">100</SelectItem>
													</SelectContent>
												</Select>
											</div>
										</div>

										{/* Pagination */}
										<div className="flex items-center gap-2">
											<Button
												variant="outline"
												size="sm"
												onClick={() => handlePageChange(currentPage - 1)}
												disabled={currentPage === 1}
											>
												Previous
											</Button>
											<span className="text-sm text-gray-700">
												Page {currentPage} of {totalPages}
											</span>
											<Button
												variant="outline"
												size="sm"
												onClick={() => handlePageChange(currentPage + 1)}
												disabled={currentPage === totalPages}
											>
												Next
											</Button>
										</div>
									</div>
								</div>
							)}
						</div>
					</>
				)}

				{/* Resume Modal */}
				<Dialog open={showResumeModal} onOpenChange={(open) => !open && handleCloseModal()}>
					<DialogContent className="max-w-6xl max-h-[90vh]">
						{selectedUserForModal && (
							<>
								{/* Modal Header */}
								<DialogHeader>
									<DialogTitle className="text-2xl font-bold text-gray-900">
										{selectedUserForModal.name}
									</DialogTitle>
									<DialogDescription className="sr-only">
										View {selectedUserForModal.name}'s resume and download it
									</DialogDescription>
									<p className="text-sm text-gray-600">
										{selectedUserForModal.email} • {getNormalizedMajor(selectedUserForModal.major) || "N/A"} • Class of{" "}
										{selectedUserForModal.graduationYear || "N/A"}
									</p>
								</DialogHeader>

								{/* Modal Body - Resume Viewer */}
								<div className="py-6">
									{selectedUserForModal.resume ? (
										<iframe
											src={selectedUserForModal.resume}
											className="w-full h-[600px] border border-gray-300 rounded-xl"
											title={`${selectedUserForModal.name}'s Resume`}
										/>
									) : (
										<div className="flex items-center justify-center h-64">
											<div className="text-center">
												<FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
												<p className="text-gray-600">No resume available</p>
											</div>
										</div>
									)}
								</div>

								{/* Modal Footer */}
								<DialogFooter>
									<div className="flex items-center justify-between w-full">
										<div className="flex items-center gap-2">
											<Badge variant={getRoleBadgeVariant(selectedUserForModal.role)}>
												{selectedUserForModal.position || selectedUserForModal.role}
											</Badge>
										</div>
										<div className="flex items-center gap-3">
											{selectedUserForModal.resume && (
												<Button asChild>
													<a
														href={selectedUserForModal.resume}
														target="_blank"
														rel="noopener noreferrer"
													>
														Open in New Tab
													</a>
												</Button>
											)}
											<Button variant="outline" onClick={handleCloseModal}>
												Close
											</Button>
										</div>
									</div>
								</DialogFooter>
							</>
						)}
					</DialogContent>
				</Dialog>
			</div>
		</div>
	);
}

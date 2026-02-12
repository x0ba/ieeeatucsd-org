import { createFileRoute } from "@tanstack/react-router";
import { usePermissions } from "@/hooks/usePermissions";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ResumeDatabaseContent from "@/components/dashboard/sponsors/ResumeDatabaseContent";

export const Route = createFileRoute("/_dashboard/sponsors/resume-database")({
	component: ResumeDatabasePage,
});

function ResumeDatabasePage() {
	const { isSponsor, canAccessResumeDatabase, isAdmin, user } = usePermissions();

	if (!isSponsor && !isAdmin) {
		return (
			<div className="flex-1 overflow-auto p-6">
				<Alert variant="destructive">
					<AlertCircle className="h-8 w-8" />
					<AlertTitle>Access Restricted</AlertTitle>
					<AlertDescription>
						Only Sponsors and Administrators can access the resume database.
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	if (!canAccessResumeDatabase) {
		return (
			<div className="flex-1 overflow-auto p-6">
				<Alert variant="destructive">
					<AlertCircle className="h-8 w-8" />
					<AlertTitle>Access Restricted</AlertTitle>
					<AlertDescription>
						{user?.sponsorTier === "Bronze"
							? "Bronze tier sponsors do not have access to the resume database. Please upgrade to Silver tier or above."
							: "Only Silver tier (or above) Sponsors and Administrators can access the resume database."}
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	return <ResumeDatabaseContent />;
}

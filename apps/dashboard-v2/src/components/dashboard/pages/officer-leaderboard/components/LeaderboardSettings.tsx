import React, { useState, useEffect } from "react";
import { Calendar, Settings, Save, AlertCircle } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useCurrentUser } from "../../../../hooks/useConvexAuth";
import {
  Card,
  CardBody,
  CardHeader,
  Input,
  Button,
  Chip,
  Divider,
} from "@heroui/react";
import type { LeaderboardSettings } from "../types/OfficerLeaderboardTypes";

export default function LeaderboardSettings() {
  const currentUser = useCurrentUser();
  const [settings, setSettings] = useState<LeaderboardSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Fetch leaderboard settings from Convex
  const leaderboardSettings = useQuery(api.leaderboard.getSettings);
  
  // Mutation to update settings
  const updateSettings = useMutation(api.leaderboard.updateSettings);

  const currentUserRole = currentUser?.role || "";

  useEffect(() => {
    if (leaderboardSettings && leaderboardSettings.startDate) {
      setSettings(leaderboardSettings);
      
      // Convert timestamp to date string (YYYY-MM-DD)
      const date = new Date(leaderboardSettings.startDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      setStartDate(`${year}-${month}-${day}`);
    }
  }, [leaderboardSettings]);

  const handleSaveSettings = async () => {
    if (!currentUser || !settings) return;

    if (!startDate) {
      setError("Please select a start date");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // Parse date as local date (YYYY-MM-DD) to avoid timezone shifts
      const [year, month, day] = startDate.split('-').map(Number);
      const localDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      
      await updateSettings({
        startDate: localDate.getTime(),
      });

      setSuccess("Settings updated successfully");

      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Don't render if not an executive
  if (
    !currentUser ||
    (currentUserRole !== "Executive Officer" &&
      currentUserRole !== "Administrator")
  ) {
    return null;
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardBody className="p-6" role="status" aria-live="polite" aria-busy="true">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-10 bg-gray-200 rounded w-full mb-4"></div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex gap-3 items-center">
        <div className="flex-shrink-0">
          <Settings className="w-5 h-5 text-gray-600" />
        </div>
        <div className="flex flex-col">
          <h3 className="text-lg font-semibold">Leaderboard Settings</h3>
          <p className="text-sm text-gray-600">
            Configure officer leaderboard tracking parameters
          </p>
        </div>
      </CardHeader>

      <Divider />

      <CardBody className="space-y-4">
        {error && (
          <Chip
            color="danger"
            variant="flat"
            startContent={<AlertCircle className="w-4 h-4" />}
            className="w-full justify-start"
          >
            {error}
          </Chip>
        )}

        {success && (
          <Chip color="success" variant="flat" className="w-full justify-start">
            {success}
          </Chip>
        )}

        <div className="space-y-2">
          <label htmlFor="leaderboard-start-date" className="text-sm font-medium text-gray-700">
            Leaderboard Start Date
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Only event attendances after this date will count toward team
            points. Team size calculation only includes officers who joined on
            or before this date.
          </p>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            startContent={<Calendar className="w-4 h-4 text-gray-400" />}
            placeholder="Select start date"
            variant="bordered"
            className="w-full"
            aria-label="Leaderboard start date"
            id="leaderboard-start-date"
          />
        </div>

        {settings && settings.startDate && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Current Settings
            </label>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm">
                <span className="font-medium">Start Date: </span>
                {(() => {
                  const date = new Date(settings.startDate);
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  return `${month}/${day}/${year}`;
                })()}
              </div>
              {settings.lastUpdated && (
                <div className="text-xs text-gray-500 mt-1">
                  Last updated: {new Date(settings.lastUpdated).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pt-4">
          <Button
            color="primary"
            variant="solid"
            onPress={handleSaveSettings}
            isLoading={saving}
            aria-label={saving ? "Saving settings" : "Save settings"}
            aria-busy={saving}
            startContent={!saving && <Save className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

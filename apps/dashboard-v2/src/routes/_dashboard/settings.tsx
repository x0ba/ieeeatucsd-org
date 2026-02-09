import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user, isLoading, logtoId } = useAuth();
  const updateProfile = useMutation(api.users.updateProfile);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    major: "",
    graduationYear: "",
    memberId: "",
    zelleInformation: "",
    pid: "",
  });

  const [initialized, setInitialized] = useState(false);
  if (user && !initialized) {
    setForm({
      name: user.name || "",
      major: user.major || "",
      graduationYear: user.graduationYear?.toString() || "",
      memberId: user.memberId || "",
      zelleInformation: user.zelleInformation || "",
      pid: user.pid || "",
    });
    setInitialized(true);
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        logtoId: logtoId!,
        name: form.name || undefined,
        major: form.major || undefined,
        graduationYear: form.graduationYear
          ? parseInt(form.graduationYear)
          : undefined,
        memberId: form.memberId || undefined,
        zelleInformation: form.zelleInformation || undefined,
        pid: form.pid || undefined,
      });
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile and preferences.
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Profile Information</h2>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Name
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Student PID
              </label>
              <Input
                value={form.pid}
                onChange={(e) => setForm({ ...form, pid: e.target.value })}
                placeholder="A12345678"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Major
              </label>
              <Input
                value={form.major}
                onChange={(e) => setForm({ ...form, major: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Expected Graduation Year
              </label>
              <Input
                type="number"
                value={form.graduationYear}
                onChange={(e) =>
                  setForm({ ...form, graduationYear: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                IEEE Member ID
              </label>
              <Input
                value={form.memberId}
                onChange={(e) =>
                  setForm({ ...form, memberId: e.target.value })
                }
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Zelle Information
              </label>
              <Input
                value={form.zelleInformation}
                onChange={(e) =>
                  setForm({ ...form, zelleInformation: e.target.value })
                }
                placeholder="Phone or email for reimbursements"
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-2">Account Information</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <span>{user?.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="capitalize">{user?.status}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

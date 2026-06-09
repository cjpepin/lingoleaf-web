import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { FeatureRequestWithMeta, FeatureStatus } from "@/lib/forum-types";
import { updateFeatureAdmin } from "@/lib/forum-api";

interface AdminControlsProps {
  feature: FeatureRequestWithMeta;
  onSaved: (next: FeatureRequestWithMeta) => void;
}

const statusValues: FeatureStatus[] = ["pending_review", "open", "planned", "in_progress", "done", "declined"];

const labelFromStatus = (status: FeatureStatus) => {
  if (status === "pending_review") {
    return "Pending Review";
  }

  if (status === "in_progress") {
    return "In Progress";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
};

const AdminControls = ({ feature, onSaved }: AdminControlsProps) => {
  const [status, setStatus] = useState<FeatureStatus>(feature.status);
  const [pinned, setPinned] = useState(feature.pinned);
  const [locked, setLocked] = useState(feature.locked);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const updated = await updateFeatureAdmin({
        id: feature.id,
        status,
        pinned,
        locked,
      });

      onSaved({ ...updated, has_voted: feature.has_voted });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update admin settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Admin Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as FeatureStatus)}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statusValues.map((value) => (
                <SelectItem key={value} value={value}>
                  {labelFromStatus(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between rounded-md border p-3">
          <Label htmlFor="pin-toggle">Pin post</Label>
          <Switch id="pin-toggle" checked={pinned} onCheckedChange={setPinned} />
        </div>

        <div className="flex items-center justify-between rounded-md border p-3">
          <Label htmlFor="lock-toggle">Lock comments</Label>
          <Switch id="lock-toggle" checked={locked} onCheckedChange={setLocked} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save admin changes"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminControls;

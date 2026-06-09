import { Badge } from "@/components/ui/badge";
import type { FeatureStatus } from "@/lib/forum-types";

const statusLabelMap: Record<FeatureStatus, string> = {
  pending_review: "Pending Review",
  open: "Open",
  planned: "Planned",
  in_progress: "In Progress",
  done: "Done",
  declined: "Declined",
};

const statusClassMap: Record<FeatureStatus, string> = {
  pending_review: "bg-muted text-muted-foreground border-border",
  open: "bg-secondary text-secondary-foreground",
  planned: "bg-info/20 text-info border-info/40",
  in_progress: "bg-warning/20 text-foreground border-warning/40",
  done: "bg-success/20 text-success border-success/40",
  declined: "bg-destructive/10 text-destructive border-destructive/40",
};

interface StatusBadgeProps {
  status: FeatureStatus;
}

const StatusBadge = ({ status }: StatusBadgeProps) => (
  <Badge variant="outline" className={statusClassMap[status]}>
    {statusLabelMap[status]}
  </Badge>
);

export default StatusBadge;

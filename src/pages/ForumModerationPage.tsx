import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import AuthControls from "@/components/auth/AuthControls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getIsForumAdmin, listForumReports, updateForumReport } from "@/lib/forum-api";
import type { ForumReportStatus } from "@/lib/forum-types";

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const ForumModerationPage = () => {
  const { user, supabaseConfigured } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ForumReportStatus | "all">("open");
  const [resolutionByReportId, setResolutionByReportId] = useState<Record<string, string>>({});

  const adminQuery = useQuery({
    queryKey: ["forum-admin", user?.id],
    queryFn: () => getIsForumAdmin(user?.id),
    enabled: Boolean(user?.id) && supabaseConfigured,
  });

  const reportsQuery = useQuery({
    queryKey: ["forum-reports", statusFilter],
    queryFn: () => listForumReports(statusFilter),
    enabled: adminQuery.data === true && supabaseConfigured,
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: ForumReportStatus }) => {
      return updateForumReport({
        reportId,
        status,
        resolutionNote: resolutionByReportId[reportId],
        resolvedBy: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-reports"] });
      toast({ title: "Report updated" });
    },
    onError: (error) => {
      toast({
        title: "Failed to update report",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!supabaseConfigured) {
    return <div className="mx-auto max-w-4xl px-6 py-10 text-destructive">Supabase not configured.</div>;
  }

  if (!user) {
    return <div className="mx-auto max-w-4xl px-6 py-10 text-muted-foreground">Log in as admin to moderate reports.</div>;
  }

  if (adminQuery.isLoading) {
    return <div className="mx-auto max-w-4xl px-6 py-10 text-muted-foreground">Checking admin access...</div>;
  }

  if (adminQuery.error) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10 text-destructive">
        {adminQuery.error instanceof Error ? adminQuery.error.message : "Could not verify admin access."}
      </div>
    );
  }

  if (!adminQuery.data) {
    return <div className="mx-auto max-w-4xl px-6 py-10 text-destructive">You are not authorized for moderation.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <Link to="/features" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to forum
            </Link>
          </div>
          <AuthControls />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-6 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold">Moderation Queue</h1>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ForumReportStatus | "all")}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="reviewing">Reviewing</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {reportsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading reports...</p> : null}
        {reportsQuery.error ? (
          <p className="text-sm text-destructive">
            {reportsQuery.error instanceof Error ? reportsQuery.error.message : "Could not load reports."}
          </p>
        ) : null}
        {reportsQuery.data?.length === 0 ? <p className="text-sm text-muted-foreground">No reports found.</p> : null}

        <div className="space-y-3">
          {reportsQuery.data?.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <CardTitle className="text-lg">{report.reason}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{report.target_type}</Badge>
                  <Badge variant="secondary">{report.status}</Badge>
                  <span>{formatDateTime(report.created_at)}</span>
                  <span>Reporter: {report.created_by}</span>
                </div>

                <p className="whitespace-pre-wrap text-sm">{report.details || "No details provided."}</p>

                <div className="space-y-2">
                  <Input
                    placeholder="Optional resolution note"
                    value={resolutionByReportId[report.id] ?? ""}
                    onChange={(event) =>
                      setResolutionByReportId((current) => ({
                        ...current,
                        [report.id]: event.target.value,
                      }))
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateReportMutation.mutate({ reportId: report.id, status: "reviewing" })}
                    >
                      Mark reviewing
                    </Button>
                    <Button size="sm" onClick={() => updateReportMutation.mutate({ reportId: report.id, status: "resolved" })}>
                      Resolve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateReportMutation.mutate({ reportId: report.id, status: "dismissed" })}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ForumModerationPage;

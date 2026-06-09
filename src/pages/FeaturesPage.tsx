import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Pin } from "lucide-react";
import AuthRequiredDialog from "@/components/auth/AuthRequiredDialog";
import SiteTopNav from "@/components/SiteTopNav";
import TurnstileChallengeDialog from "@/components/auth/TurnstileChallengeDialog";
import StatusBadge from "@/components/features/StatusBadge";
import VoteButton from "@/components/features/VoteButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { hasRecentHumanVerification } from "@/lib/human-verification";
import { createFeatureRequest, listFeatureRequests, toggleFeatureVote } from "@/lib/forum-api";
import type { FeatureRequestWithMeta, FeatureSort, FeatureStatus } from "@/lib/forum-types";

const statusFilters: Array<{ label: string; value: FeatureStatus | "all" }> = [
  { label: "All Statuses", value: "all" },
  { label: "Pending Review", value: "pending_review" },
  { label: "Open", value: "open" },
  { label: "Planned", value: "planned" },
  { label: "In Progress", value: "in_progress" },
  { label: "Done", value: "done" },
  { label: "Declined", value: "declined" },
];

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));

const FeaturesPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, supabaseConfigured } = useAuth();

  const [view, setView] = useState<"all" | "mine">("all");
  const [sort, setSort] = useState<FeatureSort>("top");
  const [status, setStatus] = useState<FeatureStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [authRequiredOpen, setAuthRequiredOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [turnstileOpen, setTurnstileOpen] = useState(false);
  const [pendingCreateAfterVerification, setPendingCreateAfterVerification] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const mine = view === "mine";

  const featuresQuery = useQuery({
    queryKey: ["features", { sort, status, mine, userId: user?.id }],
    queryFn: () =>
      listFeatureRequests({
        sort,
        status,
        mine,
        userId: user?.id,
      }),
    enabled: supabaseConfigured && (!mine || Boolean(user?.id)),
  });
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("You must be signed in to create a feature request.");
      }

      return createFeatureRequest({
        userId: user.id,
        title,
        body,
        tags: tagsInput.split(","),
      });
    },
    onSuccess: () => {
      setDialogOpen(false);
      setTitle("");
      setBody("");
      setTagsInput("");
      queryClient.invalidateQueries({ queryKey: ["features"] });
      toast({
        title: "Feature request submitted",
        description: "Your request is pending admin review and will appear on the public board once approved.",
      });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Please try again.";
      if (message.toLowerCase().includes("human verification required")) {
        setPendingCreateAfterVerification(true);
        setTurnstileOpen(true);
      }
      toast({
        title: "Could not create request",
        description: message,
        variant: "destructive",
      });
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ featureId, hasVoted }: { featureId: string; hasVoted: boolean }) => {
      if (!user) {
        throw new Error("You must be signed in to vote.");
      }

      await toggleFeatureVote(featureId, user.id, hasVoted);
      return { featureId, hasVoted };
    },
    onMutate: async ({ featureId, hasVoted }) => {
      await queryClient.cancelQueries({ queryKey: ["features"] });

      const snapshots = queryClient.getQueriesData<FeatureRequestWithMeta[]>({ queryKey: ["features"] });

      snapshots.forEach(([key, current]) => {
        if (!current) {
          return;
        }

        queryClient.setQueryData<FeatureRequestWithMeta[]>(
          key,
          current.map((feature) => {
            if (feature.id !== featureId) {
              return feature;
            }

            const delta = hasVoted ? -1 : 1;

            return {
              ...feature,
              has_voted: !hasVoted,
              vote_count: Math.max(0, feature.vote_count + delta),
            };
          }),
        );
      });

      return { snapshots };
    },
    onError: (error, _vars, context) => {
      context?.snapshots?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });

      toast({
        title: "Vote update failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["features"] });
    },
  });

  const canSubmit = Array.from(title.trim()).length >= 3 && Array.from(body.trim()).length >= 10;

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredFeatures = (featuresQuery.data ?? []).filter((feature) => {
    if (!normalizedSearch) {
      return true;
    }

    const titleMatch = feature.title.toLowerCase().includes(normalizedSearch);
    const bodyMatch = feature.body.toLowerCase().includes(normalizedSearch);
    const tagMatch = feature.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch));
    return titleMatch || bodyMatch || tagMatch;
  });

  const emptyStateLabel = useMemo(() => {
    if (mine) {
      return "You have not created any feature requests yet.";
    }

    if (status !== "all") {
      return "No requests match this status yet.";
    }

    if (normalizedSearch) {
      return "No requests match your search.";
    }

    return "No feature requests yet. Be the first to post one.";
  }, [mine, normalizedSearch, status]);

  return (
    <div className="min-h-screen bg-background">
      <SiteTopNav />

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
        {!supabaseConfigured && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">
                Supabase is not configured. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to use the forum.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
          <Tabs value={view} onValueChange={(value) => setView(value as "all" | "mine")}>
            <TabsList>
              <TabsTrigger value="all">All Requests</TabsTrigger>
              <TabsTrigger value="mine" disabled={!user}>
                My Requests
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search requests"
              className="w-full sm:w-56"
            />
            <Select value={sort} onValueChange={(value) => setSort(value as FeatureSort)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="new">New</SelectItem>
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={(value) => setStatus(value as FeatureStatus | "all")}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusFilters.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Feature Forum</h1>
            <p className="text-sm text-muted-foreground">Vote on what we build next.</p>
          </div>
          <Button
            disabled={!supabaseConfigured || authLoading}
            onClick={() => {
              if (!user) {
                setAuthRequiredOpen(true);
                return;
              }
              if (!hasRecentHumanVerification()) {
                setPendingCreateAfterVerification(false);
                setTurnstileOpen(true);
                return;
              }
              setDialogOpen(true);
            }}
          >
            New Request
          </Button>
        </div>

        {mine && !user ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Sign in to view your own requests.
            </CardContent>
          </Card>
        ) : null}

        {featuresQuery.isLoading ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">Loading feature requests...</CardContent>
          </Card>
        ) : null}

        {featuresQuery.error ? (
          <Card>
            <CardContent className="pt-6 text-sm text-destructive">
              {featuresQuery.error instanceof Error ? featuresQuery.error.message : "Failed to load features."}
            </CardContent>
          </Card>
        ) : null}

        {filteredFeatures.length === 0 && !featuresQuery.isLoading && !featuresQuery.error ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">{emptyStateLabel}</CardContent>
          </Card>
        ) : null}

        <div className="space-y-4">
          {filteredFeatures.map((feature) => {
            const isPendingReview = feature.status === "pending_review";

            return (
              <Card key={feature.id}>
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {feature.pinned && (
                      <Badge variant="outline" className="gap-1">
                        <Pin className="h-3 w-3" />
                        Pinned
                      </Badge>
                    )}
                    <StatusBadge status={feature.status} />
                    {feature.locked && <Badge variant="outline">Comments locked</Badge>}
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-xl">
                        <Link to={`/features/${feature.id}`} className="hover:text-primary">
                          {feature.title}
                        </Link>
                      </CardTitle>
                      <CardDescription className="line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed">
                        {feature.body}
                      </CardDescription>
                    </div>

                    <VoteButton
                      voteCount={feature.vote_count}
                      hasVoted={feature.has_voted}
                      disabled={voteMutation.isPending || isPendingReview}
                      loading={voteMutation.isPending}
                      onClick={() => {
                        if (!user) {
                          setAuthRequiredOpen(true);
                          return;
                        }
                        if (isPendingReview) {
                          return;
                        }
                        voteMutation.mutate({ featureId: feature.id, hasVoted: feature.has_voted });
                      }}
                    />
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-3 pt-0 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap gap-2">
                    {feature.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        #{tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{formatDate(feature.created_at)}</span>
                    <Link to={`/features/${feature.id}`} className="inline-flex items-center gap-1 hover:text-foreground">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {feature.comment_count} comments
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      <AuthRequiredDialog open={authRequiredOpen} onOpenChange={setAuthRequiredOpen} />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Feature Request</DialogTitle>
            <DialogDescription>
              Share your idea. New requests are reviewed by admins before appearing on the public board.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="feature-title">Title</Label>
              <Input
                id="feature-title"
                value={title}
                maxLength={140}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Add spaced repetition review mode"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feature-body">Description</Label>
              <Textarea
                id="feature-body"
                value={body}
                rows={6}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Explain the workflow and why this matters..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feature-tags">Tags (optional, comma-separated)</Label>
              <Input
                id="feature-tags"
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder="ios, reading, flashcards"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                if (!hasRecentHumanVerification()) {
                  setPendingCreateAfterVerification(true);
                  setTurnstileOpen(true);
                  return;
                }
                createMutation.mutate();
              }}
              disabled={!canSubmit || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TurnstileChallengeDialog
        open={turnstileOpen}
        onOpenChange={setTurnstileOpen}
        onVerified={() => {
          if (pendingCreateAfterVerification) {
            createMutation.mutate();
            setPendingCreateAfterVerification(false);
            return;
          }
          setDialogOpen(true);
        }}
      />
    </div>
  );
};

export default FeaturesPage;

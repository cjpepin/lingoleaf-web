import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageSquare } from "lucide-react";
import AuthRequiredDialog from "@/components/auth/AuthRequiredDialog";
import SiteTopNav from "@/components/SiteTopNav";
import TurnstileChallengeDialog from "@/components/auth/TurnstileChallengeDialog";
import AdminControls from "@/components/features/AdminControls";
import StatusBadge from "@/components/features/StatusBadge";
import VoteButton from "@/components/features/VoteButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { hasRecentHumanVerification } from "@/lib/human-verification";
import { cn } from "@/lib/utils";
import {
  createFeatureComment,
  createForumReport,
  deleteFeatureComment,
  deleteFeatureRequest,
  getFeatureRequestById,
  getForumUserEmails,
  getIsForumAdmin,
  listFeatureComments,
  toggleFeatureVote,
  updateFeatureComment,
  updateFeatureRequest,
} from "@/lib/forum-api";
import type { FeatureComment, FeatureRequestWithMeta } from "@/lib/forum-types";

const EMPTY_COMMENTS: FeatureComment[] = [];

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const FeatureDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, supabaseConfigured } = useAuth();
  const { toast } = useToast();

  const [newComment, setNewComment] = useState("");
  const [editingRequest, setEditingRequest] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editTags, setEditTags] = useState("");

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [authRequiredOpen, setAuthRequiredOpen] = useState(false);
  const [turnstileOpen, setTurnstileOpen] = useState(false);
  const [pendingCommentAfterVerification, setPendingCommentAfterVerification] = useState(false);
  const [pendingCommentText, setPendingCommentText] = useState("");

  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportTargetType, setReportTargetType] = useState<"feature_request" | "feature_comment">("feature_request");
  const [reportTargetId, setReportTargetId] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");

  const canPostComment = Array.from(newComment.trim()).length >= 2;
  const canSaveEditedComment = Array.from(editingCommentBody.trim()).length >= 2;
  const canSaveRequest = Array.from(editTitle.trim()).length >= 3 && Array.from(editBody.trim()).length >= 10;

  const featureQuery = useQuery({
    queryKey: ["feature", id, user?.id],
    queryFn: () => getFeatureRequestById(id!, user?.id),
    enabled: Boolean(id) && supabaseConfigured,
  });

  const commentsQuery = useQuery({
    queryKey: ["feature-comments", id],
    queryFn: () => listFeatureComments(id!),
    enabled: Boolean(id) && supabaseConfigured,
  });

  const adminQuery = useQuery({
    queryKey: ["forum-admin", user?.id],
    queryFn: () => getIsForumAdmin(user?.id),
    enabled: Boolean(user?.id) && supabaseConfigured,
  });

  const isAdmin = Boolean(adminQuery.data);
  const feature = featureQuery.data;
  const comments = commentsQuery.data ?? EMPTY_COMMENTS;
  const isPendingReview = feature?.status === "pending_review";
  const canInteractWithRequest = !isPendingReview || isAdmin;

  const creatorIds = useMemo(() => {
    const ids = new Set<string>();
    if (feature?.created_by) {
      ids.add(feature.created_by);
    }
    comments.forEach((comment) => {
      if (comment.created_by) {
        ids.add(comment.created_by);
      }
    });
    return [...ids];
  }, [comments, feature?.created_by]);

  const userEmailsQuery = useQuery({
    queryKey: ["forum-user-emails", creatorIds],
    queryFn: () => getForumUserEmails(creatorIds),
    enabled: isAdmin && supabaseConfigured && creatorIds.length > 0,
  });

  const canManageRequest = Boolean(user?.id && feature && (feature.created_by === user.id || isAdmin));
  const showSidebar = (canManageRequest && !editingRequest) || isAdmin;

  const voteMutation = useMutation({
    mutationFn: async ({ featureId, hasVoted }: { featureId: string; hasVoted: boolean }) => {
      if (!user) {
        throw new Error("You must be signed in to vote.");
      }

      await toggleFeatureVote(featureId, user.id, hasVoted);
      return { featureId, hasVoted };
    },
    onMutate: async ({ hasVoted }) => {
      await queryClient.cancelQueries({ queryKey: ["feature", id] });
      const previous = queryClient.getQueryData<FeatureRequestWithMeta>(["feature", id, user?.id]);

      if (previous) {
        const delta = hasVoted ? -1 : 1;
        queryClient.setQueryData<FeatureRequestWithMeta>(["feature", id, user?.id], {
          ...previous,
          has_voted: !hasVoted,
          vote_count: Math.max(0, previous.vote_count + delta),
        });
      }

      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["feature", id, user?.id], context.previous);
      }

      toast({
        title: "Could not update vote",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["feature", id] });
      queryClient.invalidateQueries({ queryKey: ["features"] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (commentText: string) => {
      if (!id || !user) {
        throw new Error("You must be signed in to comment.");
      }

      return createFeatureComment(id, user.id, commentText);
    },
    onMutate: async (commentText: string) => {
      if (!id || !user) {
        return;
      }

      await queryClient.cancelQueries({ queryKey: ["feature-comments", id] });

      const previousComments = queryClient.getQueryData<FeatureComment[]>(["feature-comments", id]) ?? [];

      const optimisticComment: FeatureComment = {
        id: `temp-${Date.now()}`,
        feature_id: id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: user.id,
        body: commentText.trim(),
      };

      queryClient.setQueryData<FeatureComment[]>(["feature-comments", id], [...previousComments, optimisticComment]);
      setNewComment("");
      setPendingCommentText(commentText);

      return { previousComments };
    },
    onError: (error, _vars, context) => {
      if (id && context?.previousComments) {
        queryClient.setQueryData(["feature-comments", id], context.previousComments);
      }

      const message = error instanceof Error ? error.message : "Please try again.";
      if (message.toLowerCase().includes("human verification required")) {
        setNewComment(_vars);
        setPendingCommentAfterVerification(true);
        setTurnstileOpen(true);
      }

      toast({
        title: "Could not add comment",
        description: message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-comments", id] });
      queryClient.invalidateQueries({ queryKey: ["feature", id] });
      queryClient.invalidateQueries({ queryKey: ["features"] });
    },
    onSuccess: () => {
      setPendingCommentText("");
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: async () => {
      if (!user || !feature) {
        throw new Error("Not authorized");
      }

      return updateFeatureRequest({
        id: feature.id,
        userId: user.id,
        title: editTitle,
        body: editBody,
        tags: editTags.split(","),
        isAdmin,
      });
    },
    onSuccess: (updated) => {
      if (!user) {
        return;
      }

      queryClient.setQueryData<FeatureRequestWithMeta>(["feature", id, user.id], {
        ...updated,
        has_voted: feature?.has_voted ?? false,
      });
      queryClient.invalidateQueries({ queryKey: ["features"] });
      setEditingRequest(false);
      toast({ title: "Request updated" });
    },
    onError: (error) => {
      toast({
        title: "Could not update request",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async () => {
      if (!feature) {
        throw new Error("Request not found");
      }

      await deleteFeatureRequest(feature.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features"] });
      navigate("/features");
    },
    onError: (error) => {
      toast({
        title: "Could not delete request",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: async () => {
      if (!user || !editingCommentId) {
        throw new Error("Not authorized");
      }

      return updateFeatureComment(editingCommentId, user.id, editingCommentBody, isAdmin);
    },
    onSuccess: () => {
      setEditingCommentId(null);
      setEditingCommentBody("");
      queryClient.invalidateQueries({ queryKey: ["feature-comments", id] });
      toast({ title: "Comment updated" });
    },
    onError: (error) => {
      toast({
        title: "Could not update comment",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      if (!user) {
        throw new Error("Not authorized");
      }

      await deleteFeatureComment(commentId, user.id, isAdmin);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-comments", id] });
      queryClient.invalidateQueries({ queryKey: ["feature", id] });
      queryClient.invalidateQueries({ queryKey: ["features"] });
      toast({ title: "Comment deleted" });
    },
    onError: (error) => {
      toast({
        title: "Could not delete comment",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const createReportMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("You must be signed in to report content.");
      }

      return createForumReport({
        userId: user.id,
        targetType: reportTargetType,
        targetId: reportTargetId,
        reason: reportReason,
        details: reportDetails,
      });
    },
    onSuccess: () => {
      setReportDialogOpen(false);
      setReportReason("");
      setReportDetails("");
      toast({ title: "Report submitted", description: "Thanks. Our team will review it." });
    },
    onError: (error) => {
      toast({
        title: "Could not submit report",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const startEditRequest = () => {
    if (!feature) {
      return;
    }

    setEditTitle(feature.title);
    setEditBody(feature.body);
    setEditTags(feature.tags.join(", "));
    setEditingRequest(true);
  };

  const openReportDialog = (targetType: "feature_request" | "feature_comment", targetId: string) => {
    if (!user) {
      setAuthRequiredOpen(true);
      return;
    }

    setReportTargetType(targetType);
    setReportTargetId(targetId);
    setReportReason("");
    setReportDetails("");
    setReportDialogOpen(true);
  };

  if (!supabaseConfigured) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <p className="text-destructive">Supabase is not configured. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.</p>
      </div>
    );
  }

  if (featureQuery.isLoading) {
    return <div className="mx-auto w-full max-w-4xl px-6 py-12 text-muted-foreground">Loading request...</div>;
  }

  if (featureQuery.error || !feature) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-12 text-destructive">
        {featureQuery.error instanceof Error ? featureQuery.error.message : "Feature request not found."}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteTopNav />

      <div className="mx-auto w-full max-w-5xl px-6 pt-8">
        <Link to="/features" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to forum
        </Link>
      </div>

      <main
        className={cn(
          "mx-auto w-full px-6 py-6",
          showSidebar ? "grid max-w-5xl gap-6 lg:grid-cols-[1fr_300px]" : "max-w-3xl",
        )}
      >
        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={feature.status} />
                {feature.locked && <Badge variant="outline">Comments locked</Badge>}
                {feature.pinned && <Badge variant="outline">Pinned</Badge>}
              </div>

              {editingRequest ? (
                <div className="space-y-3">
                  <Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
                  <Textarea rows={6} value={editBody} onChange={(event) => setEditBody(event.target.value)} />
                  <Input value={editTags} onChange={(event) => setEditTags(event.target.value)} placeholder="tags, comma-separated" />
                  <div className="flex gap-2">
                    <Button onClick={() => updateRequestMutation.mutate()} disabled={updateRequestMutation.isPending || !canSaveRequest}>
                      {updateRequestMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button variant="outline" onClick={() => setEditingRequest(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <CardTitle className="text-2xl leading-tight">{feature.title}</CardTitle>
                  <CardDescription className="whitespace-pre-wrap text-base leading-relaxed text-foreground/90">{feature.body}</CardDescription>
                  <div className="flex flex-wrap gap-2">
                    {feature.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">#{tag}</Badge>
                    ))}
                  </div>
                </>
              )}
            </CardHeader>

            <CardContent className="flex flex-col gap-4 pt-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{formatDateTime(feature.created_at)}</span>
                {isAdmin ? <span className="truncate max-w-[260px]">by {userEmailsQuery.data?.get(feature.created_by) ?? "unknown user"}</span> : null}
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  {feature.comment_count}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => openReportDialog("feature_request", feature.id)}>
                  Report
                </Button>
                <VoteButton
                  voteCount={feature.vote_count}
                  hasVoted={feature.has_voted}
                  disabled={voteMutation.isPending || !canInteractWithRequest}
                  loading={voteMutation.isPending}
                  onClick={() => {
                    if (!user) {
                      setAuthRequiredOpen(true);
                      return;
                    }
                    if (!canInteractWithRequest) {
                      toast({
                        title: "Pending admin review",
                        description: "Voting opens after this request is approved.",
                      });
                      return;
                    }
                    voteMutation.mutate({ featureId: feature.id, hasVoted: feature.has_voted });
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Comments</CardTitle>
              <CardDescription>
                {isPendingReview && !isAdmin
                  ? "This request is pending admin review. Comments open after approval."
                  : feature.locked
                    ? "Comments are locked for this request."
                    : "Join the discussion."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {canInteractWithRequest && (!feature.locked || isAdmin) ? (
                <div className="space-y-3">
                  <Textarea
                    rows={4}
                    value={newComment}
                    onChange={(event) => setNewComment(event.target.value)}
                    placeholder={user ? "Share details or implementation ideas..." : "Sign in to comment"}
                    disabled={commentMutation.isPending}
                    onFocus={() => {
                      if (!user) {
                        setAuthRequiredOpen(true);
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      if (!user) {
                        setAuthRequiredOpen(true);
                        return;
                      }
                      if (!canInteractWithRequest) {
                        toast({
                          title: "Pending admin review",
                          description: "Comments open after this request is approved.",
                        });
                        return;
                      }
                      if (!hasRecentHumanVerification()) {
                        setPendingCommentText(newComment);
                        setPendingCommentAfterVerification(true);
                        setTurnstileOpen(true);
                        return;
                      }
                      commentMutation.mutate(newComment);
                    }}
                    disabled={commentMutation.isPending || !canInteractWithRequest || (Boolean(user) && !canPostComment)}
                  >
                    {commentMutation.isPending ? "Posting..." : "Post comment"}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isPendingReview && !isAdmin
                    ? "Comments are unavailable until this request is approved."
                    : "Comments are locked by an admin."}
                </p>
              )}

              {commentsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading comments...</p> : null}
              {commentsQuery.error ? (
                <p className="text-sm text-destructive">
                  {commentsQuery.error instanceof Error ? commentsQuery.error.message : "Could not load comments."}
                </p>
              ) : null}

              {comments.map((comment) => {
                const canManageComment = Boolean(user?.id && (user.id === comment.created_by || isAdmin));
                const isEditing = editingCommentId === comment.id;

                return (
                  <div key={comment.id} className="rounded-md border p-4">
                    <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="truncate">
                        {formatDateTime(comment.created_at)}
                        {isAdmin ? ` • by ${userEmailsQuery.data?.get(comment.created_by) ?? "unknown user"}` : ""}
                      </span>
                      <div className="flex gap-2">
                        {!comment.id.startsWith("temp-") && (
                          <button className="text-primary hover:opacity-80" onClick={() => openReportDialog("feature_comment", comment.id)}>
                            Report
                          </button>
                        )}
                        {canManageComment && !comment.id.startsWith("temp-") && (
                          <>
                            <button
                              className="hover:text-foreground"
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingCommentBody(comment.body);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="text-destructive hover:opacity-80"
                              onClick={() => {
                                if (window.confirm("Delete this comment?")) {
                                  deleteCommentMutation.mutate(comment.id);
                                }
                              }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <Textarea rows={3} value={editingCommentBody} onChange={(event) => setEditingCommentBody(event.target.value)} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => updateCommentMutation.mutate()} disabled={!canSaveEditedComment || updateCommentMutation.isPending}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditingCommentBody("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{comment.body}</p>
                    )}
                  </div>
                );
              })}

              {comments.length === 0 ? <p className="text-sm text-muted-foreground">No comments yet.</p> : null}
            </CardContent>
          </Card>
        </div>

        {showSidebar && (
          <div className="space-y-4">
            {canManageRequest && !editingRequest && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Manage Request</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full" onClick={startEditRequest}>
                    Edit content
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={deleteRequestMutation.isPending}
                    onClick={() => {
                      if (window.confirm("Delete this request and all comments?")) {
                        deleteRequestMutation.mutate();
                      }
                    }}
                  >
                    {deleteRequestMutation.isPending ? "Deleting..." : "Delete request"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {isAdmin && (
              <AdminControls
                feature={feature}
                onSaved={(next) => {
                  queryClient.setQueryData(["feature", id, user?.id], next);
                  queryClient.invalidateQueries({ queryKey: ["features"] });
                  toast({ title: "Admin settings updated" });
                }}
              />
            )}
          </div>
        )}
      </main>

      <AuthRequiredDialog open={authRequiredOpen} onOpenChange={setAuthRequiredOpen} />
      <TurnstileChallengeDialog
        open={turnstileOpen}
        onOpenChange={setTurnstileOpen}
        onVerified={() => {
          if (pendingCommentAfterVerification && pendingCommentText.trim()) {
            setPendingCommentAfterVerification(false);
            commentMutation.mutate(pendingCommentText);
          }
        }}
      />

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report content</DialogTitle>
            <DialogDescription>Tell us what is wrong so we can review it quickly.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Spam">Spam</SelectItem>
                  <SelectItem value="Harassment">Harassment</SelectItem>
                  <SelectItem value="Hate or abuse">Hate or abuse</SelectItem>
                  <SelectItem value="NSFW content">NSFW content</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Details (optional)</Label>
              <Textarea rows={4} value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} placeholder="Add context for moderators" />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => createReportMutation.mutate()} disabled={!reportReason.trim() || createReportMutation.isPending}>
              {createReportMutation.isPending ? "Submitting..." : "Submit report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeatureDetailPage;

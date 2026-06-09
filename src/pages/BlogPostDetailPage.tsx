import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import AuthRequiredDialog from "@/components/auth/AuthRequiredDialog";
import SiteTopNav from "@/components/SiteTopNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  createBlogComment,
  deleteBlogComment,
  deleteBlogPost,
  getBlogPostById,
  listBlogComments,
  updateBlogComment,
} from "@/lib/blog-api";
import { getIsForumAdmin } from "@/lib/forum-api";

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const BlogPostDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, supabaseConfigured } = useAuth();
  const { toast } = useToast();

  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [authRequiredOpen, setAuthRequiredOpen] = useState(false);

  const postQuery = useQuery({
    queryKey: ["blog-post", id],
    queryFn: () => getBlogPostById(id!),
    enabled: Boolean(id) && supabaseConfigured,
  });

  const commentsQuery = useQuery({
    queryKey: ["blog-comments", id],
    queryFn: () => listBlogComments(id!),
    enabled: Boolean(id) && supabaseConfigured,
  });

  const adminQuery = useQuery({
    queryKey: ["forum-admin", user?.id],
    queryFn: () => getIsForumAdmin(user?.id),
    enabled: Boolean(user?.id) && supabaseConfigured,
  });

  const isAdmin = Boolean(adminQuery.data);
  const post = postQuery.data;

  const commentMutation = useMutation({
    mutationFn: async () => {
      if (!id || !user) {
        throw new Error("You must be signed in to comment.");
      }

      return createBlogComment(id, user.id, newComment);
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["blog-comments", id] });
      queryClient.invalidateQueries({ queryKey: ["blog-post", id] });
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      toast({ title: "Comment posted" });
    },
    onError: (error) => {
      toast({
        title: "Could not post comment",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: async () => {
      if (!user || !editingCommentId) {
        throw new Error("You are not authorized to edit this comment.");
      }

      await updateBlogComment(editingCommentId, user.id, editingCommentBody, isAdmin);
    },
    onSuccess: () => {
      setEditingCommentId(null);
      setEditingCommentBody("");
      queryClient.invalidateQueries({ queryKey: ["blog-comments", id] });
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
        throw new Error("You are not authorized to delete this comment.");
      }

      await deleteBlogComment(commentId, user.id, isAdmin);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-comments", id] });
      queryClient.invalidateQueries({ queryKey: ["blog-post", id] });
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
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

  const deletePostMutation = useMutation({
    mutationFn: async () => {
      if (!post) {
        throw new Error("Post not found");
      }

      await deleteBlogPost(post.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      navigate("/updates");
    },
    onError: (error) => {
      toast({
        title: "Could not delete post",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const canPostComment = Array.from(newComment.trim()).length >= 2;
  const canSaveComment = Array.from(editingCommentBody.trim()).length >= 2;

  return (
    <div className="min-h-screen bg-background">
      <SiteTopNav />

      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <Link to="/updates" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to App Updates
        </Link>

        {!supabaseConfigured ? (
          <Card>
            <CardHeader>
              <CardTitle>Supabase not configured</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to use App Updates.
            </CardContent>
          </Card>
        ) : null}

        {supabaseConfigured && postQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading post...</p> : null}
        {supabaseConfigured && !postQuery.isLoading && (postQuery.error || !post) ? (
          <Card>
            <CardHeader>
              <CardTitle>App update unavailable</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-destructive">
              {postQuery.error instanceof Error ? postQuery.error.message : "This app update could not be found."}
            </CardContent>
          </Card>
        ) : null}

        {supabaseConfigured && post ? (
          <>
            <Card className="mb-8">
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl">{post.title}</CardTitle>
                    <p className="mt-2 text-sm text-muted-foreground">Published {formatDateTime(post.created_at)}</p>
                  </div>

                  {isAdmin ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (window.confirm("Delete this post and all comments?")) {
                          deletePostMutation.mutate();
                        }
                      }}
                      disabled={deletePostMutation.isPending}
                    >
                      Delete Post
                    </Button>
                  ) : null}
                </div>

                {post.summary ? <p className="text-sm text-muted-foreground">{post.summary}</p> : null}
              </CardHeader>
              <CardContent>
                <article className="whitespace-pre-wrap text-sm leading-relaxed">{post.body}</article>
              </CardContent>
            </Card>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Comments ({commentsQuery.data?.length ?? 0})</h2>

              <Card>
                <CardContent className="pt-6">
                  <Textarea
                    placeholder={user ? "Share your thoughts..." : "Sign in to comment"}
                    value={newComment}
                    onChange={(event) => setNewComment(event.target.value)}
                    rows={4}
                  />
                  <div className="mt-3 flex justify-end">
                    <Button
                      onClick={() => {
                        if (!user) {
                          setAuthRequiredOpen(true);
                          return;
                        }
                        commentMutation.mutate();
                      }}
                      disabled={commentMutation.isPending || (Boolean(user) && !canPostComment)}
                    >
                      {commentMutation.isPending ? "Posting..." : "Post comment"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {commentsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading comments...</p> : null}
              {commentsQuery.error ? (
                <p className="text-sm text-destructive">
                  {commentsQuery.error instanceof Error ? commentsQuery.error.message : "Could not load comments."}
                </p>
              ) : null}

              {(commentsQuery.data ?? []).map((comment) => {
                const canManageComment = Boolean(user?.id && (user.id === comment.created_by || isAdmin));
                const isEditing = editingCommentId === comment.id;

                return (
                  <Card key={comment.id}>
                    <CardContent className="space-y-3 pt-6">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">{formatDateTime(comment.created_at)}</p>
                        {canManageComment ? (
                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <>
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
                                <Button
                                  size="sm"
                                  onClick={() => updateCommentMutation.mutate()}
                                  disabled={updateCommentMutation.isPending || !canSaveComment}
                                >
                                  Save
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingCommentId(comment.id);
                                    setEditingCommentBody(comment.body);
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    if (window.confirm("Delete this comment?")) {
                                      deleteCommentMutation.mutate(comment.id);
                                    }
                                  }}
                                  disabled={deleteCommentMutation.isPending}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        ) : null}
                      </div>

                      {isEditing ? (
                        <Textarea
                          value={editingCommentBody}
                          onChange={(event) => setEditingCommentBody(event.target.value)}
                          rows={4}
                        />
                      ) : (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{comment.body}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {(commentsQuery.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No comments yet.</p> : null}
            </section>
          </>
        ) : null}
      </main>

      <AuthRequiredDialog open={authRequiredOpen} onOpenChange={setAuthRequiredOpen} />
    </div>
  );
};

export default BlogPostDetailPage;

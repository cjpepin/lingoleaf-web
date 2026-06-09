import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import SiteTopNav from "@/components/SiteTopNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { createBlogPost, deleteBlogPost, listBlogPosts, updateBlogPost } from "@/lib/blog-api";
import type { BlogPost } from "@/lib/blog-types";
import { getIsForumAdmin } from "@/lib/forum-api";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));

const BlogPostsPage = () => {
  const queryClient = useQueryClient();
  const { user, supabaseConfigured } = useAuth();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");

  const postsQuery = useQuery({
    queryKey: ["blog-posts"],
    queryFn: listBlogPosts,
    enabled: supabaseConfigured,
  });

  const adminQuery = useQuery({
    queryKey: ["forum-admin", user?.id],
    queryFn: () => getIsForumAdmin(user?.id),
    enabled: Boolean(user?.id) && supabaseConfigured,
  });

  const isAdmin = Boolean(adminQuery.data);

  const resetForm = () => {
    setTitle("");
    setSummary("");
    setBody("");
    setEditingPost(null);
  };

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("You must be signed in to manage posts.");
      }

      if (editingPost) {
        return updateBlogPost({
          id: editingPost.id,
          title,
          summary,
          body,
        });
      }

      return createBlogPost({
        userId: user.id,
        title,
        summary,
        body,
      });
    },
    onSuccess: () => {
      setDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      toast({ title: editingPost ? "Post updated" : "Post published" });
    },
    onError: (error) => {
      toast({
        title: editingPost ? "Could not update post" : "Could not publish post",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      await deleteBlogPost(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      toast({ title: "Post deleted" });
    },
    onError: (error) => {
      toast({
        title: "Could not delete post",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const canSubmit = Array.from(title.trim()).length >= 3 && Array.from(body.trim()).length >= 20;

  return (
    <div className="min-h-screen bg-background">
      <SiteTopNav />

      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">App Updates</h1>
            <p className="text-sm text-muted-foreground">Release notes, product changes, and announcements.</p>
          </div>

          {isAdmin ? (
            <Button
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Post
            </Button>
          ) : null}
        </div>

        {!supabaseConfigured ? (
          <Card>
            <CardHeader>
              <CardTitle>Supabase not configured</CardTitle>
              <CardDescription>Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to use App Updates.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {supabaseConfigured && postsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading posts...</p> : null}
        {supabaseConfigured && postsQuery.error ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-destructive">
              {postsQuery.error instanceof Error ? postsQuery.error.message : "Could not load app updates."}
            </CardContent>
          </Card>
        ) : null}

        {supabaseConfigured && !postsQuery.isLoading && !postsQuery.error ? (
          <div className="space-y-4">
            {(postsQuery.data ?? []).map((post) => (
              <Card key={post.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <Link to={`/updates/${post.id}`} className="space-y-1 hover:opacity-90">
                      <CardTitle>{post.title}</CardTitle>
                      <CardDescription>
                        {formatDate(post.created_at)} • {post.comment_count} comments
                      </CardDescription>
                    </Link>

                    {isAdmin ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingPost(post);
                            setTitle(post.title);
                            setSummary(post.summary);
                            setBody(post.body);
                            setDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (window.confirm("Delete this post and all comments?")) {
                              deleteMutation.mutate(post.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          Delete
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {post.summary ? <p className="text-sm text-muted-foreground">{post.summary}</p> : null}
                  <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed">{post.body}</p>
                  <Button asChild variant="link" className="px-0">
                    <Link to={`/updates/${post.id}`}>Read full post</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}

            {(postsQuery.data ?? []).length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">No app updates yet.</CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}
      </main>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPost ? "Edit App Update" : "New App Update"}</DialogTitle>
            <DialogDescription>Only admin users can publish posts.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="post-title">Title</Label>
              <Input
                id="post-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                placeholder="Version 1.8.0 is live"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="post-summary">Summary (optional)</Label>
              <Input
                id="post-summary"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                maxLength={280}
                placeholder="Short one-line summary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="post-body">Body</Label>
              <Textarea
                id="post-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={8}
                placeholder="Write the update details..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => upsertMutation.mutate()} disabled={!canSubmit || upsertMutation.isPending}>
              {upsertMutation.isPending ? "Saving..." : editingPost ? "Save changes" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlogPostsPage;

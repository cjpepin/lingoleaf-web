import { isDemoMode } from "@/lib/demo/config";
import {
  readLocalBlogComments,
  readLocalBlogPostById,
  readLocalBlogPosts,
} from "@/lib/demo/localBlog";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import type { BlogComment, BlogPost, CreateBlogPostInput, UpdateBlogPostInput } from "@/lib/blog-types";
import { getSupabaseErrorMessage, normalizeTextInput, normalizedCharCount } from "@/lib/content-validation";

const assertSupabaseConfigured = () => {
  if (!supabaseConfigured) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
};

export const listBlogPosts = async () => {
  if (isDemoMode()) {
    return readLocalBlogPosts();
  }

  assertSupabaseConfigured();

  const { data, error } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BlogPost[];
};

export const getBlogPostById = async (id: string) => {
  if (isDemoMode()) {
    const post = await readLocalBlogPostById(id);
    if (!post) {
      throw new Error("App update not found.");
    }
    return post;
  }

  assertSupabaseConfigured();

  const { data, error } = await supabase.from("blog_posts").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(getSupabaseErrorMessage(error, "App update not found."));
  }

  if (!data) {
    throw new Error("App update not found.");
  }

  return data as BlogPost;
};

export const createBlogPost = async ({ userId, title, summary, body }: CreateBlogPostInput) => {
  assertSupabaseConfigured();
  const normalizedTitle = normalizeTextInput(title, "Title");
  const normalizedSummary = normalizeTextInput(summary, "Summary");
  const normalizedBody = normalizeTextInput(body, "Body");

  if (normalizedCharCount(normalizedTitle) < 3) {
    throw new Error("Title must be at least 3 characters.");
  }
  if (Array.from(normalizedSummary).length > 280) {
    throw new Error("Summary must be 280 characters or fewer.");
  }
  if (normalizedCharCount(normalizedBody) < 20) {
    throw new Error("Body must be at least 20 characters.");
  }

  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      created_by: userId,
      title: normalizedTitle,
      summary: normalizedSummary,
      body: normalizedBody,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as BlogPost;
};

export const updateBlogPost = async ({ id, title, summary, body }: UpdateBlogPostInput) => {
  assertSupabaseConfigured();
  const normalizedTitle = normalizeTextInput(title, "Title");
  const normalizedSummary = normalizeTextInput(summary, "Summary");
  const normalizedBody = normalizeTextInput(body, "Body");

  if (normalizedCharCount(normalizedTitle) < 3) {
    throw new Error("Title must be at least 3 characters.");
  }
  if (Array.from(normalizedSummary).length > 280) {
    throw new Error("Summary must be 280 characters or fewer.");
  }
  if (normalizedCharCount(normalizedBody) < 20) {
    throw new Error("Body must be at least 20 characters.");
  }

  const { data, error } = await supabase
    .from("blog_posts")
    .update({
      title: normalizedTitle,
      summary: normalizedSummary,
      body: normalizedBody,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as BlogPost;
};

export const deleteBlogPost = async (id: string) => {
  assertSupabaseConfigured();

  const { error } = await supabase.from("blog_posts").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
};

export const listBlogComments = async (postId: string) => {
  if (isDemoMode()) {
    return readLocalBlogComments(postId);
  }

  assertSupabaseConfigured();

  const { data, error } = await supabase
    .from("blog_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BlogComment[];
};

export const createBlogComment = async (postId: string, userId: string, body: string) => {
  assertSupabaseConfigured();
  const normalizedBody = normalizeTextInput(body, "Comment");
  if (normalizedCharCount(normalizedBody) < 2) {
    throw new Error("Comment must be at least 2 characters.");
  }

  const { data, error } = await supabase
    .from("blog_comments")
    .insert({ post_id: postId, created_by: userId, body: normalizedBody })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as BlogComment;
};

export const updateBlogComment = async (commentId: string, userId: string, body: string, isAdmin: boolean) => {
  assertSupabaseConfigured();
  const normalizedBody = normalizeTextInput(body, "Comment");
  if (normalizedCharCount(normalizedBody) < 2) {
    throw new Error("Comment must be at least 2 characters.");
  }

  let query = supabase.from("blog_comments").update({ body: normalizedBody }).eq("id", commentId);
  if (!isAdmin) {
    query = query.eq("created_by", userId);
  }

  const { data, error } = await query.select("*").single();

  if (error) {
    throw new Error(error.message);
  }

  return data as BlogComment;
};

export const deleteBlogComment = async (commentId: string, userId: string, isAdmin: boolean) => {
  assertSupabaseConfigured();

  let query = supabase.from("blog_comments").delete().eq("id", commentId);
  if (!isAdmin) {
    query = query.eq("created_by", userId);
  }

  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }
};

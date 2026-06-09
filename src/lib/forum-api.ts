import { supabase, supabaseConfigured } from "@/lib/supabase";
import type {
  CreateFeatureRequestInput,
  FeatureComment,
  FeatureRequest,
  FeatureRequestWithMeta,
  ForumReport,
  ForumReportStatus,
  ForumReportTargetType,
  ListFeaturesParams,
  UpdateFeatureAdminInput,
  UpdateFeatureRequestInput,
} from "@/lib/forum-types";
import { assertNoDisallowedControlChars, getSupabaseErrorMessage, normalizeTextInput, normalizedCharCount } from "@/lib/content-validation";

const assertSupabaseConfigured = () => {
  if (!supabaseConfigured) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
};

const normalizeTags = (tags: string[]) => {
  const cleaned = tags
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .map((tag) => {
      assertNoDisallowedControlChars(tag, "Tag");
      return tag;
    });

  return [...new Set(cleaned)].slice(0, 10);
};

export const listFeatureRequests = async ({ sort, status, mine, userId }: ListFeaturesParams) => {
  assertSupabaseConfigured();

  let query = supabase
    .from("feature_requests")
    .select("*")
    .order("pinned", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (mine && userId) {
    query = query.eq("created_by", userId);
  }

  if (sort === "top") {
    query = query.order("vote_count", { ascending: false }).order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as FeatureRequest[];

  if (!userId || rows.length === 0) {
    return rows.map((row) => ({ ...row, has_voted: false })) as FeatureRequestWithMeta[];
  }

  const ids = rows.map((row) => row.id);
  const { data: votes, error: votesError } = await supabase
    .from("feature_votes")
    .select("feature_id")
    .eq("user_id", userId)
    .in("feature_id", ids);

  if (votesError) {
    throw new Error(votesError.message);
  }

  const votedIds = new Set((votes ?? []).map((vote) => vote.feature_id));

  return rows.map((row) => ({
    ...row,
    has_voted: votedIds.has(row.id),
  }));
};

export const getFeatureRequestById = async (id: string, userId?: string) => {
  assertSupabaseConfigured();

  const { data, error } = await supabase.from("feature_requests").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(getSupabaseErrorMessage(error, "Feature request not found."));
  }

  if (!data) {
    throw new Error("Feature request not found.");
  }

  const row = data as FeatureRequest;

  if (!userId) {
    return { ...row, has_voted: false } as FeatureRequestWithMeta;
  }

  const { data: vote, error: voteError } = await supabase
    .from("feature_votes")
    .select("feature_id")
    .eq("feature_id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (voteError) {
    throw new Error(voteError.message);
  }

  return {
    ...row,
    has_voted: Boolean(vote),
  } as FeatureRequestWithMeta;
};

export const createFeatureRequest = async ({ userId, title, body, tags }: CreateFeatureRequestInput) => {
  assertSupabaseConfigured();
  const normalizedTitle = normalizeTextInput(title, "Title");
  const normalizedBody = normalizeTextInput(body, "Description");

  if (normalizedCharCount(normalizedTitle) < 3) {
    throw new Error("Title must be at least 3 characters.");
  }
  if (normalizedCharCount(normalizedBody) < 10) {
    throw new Error("Description must be at least 10 characters.");
  }

  const { data, error } = await supabase
    .from("feature_requests")
    .insert({
      created_by: userId,
      title: normalizedTitle,
      body: normalizedBody,
      tags: normalizeTags(tags),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as FeatureRequest;
};

export const updateFeatureRequest = async ({ id, userId, title, body, tags, isAdmin = false }: UpdateFeatureRequestInput) => {
  assertSupabaseConfigured();
  const normalizedTitle = normalizeTextInput(title, "Title");
  const normalizedBody = normalizeTextInput(body, "Description");

  if (normalizedCharCount(normalizedTitle) < 3) {
    throw new Error("Title must be at least 3 characters.");
  }
  if (normalizedCharCount(normalizedBody) < 10) {
    throw new Error("Description must be at least 10 characters.");
  }

  let query = supabase
    .from("feature_requests")
    .update({
      title: normalizedTitle,
      body: normalizedBody,
      tags: normalizeTags(tags),
    })
    .eq("id", id);

  if (!isAdmin) {
    query = query.eq("created_by", userId);
  }

  const { data, error } = await query.select("*").single();

  if (error) {
    throw new Error(error.message);
  }

  return data as FeatureRequest;
};

export const deleteFeatureRequest = async (id: string) => {
  assertSupabaseConfigured();

  const { error } = await supabase.from("feature_requests").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
};

export const toggleFeatureVote = async (featureId: string, userId: string, hasVoted: boolean) => {
  assertSupabaseConfigured();

  if (hasVoted) {
    const { error } = await supabase
      .from("feature_votes")
      .delete()
      .eq("feature_id", featureId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await supabase
    .from("feature_votes")
    .insert({ feature_id: featureId, user_id: userId });

  if (error) {
    throw new Error(error.message);
  }
};

export const listFeatureComments = async (featureId: string) => {
  assertSupabaseConfigured();

  const { data, error } = await supabase
    .from("feature_comments")
    .select("*")
    .eq("feature_id", featureId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as FeatureComment[];
};

export const createFeatureComment = async (featureId: string, userId: string, body: string) => {
  assertSupabaseConfigured();
  const normalizedBody = normalizeTextInput(body, "Comment");
  if (normalizedCharCount(normalizedBody) < 2) {
    throw new Error("Comment must be at least 2 characters.");
  }

  const { data, error } = await supabase
    .from("feature_comments")
    .insert({ feature_id: featureId, created_by: userId, body: normalizedBody })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as FeatureComment;
};

export const updateFeatureComment = async (commentId: string, userId: string, body: string, isAdmin = false) => {
  assertSupabaseConfigured();
  const normalizedBody = normalizeTextInput(body, "Comment");
  if (normalizedCharCount(normalizedBody) < 2) {
    throw new Error("Comment must be at least 2 characters.");
  }

  let query = supabase.from("feature_comments").update({ body: normalizedBody }).eq("id", commentId);

  if (!isAdmin) {
    query = query.eq("created_by", userId);
  }

  const { data, error } = await query.select("*").single();

  if (error) {
    throw new Error(error.message);
  }

  return data as FeatureComment;
};

export const deleteFeatureComment = async (commentId: string, userId: string, isAdmin: boolean) => {
  assertSupabaseConfigured();

  let query = supabase.from("feature_comments").delete().eq("id", commentId);

  if (!isAdmin) {
    query = query.eq("created_by", userId);
  }

  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }
};

export const getIsForumAdmin = async (userId?: string) => {
  assertSupabaseConfigured();

  if (!userId) {
    return false;
  }

  const { data, error } = await supabase
    .from("forum_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data?.user_id);
};

export const updateFeatureAdmin = async ({ id, status, pinned, locked }: UpdateFeatureAdminInput) => {
  assertSupabaseConfigured();

  const { data, error } = await supabase
    .from("feature_requests")
    .update({ status, pinned, locked })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as FeatureRequest;
};

export const getForumUserEmails = async (userIds: string[]) => {
  assertSupabaseConfigured();

  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase.rpc("get_forum_user_emails", {
    input_user_ids: uniqueIds,
  });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<{ user_id: string; email: string }>;
  return new Map(rows.map((row) => [row.user_id, row.email]));
};

export const createForumReport = async (params: {
  userId: string;
  targetType: ForumReportTargetType;
  targetId: string;
  reason: string;
  details: string;
}) => {
  assertSupabaseConfigured();
  const normalizedReason = normalizeTextInput(params.reason, "Reason");
  const normalizedDetails = normalizeTextInput(params.details, "Details");

  const { data, error } = await supabase
    .from("forum_reports")
    .insert({
      created_by: params.userId,
      target_type: params.targetType,
      target_id: params.targetId,
      reason: normalizedReason,
      details: normalizedDetails,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ForumReport;
};

export const listForumReports = async (status: ForumReportStatus | "all") => {
  assertSupabaseConfigured();

  let query = supabase.from("forum_reports").select("*").order("created_at", { ascending: false });
  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ForumReport[];
};

export const updateForumReport = async (params: {
  reportId: string;
  status: ForumReportStatus;
  resolutionNote?: string;
  resolvedBy?: string;
}) => {
  assertSupabaseConfigured();
  const normalizedResolutionNote = params.resolutionNote
    ? normalizeTextInput(params.resolutionNote, "Resolution note")
    : "";

  const { data, error } = await supabase
    .from("forum_reports")
    .update({
      status: params.status,
      resolution_note: normalizedResolutionNote || null,
      resolved_by: params.resolvedBy ?? null,
      resolved_at: params.status === "resolved" || params.status === "dismissed" ? new Date().toISOString() : null,
    })
    .eq("id", params.reportId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ForumReport;
};

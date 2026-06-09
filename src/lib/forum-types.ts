export type FeatureStatus = "pending_review" | "open" | "planned" | "in_progress" | "done" | "declined";
export type FeatureSort = "top" | "new";

export interface FeatureRequest {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  title: string;
  body: string;
  status: FeatureStatus;
  pinned: boolean;
  locked: boolean;
  tags: string[];
  vote_count: number;
  comment_count: number;
}

export interface FeatureRequestWithMeta extends FeatureRequest {
  has_voted: boolean;
}

export interface FeatureComment {
  id: string;
  feature_id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  body: string;
}

export type ForumReportTargetType = "feature_request" | "feature_comment";
export type ForumReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export interface ForumReport {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  target_type: ForumReportTargetType;
  target_id: string;
  reason: string;
  details: string;
  status: ForumReportStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
}

export interface ListFeaturesParams {
  sort: FeatureSort;
  status: FeatureStatus | "all";
  mine: boolean;
  userId?: string;
}

export interface CreateFeatureRequestInput {
  userId: string;
  title: string;
  body: string;
  tags: string[];
}

export interface UpdateFeatureRequestInput {
  id: string;
  userId: string;
  title: string;
  body: string;
  tags: string[];
  isAdmin?: boolean;
}

export interface UpdateFeatureAdminInput {
  id: string;
  status: FeatureStatus;
  pinned: boolean;
  locked: boolean;
}

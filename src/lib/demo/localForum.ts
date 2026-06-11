import {
  hydrateIfEmpty,
  listStoreRecords,
  openDemoDb,
  type DemoSeedPayload,
} from "@portfolio/demo-local";
import seed from "./forum-seed.json";
import type {
  FeatureComment,
  FeatureRequest,
  FeatureRequestWithMeta,
  FeatureSort,
  FeatureStatus,
} from "@/lib/forum-types";

const APP_ID = "lingoleaf-web";
const SCHEMA_VERSION = 1;

let dbPromise: ReturnType<typeof openDemoDb> | null = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = openDemoDb(APP_ID, SCHEMA_VERSION);
  }
  return dbPromise;
}

async function ensureForumHydrated(): Promise<void> {
  const db = await getDb();
  await hydrateIfEmpty(db, seed as DemoSeedPayload, "forum_seed_version");
}

export async function readLocalFeatureRequests({
  sort,
  status,
  mine,
  userId,
}: {
  sort: FeatureSort;
  status: FeatureStatus | "all";
  mine: boolean;
  userId?: string;
}): Promise<FeatureRequestWithMeta[]> {
  await ensureForumHydrated();
  const db = await getDb();
  let rows = await listStoreRecords<FeatureRequest>(db, "feature_requests");

  if (status !== "all") {
    rows = rows.filter((row) => row.status === status);
  }

  if (mine && userId) {
    rows = rows.filter((row) => row.created_by === userId);
  }

  rows.sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }
    if (sort === "top") {
      if (left.vote_count !== right.vote_count) {
        return right.vote_count - left.vote_count;
      }
    }
    return right.created_at.localeCompare(left.created_at);
  });

  const votes = await listStoreRecords<{ feature_id: string; user_id: string }>(db, "feature_votes");
  const votedIds = new Set(
    votes.filter((vote) => vote.user_id === userId).map((vote) => vote.feature_id),
  );

  return rows.map((row) => ({
    ...row,
    has_voted: votedIds.has(row.id),
  }));
}

export async function readLocalFeatureRequestById(
  id: string,
  userId?: string,
): Promise<FeatureRequestWithMeta | null> {
  await ensureForumHydrated();
  const db = await getDb();
  const rows = await listStoreRecords<FeatureRequest>(db, "feature_requests");
  const row = rows.find((item) => item.id === id);
  if (!row) {
    return null;
  }

  const votes = await listStoreRecords<{ feature_id: string; user_id: string }>(db, "feature_votes");
  const hasVoted = votes.some((vote) => vote.feature_id === id && vote.user_id === userId);

  return { ...row, has_voted: hasVoted };
}

export async function readLocalFeatureComments(featureId: string): Promise<FeatureComment[]> {
  await ensureForumHydrated();
  const db = await getDb();
  const rows = await listStoreRecords<FeatureComment>(db, "feature_comments");
  return rows
    .filter((row) => row.feature_id === featureId)
    .sort((left, right) => left.created_at.localeCompare(right.created_at));
}

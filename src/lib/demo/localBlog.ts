import {
  hydrateIfEmpty,
  listStoreRecords,
  openDemoDb,
  type DemoSeedPayload,
} from "@portfolio/demo-local";
import seed from "./blog-seed.json";
import type { BlogComment, BlogPost } from "@/lib/blog-types";

const APP_ID = "lingoleaf-web";
const SCHEMA_VERSION = 1;

let dbPromise: ReturnType<typeof openDemoDb> | null = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = openDemoDb(APP_ID, SCHEMA_VERSION);
  }
  return dbPromise;
}

async function ensureBlogHydrated(): Promise<void> {
  const db = await getDb();
  await hydrateIfEmpty(db, seed as DemoSeedPayload, "blog_seed_version");
}

export async function readLocalBlogPosts(): Promise<BlogPost[]> {
  await ensureBlogHydrated();
  const db = await getDb();
  const rows = await listStoreRecords<BlogPost>(db, "blog_posts");
  return rows.sort((left, right) => right.created_at.localeCompare(left.created_at));
}

export async function readLocalBlogPostById(id: string): Promise<BlogPost | null> {
  await ensureBlogHydrated();
  const db = await getDb();
  const rows = await listStoreRecords<BlogPost>(db, "blog_posts");
  return rows.find((row) => row.id === id) ?? null;
}

export async function readLocalBlogComments(postId: string): Promise<BlogComment[]> {
  await ensureBlogHydrated();
  const db = await getDb();
  const rows = await listStoreRecords<BlogComment>(db, "blog_comments");
  return rows
    .filter((row) => row.post_id === postId)
    .sort((left, right) => left.created_at.localeCompare(right.created_at));
}

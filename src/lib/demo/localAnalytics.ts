import {
  hydrateIfEmpty,
  listStoreRecords,
  openDemoDb,
  type DemoSeedPayload,
} from "@portfolio/demo-local";
import seed from "./analytics-seed.json";
import type { AdminAnalyticsDashboard } from "@/lib/admin-analytics-api";

const APP_ID = "lingoleaf-web";
const SCHEMA_VERSION = 1;

let dbPromise: ReturnType<typeof openDemoDb> | null = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = openDemoDb(APP_ID, SCHEMA_VERSION);
  }
  return dbPromise;
}

export async function readLocalAnalyticsDashboard(): Promise<AdminAnalyticsDashboard> {
  const db = await getDb();
  await hydrateIfEmpty(db, seed as DemoSeedPayload);
  const rows = await listStoreRecords<AdminAnalyticsDashboard>(db, "analytics_dashboard");
  const dashboard = rows[0];
  if (!dashboard) {
    throw new Error("Demo analytics seed is missing.");
  }
  return dashboard;
}

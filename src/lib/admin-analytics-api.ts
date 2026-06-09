import { getIsForumAdmin } from "@/lib/forum-api";
import { supabase, supabaseConfigured } from "@/lib/supabase";

export interface AnalyticsDashboardSummary {
  from: string;
  to: string;
  totals: {
    events: number;
    failures: number;
    users: number;
    installs: number;
    last_event_at: string | null;
  };
  daily_events: Array<{ day: string; count: number }>;
  daily_failures: Array<{ day: string; count: number }>;
  top_events: Array<{ event_name: string; count: number }>;
}

export interface AnalyticsRecentEvent {
  id: string;
  created_at: string;
  user_id: string | null;
  event_name: string;
  event_version: number;
  install_id: string | null;
  app_version: string | null;
  platform: string | null;
  locale: string | null;
  severity?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  purchase_product_id?: string | null;
  purchase_price?: number | null;
  purchase_currency?: string | null;
  purchase_storefront?: string | null;
}

export interface AdminAnalyticsDashboard {
  summary: AnalyticsDashboardSummary;
  recent_events: AnalyticsRecentEvent[];
}

const assertSupabaseConfigured = () => {
  if (!supabaseConfigured) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
};

export const fetchAdminAnalyticsDashboard = async ({
  userId,
  spanHours,
  limit = 50,
}: {
  userId?: string;
  spanHours: number;
  limit?: number;
}): Promise<AdminAnalyticsDashboard> => {
  assertSupabaseConfigured();

  if (!userId) {
    throw new Error("You must be logged in as admin.");
  }

  const isAdmin = await getIsForumAdmin(userId);
  if (!isAdmin) {
    throw new Error("You are not authorized for analytics.");
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("Your session expired. Please sign in again.");
  }

  const now = new Date();
  const boundedSpanHours = Math.min(Math.max(Math.trunc(spanHours), 1), 24 * 60);
  const from = new Date(now.getTime() - boundedSpanHours * 60 * 60 * 1000);
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);

  const response = await fetch(
    `/api/admin-analytics?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(now.toISOString())}&limit=${boundedLimit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to load admin analytics.");
  }

  return payload as AdminAnalyticsDashboard;
};

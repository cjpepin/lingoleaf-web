import { supabaseApiHeaders } from "../../lib/supabase-schema.ts";

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

type RecordValue = Record<string, unknown>;
const MAX_RANGE_MS = 60 * 24 * 60 * 60 * 1000;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });

const asRecord = (value: unknown): RecordValue | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as RecordValue) : null;

const firstNonEmptyString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
};

const parseIsoDate = (value: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const firstNumber = (...values: unknown[]): number | null => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
};

const normalizeRecentEvent = (value: unknown) => {
  const row = asRecord(value) ?? {};
  const properties =
    asRecord(row.properties) ??
    asRecord(row.event_properties) ??
    asRecord(row.event_payload) ??
    asRecord(row.metadata) ??
    null;
  const purchase = asRecord(properties?.purchase) ?? asRecord(row.purchase) ?? null;
  const error = asRecord(properties?.error) ?? asRecord(row.error) ?? null;

  return {
    ...row,
    severity: firstNonEmptyString(row.severity, properties?.severity, properties?.level, error?.severity),
    error_code: firstNonEmptyString(row.error_code, properties?.error_code, error?.code, purchase?.error_code),
    error_message: firstNonEmptyString(row.error_message, properties?.error_message, error?.message, purchase?.error_message),
    purchase_product_id: firstNonEmptyString(
      row.purchase_product_id,
      properties?.purchase_product_id,
      properties?.product_id,
      purchase?.product_id,
    ),
    purchase_price: firstNumber(row.purchase_price, properties?.purchase_price, properties?.price, purchase?.price),
    purchase_currency: firstNonEmptyString(
      row.purchase_currency,
      properties?.purchase_currency,
      properties?.currency,
      purchase?.currency,
    ),
    purchase_storefront: firstNonEmptyString(
      row.purchase_storefront,
      properties?.purchase_storefront,
      properties?.storefront,
      purchase?.storefront,
    ),
  };
};

const supabaseRpc = async ({
  url,
  anonKey,
  token,
  rpcName,
  payload,
}: {
  url: string;
  anonKey: string;
  token: string;
  rpcName: string;
  payload: Record<string, unknown>;
}) => {
  const response = await fetch(`${url}/rest/v1/rpc/${rpcName}`, {
    method: "POST",
    headers: supabaseApiHeaders(anonKey, token),
    body: JSON.stringify(payload),
  });

  const body = await response.text();

  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      body,
    };
  }

  return {
    ok: true as const,
    status: response.status,
    data: (() => {
      if (!body) {
        return null;
      }

      try {
        return JSON.parse(body);
      } catch {
        return body;
      }
    })(),
  };
};

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return json({ error: "Missing authorization token." }, 401);
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json({ error: "Supabase configuration missing for admin analytics." }, 500);
  }

  try {
    const meResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: supabaseApiHeaders(SUPABASE_ANON_KEY, token),
    });

    if (!meResponse.ok) {
      return json({ error: "Invalid session." }, 401);
    }

    const url = new URL(request.url);
    const from = parseIsoDate(url.searchParams.get("from"));
    const to = parseIsoDate(url.searchParams.get("to"));
    const limitValue = Number(url.searchParams.get("limit") ?? "50");
    const limit = Number.isFinite(limitValue) ? Math.min(Math.max(Math.trunc(limitValue), 1), 200) : 50;

    if (!from || !to || from >= to || to.getTime() - from.getTime() > MAX_RANGE_MS) {
      return json({ error: "Invalid date range." }, 400);
    }

    const summaryResult = await supabaseRpc({
      url: SUPABASE_URL,
      anonKey: SUPABASE_ANON_KEY,
      token,
      rpcName: "analytics_admin_dashboard",
      payload: {
        p_from: from.toISOString(),
        p_to: to.toISOString(),
      },
    });

    if (!summaryResult.ok) {
      if (summaryResult.status === 401 || summaryResult.status === 403) {
        return json({ error: "Not authorized for analytics dashboard." }, 403);
      }
      console.error("Analytics summary RPC failed", { status: summaryResult.status, body: summaryResult.body });
      return json({ error: "Failed to load analytics summary." }, 500);
    }

    const eventsResult = await supabaseRpc({
      url: SUPABASE_URL,
      anonKey: SUPABASE_ANON_KEY,
      token,
      rpcName: "analytics_admin_recent_events",
      payload: {
        p_limit: limit,
        p_from: from.toISOString(),
        p_to: to.toISOString(),
      },
    });

    if (!eventsResult.ok) {
      if (eventsResult.status === 401 || eventsResult.status === 403) {
        return json({ error: "Not authorized for analytics dashboard." }, 403);
      }
      console.error("Analytics events RPC failed", { status: eventsResult.status, body: eventsResult.body });
      return json({ error: "Failed to load analytics events." }, 500);
    }

    return json({
      summary: summaryResult.data,
      recent_events: Array.isArray(eventsResult.data) ? eventsResult.data.map(normalizeRecentEvent) : [],
    });
  } catch (error) {
    console.error("Admin analytics error", error);
    return json({ error: "Failed to load admin analytics." }, 500);
  }
};

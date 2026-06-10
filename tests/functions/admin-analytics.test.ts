import assert from "node:assert/strict";
import test from "node:test";
import { onRequestGet } from "../../functions/lingoleaf/api/admin-analytics.ts";
import { jsonResponse, readJson, withMockedFetch } from "../helpers/http.ts";

const env = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon_key",
};

const APP_ORIGIN = "https://example.com";
const API_ANALYTICS = `${APP_ORIGIN}/lingoleaf/api/admin-analytics`;

const createRequest = (query: string, token = "session_token") =>
  new Request(`${API_ANALYTICS}${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

test("admin analytics rejects invalid date ranges before upstream calls", async () => {
  const fetchCalls: string[] = [];

  await withMockedFetch(
    async (url) => {
      fetchCalls.push(String(url));
      return jsonResponse({ id: "admin_123" });
    },
    async () => {
      const response = await onRequestGet({
        request: createRequest("?from=2026-01-01T00:00:00.000Z&to=2026-04-15T00:00:00.000Z"),
        env,
      });

      assert.equal(response.status, 400);
      assert.deepEqual(await readJson<{ error: string }>(response), {
        error: "Invalid date range.",
      });
      assert.deepEqual(fetchCalls, ["https://example.supabase.co/auth/v1/user"]);
    },
  );
});

test("admin analytics masks RPC failures from clients", async () => {
  const fetchSequence = [
    jsonResponse({ id: "admin_123" }),
    new Response("sensitive rpc detail", { status: 500 }),
  ];

  await withMockedFetch(
    async () => {
      const next = fetchSequence.shift();
      if (!next) {
        throw new Error("Unexpected fetch");
      }
      return next;
    },
    async () => {
      const response = await onRequestGet({
        request: createRequest("?from=2026-03-18T00:00:00.000Z&to=2026-03-19T00:00:00.000Z"),
        env,
      });

      assert.equal(response.status, 500);
      assert.deepEqual(await readJson<{ error: string }>(response), {
        error: "Failed to load analytics summary.",
      });
    },
  );
});

test("admin analytics returns normalized recent event data", async () => {
  const fetchCalls: string[] = [];

  await withMockedFetch(
    async (url) => {
      fetchCalls.push(String(url));

      if (String(url).endsWith("/auth/v1/user")) {
        return jsonResponse({ id: "admin_123" });
      }

      if (String(url).includes("analytics_admin_dashboard")) {
        return jsonResponse({
          from: "2026-03-18T00:00:00.000Z",
          to: "2026-03-19T00:00:00.000Z",
          totals: {
            events: 1,
            failures: 1,
            users: 1,
            installs: 1,
            last_event_at: "2026-03-18T12:00:00.000Z",
          },
          daily_events: [],
          daily_failures: [],
          top_events: [],
        });
      }

      if (String(url).includes("analytics_admin_recent_events")) {
        return jsonResponse([
          {
            id: "event_1",
            created_at: "2026-03-18T12:00:00.000Z",
            user_id: "user_1",
            event_name: "purchase_failed",
            event_version: 1,
            install_id: "install_1",
            app_version: "1.0.0",
            platform: "ios",
            locale: "en-US",
            metadata: {
              purchase: {
                product_id: "premium_monthly",
                price: "9.99",
                currency: "USD",
                storefront: "USA",
              },
              error: {
                severity: "critical",
                code: "store_unavailable",
                message: "The App Store is temporarily unavailable.",
              },
            },
          },
        ]);
      }

      throw new Error(`Unexpected fetch URL: ${String(url)}`);
    },
    async () => {
      const response = await onRequestGet({
        request: createRequest("?from=2026-03-18T00:00:00.000Z&to=2026-03-19T00:00:00.000Z&limit=25"),
        env,
      });

      assert.equal(response.status, 200);

      const payload = await readJson<{
        summary: { totals: { events: number } };
        recent_events: Array<{
          severity: string;
          error_code: string;
          error_message: string;
          purchase_product_id: string;
          purchase_price: number;
          purchase_currency: string;
          purchase_storefront: string;
        }>;
      }>(response);

      assert.equal(payload.summary.totals.events, 1);
      assert.equal(payload.recent_events[0].severity, "critical");
      assert.equal(payload.recent_events[0].error_code, "store_unavailable");
      assert.equal(payload.recent_events[0].error_message, "The App Store is temporarily unavailable.");
      assert.equal(payload.recent_events[0].purchase_product_id, "premium_monthly");
      assert.equal(payload.recent_events[0].purchase_price, 9.99);
      assert.equal(payload.recent_events[0].purchase_currency, "USD");
      assert.equal(payload.recent_events[0].purchase_storefront, "USA");
      assert.equal(fetchCalls.length, 3);
    },
  );
});

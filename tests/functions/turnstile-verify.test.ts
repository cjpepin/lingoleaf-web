import assert from "node:assert/strict";
import test from "node:test";
import { onRequestPost } from "../../functions/lingoleaf/api/turnstile-verify.ts";
import { jsonResponse, readJson, withMockedFetch } from "../helpers/http.ts";

const APP_ORIGIN = "https://example.com";
const API_TURNSTILE = `${APP_ORIGIN}/lingoleaf/api/turnstile-verify`;

const createRequest = (body: Record<string, unknown>, token?: string, origin = APP_ORIGIN) =>
  new Request(API_TURNSTILE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

const env = {
  TURNSTILE_SECRET_KEY: "turnstile_secret",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon_key",
  SUPABASE_SERVICE_ROLE_KEY: "service_role_key",
};

test("turnstile verify requires an auth token", async () => {
  const response = await onRequestPost({
    request: createRequest({ token: "abc" }),
    env,
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await readJson<{ error: string }>(response), {
    error: "Missing authorization token.",
  });
});

test("turnstile verify rejects mismatched origins", async () => {
  const response = await onRequestPost({
    request: createRequest({ token: "abc" }, "session_token", "https://evil.example"),
    env,
  });

  assert.equal(response.status, 403);
  assert.deepEqual(await readJson<{ error: string }>(response), {
    error: "Origin not allowed.",
  });
});

test("turnstile verify validates request payloads", async () => {
  const response = await onRequestPost({
    request: createRequest({}, "session_token"),
    env,
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await readJson<{ error: string }>(response), {
    error: "Missing Turnstile token.",
  });
});

test("turnstile verify does not leak provider details on failure", async () => {
  await withMockedFetch(
    async () => jsonResponse({ success: false, "error-codes": ["timeout-or-duplicate"] }),
    async () => {
      const response = await onRequestPost({
        request: createRequest({ token: "challenge_token" }, "session_token"),
        env,
      });

      assert.equal(response.status, 400);
      assert.deepEqual(await readJson<{ error: string }>(response), {
        error: "Turnstile verification failed.",
      });
    },
  );
});

test("turnstile verify stores verification for valid sessions", async () => {
  const fetchCalls: string[] = [];

  await withMockedFetch(
    async (url, init) => {
      fetchCalls.push(String(url));

      if (String(url).includes("siteverify")) {
        return jsonResponse({ success: true });
      }

      if (String(url).endsWith("/auth/v1/user")) {
        return jsonResponse({ id: "user_123" });
      }

      if (String(url).includes("/rpc/mark_forum_human_verified_for_user")) {
        assert.equal(init?.headers && (init.headers as Record<string, string>).Authorization, "Bearer service_role_key");
        return jsonResponse("2026-03-19T18:30:00.000Z");
      }

      throw new Error(`Unexpected fetch URL: ${String(url)}`);
    },
    async () => {
      const response = await onRequestPost({
        request: createRequest({ token: "challenge_token" }, "session_token"),
        env,
      });

      assert.equal(response.status, 200);
      assert.deepEqual(await readJson<{ success: boolean; expires_at: string }>(response), {
        success: true,
        expires_at: "2026-03-19T18:30:00.000Z",
      });
      assert.deepEqual(fetchCalls, [
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        "https://example.supabase.co/auth/v1/user",
        "https://example.supabase.co/rest/v1/rpc/mark_forum_human_verified_for_user",
      ]);
    },
  );
});

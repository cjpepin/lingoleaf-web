import assert from "node:assert/strict";
import test from "node:test";
import { onRequestPost } from "../../functions/api/contact.ts";
import { jsonResponse, readJson, withMockedFetch } from "../helpers/http.ts";

const createContactRequest = (fields: Record<string, string>, origin = "https://lingoleaf.app") => {
  const formData = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }

  return new Request("https://lingoleaf.app/api/contact", {
    method: "POST",
    headers: { Origin: origin },
    body: formData,
  });
};

test("contact endpoint rejects cross-origin requests", async () => {
  const response = await onRequestPost({
    request: createContactRequest(
      {
        name: "Test User",
        email: "test@example.com",
        message: "Hello from a bad origin",
      },
      "https://evil.example",
    ),
    env: { RESEND_API_KEY: "re_test" },
  });

  assert.equal(response.status, 403);
  assert.deepEqual(await readJson<{ error: string }>(response), { error: "Origin not allowed." });
});

test("contact endpoint short-circuits honeypot submissions", async () => {
  let called = false;

  await withMockedFetch(
    async () => {
      called = true;
      return jsonResponse({});
    },
    async () => {
      const response = await onRequestPost({
        request: createContactRequest({
          name: "Bot",
          email: "bot@example.com",
          message: "Spam",
          website: "https://spam.invalid",
        }),
        env: { RESEND_API_KEY: "re_test" },
      });

      assert.equal(response.status, 200);
      assert.deepEqual(await readJson<{ success: boolean }>(response), { success: true });
      assert.equal(called, false);
    },
  );
});

test("contact endpoint validates email addresses server-side", async () => {
  const response = await onRequestPost({
    request: createContactRequest({
      name: "Test User",
      email: "not-an-email",
      message: "This should fail validation.",
    }),
    env: { RESEND_API_KEY: "re_test" },
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await readJson<{ error: string }>(response), {
    error: "Enter a valid email address.",
  });
});

test("contact endpoint sanitizes and forwards valid requests", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  await withMockedFetch(
    async (url, init) => {
      calls.push({ url: String(url), init });
      return jsonResponse({ id: "email_123" });
    },
    async () => {
      const response = await onRequestPost({
        request: createContactRequest({
          name: "<Admin>",
          email: "user@example.com",
          subject: 'Need "help"',
          message: "Line 1\n<script>alert('xss')</script>",
        }),
        env: { RESEND_API_KEY: "re_test" },
      });

      assert.equal(response.status, 200);
      assert.deepEqual(await readJson<{ success: boolean }>(response), { success: true });
      assert.equal(calls.length, 1);

      const outboundBody = JSON.parse(String(calls[0].init?.body));
      assert.equal(calls[0].url, "https://api.resend.com/emails");
      assert.equal(outboundBody.reply_to, "user@example.com");
      assert.match(outboundBody.html, /&lt;Admin&gt;/);
      assert.match(outboundBody.html, /&lt;script&gt;alert\('xss'\)&lt;\/script&gt;/);
      assert.doesNotMatch(outboundBody.html, /<script>/);
    },
  );
});

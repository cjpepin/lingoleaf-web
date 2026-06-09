import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("blog comment hardening migration includes abuse controls", async () => {
  const sql = await readFile(
    path.join(process.cwd(), "supabase/migrations/202603190001_blog_comment_abuse_hardening.sql"),
    "utf8",
  );

  assert.match(sql, /is_forum_blocked/);
  assert.match(sql, /raise_if_forum_text_has_disallowed_chars/);
  assert.match(sql, /15 seconds/);
  assert.match(sql, /1 hour/);
});

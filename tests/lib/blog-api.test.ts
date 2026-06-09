import assert from "node:assert/strict";
import test from "node:test";
import { getBlogPostById } from "../../src/lib/blog-api.ts";
import { supabase } from "../../src/lib/supabase.ts";

test("getBlogPostById returns a friendly not-found error", async () => {
  const originalFrom = supabase.from;

  Object.assign(supabase, {
    from: ((table: string) => {
      assert.equal(table, "blog_posts");

      return {
        select() {
          return {
            eq(column: string, value: string) {
              assert.equal(column, "id");
              assert.equal(value, "missing_post");

              return {
                maybeSingle: async () => ({ data: null, error: null }),
              };
            },
          };
        },
      };
    }) as typeof supabase.from,
  });

  try {
    await assert.rejects(() => getBlogPostById("missing_post"), /App update not found\./);
  } finally {
    Object.assign(supabase, { from: originalFrom });
  }
});

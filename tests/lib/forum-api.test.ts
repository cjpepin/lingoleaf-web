import assert from "node:assert/strict";
import test from "node:test";
import { getFeatureRequestById, updateFeatureComment, updateFeatureRequest } from "../../src/lib/forum-api.ts";
import { supabase } from "../../src/lib/supabase.ts";

const withFromMock = async <T>(fromMock: typeof supabase.from, run: () => Promise<T>) => {
  const originalFrom = supabase.from;
  Object.assign(supabase, { from: fromMock });

  try {
    return await run();
  } finally {
    Object.assign(supabase, { from: originalFrom });
  }
};

const createUpdateChain = (result: Record<string, unknown>) => {
  const eqCalls: Array<[string, unknown]> = [];
  let payload: Record<string, unknown> | null = null;

  return {
    eqCalls,
    getPayload: () => payload,
    fromMock: ((table: string) => ({
      update(nextPayload: Record<string, unknown>) {
        payload = nextPayload;

        const chain = {
          eq(column: string, value: unknown) {
            eqCalls.push([column, value]);
            return chain;
          },
          select() {
            return {
              single: async () => ({ data: result, error: null }),
            };
          },
        };

        return chain;
      },
    })) as typeof supabase.from,
  };
};

test("updateFeatureRequest limits non-admin edits to the owner", async () => {
  const chain = createUpdateChain({
    id: "feature_1",
    title: "Updated title",
    body: "Updated body content",
    tags: ["ios"],
  });

  await withFromMock(chain.fromMock, async () => {
    await updateFeatureRequest({
      id: "feature_1",
      userId: "user_1",
      title: " Updated title ",
      body: " Updated body content ",
      tags: ["ios"],
    });
  });

  assert.deepEqual(chain.eqCalls, [
    ["id", "feature_1"],
    ["created_by", "user_1"],
  ]);
  assert.deepEqual(chain.getPayload(), {
    title: "Updated title",
    body: "Updated body content",
    tags: ["ios"],
  });
});

test("updateFeatureRequest lets admins edit without owner filtering", async () => {
  const chain = createUpdateChain({
    id: "feature_1",
    title: "Admin edit",
    body: "Admin updated body",
    tags: ["priority"],
  });

  await withFromMock(chain.fromMock, async () => {
    await updateFeatureRequest({
      id: "feature_1",
      userId: "admin_user",
      title: " Admin edit ",
      body: " Admin updated body ",
      tags: ["priority"],
      isAdmin: true,
    });
  });

  assert.deepEqual(chain.eqCalls, [["id", "feature_1"]]);
});

test("updateFeatureComment lets admins edit without owner filtering", async () => {
  const chain = createUpdateChain({
    id: "comment_1",
    body: "Updated by admin",
  });

  await withFromMock(chain.fromMock, async () => {
    await updateFeatureComment("comment_1", "admin_user", " Updated by admin ", true);
  });

  assert.deepEqual(chain.eqCalls, [["id", "comment_1"]]);
});

test("getFeatureRequestById returns a friendly not-found error", async () => {
  const fromMock = ((table: string) => {
    assert.equal(table, "feature_requests");

    return {
      select() {
        return {
          eq(column: string, value: string) {
            assert.equal(column, "id");
            assert.equal(value, "missing_feature");

            return {
              maybeSingle: async () => ({ data: null, error: null }),
            };
          },
        };
      },
    };
  }) as typeof supabase.from;

  await withFromMock(fromMock, async () => {
    await assert.rejects(() => getFeatureRequestById("missing_feature"), /Feature request not found\./);
  });
});

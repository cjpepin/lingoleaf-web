import { supabaseApiHeaders } from "../../lib/supabase-schema.ts";

interface Env {
  TURNSTILE_SECRET_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return json({ error: "Missing authorization token." }, 401);
  }

  const requestOrigin = new URL(request.url).origin;
  const headerOrigin = request.headers.get("Origin");
  const referer = request.headers.get("Referer");
  const incomingOrigin = headerOrigin ?? referer;

  if (incomingOrigin) {
    try {
      if (new URL(incomingOrigin).origin !== requestOrigin) {
        return json({ error: "Origin not allowed." }, 403);
      }
    } catch {
      return json({ error: "Origin not allowed." }, 403);
    }
  }

  const { TURNSTILE_SECRET_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = env;

  if (!TURNSTILE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Turnstile verification is not configured." }, 500);
  }

  try {
    const payload = await request.json<{ token?: string }>().catch(() => ({}));
    if (typeof payload.token !== "string" || payload.token.length === 0 || payload.token.length > 2048) {
      return json({ error: "Missing Turnstile token." }, 400);
    }

    const ip = request.headers.get("CF-Connecting-IP") ?? undefined;

    const verificationResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: TURNSTILE_SECRET_KEY,
        response: payload.token,
        remoteip: ip,
      }),
    });

    if (!verificationResponse.ok) {
      console.error("Turnstile upstream error", { status: verificationResponse.status });
      return json({ error: "Turnstile verification failed." }, 502);
    }

    const verificationResult = await verificationResponse.json<{ success?: boolean; [key: string]: unknown }>();
    if (!verificationResult.success) {
      return json({ error: "Turnstile verification failed." }, 400);
    }

    const meResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: supabaseApiHeaders(SUPABASE_ANON_KEY, token),
    });

    if (!meResponse.ok) {
      return json({ error: "Invalid session." }, 401);
    }

    const user = await meResponse.json<{ id?: string }>().catch(() => ({}));
    if (!user.id) {
      return json({ error: "Invalid session." }, 401);
    }

    const rpcResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/mark_forum_human_verified_for_user`, {
      method: "POST",
      headers: supabaseApiHeaders(SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SERVICE_ROLE_KEY),
      body: JSON.stringify({ p_user_id: user.id }),
    });

    if (!rpcResponse.ok) {
      console.error("Failed to store Turnstile verification", { status: rpcResponse.status });
      return json({ error: "Failed to store verification." }, 500);
    }

    const expiresAt = await rpcResponse.json<string | null>().catch(() => null);
    return json({ success: true, expires_at: expiresAt });
  } catch (error) {
    console.error("Turnstile verification error", error);
    return json({ error: "Turnstile verification failed." }, 500);
  }
};

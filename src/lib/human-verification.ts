import { supabase } from "@/lib/supabase";
import { apiPath } from "@/lib/paths";

const STORAGE_KEY = "forum_human_verification_expires_at";

export const hasRecentHumanVerification = () => {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return false;
  }

  const expiresAt = Number(raw);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
};

export const rememberHumanVerification = (expiresAtIso: string) => {
  const expiresAt = new Date(expiresAtIso).getTime();
  if (Number.isFinite(expiresAt)) {
    window.localStorage.setItem(STORAGE_KEY, String(expiresAt));
  }
};

export const verifyHumanChallenge = async (turnstileToken: string) => {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error("You must be logged in to verify.");
  }

  const response = await fetch(apiPath("turnstile-verify"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: turnstileToken }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error ?? "Human verification failed.");
  }

  if (payload.expires_at) {
    rememberHumanVerification(payload.expires_at);
  }
};

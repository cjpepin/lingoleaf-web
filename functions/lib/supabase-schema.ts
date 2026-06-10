export const SUPABASE_DB_SCHEMA = "lingoleaf";

export const supabaseApiHeaders = (apiKey: string, bearerToken?: string) => ({
  apikey: apiKey,
  "Content-Type": "application/json",
  Accept: "application/json",
  "Accept-Profile": SUPABASE_DB_SCHEMA,
  "Content-Profile": SUPABASE_DB_SCHEMA,
  ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
});

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const CLOUD_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let _client = null;
function client() {
  if (!CLOUD_ENABLED) return null;
  if (!_client) _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _client;
}

export function makeSessionCode(length = 18) {
  // long enough to be practically unguessable
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // avoids confusing 0/O/1/I
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) out += chars[bytes[i] % chars.length];
  return out;
}

export async function upsertSession(code, payload) {
  const c = client();
  if (!c) throw new Error("Cloud not configured: missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
  const row = {
    code,
    payload,
    updated_at: new Date().toISOString(),
  };
  const { error } = await c.from("seer_sessions").upsert(row, { onConflict: "code" });
  if (error) throw error;
}

export async function fetchSession(code) {
  const c = client();
  if (!c) throw new Error("Cloud not configured: missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");

  const { data, error } = await c
    .from("seer_sessions")
    .select("code,payload,created_at,updated_at")
    .eq("code", code)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

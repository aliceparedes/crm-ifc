import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabaseIfc(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_IFC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_IFC_SUPABASE_KEY;
    if (!url || !key) throw new Error("Missing NEXT_PUBLIC_IFC_SUPABASE_URL or NEXT_PUBLIC_IFC_SUPABASE_KEY");
    _client = createClient(url, key);
  }
  return _client;
}

export const supabaseIfc = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    return (getSupabaseIfc() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

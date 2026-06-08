import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_IFC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_IFC_SUPABASE_KEY!;

export const supabaseIfc = createClient(url, key);

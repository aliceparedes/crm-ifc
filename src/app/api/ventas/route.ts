import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/ventas — load all rows
export async function GET() {
  const { data, error } = await supabase
    .from("ventas")
    .select("*")
    .order("mes", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/ventas — insert new rows for a month
export async function POST(req: NextRequest) {
  const rows = await req.json();
  if (!Array.isArray(rows) || !rows.length) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  const { error } = await supabase.from("ventas").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/ventas?mes=YYYY-MM — remove all rows for a month
export async function DELETE(req: NextRequest) {
  const mes = req.nextUrl.searchParams.get("mes");
  if (!mes) return NextResponse.json({ error: "mes param required" }, { status: 400 });

  const { error } = await supabase.from("ventas").delete().eq("mes", mes);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

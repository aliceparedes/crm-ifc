import { supabaseIfc } from "@/lib/supabase-ifc";
import { NextResponse } from "next/server";

export async function GET() {
  const { data, error } = await supabaseIfc
    .from("clients")
    .select("*")
    .order("proximo_contacto", { ascending: true, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();

  if (body.ultima_visita && !body.proximo_contacto) {
    const d = new Date(body.ultima_visita);
    d.setMonth(d.getMonth() + 1);
    body.proximo_contacto = d.toISOString().split("T")[0];
  }

  const { data, error } = await supabaseIfc
    .from("clients")
    .insert([{ ...body, estado: body.estado || "Por Contactar" }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

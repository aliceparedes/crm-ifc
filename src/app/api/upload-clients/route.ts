import { supabaseIfc } from "@/lib/supabase-ifc";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

const COLUMN_MAP: Record<string, string> = {
  "nombre": "nombre", "name": "nombre", "nombres y apellidos": "nombre", "nombres": "nombre",
  "dni": "dni", "número de documento": "dni", "numero de documento": "dni",
  "nro. documento": "dni", "nro documento": "dni", "número documento": "dni", "numero documento": "dni",
  "fecha": "ultima_visita", "ultima visita": "ultima_visita", "última visita": "ultima_visita",
  "ultima fecha de compra": "ultima_visita", "última fecha de compra": "ultima_visita",
  "fecha de compra": "ultima_visita", "last visit": "ultima_visita",
  "doctor": "doctor",
  "servicio": "servicio", "service": "servicio",
  "encargada": "responsable", "responsable": "responsable",
  "telefono": "telefono", "teléfono": "telefono", "phone": "telefono",
  "estado": "estado", "status": "estado",
  "observaciones": "observaciones", "observations": "observaciones",
  "correo": "correo", "email": "correo",
  "proximo contacto": "proximo_contacto", "próximo contacto": "proximo_contacto",
  "f. próximo contacto": "proximo_contacto",
};

function parseDate(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split("T")[0];
  if (typeof val === "number") {
    return new Date((val - 25569) * 86400 * 1000).toISOString().split("T")[0];
  }
  const s = String(val).trim();
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const iso = new Date(s);
  if (!isNaN(iso.getTime())) return iso.toISOString().split("T")[0];
  return null;
}

function normalizeKey(key: string): string {
  const s = String(key).toLowerCase().trim().replace(/\s+/g, " ").normalize("NFD");
  return s.split("").filter((ch) => ch.charCodeAt(0) < 0x0300 || ch.charCodeAt(0) > 0x036f).join("");
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const normalizedMap: Record<string, string> = {};
    Object.entries(COLUMN_MAP).forEach(([k, v]) => { normalizedMap[normalizeKey(k)] = v; });

    const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as string[][];
    if (!allRows.length) return NextResponse.json({ error: "File is empty" }, { status: 400 });

    let headerRowIdx = 0, bestScore = 0;
    for (let i = 0; i < Math.min(10, allRows.length); i++) {
      let score = 0;
      for (const cell of allRows[i] || []) {
        const nk = normalizeKey(String(cell || ""));
        if (normalizedMap[nk]) score++;
        if (nk.includes("apellido") || nk.includes("nombre") || nk.includes("documento") ||
            nk.includes("telefono") || nk.includes("fecha") || nk.includes("correo")) score++;
      }
      if (score > bestScore) { bestScore = score; headerRowIdx = i; }
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { raw: false, range: headerRowIdx }) as Record<string, unknown>[];
    if (!rows.length) return NextResponse.json({ error: "File is empty" }, { status: 400 });

    const mapped = rows.map((row) => {
      const client: Record<string, unknown> = {};
      Object.keys(row).forEach((key) => {
        const normalized = normalizeKey(key);
        if (normalized === "doctor, servicio" || normalized === "doctor,servicio") {
          const parts = String(row[key] || "").split(",");
          client.doctor = parts[0].trim() || null;
          client.servicio = parts.slice(1).join(",").trim() || null;
          return;
        }
        const dbField = normalizedMap[normalized];
        if (dbField) {
          let val: unknown = row[key];
          if (["ultima_visita", "proximo_contacto"].includes(dbField)) val = parseDate(val);
          client[dbField] = val || null;
        }
      });
      return client;
    }).filter((c) => c.nombre);

    if (!mapped.length) {
      return NextResponse.json({ error: "No se encontró columna de nombre en el archivo." }, { status: 400 });
    }

    mapped.forEach((c) => {
      if (c.ultima_visita && !c.proximo_contacto) {
        const d = new Date(c.ultima_visita as string);
        d.setMonth(d.getMonth() + 1);
        c.proximo_contacto = d.toISOString().split("T")[0];
      }
      if (!c.estado) c.estado = "Por Contactar";
    });

    const withDni    = mapped.filter((c) => c.dni);
    const withoutDni = mapped.filter((c) => !c.dni);
    let inserted = 0, updated = 0, skipped = 0;

    for (const client of withDni) {
      const { data: existing } = await supabaseIfc
        .from("clients").select("id").eq("dni", String(client.dni)).single();
      if (existing) {
        await supabaseIfc.from("clients").update(client).eq("id", existing.id);
        updated++;
      } else {
        await supabaseIfc.from("clients").insert([client]);
        inserted++;
      }
    }

    if (withoutDni.length) {
      const { error } = await supabaseIfc.from("clients").insert(withoutDni);
      if (!error) inserted += withoutDni.length;
      else skipped += withoutDni.length;
    }

    return NextResponse.json({ success: true, inserted, updated, skipped, total: mapped.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

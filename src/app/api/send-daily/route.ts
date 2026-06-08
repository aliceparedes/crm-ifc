import { supabaseIfc } from "@/lib/supabase-ifc";
import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

const ENCARGADA_EMAILS: Record<string, string> = {
  Lilian: "lilianparedes26.v@gmail.com",
  Heydi:  "gomezheydi252525@gmail.com",
  Miriam: "mirianconde86@gmail.com",
};

interface Client {
  nombre: string;
  telefono?: string;
  doctor?: string;
  servicio?: string;
  responsable?: string;
  proximo_contacto?: string;
}

function buildTable(clients: Client[], showEncargada: boolean): string {
  const rows = clients.map((c, i) => {
    const bg = i % 2 === 0 ? "#ffffff" : "#f0f7ff";
    const fecha = c.proximo_contacto
      ? new Date(c.proximo_contacto + "T12:00:00").toLocaleDateString("es-PE")
      : "—";
    return `<tr style="background:${bg}">
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-weight:600">${c.nombre}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0">${c.telefono || "—"}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0">${c.doctor || "—"}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0">${c.servicio || "—"}</td>
      ${showEncargada ? `<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0">${c.responsable || "—"}</td>` : ""}
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0">${fecha}</td>
    </tr>`;
  }).join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:13px;background:white;border-radius:8px;overflow:hidden;border:1px solid #eee">
    <thead><tr style="background:#1565C0;color:white">
      <th style="padding:10px 12px;text-align:left">Nombre</th>
      <th style="padding:10px 12px;text-align:left">Teléfono</th>
      <th style="padding:10px 12px;text-align:left">Doctor</th>
      <th style="padding:10px 12px;text-align:left">Servicio</th>
      ${showEncargada ? '<th style="padding:10px 12px;text-align:left">Encargada</th>' : ""}
      <th style="padding:10px 12px;text-align:left">Próximo contacto</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];
    const fechaHoy = today.toLocaleDateString("es-PE", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const { data: clients, error } = await supabaseIfc
      .from("clients")
      .select("*")
      .lte("proximo_contacto", todayStr)
      .neq("estado", "Contactado")
      .neq("estado", "Agendado");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!clients?.length) {
      return NextResponse.json({ sent: 0, total: 0, message: "No hay clientes pendientes para hoy" });
    }

    const byEmail: Record<string, { name: string; clients: Client[] }> = {};
    clients.forEach((c: Client) => {
      const email = ENCARGADA_EMAILS[c.responsable ?? ""];
      if (!email) return;
      if (!byEmail[email]) byEmail[email] = { name: c.responsable!, clients: [] };
      byEmail[email].clients.push(c);
    });

    for (const [email, { name, clients: list }] of Object.entries(byEmail)) {
      const sorted = [...list].sort((a, b) =>
        (a.proximo_contacto ?? "").localeCompare(b.proximo_contacto ?? "")
      );
      const html = `<div style="font-family:'Segoe UI',sans-serif;max-width:620px;color:#222">
        <div style="background:#1565C0;padding:18px 24px;border-radius:10px 10px 0 0">
          <h2 style="color:white;margin:0;font-size:18px">IFC · Clientes para llamar hoy</h2>
          <p style="color:rgba(255,255,255,.75);margin:4px 0 0;font-size:13px">${fechaHoy}</p>
        </div>
        <div style="background:#f9f9f9;padding:16px 24px;border:1px solid #e8e8e8;border-top:none;border-radius:0 0 10px 10px">
          <p style="margin:0 0 14px;font-size:14px">Hola <strong>${name}</strong>, tienes <strong>${list.length}</strong> cliente(s) para contactar hoy:</p>
          ${buildTable(sorted, false)}
        </div>
      </div>`;
      await resend.emails.send({
        from: "IFC Seguimiento <onboarding@resend.dev>",
        to: email,
        subject: `IFC · ${list.length} cliente(s) para llamar hoy`,
        html,
      });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      const sorted = [...clients].sort((a: Client, b: Client) =>
        (a.responsable ?? "").localeCompare(b.responsable ?? "")
      );
      await resend.emails.send({
        from: "IFC Seguimiento <onboarding@resend.dev>",
        to: adminEmail,
        subject: `IFC · Resumen diario — ${clients.length} cliente(s) hoy`,
        html: `<div style="font-family:'Segoe UI',sans-serif;max-width:700px;color:#222">
          <div style="background:#1565C0;padding:18px 24px;border-radius:10px 10px 0 0">
            <h2 style="color:white;margin:0;font-size:18px">IFC · Resumen diario</h2>
            <p style="color:rgba(255,255,255,.75);margin:4px 0 0;font-size:13px">${fechaHoy}</p>
          </div>
          <div style="background:#f9f9f9;padding:16px 24px;border:1px solid #e8e8e8;border-top:none;border-radius:0 0 10px 10px">
            <p style="margin:0 0 14px;font-size:14px"><strong>${clients.length}</strong> clientes pendientes hoy.</p>
            ${buildTable(sorted, true)}
          </div>
        </div>`,
      });
    }

    return NextResponse.json({ sent: Object.keys(byEmail).length, total: clients.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

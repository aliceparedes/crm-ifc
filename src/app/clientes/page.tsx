"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import ClientModal from "@/components/ClientModal";
import ClientUploadModal from "@/components/ClientUploadModal";

const ENCARGADAS_LIST = ["Lilian", "Heydi", "Miriam"];
const ENCARGADA_COLORS: Record<string, string> = {
  Lilian: "#1565C0",
  Heydi:  "#8e44ad",
  Miriam: "#e67e22",
};

interface Client {
  id: string;
  nombre: string;
  dni?: string;
  ultima_visita?: string;
  doctor?: string;
  servicio?: string;
  responsable?: string;
  telefono?: string;
  correo?: string;
  proximo_contacto?: string;
  estado?: string;
  observaciones?: string;
}

function normalize(name: string | undefined) {
  return name || "Sin asignar";
}

function urgency(dateStr: string | undefined) {
  if (!dateStr) return "sin-fecha";
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - t.getTime()) / 86400000);
  if (diff < 0)   return "atrasado";
  if (diff === 0) return "hoy";
  if (diff <= 7)  return "semana";
  if (diff <= 31) return "mes";
  return "futuro";
}

function daysDiff(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

function UrgencyBadge({ dateStr, isContacted }: { dateStr?: string; isContacted?: boolean }) {
  if (isContacted) return <span className="badge badge-teal">Contactado</span>;
  const u = urgency(dateStr);
  const diff = daysDiff(dateStr);
  if (u === "atrasado") return <span className="badge badge-red">Atrasado {Math.abs(diff!)}d</span>;
  if (u === "hoy")      return <span className="badge badge-red">Hoy</span>;
  if (u === "semana")   return <span className="badge badge-amber">En {diff}d</span>;
  if (u === "mes")      return <span className="badge badge-green">En {diff}d</span>;
  return <span className="badge badge-gray">Futuro</span>;
}

function ClientRow({ c, isContacted, onEdit, onStatus, onAssign, statusMenu, setStatusMenu }: {
  c: Client;
  isContacted?: boolean;
  onEdit: (c: Client) => void;
  onStatus: (c: Client, s: string) => void;
  onAssign: (c: Client, r: string | null) => void;
  statusMenu: string | null;
  setStatusMenu: (id: string | null) => void;
}) {
  const u = urgency(c.proximo_contacto);
  const estado = c.estado || "Por Contactar";
  const dot = isContacted ? "#ccc" :
    (u === "atrasado" || u === "hoy") ? "#e74c3c" :
    u === "semana" ? "#f0a500" : "#1565C0";
  const respColor = ENCARGADA_COLORS[normalize(c.responsable)];
  const waMsg = encodeURIComponent(`Hola ${c.nombre?.split(" ").slice(-2).join(" ")}, le contactamos desde IFC para hacer seguimiento a su tratamiento. ¿Cómo se ha sentido?`);
  const waLink = c.telefono ? `https://wa.me/51${c.telefono.replace(/\D/g, "")}?text=${waMsg}` : null;

  return (
    <tr className={`border-b border-gray-50 hover:bg-blue-50/20 transition-colors ${isContacted ? "opacity-50" : ""}`}>
      <td className="py-2.5 px-2.5">
        <span className="inline-block w-2 h-2 rounded-full" style={{ background: dot }} />
      </td>
      <td className="py-2.5 px-2.5 max-w-[200px]">
        <div className="font-semibold text-gray-900 leading-snug">{c.nombre}</div>
        {c.dni && <div className="text-[11px] text-gray-400">DNI: {c.dni}</div>}
        {c.observaciones && (
          <div className="text-[11px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 mt-0.5 line-clamp-1" title={c.observaciones}>
            {c.observaciones}
          </div>
        )}
      </td>
      <td className="py-2.5 px-2.5 whitespace-nowrap">
        <span className="text-gray-600 mr-1.5">
          {c.proximo_contacto ? new Date(c.proximo_contacto + "T12:00:00").toLocaleDateString("es-PE") : "—"}
        </span>
        <UrgencyBadge dateStr={c.proximo_contacto} isContacted={isContacted} />
      </td>
      <td className="py-2.5 px-2.5 text-gray-600">
        <div>{c.doctor || "—"}</div>
        {c.servicio && <div className="text-[11px] text-gray-400">{c.servicio}</div>}
      </td>
      <td className="py-2.5 px-2.5">
        <select
          value={c.responsable || ""}
          onChange={(e) => onAssign(c, e.target.value || null)}
          onClick={(e) => e.stopPropagation()}
          className="text-xs font-semibold rounded-md px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-300"
          style={{
            background: respColor ? respColor + "18" : "#f1f1f1",
            color: respColor || "#888",
          }}>
          <option value="">Sin asignar</option>
          {ENCARGADAS_LIST.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </td>
      <td className="py-2.5 px-2.5 text-gray-600">
        {c.telefono ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs">{c.telefono}</span>
            {waLink && (
              <a href={waLink} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                className="text-green-600 hover:text-green-700 transition-colors flex-shrink-0" title="WhatsApp">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </a>
            )}
          </div>
        ) : "—"}
      </td>
      <td className="py-2.5 px-2.5">
        <div className="status-wrap relative inline-block">
          <button
            onClick={(e) => { e.stopPropagation(); setStatusMenu(statusMenu === c.id ? null : c.id); }}
            className={`text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1 ${
              estado === "Contactado"   ? "bg-blue-50 text-[#1565C0]" :
              estado === "Agendado"    ? "bg-[#1565C0] text-white" :
              estado === "No Responde" ? "bg-pink-50 text-pink-800" :
              "bg-red-50 text-red-700"
            }`}>
            {estado} <span className="opacity-60">▾</span>
          </button>
          {statusMenu === c.id && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden min-w-[150px]" onClick={(e) => e.stopPropagation()}>
              {["Por Contactar", "No Responde", "Contactado", "Agendado"].map((s) => (
                <div key={s} onClick={() => onStatus(c, s)}
                  className="px-3.5 py-2.5 text-sm font-semibold cursor-pointer hover:bg-gray-50 border-b border-gray-50 last:border-0 text-gray-700">
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>
      </td>
      <td className="py-2.5 px-2.5">
        <button onClick={() => onEdit(c)} className="text-xs text-gray-400 hover:text-[#1565C0] font-medium transition-colors">
          Editar
        </button>
      </td>
    </tr>
  );
}

export default function ClientesPage() {
  const [clients,       setClients]       = useState<Client[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState("hoy");
  const [search,        setSearch]        = useState("");
  const [fResp,         setFResp]         = useState("");
  const [fDoctor,       setFDoctor]       = useState("");
  const [fEstado,       setFEstado]       = useState("");
  const [editClient,    setEditClient]    = useState<Client | null | Partial<Client>>(null);
  const [showUpload,    setShowUpload]    = useState(false);
  const [statusMenu,    setStatusMenu]    = useState<string | null>(null);
  const [sending,       setSending]       = useState(false);
  const [sendResult,    setSendResult]    = useState<string | null>(null);
  const [soloRecientes, setSoloRecientes] = useState(true);
  const [lastUpdated,   setLastUpdated]   = useState<Date | null>(null);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchClients = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/clients");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Error loading clients:", e);
      if (!silent) setClients([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  useEffect(() => {
    refreshRef.current = setInterval(() => fetchClients(true), 90_000);
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, [fetchClients]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!(e.target as Element).closest(".status-wrap")) setStatusMenu(null);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  async function sendDailyEmails() {
    setSending(true); setSendResult(null);
    try {
      const res = await fetch("/api/send-daily", { method: "POST" });
      const data = await res.json();
      setSendResult(data.error
        ? `Error: ${data.error}`
        : data.total === 0
          ? "No hay clientes pendientes para hoy."
          : `Emails enviados: ${data.sent} encargada(s), ${data.total} clientes.`
      );
    } catch {
      setSendResult("Error al enviar emails.");
    } finally {
      setSending(false);
      setTimeout(() => setSendResult(null), 5000);
    }
  }

  async function updateResponsable(client: Client, newResp: string | null) {
    setClients((prev) => prev.map((c) => c.id === client.id ? { ...c, responsable: newResp ?? undefined } : c));
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responsable: newResp }),
      });
      if (!res.ok) throw new Error();
    } catch {
      fetchClients();
    }
  }

  async function updateStatus(client: Client, newStatus: string) {
    setStatusMenu(null);
    const body: Record<string, string> = { estado: newStatus };
    if (newStatus === "Agendado") {
      const d = new Date(); d.setMonth(d.getMonth() + 1);
      body.proximo_contacto = d.toISOString().split("T")[0];
      body.ultima_visita    = new Date().toISOString().split("T")[0];
    }
    setClients((prev) => prev.map((c) => c.id === client.id ? { ...c, ...body } : c));
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
    } catch {
      fetchClients();
    }
  }

  const yearStart     = `${new Date().getFullYear()}-01-01`;
  const doctorsList   = [...new Set(clients.map((c) => c.doctor).filter(Boolean))].sort() as string[];

  const baseFiltered = clients.filter((c) => {
    const s = search.toLowerCase();
    const desdeEnero = !soloRecientes || (c.ultima_visita && c.ultima_visita >= yearStart);
    return desdeEnero &&
      (!s       || c.nombre?.toLowerCase().includes(s) || c.dni?.includes(s)) &&
      (!fDoctor || c.doctor === fDoctor) &&
      (!fEstado || c.estado === fEstado);
  });

  const encargadaCounts = Object.fromEntries(
    ENCARGADAS_LIST.map((n) => [n, baseFiltered.filter((c) => normalize(c.responsable) === n).length])
  );

  const filtered = baseFiltered.filter((c) => !fResp || normalize(c.responsable) === fResp);

  function tabMatch(c: Client, t: string) {
    if (c.estado === "Agendado") return t === "todos";
    const u = urgency(c.proximo_contacto);
    if (t === "hoy")    return u === "hoy" || u === "atrasado";
    if (t === "semana") return ["hoy", "atrasado", "semana"].includes(u);
    if (t === "mes")    return ["hoy", "atrasado", "semana", "mes"].includes(u);
    return true;
  }

  const tabFiltered = filtered.filter((c) => tabMatch(c, tab));
  const pending     = tabFiltered.filter((c) => c.estado !== "Contactado").sort((a, b) => {
    if (!a.proximo_contacto) return 1;
    if (!b.proximo_contacto) return -1;
    return new Date(a.proximo_contacto).getTime() - new Date(b.proximo_contacto).getTime();
  });
  const contacted   = tabFiltered.filter((c) => c.estado === "Contactado");

  const pendingAll = filtered.filter((c) => c.estado !== "Contactado" && c.estado !== "Agendado");
  const mHoy = pendingAll.filter((c) => urgency(c.proximo_contacto) === "hoy").length;
  const mAtr = pendingAll.filter((c) => urgency(c.proximo_contacto) === "atrasado").length;
  const mMes = pendingAll.filter((c) => ["hoy", "atrasado", "semana", "mes"].includes(urgency(c.proximo_contacto))).length;

  const thisMonth = filtered.filter((c) => ["hoy", "atrasado", "semana", "mes"].includes(urgency(c.proximo_contacto)));
  const perfStats = Object.fromEntries(ENCARGADAS_LIST.map((n) => [n, { total: 0, done: 0, agendado: 0, noResponde: 0 }]));
  thisMonth.forEach((c) => {
    const g = normalize(c.responsable);
    if (!perfStats[g]) return;
    perfStats[g].total++;
    if (c.estado === "Contactado") perfStats[g].done++;
    if (c.estado === "Agendado")   { perfStats[g].done++; perfStats[g].agendado++; }
    if (c.estado === "No Responde") perfStats[g].noResponde++;
  });

  const today = new Date().toLocaleDateString("es-PE", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      {/* Topbar */}
      <div className="bg-[#1565C0] text-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Seguimiento de Clientes</h1>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs opacity-70">{today}</span>
            {lastUpdated && (
              <span className="text-[10px] opacity-50">
                Actualizado {lastUpdated.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <button onClick={() => fetchClients()} title="Actualizar"
            className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1.5 rounded-lg font-medium transition-colors">↻</button>
          <button onClick={sendDailyEmails} disabled={sending}
            className="text-xs bg-white/20 hover:bg-white/30 disabled:opacity-50 px-3 py-1.5 rounded-lg font-medium transition-colors">
            {sending ? "Enviando..." : "📧 Emails hoy"}
          </button>
          <button onClick={() => setShowUpload(true)}
            className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg font-medium transition-colors">
            Subir Excel
          </button>
          <button onClick={() => setEditClient({})}
            className="text-xs bg-white text-[#1565C0] hover:bg-blue-50 px-3 py-1.5 rounded-lg font-semibold transition-colors">
            + Nuevo cliente
          </button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 py-5">

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Clientes activos", val: filtered.length,  color: "" },
            { label: "Llamar hoy",       val: mHoy,             color: "text-red-600" },
            { label: "Atrasados",        val: mAtr,             color: "text-amber-600" },
            { label: "Este mes",         val: mMes,             color: "text-[#1565C0]" },
          ].map((m) => (
            <div key={m.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">{m.label}</div>
              <div className={`text-[26px] font-semibold ${m.color || "text-gray-900"}`}>{m.val}</div>
            </div>
          ))}
        </div>

        {/* Performance bars */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Rendimiento por encargada — este mes
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {ENCARGADAS_LIST.map((name) => {
              const s = perfStats[name];
              const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
              const color = ENCARGADA_COLORS[name];
              return (
                <div key={name}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-semibold text-gray-800">{name}</span>
                    <span className="text-sm font-bold" style={{ color }}>{pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <div className="flex gap-3 text-[11px] text-gray-400">
                    <span style={{ color, fontWeight: 600 }}>{s.done}/{s.total} llamadas</span>
                    <span>{s.agendado} agendados</span>
                    <span className="text-red-500">{s.noResponde} no responde</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 mb-4 -mt-1 overflow-x-auto">
            {[
              { key: "hoy",    label: "Llamar hoy" },
              { key: "semana", label: "Esta semana" },
              { key: "mes",    label: "Este mes" },
              { key: "todos",  label: "Todos" },
            ].map(({ key, label }) => {
              const count = filtered.filter((c) => tabMatch(c, key)).length;
              return (
                <button key={key} onClick={() => setTab(key)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    tab === key ? "border-[#1565C0] text-[#1565C0]" : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}>
                  {label}
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                    tab === key ? "bg-[#1565C0] text-white" : "bg-gray-100 text-gray-500"
                  }`}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex gap-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o DNI..."
                className="input flex-1" />
              <button onClick={() => setSoloRecientes((v) => !v)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors whitespace-nowrap ${
                  soloRecientes ? "bg-[#1565C0] text-white border-[#1565C0]" : "bg-white text-gray-500 border-gray-300 hover:border-gray-400"
                }`}>
                {soloRecientes ? "📅 Desde ene 2026" : "📅 Todos los años"}
              </button>
              {(fResp || fDoctor || fEstado) && (
                <button onClick={() => { setFResp(""); setFDoctor(""); setFEstado(""); }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 font-medium whitespace-nowrap">
                  ✕ Limpiar
                </button>
              )}
            </div>

            <div className="flex gap-1.5 flex-wrap items-center">
              <span className="text-[11px] text-gray-400 font-medium mr-1">Encargada:</span>
              {ENCARGADAS_LIST.map((name) => {
                const color = ENCARGADA_COLORS[name] || "#555";
                const active = fResp === name;
                return (
                  <button key={name} onClick={() => setFResp(active ? "" : name)}
                    className="text-xs px-3 py-1 rounded-full border font-semibold transition-all flex items-center gap-1.5"
                    style={active
                      ? { background: color, color: "white", borderColor: color }
                      : { background: "white", color, borderColor: color + "66" }}>
                    {name} <span className="font-normal opacity-75">{encargadaCounts[name] || 0}</span>
                  </button>
                );
              })}
            </div>

            {doctorsList.length > 0 && (
              <div className="flex gap-1.5 flex-wrap items-center">
                <span className="text-[11px] text-gray-400 font-medium mr-1">Doctor:</span>
                {doctorsList.map((doc) => {
                  const active = fDoctor === doc;
                  return (
                    <button key={doc} onClick={() => setFDoctor(active ? "" : doc)}
                      className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${
                        active ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
                      }`}>
                      {doc}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex gap-1.5 flex-wrap items-center">
              <span className="text-[11px] text-gray-400 font-medium mr-1">Estado:</span>
              {["Por Contactar", "No Responde", "Contactado", "Agendado"].map((est) => {
                const active = fEstado === est;
                const colors: Record<string, { bg: string; text: string; activeBg: string }> = {
                  "Por Contactar": { bg: "#fdecea", text: "#c0392b", activeBg: "#c0392b" },
                  "No Responde":   { bg: "#fde8f0", text: "#8a1a42", activeBg: "#8a1a42" },
                  "Contactado":    { bg: "#e8f0fb", text: "#1565C0", activeBg: "#1565C0" },
                  "Agendado":      { bg: "#e8f0fb", text: "#1565C0", activeBg: "#1565C0" },
                };
                const c = colors[est];
                return (
                  <button key={est} onClick={() => setFEstado(active ? "" : est)}
                    className="text-xs px-3 py-1 rounded-full border font-medium transition-all"
                    style={active
                      ? { background: c.activeBg, color: "white", borderColor: c.activeBg }
                      : { background: c.bg, color: c.text, borderColor: c.bg }}>
                    {est}
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Cargando clientes...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_#f0f0f0]">
                  <tr>
                    {["", "Cliente", "Próximo contacto", "Doctor / Servicio", "Encargada", "Teléfono", "Estado", ""].map((h, i) => (
                      <th key={i} className="text-left py-2.5 px-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pending.map((c) => (
                    <ClientRow key={c.id} c={c} onEdit={setEditClient as (c: Client) => void}
                      onStatus={updateStatus} onAssign={updateResponsable}
                      statusMenu={statusMenu} setStatusMenu={setStatusMenu} />
                  ))}
                  {contacted.length > 0 && (
                    <>
                      <tr>
                        <td colSpan={8} className="py-2 px-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-y border-gray-100">
                          Contactados ({contacted.length})
                        </td>
                      </tr>
                      {contacted.map((c) => (
                        <ClientRow key={c.id} c={c} isContacted onEdit={setEditClient as (c: Client) => void}
                          onStatus={updateStatus} onAssign={updateResponsable}
                          statusMenu={statusMenu} setStatusMenu={setStatusMenu} />
                      ))}
                    </>
                  )}
                  {tabFiltered.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-10 text-gray-400">No hay clientes con los filtros aplicados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editClient !== null && (
        <ClientModal
          client={editClient as Parameters<typeof ClientModal>[0]["client"]}
          onClose={() => setEditClient(null)}
          onSave={() => { setEditClient(null); fetchClients(); }}
        />
      )}

      {showUpload && (
        <ClientUploadModal
          onClose={() => setShowUpload(false)}
          onDone={() => { setShowUpload(false); fetchClients(); }}
        />
      )}

      {sendResult && (
        <div className="fixed bottom-6 right-6 bg-[#1565C0] text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium z-50">
          {sendResult}
        </div>
      )}
    </div>
  );
}

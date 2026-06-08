"use client";
import { useState } from "react";

const DOCTORS    = ["Miguel Moltavan", "Rosa Campos", "Camila Villalta"];
const ENCARGADAS = ["Lilian", "Heydi", "Miriam"];
const SERVICIOS  = ["Mesoterapia", "Consulta", "Cirugia", "Medicamentos/Tratamiento"];
const ESTADOS    = ["Por Contactar", "No Responde", "Contactado", "Agendado"];

interface ClientRecord {
  id?: string;
  nombre?: string;
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

interface Props {
  client: ClientRecord;
  onClose: () => void;
  onSave: () => void;
}

export default function ClientModal({ client, onClose, onSave }: Props) {
  const isNew = !client?.id;

  const [form, setForm] = useState({
    nombre:           client?.nombre           ?? "",
    dni:              client?.dni              ?? "",
    ultima_visita:    client?.ultima_visita    ?? "",
    doctor:           client?.doctor           ?? "",
    servicio:         client?.servicio         ?? "",
    responsable:      client?.responsable      ?? "",
    telefono:         client?.telefono         ?? "",
    correo:           client?.correo           ?? "",
    proximo_contacto: client?.proximo_contacto ?? "",
    estado:           client?.estado           ?? "Por Contactar",
    observaciones:    client?.observaciones    ?? "",
  });

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  function set(field: string, val: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: val };
      if (field === "ultima_visita" && val && !prev.proximo_contacto) {
        const d = new Date(val);
        d.setMonth(d.getMonth() + 1);
        next.proximo_contacto = d.toISOString().split("T")[0];
      }
      return next;
    });
  }

  async function handleSave() {
    if (!form.nombre.trim()) { setError("El nombre es obligatorio."); return; }
    setSaving(true); setError("");
    try {
      const url    = isNew ? "/api/clients" : `/api/clients/${client.id}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Error al guardar");
      }
      onSave();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar a ${client.nombre}?`)) return;
    await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
    onSave();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{isNew ? "Nuevo cliente" : "Editar cliente"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="lbl">Nombre completo *</label>
            <input className="input" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="APELLIDO NOMBRE" />
          </div>
          <div>
            <label className="lbl">DNI</label>
            <input className="input" value={form.dni} onChange={(e) => set("dni", e.target.value)} placeholder="12345678" />
          </div>
          <div>
            <label className="lbl">Teléfono</label>
            <input className="input" value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="999999999" />
          </div>
          <div>
            <label className="lbl">Correo</label>
            <input className="input" type="email" value={form.correo} onChange={(e) => set("correo", e.target.value)} placeholder="cliente@email.com" />
          </div>
          <div>
            <label className="lbl">Última visita</label>
            <input className="input" type="date" value={form.ultima_visita} onChange={(e) => set("ultima_visita", e.target.value)} />
          </div>
          <div>
            <label className="lbl">Próximo contacto</label>
            <input className="input" type="date" value={form.proximo_contacto} onChange={(e) => set("proximo_contacto", e.target.value)} />
          </div>
          <div>
            <label className="lbl">Doctor</label>
            <select className="input" value={form.doctor} onChange={(e) => set("doctor", e.target.value)}>
              <option value="">Seleccionar</option>
              {DOCTORS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="lbl">Servicio</label>
            <select className="input" value={form.servicio} onChange={(e) => set("servicio", e.target.value)}>
              <option value="">Seleccionar</option>
              {SERVICIOS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="lbl">Encargada</label>
            <select className="input" value={form.responsable} onChange={(e) => set("responsable", e.target.value)}>
              <option value="">Seleccionar</option>
              {ENCARGADAS.map((e) => <option key={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="lbl">Estado</label>
            <select className="input" value={form.estado} onChange={(e) => set("estado", e.target.value)}>
              {ESTADOS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="lbl">Observaciones</label>
            <textarea className="input resize-none h-20" value={form.observaciones}
              onChange={(e) => set("observaciones", e.target.value)} placeholder="Notas adicionales..." />
          </div>
          {error && <div className="col-span-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <div>
            {!isNew && (
              <button onClick={handleDelete} className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors">
                Eliminar cliente
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? "Guardando..." : isNew ? "Agregar cliente" : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .lbl { display:block; font-size:12px; font-weight:600; color:#555; margin-bottom:5px; text-transform:uppercase; letter-spacing:.03em; }
      `}</style>
    </div>
  );
}

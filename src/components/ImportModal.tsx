"use client";
import React, { useState, useRef } from "react";
import { X, Plus, Trash2, Upload, AlertCircle } from "lucide-react";
import { ImportRow, DataRow } from "@/lib/types";
import { parseImportRows, parseProductReport, isProductReport } from "@/lib/utils";

interface ImportModalProps {
  onClose: () => void;
  onImport: (rows: DataRow[]) => void;
}

const EMPTY_ROW = (): ImportRow => ({
  nombre: "",
  tipoDoc: "DNI",
  doc: "",
  fecha: "",
  cantidad: 1,
  total: 0,
  clasificacion: "Tratamientos, Mesoterapia",
});

const CLASIFICACIONES = [
  "Tratamientos",
  "Mesoterapia",
  "Tratamientos, Mesoterapia",
  "Consulta",
  "Medicamentos",
  "Cirugías",
  "Otros",
];

export default function ImportModal({ onClose, onImport }: ImportModalProps) {
  const [rows, setRows] = useState<ImportRow[]>([EMPTY_ROW()]);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function updateRow(idx: number, field: keyof ImportRow, value: string | number) {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  function addRow() {
    setRows((prev) => [...prev, EMPTY_ROW()]);
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit() {
    setError("");
    const filled = rows.filter((r) => r.nombre && r.fecha && r.total > 0);
    if (!filled.length) {
      setError("Por favor completa al menos una fila con nombre, fecha y monto.");
      return;
    }
    const parsed = parseImportRows(filled);
    if (!parsed.length) {
      setError("No se pudieron procesar las filas. Verifica el formato de fecha (DD-MM-YYYY).");
      return;
    }
    onImport(parsed);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: false, defval: "" });

      if (!jsonData.length) {
        setError("No se encontraron filas válidas en el archivo.");
        return;
      }

      // Detect product report format
      if (isProductReport(jsonData)) {
        const parsed = parseProductReport(jsonData);
        if (!parsed.length) {
          setError("No se pudieron leer los productos. Verifica el archivo.");
          return;
        }
        onImport(parsed);
        return;
      }

      // Fallback: client report format
      const mapped: ImportRow[] = jsonData.map((r) => {
        const get = (...keys: string[]) => {
          for (const k of keys) {
            const found = Object.keys(r).find(
              (rk) => rk.toLowerCase().replace(/\s+/g, " ").trim() === k.toLowerCase()
            );
            if (found) return String(r[found] || "");
          }
          return "";
        };
        return {
          nombre: get("nombres y apellidos", "nombre", "cliente"),
          tipoDoc: get("tipo de documento", "tipo doc", "tipodoc") || "DNI",
          doc: get("número de documento", "numero de documento", "documento", "doc", "dni"),
          fecha: get("ultima fecha de compra", "fecha", "fecha de compra"),
          cantidad: parseFloat(get("cantidad de compras", "cantidad")) || 1,
          total: parseFloat(get("total de compras", "total", "monto")) || 0,
          clasificacion: get("clasificación de servicio", "clasificacion de servicio", "clasificacion", "servicio") || "Tratamientos",
        };
      });

      if (mapped.length > 0) {
        setRows(mapped);
        setError("");
      } else {
        setError("No se encontraron filas válidas en el archivo.");
      }
    } catch {
      setError("Error al leer el archivo. Asegúrate de que sea un .xlsx válido.");
    }
  }

  const inputStyle = {
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    color: "var(--text)",
    padding: "6px 8px",
    fontSize: 12,
    outline: "none",
    width: "100%",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "24px 16px",
        overflowY: "auto",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          width: "100%",
          maxWidth: 1100,
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>
              Agregar Ingresos
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              Ingresa los datos manualmente o sube un archivo .xlsx con el formato del reporte
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          {/* Upload section */}
          <div style={{ marginBottom: 20 }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: "1px dashed var(--border)",
                borderRadius: 8,
                padding: "16px 20px",
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: 12,
                color: "var(--text-muted)",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent2)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            >
              <Upload size={18} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: 13 }}>
                Subir <strong>Reporte de Producto Vendidos</strong> (.xlsx) — se detecta automáticamente el mes y los productos
              </span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFile}
              style={{ display: "none" }}
            />
          </div>

          {/* Columns header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 80px 90px 110px 60px 90px 1.5fr 32px",
              gap: 8,
              padding: "0 4px 8px",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--accent)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              borderBottom: "1px solid var(--border)",
              marginBottom: 8,
            }}
          >
            <span>Nombres y Apellidos</span>
            <span>Tipo Doc</span>
            <span>Documento</span>
            <span>Fecha</span>
            <span>Cant.</span>
            <span>Total S/.</span>
            <span>Clasificación</span>
            <span></span>
          </div>

          {/* Rows */}
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {rows.map((row, idx) => (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 80px 90px 110px 60px 90px 1.5fr 32px",
                  gap: 8,
                  marginBottom: 6,
                  alignItems: "center",
                }}
              >
                <input
                  style={inputStyle}
                  value={row.nombre}
                  placeholder="APELLIDOS Y NOMBRES"
                  onChange={(e) => updateRow(idx, "nombre", e.target.value)}
                />
                <select
                  style={inputStyle}
                  value={row.tipoDoc}
                  onChange={(e) => updateRow(idx, "tipoDoc", e.target.value)}
                >
                  <option>DNI</option>
                  <option>CE</option>
                  <option>EXTRANJERO</option>
                  <option>Sin tipo</option>
                </select>
                <input
                  style={inputStyle}
                  value={row.doc}
                  placeholder="12345678"
                  onChange={(e) => updateRow(idx, "doc", e.target.value)}
                />
                <input
                  style={inputStyle}
                  value={row.fecha}
                  placeholder="DD-MM-YYYY"
                  onChange={(e) => updateRow(idx, "fecha", e.target.value)}
                />
                <input
                  style={inputStyle}
                  type="number"
                  min={1}
                  value={row.cantidad}
                  onChange={(e) => updateRow(idx, "cantidad", parseFloat(e.target.value) || 0)}
                />
                <input
                  style={inputStyle}
                  type="number"
                  min={0}
                  step={0.01}
                  value={row.total}
                  onChange={(e) => updateRow(idx, "total", parseFloat(e.target.value) || 0)}
                />
                <select
                  style={inputStyle}
                  value={row.clasificacion}
                  onChange={(e) => updateRow(idx, "clasificacion", e.target.value)}
                >
                  {CLASIFICACIONES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                  <option value={row.clasificacion}>
                    {!CLASIFICACIONES.includes(row.clasificacion) ? row.clasificacion : undefined}
                  </option>
                </select>
                <button
                  onClick={() => removeRow(idx)}
                  disabled={rows.length === 1}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: rows.length === 1 ? "default" : "pointer",
                    color: rows.length === 1 ? "var(--border)" : "#EF5350",
                    padding: 4,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Add row */}
          <button
            onClick={addRow}
            style={{
              marginTop: 12,
              background: "none",
              border: "1px dashed var(--accent)",
              borderRadius: 6,
              padding: "8px 16px",
              cursor: "pointer",
              color: "var(--accent)",
              fontSize: 12,
              display: "flex", alignItems: "center", gap: 6,
              width: "100%",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            <Plus size={14} />
            Agregar fila
          </button>

          {error && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 14px",
                background: "#EF535022",
                border: "1px solid #EF535055",
                borderRadius: 6,
                color: "#EF5350",
                fontSize: 12,
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex", justifyContent: "flex-end", gap: 10,
            padding: "16px 24px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              background: "var(--surface2)",
              border: "1px solid var(--accent)",
              borderRadius: 8,
              color: "var(--accent)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: "10px 24px",
              background: "var(--accent)",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            Agregar al Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

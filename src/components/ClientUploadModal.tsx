"use client";
import { useState, useRef } from "react";

interface Props {
  onClose: () => void;
  onDone: () => void;
}

interface UploadResult {
  inserted: number;
  updated: number;
  skipped: number;
  total: number;
}

export default function ClientUploadModal({ onClose, onDone }: Props) {
  const [file,     setFile]     = useState<File | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<UploadResult | null>(null);
  const [error,    setError]    = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File | null) {
    if (!f) return;
    if (!f.name.match(/\.(xlsx|xls)$/i)) { setError("Solo se admiten archivos .xlsx o .xls"); return; }
    setFile(f); setError(""); setResult(null);
  }

  async function handleUpload() {
    if (!file) return;
    setLoading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-clients", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al subir");
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al subir");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Subir base de datos Excel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="px-6 py-5">
          {!result ? (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragging ? "border-[#1a56a0] bg-blue-50" : "border-gray-200 hover:border-[#1a56a0] hover:bg-blue-50/30"
                }`}>
                <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
                <div className="text-3xl mb-2">📄</div>
                {file ? (
                  <div>
                    <div className="font-semibold text-gray-800">{file.name}</div>
                    <div className="text-sm text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB</div>
                  </div>
                ) : (
                  <div>
                    <div className="font-medium text-gray-600">Arrastra tu archivo aquí</div>
                    <div className="text-sm text-gray-400 mt-1">o haz clic para seleccionar</div>
                    <div className="text-xs text-gray-300 mt-1">.xlsx o .xls</div>
                  </div>
                )}
              </div>

              <div className="mt-4 bg-gray-50 rounded-lg p-3">
                <div className="text-xs font-semibold text-gray-500 mb-2">Columnas reconocidas en tu Excel:</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                  {[
                    ["Nombre", "Obligatorio"],
                    ["DNI", "Opcional"],
                    ["Fecha / Ultima Visita", "Fecha visita"],
                    ["Teléfono", "Opcional"],
                    ["Doctor", "Opcional"],
                    ["Servicio", "Opcional"],
                    ["Encargada", "Opcional"],
                    ["Estado", "Opcional"],
                    ["Proximo Contacto", "Auto si vacío"],
                    ["Observaciones", "Opcional"],
                  ].map(([col, note]) => (
                    <div key={col} className="flex justify-between">
                      <span className="font-medium text-gray-700">{col}</span>
                      <span className="text-gray-400">{note}</span>
                    </div>
                  ))}
                </div>
              </div>

              {error && <div className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
            </>
          ) : (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">✅</div>
              <div className="font-semibold text-gray-900 text-lg mb-4">Carga completada</div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-700">{result.inserted}</div>
                  <div className="text-xs text-green-600">Nuevos</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-[#1a56a0]">{result.updated}</div>
                  <div className="text-xs text-[#1a56a0]">Actualizados</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-gray-500">{result.skipped}</div>
                  <div className="text-xs text-gray-400">Sin cambios</div>
                </div>
              </div>
              <div className="text-sm text-gray-400">{result.total} filas procesadas en total</div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end px-6 py-4 border-t border-gray-100">
          {!result ? (
            <>
              <button onClick={onClose} className="btn-secondary">Cancelar</button>
              <button onClick={handleUpload} disabled={!file || loading} className="btn-primary">
                {loading ? "Subiendo..." : "Subir archivo"}
              </button>
            </>
          ) : (
            <button onClick={onDone} className="btn-primary">Ver clientes actualizados</button>
          )}
        </div>
      </div>
    </div>
  );
}

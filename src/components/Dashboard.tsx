"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import { TrendingUp, Package, ShoppingBag, Plus, Trash2 } from "lucide-react";

import initialData from "@/lib/initialData.json";
import { DataRow } from "@/lib/types";
import {
  fmtMonth, fmtMoney, buildCategoryList, buildColorMap,
  getMonths, getCategories,
} from "@/lib/utils";
import KpiCard from "./KpiCard";
import ChartCard from "./ChartCard";
import ImportModal from "./ImportModal";

const INITIAL: DataRow[] = initialData as DataRow[];

const TOOLTIP_STYLE = {
  backgroundColor: "#ffffff",
  border: "1px solid #c8d8f0",
  borderRadius: 8,
  fontSize: 12,
  color: "#0d1f4a",
};

export default function Dashboard() {
  const [allRows, setAllRows] = useState<DataRow[]>(INITIAL);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const months = [...new Set(INITIAL.map((r) => r.mes))].sort();
    return months[months.length - 1];
  });
  const [showImport, setShowImport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(false);

  const loadFromDb = useCallback(async () => {
    try {
      const res = await fetch("/api/ventas");
      if (!res.ok) return;
      const data: DataRow[] = await res.json();
      if (data.length) {
        setAllRows(data);
        const months = [...new Set(data.map((r) => r.mes))].sort();
        setSelectedMonth(months[months.length - 1]);
        setDbReady(true);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadFromDb(); }, [loadFromDb]);

  const months = useMemo(() => getMonths(allRows), [allRows]);
  const allCats = useMemo(() => getCategories(allRows), [allRows]);
  const categories = useMemo(() => buildCategoryList(allCats), [allCats]);
  const colorMap = useMemo(() => buildColorMap(categories), [categories]);

  const monthData = useMemo(
    () => allRows.filter((r) => r.mes === selectedMonth),
    [allRows, selectedMonth]
  );

  // KPIs
  const totalVentas = useMemo(() => monthData.reduce((s, d) => s + d.monto, 0), [monthData]);
  const clientesUnicos = useMemo(() => new Set(monthData.map((d) => d.doc)).size, [monthData]);
  const totalOrdenes = useMemo(() => monthData.reduce((s, d) => s + d.ordenes, 0), [monthData]);

  // Chart 1: ventas por categoría del mes
  const catBarData = useMemo(() => {
    const byCat: Record<string, number> = {};
    monthData.forEach((d) => { byCat[d.categoria] = (byCat[d.categoria] || 0) + d.monto; });
    return categories
      .filter((c) => byCat[c])
      .map((c) => ({ name: c, monto: Math.round(byCat[c]) }));
  }, [monthData, categories]);

  // Chart 2: ordenes por categoría del mes
  const ordBarData = useMemo(() => {
    const byOrd: Record<string, number> = {};
    monthData.forEach((d) => { byOrd[d.categoria] = (byOrd[d.categoria] || 0) + d.ordenes; });
    return categories
      .filter((c) => byOrd[c])
      .map((c) => ({ name: c, ordenes: Math.round(byOrd[c]) }));
  }, [monthData, categories]);

  // Chart 3: evolutivo apilado
  const evolutivo = useMemo(() => {
    return months.map((m) => {
      const mRows = allRows.filter((r) => r.mes === m);
      const entry: Record<string, unknown> = { mes: fmtMonth(m) };
      categories.forEach((c) => {
        entry[c] = Math.round(mRows.filter((r) => r.categoria === c).reduce((s, r) => s + r.monto, 0));
      });
      entry._total = mRows.reduce((s, r) => s + r.monto, 0);
      return entry;
    });
  }, [allRows, months, categories]);

  // Chart 4: pie tipo doc
  const pieData = useMemo(() => {
    const byDoc: Record<string, number> = {};
    monthData.forEach((d) => { byDoc[d.tipoDoc] = (byDoc[d.tipoDoc] || 0) + d.monto; });
    return Object.entries(byDoc).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [monthData]);

  // Chart 5: top 10 clientes
  const topClientes = useMemo(() => {
    const byClient: Record<string, number> = {};
    monthData.forEach((d) => { byClient[d.nombre] = (byClient[d.nombre] || 0) + d.monto; });
    return Object.entries(byClient)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([nombre, monto]) => ({ nombre: nombre.split(" ").slice(0, 4).join(" "), monto: Math.round(monto) }));
  }, [monthData]);

  async function handleImport(newRows: DataRow[]) {
    try {
      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRows),
      });
      if (!res.ok) {
        const { error } = await res.json();
        alert(`Error al guardar: ${error}`);
        return;
      }
    } catch {
      alert("No se pudo conectar con la base de datos.");
      return;
    }
    setAllRows((prev) => [...prev, ...newRows]);
    const newMonths = [...new Set(newRows.map((r) => r.mes))].sort();
    if (newMonths.length) setSelectedMonth(newMonths[newMonths.length - 1]);
    setShowImport(false);
    setDbReady(true);
  }

  async function removeMonth(m: string) {
    if (!confirm(`¿Eliminar todos los datos de ${fmtMonth(m)}?`)) return;
    try {
      const res = await fetch(`/api/ventas?mes=${m}`, { method: "DELETE" });
      if (!res.ok) {
        const { error } = await res.json();
        alert(`Error al eliminar: ${error}`);
        return;
      }
    } catch {
      alert("No se pudo conectar con la base de datos.");
      return;
    }
    setAllRows((prev) => prev.filter((r) => r.mes !== m));
    const remaining = months.filter((x) => x !== m);
    if (remaining.length) setSelectedMonth(remaining[remaining.length - 1]);
  }

  const PIE_COLORS = ["#1565C0", "#1E88E5", "#42A5F5", "#0288D1", "#0277BD"];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Header */}
      <div
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.04em" }}>
            Instituto Facial y Capilar · Dashboard de Ventas
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Month selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                outline: "none",
              }}
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {fmtMonth(m)}
                </option>
              ))}
            </select>
            <button
              onClick={() => removeMonth(selectedMonth)}
              title="Eliminar mes seleccionado"
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--accent)",
                padding: "8px 10px",
                cursor: "pointer",
                display: "flex", alignItems: "center",
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Add button */}
          <button
            onClick={() => setShowImport(true)}
            style={{
              background: "var(--accent)",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              padding: "9px 16px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              display: "flex", alignItems: "center", gap: 6,
              letterSpacing: "0.04em",
            }}
          >
            <Plus size={15} />
            Agregar Mes
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ padding: "24px", maxWidth: 1400, margin: "0 auto" }}>
        {loading && (
          <div style={{ textAlign: "center", color: "#BBDEFB", padding: "40px 0", fontSize: 14 }}>
            Cargando datos…
          </div>
        )}
        {/* Month label */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#ffffff" }}>
            {fmtMonth(selectedMonth)}
          </h2>
          <div style={{ fontSize: 12, color: "#BBDEFB", marginTop: 4 }}>
            {monthData.length} registros en este mes
          </div>
        </div>

        {/* KPIs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <KpiCard
            label="Total de Ventas"
            value={fmtMoney(totalVentas)}
            icon={<TrendingUp size={16} />}
            color="#1565C0"
          />
          <KpiCard
            label="Productos"
            value={clientesUnicos.toLocaleString("es-PE")}
            icon={<Package size={16} />}
            color="#0288D1"
          />
          <KpiCard
            label="Total de Órdenes"
            value={Math.round(totalOrdenes).toLocaleString("es-PE")}
            icon={<ShoppingBag size={16} />}
            color="#1E88E5"
          />
        </div>

        {/* Top 2 charts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <ChartCard title="Ventas del Mes por Categoría (S/.)">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={catBarData} margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dde8f8" />
                <XAxis dataKey="name" tick={{ fill: "#5878a0", fontSize: 11 }} angle={-20} textAnchor="end" />
                <YAxis tick={{ fill: "#5878a0", fontSize: 11 }} tickFormatter={(v) => `S/${(v/1000).toFixed(0)}K`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmtMoney(Number(v))} />
                <Bar dataKey="monto" radius={[4, 4, 0, 0]}>
                  {catBarData.map((entry, index) => (
                    <Cell key={index} fill={colorMap[entry.name] || "#1565C0"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Órdenes del Mes por Categoría">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ordBarData} margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dde8f8" />
                <XAxis dataKey="name" tick={{ fill: "#5878a0", fontSize: 11 }} angle={-20} textAnchor="end" />
                <YAxis tick={{ fill: "#5878a0", fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="ordenes" radius={[4, 4, 0, 0]}>
                  {ordBarData.map((entry, index) => (
                    <Cell key={index} fill={colorMap[entry.name] || "#1565C0"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Evolutivo full width */}
        <div style={{ marginBottom: 12 }}>
          <ChartCard title="Evolutivo de Ventas por Categoría" fullWidth>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={evolutivo} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dde8f8" />
                <XAxis dataKey="mes" tick={{ fill: "#5878a0", fontSize: 11 }} />
                <YAxis tick={{ fill: "#5878a0", fontSize: 11 }} tickFormatter={(v) => `S/${(v/1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => fmtMoney(Number(v))}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "#5878a0", paddingTop: 8 }}
                />
                {categories.map((cat) => (
                  <Bar key={cat} dataKey={cat} stackId="a" fill={colorMap[cat]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Bottom 2 charts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <ChartCard title="Distribución por Categoría">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmtMoney(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#5878a0" }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top Productos del Mes">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                layout="vertical"
                data={topClientes}
                margin={{ top: 0, right: 60, bottom: 0, left: 10 }}
              >
                <XAxis type="number" tick={{ fill: "#5878a0", fontSize: 10 }} tickFormatter={(v) => `S/${v}`} />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  tick={{ fill: "#5878a0", fontSize: 10 }}
                  width={130}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmtMoney(Number(v))} />
                <Bar dataKey="monto" fill="#1F73E1" radius={[0, 4, 4, 0]}>
                  {topClientes.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "#1565C0" : i === 1 ? "#1E88E5" : "#42A5F5"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* Import Modal */}
      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} onImport={handleImport} />
      )}
    </div>
  );
}

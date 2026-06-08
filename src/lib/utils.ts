import { DataRow, ImportRow } from "./types";

export const KNOWN_COLORS: Record<string, string> = {
  Tratamientos: "#1565C0",
  Mesoterapia: "#1E88E5",
  Consulta: "#42A5F5",
  Consultas: "#42A5F5",
  Medicamentos: "#0288D1",
  Servicios: "#0277BD",
  Cirugías: "#1976D2",
  Cirugia: "#1976D2",
  Otros: "#1976D2",
};

const FALLBACK_PALETTE = ["#1565C0", "#1E88E5", "#42A5F5", "#0288D1", "#0277BD"];

export const PREFERRED_ORDER = [
  "Tratamientos", "Medicamentos", "Consultas", "Consulta",
  "Servicios", "Mesoterapia", "Cirugías", "Otros",
];

export const MONTH_NAMES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export function fmtMonth(m: string): string {
  const [year, month] = m.split("-");
  return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`;
}

export function fmtMoney(n: number): string {
  return "S/. " + Math.round(n).toLocaleString("es-PE");
}

export function buildCategoryList(cats: string[]): string[] {
  const known = PREFERRED_ORDER.filter((c) => cats.includes(c));
  const extras = cats.filter((c) => !PREFERRED_ORDER.includes(c)).sort();
  return [...known, ...extras];
}

export function buildColorMap(categories: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  let fbIdx = 0;
  categories.forEach((c) => {
    if (KNOWN_COLORS[c]) {
      out[c] = KNOWN_COLORS[c];
    } else {
      out[c] = FALLBACK_PALETTE[fbIdx % FALLBACK_PALETTE.length];
      fbIdx++;
    }
  });
  return out;
}

export function parseImportRows(rows: ImportRow[]): DataRow[] {
  const expanded: DataRow[] = [];
  rows.forEach((row) => {
    if (!row.fecha || !row.total || row.total <= 0) return;

    // Parse date
    const dateMatch = String(row.fecha).match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    let d: Date;
    if (dateMatch) {
      d = new Date(parseInt(dateMatch[3]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[1]));
    } else {
      d = new Date(row.fecha);
    }
    if (isNaN(d.getTime())) return;

    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const clasRaw = String(row.clasificacion || "").trim();
    const tags = clasRaw
      .split(/[,+]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (!tags.length) return;

    const weight = 1 / tags.length;
    tags.forEach((tag) => {
      expanded.push({
        mes,
        categoria: tag,
        monto: row.total * weight,
        ordenes: (row.cantidad || 0) * weight,
        nombre: row.nombre || "",
        doc: String(row.doc || ""),
        tipoDoc: row.tipoDoc || "Sin tipo",
      });
    });
  });
  return expanded;
}

export function getMonths(rows: DataRow[]): string[] {
  return [...new Set(rows.map((r) => r.mes))].sort();
}

export function getCategories(rows: DataRow[]): string[] {
  return [...new Set(rows.map((r) => r.categoria))].sort();
}

function normalizeCat(cat: string): string {
  const c = (cat || "").toUpperCase().trim();
  if (c.includes("TRATAMIENTO") || c.includes("MESOTERAPIA")) return "Tratamientos";
  if (
    c.includes("MEDICAMENTO") || c.includes("MINOXIDIL") || c.includes("FINASTERIDE") ||
    c.includes("DUTASTERIDE") || c.includes("PILOPEPTAN") || c.startsWith("PQ ")
  ) return "Medicamentos";
  if (c.includes("SERVICIO") || c.includes("ENVIO") || c.includes("ENVÍO")) return "Servicios";
  if (c.includes("CONSULTA") || c.includes("ANTICIPO")) return "Consultas";
  if (c.includes("CIRUG")) return "Cirugías";
  return "Otros";
}

function parseMoney(s: unknown): number {
  return parseFloat(String(s ?? "0").replace(/[^0-9.]/g, "")) || 0;
}

export function isProductReport(rawData: Record<string, unknown>[]): boolean {
  if (!rawData.length) return false;
  const titleKey = Object.keys(rawData[0])[0] || "";
  const lc = titleKey.toLowerCase();
  return (
    lc.includes("reporte de producto") ||
    lc.includes("reporte de ventas detallado") ||
    Object.values(rawData[0]).map((v) => String(v).trim()).includes("Total de Ventas")
  );
}

// Parses "Reporte de ventas detallado por producto" — 2-header-row format:
// row 0 = group headers + title key with date range
// row 1 = actual column names
// row 2+ = transaction data
export function parseProductReport(rawData: Record<string, unknown>[]): DataRow[] {
  if (rawData.length < 3) return [];

  const titleKey = Object.keys(rawData[0])[0];

  // Extract month from title e.g. "... | 01-05-2026 - 31-05-2026"
  const dateMatch = titleKey.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (!dateMatch) return [];
  const mes = `${dateMatch[3]}-${dateMatch[2]}`;

  // Build column name → key map from row 1 (real column headers)
  const colByName: Record<string, string> = {};
  Object.entries(rawData[1]).forEach(([key, val]) => {
    colByName[String(val).trim()] = key;
  });

  const nombreKey    = colByName["Nombre"]              ?? "__EMPTY_10";
  const cantidadKey  = colByName["Cantidad"]             ?? "__EMPTY_18";
  const totalKey     = colByName["Total"]                ?? "__EMPTY_21";
  const estadoKey    = colByName["Estado"]               ?? "__EMPTY_5";
  const tipoDocKey   = colByName["Tipo de documento"]    ?? "__EMPTY_7";
  const numDocKey    = colByName["Número de documento"]  ?? "__EMPTY_8";

  return rawData.slice(2)
    .filter((r) => {
      const nombre = String(r[nombreKey] ?? "").trim();
      const estado = String(r[estadoKey] ?? "").trim();
      return nombre && estado === "Aceptado";
    })
    .map((r) => {
      const nombre = String(r[nombreKey] ?? "").trim();
      const cat = normalizeCat(nombre);
      return {
        mes,
        categoria: cat,
        monto: parseMoney(r[totalKey]),
        ordenes: parseFloat(String(r[cantidadKey] ?? "0")) || 0,
        nombre,
        doc: nombre,           // unique product name used to count distinct products
        tipoDoc: cat,          // category used for pie chart breakdown
      };
    });
}

export interface DataRow {
  mes: string; // "YYYY-MM"
  categoria: string;
  monto: number;
  ordenes: number;
  nombre: string;
  doc: string;
  tipoDoc: string;
}

export interface MonthSummary {
  mes: string;
  totalVentas: number;
  clientesUnicos: number;
  totalOrdenes: number;
  porCategoria: Record<string, number>;
}

export interface ImportRow {
  nombre: string;
  tipoDoc: string;
  doc: string;
  fecha: string;
  cantidad: number;
  total: number;
  clasificacion: string;
}

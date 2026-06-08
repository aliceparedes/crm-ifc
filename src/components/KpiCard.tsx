"use client";
import React from "react";

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
  sub?: string;
}

export default function KpiCard({ label, value, icon, color = "#1565C0", sub }: KpiCardProps) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "20px 24px",
        boxShadow: "0 4px 16px rgba(13, 71, 161, 0.25)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 12, color: "var(--text)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {label}
        </span>
        <span
          style={{
            width: 32, height: 32, borderRadius: 8,
            background: color + "22",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: color, flexShrink: 0,
          }}
        >
          {icon}
        </span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{sub}</div>
      )}
    </div>
  );
}

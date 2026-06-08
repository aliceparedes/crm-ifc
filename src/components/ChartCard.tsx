"use client";
import React from "react";

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}

export default function ChartCard({ title, children, fullWidth }: ChartCardProps) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "20px",
        boxShadow: "0 4px 16px rgba(13, 71, 161, 0.25)",
        gridColumn: fullWidth ? "1 / -1" : undefined,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "var(--accent)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: 16,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

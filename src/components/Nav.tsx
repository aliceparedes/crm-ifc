"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const path = usePathname();

  return (
    <div style={{
      background: "#0D47A1",
      borderBottom: "1px solid #1565C0",
      padding: "0 24px",
      display: "flex",
      alignItems: "center",
      gap: 0,
      height: 44,
    }}>
      <span style={{ color: "white", fontWeight: 700, fontSize: 13, marginRight: 24, letterSpacing: "0.04em", opacity: 0.9 }}>
        Instituto Facial y Capilar
      </span>
      {[
        { href: "/",         label: "Dashboard de Ventas" },
        { href: "/clientes", label: "Seguimiento de Clientes" },
      ].map(({ href, label }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            style={{
              color: active ? "white" : "rgba(255,255,255,0.6)",
              fontWeight: active ? 600 : 400,
              fontSize: 13,
              padding: "0 16px",
              height: 44,
              display: "flex",
              alignItems: "center",
              borderBottom: active ? "2px solid white" : "2px solid transparent",
              textDecoration: "none",
              transition: "color .15s",
            }}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

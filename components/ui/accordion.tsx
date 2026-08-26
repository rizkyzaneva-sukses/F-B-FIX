import { ChevronRight, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export function Accordion({
  id,
  title,
  icon,
  children,
  isOpen,
  toggle,
}: {
  id: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
  isOpen: boolean;
  toggle: (id: string) => void;
}) {
  return (
    <section className="card" style={{ marginBottom: 10 }}>
      <button
        onClick={() => toggle(id)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "14px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          color: "inherit",
          fontSize: "inherit",
        }}
      >
        {icon}
        <strong style={{ flex: 1, fontSize: 14 }}>{title}</strong>
        <ChevronRight
          size={16}
          style={{
            transform: isOpen ? "rotate(90deg)" : "none",
            transition: "transform .2s",
            color: "var(--muted)",
          }}
        />
      </button>
      {isOpen && (
        <div
          style={{
            padding: "0 16px 16px",
            borderTop: "1px solid var(--border)",
            fontSize: 13,
            lineHeight: 1.7,
          }}
        >
          {children}
        </div>
      )}
    </section>
  );
}

export function Step({
  num,
  title,
  children,
}: {
  num: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
      <span
        className="badge badge-blue"
        style={{ minWidth: 22, textAlign: "center", flexShrink: 0, alignSelf: "flex-start" }}
      >
        {num}
      </span>
      <div>
        <strong>{title}</strong>
        <p style={{ margin: "2px 0 0", color: "var(--muted)" }}>{children}</p>
      </div>
    </div>
  );
}

export function Tip({ children }: { children: ReactNode }) {
  return (
    <div className="callout" style={{ marginTop: 10 }}>
      <Sparkles size={15} style={{ flexShrink: 0 }} />
      <div>
        <strong>Tips</strong>
        <p style={{ margin: 0 }}>{children}</p>
      </div>
    </div>
  );
}

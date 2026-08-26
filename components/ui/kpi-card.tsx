import type { ReactNode } from "react";

export function Kpi({
  label,
  value,
  foot,
  icon,
  tone,
}: {
  label: string;
  value: string;
  foot: ReactNode;
  icon: ReactNode;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <div className="kpi-icon">{icon}</div>
      </div>
      <p className={`kpi-value ${tone || ""}`}>{value}</p>
      <div className="kpi-foot">{foot}</div>
    </div>
  );
}

export function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="mini-stat">
      <span className="mini-stat-label">{label}</span>
      <p className={`mini-stat-value ${tone || ""}`}>{value}</p>
    </div>
  );
}

import { X } from "lucide-react";
import { navSections } from "@/components/layout/sidebar";
import type { UserRole, View } from "@/lib/types";

export function MobileNavSheet({
  view,
  navigate,
  onClose,
  role,
}: {
  view: View;
  navigate: (view: View) => void;
  onClose: () => void;
  role: UserRole;
}) {
  return (
    <div
      className="mobile-sheet-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mobile-sheet" role="dialog" aria-label="Navigasi Menu Mobile">
        <div className="mobile-sheet-header">
          <div className="brand">
            <div className="brand-mark">DK</div>
            <div>
              <span className="brand-name">DapurKasir</span>
              <span className="brand-sub">Semua Menu</span>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Tutup menu">
            <X size={17} />
          </button>
        </div>

        <div className="mobile-sheet-body">
          {navSections.map((section) => {
            if (section.roles && !section.roles.includes(role)) {
              return null;
            }

            const items = section.items.filter(
              (item) => !item.roles || item.roles.includes(role)
            );

            if (!items.length) return null;

            return (
              <div className="mobile-sheet-group" key={section.label}>
                <div className="mobile-sheet-label">{section.label}</div>
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = view === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`mobile-sheet-item ${isActive ? "active" : ""}`}
                      onClick={() => navigate(item.id)}
                    >
                      <Icon size={18} />
                      <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                      {item.badge && <span className="badge badge-amber">{item.badge}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

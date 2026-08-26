import { Bell, Leaf, PanelLeft, Sparkles } from "lucide-react";
import { navSections } from "@/components/layout/sidebar";
import type { View } from "@/lib/types";

export function Topbar({
  businessName,
  view,
  dark,
  setDark,
  onOpenMobileMenu,
  onNotify,
}: {
  businessName: string;
  view: View;
  dark: boolean;
  setDark: (v: boolean | ((prev: boolean) => boolean)) => void;
  onOpenMobileMenu: () => void;
  onNotify: (msg: string, tone?: "default" | "success" | "error") => void;
}) {
  const currentItem = navSections
    .flatMap((section) => section.items)
    .find((item) => item.id === view);

  return (
    <header className="topbar">
      <div className="topbar-context">
        <strong>{businessName || "DapurKasir"}</strong>
        <span> / </span>
        <span>{currentItem?.label || "Aplikasi"}</span>
      </div>
      <div className="topbar-actions">
        <button
          type="button"
          className="icon-button mobile-only"
          aria-label="Buka navigasi mobile"
          onClick={onOpenMobileMenu}
        >
          <PanelLeft size={18} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Pusat Notifikasi"
          onClick={() => onNotify("Tidak ada notifikasi baru.", "default")}
        >
          <Bell size={17} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Ganti mode terang / gelap"
          onClick={() => setDark((value) => !value)}
        >
          {dark ? <Sparkles size={17} /> : <Leaf size={17} />}
        </button>
      </div>
    </header>
  );
}

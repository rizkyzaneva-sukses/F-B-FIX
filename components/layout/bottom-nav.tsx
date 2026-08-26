import { Boxes, LayoutDashboard, Menu, ShoppingCart, WalletCards } from "lucide-react";
import type { UserRole, View } from "@/lib/types";

export function BottomNav({
  view,
  navigate,
  role,
  onMenu,
}: {
  view: View;
  navigate: (view: View) => void;
  role: UserRole;
  onMenu: () => void;
}) {
  const isKasir = role === "KASIR";

  if (isKasir) {
    return (
      <nav className="bottom-nav" aria-label="Navigasi mobile kasir">
        <button
          type="button"
          className={view === "pos" ? "active" : ""}
          onClick={() => navigate("pos")}
        >
          <ShoppingCart size={19} />
          Kasir POS
        </button>
        <button
          type="button"
          className={view === "guide" ? "active" : ""}
          onClick={() => navigate("guide")}
        >
          <LayoutDashboard size={19} />
          Panduan
        </button>
        <button type="button" onClick={onMenu}>
          <Menu size={19} />
          Menu
        </button>
      </nav>
    );
  }

  return (
    <nav className="bottom-nav" aria-label="Navigasi mobile">
      <button
        type="button"
        className={view === "dashboard" ? "active" : ""}
        onClick={() => navigate("dashboard")}
      >
        <LayoutDashboard size={19} />
        Ringkasan
      </button>
      <button
        type="button"
        className={view === "pos" ? "active" : ""}
        onClick={() => navigate("pos")}
      >
        <ShoppingCart size={19} />
        POS
      </button>
      <button
        type="button"
        className={view === "production" ? "active" : ""}
        onClick={() => navigate("production")}
      >
        <Boxes size={19} />
        Produksi
      </button>
      <button
        type="button"
        className={view === "reports" || view === "receivables" ? "active" : ""}
        onClick={() => navigate("reports")}
      >
        <WalletCards size={19} />
        Keuangan
      </button>
      <button type="button" onClick={onMenu}>
        <Menu size={19} />
        Menu
      </button>
    </nav>
  );
}

import {
  Boxes,
  FileText,
  LayoutDashboard,
  Leaf,
  Menu,
  Package,
  ShoppingCart,
  WalletCards,
} from "lucide-react";
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
  if (role === "KASIR") {
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
          className={view === "b2b-orders" ? "active" : ""}
          onClick={() => navigate("b2b-orders")}
        >
          <FileText size={19} />
          Sales Order
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

  if (role === "GUDANG") {
    return (
      <nav className="bottom-nav" aria-label="Navigasi mobile gudang">
        <button
          type="button"
          className={view === "materials" ? "active" : ""}
          onClick={() => navigate("materials")}
        >
          <Leaf size={19} />
          Bahan
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
          className={view === "products" ? "active" : ""}
          onClick={() => navigate("products")}
        >
          <Package size={19} />
          Produk
        </button>
        <button type="button" onClick={onMenu}>
          <Menu size={19} />
          Menu
        </button>
      </nav>
    );
  }

  if (role === "FINANCE") {
    return (
      <nav className="bottom-nav" aria-label="Navigasi mobile finance">
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
          className={view === "receivables" ? "active" : ""}
          onClick={() => navigate("receivables")}
        >
          <WalletCards size={19} />
          Piutang
        </button>
        <button
          type="button"
          className={view === "reports" ? "active" : ""}
          onClick={() => navigate("reports")}
        >
          <Boxes size={19} />
          Laporan
        </button>
        <button type="button" onClick={onMenu}>
          <Menu size={19} />
          Menu
        </button>
      </nav>
    );
  }

  return (
    <nav className="bottom-nav" aria-label="Navigasi mobile owner">
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

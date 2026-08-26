import { MessageCircle, Plus, Truck, UserRound } from "lucide-react";
import { useState } from "react";
import { PageHeading } from "@/components/ui/page-heading";
import { MiniStat } from "@/components/ui/kpi-card";
import { rupiah } from "@/lib/format";
import type { Party } from "@/lib/types";

export function PartiesView({
  parties,
  onAdd,
  onWhatsApp,
}: {
  parties: Party[];
  onAdd: () => void;
  onWhatsApp: (phone: string, message: string) => void;
}) {
  const [tab, setTab] = useState<"ALL" | "CUSTOMER" | "SUPPLIER">("ALL");

  const customers = parties.filter((p) => p.type === "CUSTOMER");
  const suppliers = parties.filter((p) => p.type === "SUPPLIER");

  const displayParties =
    tab === "CUSTOMER" ? customers : tab === "SUPPLIER" ? suppliers : parties;

  return (
    <main className="page">
      <PageHeading
        eyebrow="Operasional"
        title="Kontak Pelanggan & Supplier"
        description="Kelola direktori kontak bisnis untuk penjualan hutang, B2B, dan pembelian bahan."
        action={
          <button className="button button-primary" onClick={onAdd}>
            <Plus size={16} />
            Tambah Kontak
          </button>
        }
      />

      <div className="page-card-grid">
        <MiniStat label="Total Pelanggan Terdaftar" value={`${customers.length} kontak`} />
        <MiniStat label="Total Supplier Terdaftar" value={`${suppliers.length} rekanan`} />
        <MiniStat label="Total Kontak Keseluruhan" value={`${parties.length} entitas`} />
      </div>

      <div className="category-row" style={{ marginTop: 20 }}>
        <button
          className={`category-chip ${tab === "ALL" ? "active" : ""}`}
          onClick={() => setTab("ALL")}
        >
          Semua Kontak ({parties.length})
        </button>
        <button
          className={`category-chip ${tab === "CUSTOMER" ? "active" : ""}`}
          onClick={() => setTab("CUSTOMER")}
        >
          Pelanggan ({customers.length})
        </button>
        <button
          className={`category-chip ${tab === "SUPPLIER" ? "active" : ""}`}
          onClick={() => setTab("SUPPLIER")}
        >
          Supplier ({suppliers.length})
        </button>
      </div>

      <section className="card table-wrap" style={{ marginTop: 12 }}>
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Tipe</th>
              <th>Telepon / WhatsApp</th>
              <th>Alamat</th>
              <th className="text-right">Limit Piutang</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {displayParties.map((item) => (
              <tr key={item.id}>
                <td className="table-primary">{item.name}</td>
                <td>
                  <span
                    className={`badge ${item.type === "CUSTOMER" ? "badge-blue" : "badge-emerald"}`}
                  >
                    {item.type === "CUSTOMER" ? "Pelanggan" : "Supplier"}
                  </span>
                </td>
                <td>{item.phone || <span className="table-muted">-</span>}</td>
                <td>{item.address || <span className="table-muted">-</span>}</td>
                <td className="text-right table-primary">
                  {item.creditLimit > 0 ? (
                    rupiah(item.creditLimit)
                  ) : (
                    <span className="table-muted">Tanpa Limit</span>
                  )}
                </td>
                <td>
                  {item.phone ? (
                    <button
                      className="button button-secondary"
                      style={{ minHeight: 30, padding: "0 10px", fontSize: 11 }}
                      onClick={() => onWhatsApp(item.phone, `Halo ${item.name}, salam dari DapurKasir.`)}
                    >
                      <MessageCircle size={14} />
                      WhatsApp
                    </button>
                  ) : (
                    <span className="table-muted" style={{ fontSize: 11 }}>
                      -
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {!displayParties.length && (
              <tr>
                <td colSpan={6} className="table-muted" style={{ textAlign: "center", padding: 30 }}>
                  Belum ada kontak yang terdaftar pada kategori ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

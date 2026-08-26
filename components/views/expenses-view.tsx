import { Plus } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { MiniStat } from "@/components/ui/kpi-card";
import { rupiah, shortRupiah, dateLabel } from "@/lib/format";
import type { Expense } from "@/lib/types";

export function ExpensesView({
  expenses,
  onAdd,
}: {
  expenses: Expense[];
  onAdd: () => void;
}) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyExpenses = expenses.filter((e) => e.date.slice(0, 7) === currentMonth);
  const operatingTotal = monthlyExpenses
    .filter((e) => e.type !== "OWNER_WITHDRAWAL")
    .reduce((sum, item) => sum + item.amount, 0);
  const priveTotal = monthlyExpenses
    .filter((e) => e.type === "OWNER_WITHDRAWAL")
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <main className="page">
      <PageHeading
        eyebrow="Keuangan"
        title="Pengeluaran & Biaya Operasional"
        description="Catat seluruh pengeluaran rutin, biaya operasional, dan prive pemilik."
        action={
          <button className="button button-primary" onClick={onAdd}>
            <Plus size={16} />
            Tambah Pengeluaran
          </button>
        }
      />

      <div className="page-card-grid">
        <MiniStat label="Beban Operasional Bulan Ini" value={shortRupiah(operatingTotal)} />
        <MiniStat
          label="Prive Pemilik (Tarik Modal)"
          value={shortRupiah(priveTotal)}
          tone={priveTotal > 0 ? "negative" : undefined}
        />
        <MiniStat label="Total Catatan Bulan Ini" value={`${monthlyExpenses.length} transaksi`} />
      </div>

      <section className="card table-wrap" style={{ marginTop: 20 }}>
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Kategori</th>
              <th>Tipe</th>
              <th>Keterangan / Catatan</th>
              <th className="text-right">Nominal</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((item) => (
              <tr key={item.id}>
                <td className="table-muted">{dateLabel(item.date)}</td>
                <td>
                  <span className="badge badge-blue">{item.category}</span>
                </td>
                <td>
                  <span
                    className={`badge ${
                      item.type === "OWNER_WITHDRAWAL" ? "badge-amber" : "badge-emerald"
                    }`}
                  >
                    {item.type === "OWNER_WITHDRAWAL" ? "Prive" : "Operasional"}
                  </span>
                </td>
                <td>{item.note || <span className="table-muted">Tidak ada catatan</span>}</td>
                <td className="text-right table-primary">{rupiah(item.amount)}</td>
              </tr>
            ))}
            {!expenses.length && (
              <tr>
                <td colSpan={5} className="table-muted" style={{ textAlign: "center", padding: 30 }}>
                  Belum ada catatan pengeluaran.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

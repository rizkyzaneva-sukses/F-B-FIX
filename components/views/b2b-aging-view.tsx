import { Clock3 } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { Kpi, MiniStat } from "@/components/ui/kpi-card";
import { rupiah, dateLabel } from "@/lib/format";
import type { AgingRow } from "@/lib/types";

export function B2BAgingView({ aging }: { aging: AgingRow[] }) {
  const buckets = [
    { label: "0-30 hari", key: "0-30", desc: "Jatuh tempo wajar" },
    { label: "31-60 hari", key: "31-60", desc: "Perlu diingatkan" },
    { label: "61-90 hari", key: "61-90", desc: "Tagih intensif" },
    { label: ">90 hari", key: ">90", desc: "Risiko macet" },
  ];

  const totalOutstanding = aging.reduce((s, r) => s + r.outstanding, 0);

  return (
    <main className="page">
      <PageHeading
        eyebrow="B2B / Keuangan"
        title="Aging Piutang Grosir (Umur Tagihan)"
        description="Analisis umur tagihan B2B yang belum lunas untuk menentukan prioritas penagihan."
      />

      <div className="page-card-grid">
        <MiniStat
          label="Total Piutang Belum Lunas"
          value={rupiah(totalOutstanding)}
          tone={totalOutstanding > 0 ? "negative" : undefined}
        />
        <MiniStat label="Jumlah Invoice Outstanding" value={`${aging.length} invoice`} />
        <MiniStat
          label="Tagihan &gt; 60 Hari"
          value={`${aging.filter((r) => r.days_overdue > 60).length} invoice`}
          tone={aging.some((r) => r.days_overdue > 60) ? "negative" : undefined}
        />
      </div>

      <div className="kpi-grid" style={{ marginTop: 20 }}>
        {buckets.map((b) => {
          const bucketRows = aging.filter((r) => r.age_bucket === b.key);
          const bucketTotal = bucketRows.reduce((s, r) => s + r.outstanding, 0);
          return (
            <Kpi
              key={b.key}
              label={b.label}
              value={rupiah(bucketTotal)}
              foot={
                <span>
                  {bucketRows.length} invoice &middot; {b.desc}
                </span>
              }
              icon={<Clock3 size={16} />}
              tone={b.key === ">90" || b.key === "61-90" ? "negative" : undefined}
            />
          );
        })}
      </div>

      <section className="card table-wrap" style={{ marginTop: 20 }}>
        <table>
          <thead>
            <tr>
              <th>No. Invoice</th>
              <th>Nama Pelanggan</th>
              <th>Tanggal Terbit</th>
              <th>Jatuh Tempo</th>
              <th>Total Tagihan</th>
              <th>Sudah Dibayar</th>
              <th>Sisa Piutang</th>
              <th>Umur Lewat</th>
            </tr>
          </thead>
          <tbody>
            {aging.map((row) => (
              <tr key={row.invoice_id}>
                <td
                  className="table-primary"
                  style={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}
                >
                  {row.invoice_number}
                </td>
                <td>{row.customer_name}</td>
                <td className="table-muted">{dateLabel(row.invoice_date)}</td>
                <td className="negative">{dateLabel(row.due_date)}</td>
                <td>{rupiah(row.total_amount)}</td>
                <td>{rupiah(row.paid_amount)}</td>
                <td className="table-primary negative">{rupiah(row.outstanding)}</td>
                <td>
                  <span
                    className={`badge ${
                      row.days_overdue > 60
                        ? "badge-red"
                        : row.days_overdue > 30
                        ? "badge-amber"
                        : "badge-blue"
                    }`}
                  >
                    {row.days_overdue} hari
                  </span>
                </td>
              </tr>
            ))}
            {!aging.length && (
              <tr>
                <td colSpan={8} className="table-muted" style={{ textAlign: "center", padding: 30 }}>
                  Semua tagihan B2B telah lunas. Tidak ada piutang outstanding.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

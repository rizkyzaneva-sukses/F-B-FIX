import { Plus } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { MiniStat } from "@/components/ui/kpi-card";
import { rupiah, shortRupiah, dateLabel } from "@/lib/format";
import type { CashRecon } from "@/lib/types";

export function CashReconView({
  recons,
  onAdd,
}: {
  recons: CashRecon[];
  onAdd: () => void;
}) {
  const largestDiff = recons.length
    ? Math.max(...recons.map((r) => Math.abs(r.difference)))
    : 0;

  return (
    <main className="page">
      <PageHeading
        eyebrow="Keuangan"
        title="Rekonsiliasi Kas Harian"
        description="Bandingkan uang fisik aktual di laci kasir dengan catatan sistem untuk kontrol keuangan harian."
        action={
          <button className="button button-primary" onClick={onAdd}>
            <Plus size={16} />
            Input Rekonsiliasi Kas
          </button>
        }
      />

      <div className="page-card-grid">
        <MiniStat label="Rekonsiliasi Tercatat" value={`${recons.length} sesi`} />
        <MiniStat
          label="Selisih Tertinggi"
          value={shortRupiah(largestDiff)}
          tone={largestDiff > 0 ? "negative" : undefined}
        />
        <MiniStat
          label="Status Seimbang"
          value={`${recons.filter((r) => r.difference === 0).length} dari ${recons.length}`}
        />
      </div>

      <section className="card table-wrap" style={{ marginTop: 20 }}>
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Kas Sistem</th>
              <th>Kas Fisik Laci</th>
              <th className="text-right">Selisih</th>
              <th>Status</th>
              <th>Catatan / Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {recons.map((item) => (
              <tr key={item.id}>
                <td className="table-muted">{dateLabel(item.date)}</td>
                <td>{rupiah(item.systemCash)}</td>
                <td>{rupiah(item.physicalCash)}</td>
                <td
                  className={`text-right ${
                    item.difference === 0
                      ? "table-muted"
                      : item.difference > 0
                      ? "positive"
                      : "negative"
                  }`}
                >
                  {item.difference > 0 ? "+" : ""}
                  {rupiah(item.difference)}
                </td>
                <td>
                  <span
                    className={`badge ${
                      item.status === "verified"
                        ? "badge-green"
                        : item.status === "disputed"
                        ? "badge-amber"
                        : "badge-blue"
                    }`}
                  >
                    {item.status === "open"
                      ? "Open"
                      : item.status === "verified"
                      ? "Verified"
                      : "Disputed"}
                  </span>
                </td>
                <td
                  style={{
                    maxWidth: 240,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.notes || "-"}
                </td>
              </tr>
            ))}
            {!recons.length && (
              <tr>
                <td colSpan={6} className="table-muted" style={{ textAlign: "center", padding: 30 }}>
                  Belum ada data rekonsiliasi kas harian.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Building2,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  Search,
  Users,
} from "lucide-react";
import { backendRequest } from "@/lib/client-api";

type AdminStats = {
  overview: {
    totalBusinesses: number;
    proBusinesses: number;
    freeBusinesses: number;
    totalUsers: number;
    activeUsers: number;
  };
  revenue: {
    thisMonth: number;
    paymentsThisMonth: number;
    mrr: number;
  };
  transactions: {
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };
  pendingUpgrades: number;
  recentBusinesses: Array<{
    id: string;
    name: string;
    plan: string;
    createdAt: string;
  }>;
};

type Business = {
  id: string;
  name: string;
  plan: string;
  created_at: string;
  stats: {
    userCount: number;
    salesThisMonth: number;
    productCount: number;
    materialCount: number;
  };
  lastPayment: {
    amount: number;
    status: string;
    paidAt: string;
  } | null;
};

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace("Rp", "Rp ");

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      backendRequest<AdminStats>("/api/admin/stats"),
      backendRequest<{ businesses: Business[] }>("/api/admin/businesses"),
    ])
      .then(([statsData, bizData]) => {
        setStats(statsData);
        setBusinesses(bizData.businesses);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async (businessId: string, action: "approve" | "reject") => {
    try {
      await backendRequest("/api/admin/upgrades", {
        method: "PATCH",
        body: JSON.stringify({ requestId: businessId, action }),
      });
      // Refresh data
      const bizData = await backendRequest<{ businesses: Business[] }>("/api/admin/businesses");
      setBusinesses(bizData.businesses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  };

  const handlePlanChange = async (businessId: string, newPlan: "FREE" | "PRO") => {
    try {
      await backendRequest(`/api/admin/businesses/${businessId}`, {
        method: "PATCH",
        body: JSON.stringify({ plan: newPlan }),
      });
      setBusinesses((prev) =>
        prev.map((b) => (b.id === businessId ? { ...b, plan: newPlan } : b))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        Memuat panel admin...
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div className="callout error">{error}</div>
      </main>
    );
  }

  const filteredBusinesses = businesses.filter((b) => {
    const matchSearch = !search || b.name.toLowerCase().includes(search.toLowerCase());
    const matchPlan = !planFilter || b.plan === planFilter;
    return matchSearch && matchPlan;
  });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">DK</div>
          <div>
            <span className="brand-name">Admin Panel</span>
            <span className="brand-sub">DapurKasir</span>
          </div>
        </div>
        <nav>
          <div className="nav-group">
            <div className="nav-label">Admin</div>
            <button className="nav-item active">
              <LayoutDashboard size={17} />
              Dashboard
            </button>
            <button className="nav-item">
              <Building2 size={17} />
              Bisnis
            </button>
            <button className="nav-item">
              <Users size={17} />
              Pengguna
            </button>
            <button className="nav-item">
              <CreditCard size={17} />
              Pembayaran
            </button>
          </div>
        </nav>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-context">
            <strong>Admin Panel</strong>
            <span> / </span>Dashboard
          </div>
        </header>

        <main className="page">
          {/* Overview Stats */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">Total Bisnis</span>
                <Building2 size={16} />
              </div>
              <p className="kpi-value">{stats?.overview.totalBusinesses || 0}</p>
              <div className="kpi-foot">
                <span className="positive">{stats?.overview.proBusinesses || 0} PRO</span>
                <span> · {stats?.overview.freeBusinesses || 0} FREE</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">MRR</span>
                <CreditCard size={16} />
              </div>
              <p className="kpi-value">{rupiah(stats?.revenue.mrr || 0)}</p>
              <div className="kpi-foot">
                <span>Pendapatan bulan ini</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">Transaksi</span>
                <BarChart3 size={16} />
              </div>
              <p className="kpi-value">{stats?.transactions.thisMonth || 0}</p>
              <div className="kpi-foot">
                <span className={stats?.transactions.growth && stats.transactions.growth > 0 ? "positive" : "negative"}>
                  {stats?.transactions.growth && stats.transactions.growth > 0 ? "+" : ""}
                  {stats?.transactions.growth || 0}%
                </span>
                <span> vs bulan lalu</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">Pending Upgrade</span>
                <Users size={16} />
              </div>
              <p className="kpi-value">{stats?.pendingUpgrades || 0}</p>
              <div className="kpi-foot">
                <span>Menunggu review</span>
              </div>
            </div>
          </div>

          {/* Businesses Table */}
          <section className="card" style={{ marginTop: 24 }}>
            <div className="card-pad">
              <div className="section-header">
                <div>
                  <h2>Semua Bisnis</h2>
                  <p>Kelola bisnis, upgrade, dan monitor usage</p>
                </div>
              </div>

              <div className="toolbar">
                <div className="search-field">
                  <Search size={16} />
                  <input
                    className="input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari bisnis..."
                  />
                </div>
                <select
                  className="select"
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  style={{ minWidth: 120 }}
                >
                  <option value="">Semua Paket</option>
                  <option value="FREE">FREE</option>
                  <option value="PRO">PRO</option>
                </select>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Bisnis</th>
                    <th>Paket</th>
                    <th>Users</th>
                    <th>Transaksi</th>
                    <th>Produk</th>
                    <th>Terakhir Bayar</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBusinesses.map((biz) => (
                    <tr key={biz.id}>
                      <td>
                        <strong>{biz.name}</strong>
                        <br />
                        <small style={{ color: "#64748b" }}>
                          {new Date(biz.created_at).toLocaleDateString("id-ID")}
                        </small>
                      </td>
                      <td>
                        <span className={`badge ${biz.plan === "PRO" ? "badge-green" : "badge-emerald"}`}>
                          {biz.plan}
                        </span>
                      </td>
                      <td>{biz.stats.userCount}</td>
                      <td>{biz.stats.salesThisMonth}</td>
                      <td>{biz.stats.productCount}</td>
                      <td>
                        {biz.lastPayment ? (
                          <>
                            {rupiah(biz.lastPayment.amount)}
                            <br />
                            <small className={`badge ${biz.lastPayment.status === "SUCCESS" ? "badge-green" : "badge-amber"}`}>
                              {biz.lastPayment.status}
                            </small>
                          </>
                        ) : (
                          <span style={{ color: "#64748b" }}>Belum ada</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          {biz.plan === "FREE" ? (
                            <button
                              className="button button-primary"
                              style={{ minHeight: 32, padding: "0 10px", fontSize: 11 }}
                              onClick={() => handlePlanChange(biz.id, "PRO")}
                            >
                              Upgrade
                            </button>
                          ) : (
                            <button
                              className="button button-secondary"
                              style={{ minHeight: 32, padding: "0 10px", fontSize: 11 }}
                              onClick={() => handlePlanChange(biz.id, "FREE")}
                            >
                              Downgrade
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Recent Businesses */}
          <section className="card card-pad" style={{ marginTop: 24 }}>
            <h2>Bisnis Terbaru</h2>
            <div className="activity-list">
              {stats?.recentBusinesses.map((biz) => (
                <div className="activity-row" key={biz.id}>
                  <div className="item-avatar">
                    <Building2 size={15} />
                  </div>
                  <div className="row-main">
                    <strong>{biz.name}</strong>
                    <span>{new Date(biz.createdAt).toLocaleDateString("id-ID")}</span>
                  </div>
                  <span className={`badge ${biz.plan === "PRO" ? "badge-green" : "badge-emerald"}`}>
                    {biz.plan}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

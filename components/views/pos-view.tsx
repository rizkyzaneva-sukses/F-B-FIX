import { Minus, Plus, Search, ShoppingBag, ShoppingCart, Trash2 } from "lucide-react";
import { useState } from "react";
import { rupiah } from "@/lib/format";
import type { CartItem, Product } from "@/lib/types";

export function POSView({
  products,
  cart,
  total,
  discount,
  onDiscountChange,
  onAdd,
  onChangeQty,
  onPay,
  onNewProduct,
}: {
  products: Product[];
  cart: CartItem[];
  total: number;
  discount: number;
  onDiscountChange: (d: number) => void;
  onAdd: (product: Product) => void;
  onChangeQty: (id: string, delta: number) => void;
  onPay: () => void;
  onNewProduct: () => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");

  const categories = ["Semua", ...Array.from(new Set(products.map((p) => p.category)))];

  const filtered = products.filter((p) => {
    if (!p.active) return false;
    const matchCategory = category === "Semua" || p.category === category;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const payableTotal = Math.max(0, total - discount);

  return (
    <div className="pos-page">
      <div className="pos-layout">
        <div className="pos-catalog">
          <div className="pos-heading">
            <div>
              <h1>Kasir Penjualan</h1>
              <p>Pilih produk untuk ditambahkan ke pesanan pelanggan</p>
            </div>
            <div className="pos-controls">
              <button className="button button-secondary" onClick={onNewProduct}>
                <Plus size={16} />
                <span>Tambah Produk</span>
              </button>
            </div>
          </div>

          <div className="search-field pos-search">
            <Search size={16} />
            <input
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk berdasarkan nama..."
            />
          </div>

          <div className="category-row">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-chip ${category === cat ? "active" : ""}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="product-grid">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className="product-card"
                onClick={() => onAdd(item)}
                disabled={item.stock <= 0}
              >
                <div className="product-card-top">
                  <div className="product-emoji">{item.emoji || "🍽️"}</div>
                  <span
                    className={`badge ${
                      item.stock > 10
                        ? "badge-green"
                        : item.stock > 0
                        ? "badge-amber"
                        : "badge-red"
                    }`}
                  >
                    {item.stock > 0 ? `${item.stock} ${item.unit}` : "Habis"}
                  </span>
                </div>
                <div>
                  <h3 className="product-name">{item.name}</h3>
                  <span className="product-price">{rupiah(item.price)}</span>
                </div>
              </button>
            ))}
          </div>

          {!filtered.length && (
            <div className="empty-state card" style={{ marginTop: 20 }}>
              <ShoppingBag size={32} />
              <strong>Produk Tidak Ditemukan</strong>
              <p>Coba kata kunci lain atau pilih kategori Semua.</p>
            </div>
          )}
        </div>

        <aside className="card cart-panel">
          <div className="cart-header">
            <div>
              <h2>Keranjang Belanja</h2>
              <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>
                {cart.length} item dipilih
              </p>
            </div>
            <span className="cart-count">{cart.reduce((sum, item) => sum + item.qty, 0)}</span>
          </div>

          <div className="cart-items">
            {cart.map((item) => (
              <div className="cart-item" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <small>
                    {rupiah(item.price)} &times; {item.qty} {item.unit}
                  </small>
                  <div className="qty-control">
                    <button
                      type="button"
                      className="qty-button"
                      onClick={() => onChangeQty(item.id, -1)}
                      aria-label="Kurangi"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="qty-number">{item.qty}</span>
                    <button
                      type="button"
                      className="qty-button"
                      onClick={() => onChangeQty(item.id, 1)}
                      aria-label="Tambah"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
                <div className="cart-subtotal">{rupiah(item.price * item.qty)}</div>
              </div>
            ))}

            {!cart.length && (
              <div className="empty-state">
                <ShoppingCart size={32} />
                <strong>Keranjang Kosong</strong>
                <p>Klik produk di sebelah kiri untuk memulai pesanan.</p>
              </div>
            )}
          </div>

          <div className="cart-footer">
            <div className="total-row">
              <span>Subtotal</span>
              <strong>{rupiah(total)}</strong>
            </div>

            {discount > 0 && (
              <div className="total-row" style={{ color: "var(--success)" }}>
                <span>Diskon</span>
                <strong>-{rupiah(discount)}</strong>
              </div>
            )}

            <button
              type="button"
              className="button button-primary"
              style={{ width: "100%", fontSize: 15, padding: "14px 20px" }}
              disabled={!cart.length}
              onClick={onPay}
            >
              Bayar Sekarang &middot; {rupiah(payableTotal)}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

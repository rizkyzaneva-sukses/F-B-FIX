import { Modal, ModalFooter } from "@/components/ui/modal";
import type { FormEvent } from "react";

export function ItemModal({
  kind,
  onClose,
  onSave,
}: {
  kind: "product" | "material";
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>, kind: "product" | "material") => void;
}) {
  const isProduct = kind === "product";

  return (
    <Modal
      title={isProduct ? "Tambah produk jadi" : "Tambah bahan baku"}
      description={
        isProduct
          ? "Produk akan langsung tersedia di katalog kasir setelah disimpan."
          : "Gunakan satuan standar agar perhitungan stok tetap konsisten."
      }
      onClose={onClose}
    >
      <form onSubmit={(event) => onSave(event, kind)}>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="name">
              Nama item <span>*</span>
            </label>
            <input
              className="input"
              id="name"
              name="name"
              autoFocus
              placeholder={isProduct ? "Contoh: Sambal Terasi 150g" : "Contoh: Cabai rawit merah"}
              required
            />
          </div>

          {isProduct && (
            <div className="field">
              <label htmlFor="category">
                Kategori <span>*</span>
              </label>
              <select className="select" id="category" name="category" defaultValue="Sambal">
                <option value="Sambal">Sambal</option>
                <option value="Minyak">Minyak</option>
                <option value="Frozen">Frozen</option>
                <option value="Paket">Paket</option>
                <option value="Minuman">Minuman</option>
                <option value="Makanan">Makanan</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          )}

          <div className="field">
            <label htmlFor="unit">
              Satuan <span>*</span>
            </label>
            <select className="select" id="unit" name="unit" defaultValue="" required>
              <option value="" disabled>
                Pilih satuan
              </option>
              <option value="pcs">pcs</option>
              <option value="botol">botol</option>
              <option value="jar">jar</option>
              <option value="porsi">porsi</option>
              <option value="box">box</option>
              <option value="pack">pack</option>
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="ml">ml</option>
              <option value="liter">liter</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="price">
              {isProduct ? "Harga jual" : "Harga beli terakhir"} <span>*</span>
            </label>
            <input
              className="input"
              id="price"
              name="price"
              type="number"
              min="0"
              placeholder="0"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="stock">
              Stok awal <span>*</span>
            </label>
            <input
              className="input"
              id="stock"
              name="stock"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              required
            />
          </div>

          {!isProduct && (
            <div className="field full">
              <label htmlFor="supplier">Supplier default</label>
              <input
                className="input"
                id="supplier"
                name="supplier"
                placeholder="Contoh: Pasar Segar Bu Ani"
              />
            </div>
          )}
        </div>
        <ModalFooter onClose={onClose} submitLabel={isProduct ? "Simpan produk" : "Simpan bahan"} />
      </form>
    </Modal>
  );
}

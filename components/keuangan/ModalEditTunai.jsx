import { useState, useEffect } from 'react';
import { formatRupiah } from '../../lib/keuangan/helpers';

export default function ModalEditTunai({ batch, warga, tarifList, onClose, onSave }) {
  const [items, setItems] = useState([]);
  const [catatan, setCatatan] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (batch) {
      setItems(
        batch.items.map((i) => ({
          id: i.id,
          bulan_tahun: i.bulan_tahun,
          jumlah: Number(i.jumlah || 0),
        }))
      );
      setCatatan(batch.items[0]?.catatan || '');
      setTanggal(batch.items[0]?.tanggal_transaksi || new Date().toISOString().split('T')[0]);
    }
  }, [batch]);

  if (!batch || !warga) return null;

  const total = items.reduce((s, i) => s + Number(i.jumlah || 0), 0);

  const handleJumlahChange = (idx, val) => {
    const newItems = [...items];
    newItems[idx].jumlah = Number(val) || 0;
    setItems(newItems);
  };

  const handleHapusItem = (idx) => {
    if (!confirm('Hapus bulan ini dari batch?')) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Minimal 1 bulan harus ada. Kalau mau hapus semua, gunakan tombol Hapus.');
      return;
    }
    if (items.some((i) => i.jumlah <= 0)) {
      alert('Semua nominal harus lebih dari 0');
      return;
    }
    setSubmitting(true);
    try {
      await onSave({
        batchId: batch.batchId,
        items,
        catatan,
        tanggal,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const namaBulan = (kode) => {
    const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const idx = Number(kode.substring(5, 7)) - 1;
    return bulan[idx] || kode;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl my-8">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-white text-base">✏️ Edit Iuran Tunai</h3>
            <p className="text-[11px] text-slate-400">
              {warga.no_rumah} — {warga.nama_lengkap}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
              Tanggal Bayar
            </label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-2">
              Bulan & Nominal ({items.length} bulan)
            </label>
            <div className="space-y-1.5 max-h-64 overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl p-2">
              {items.map((item, idx) => (
                <div key={item.id || idx} className="flex gap-2 items-center">
                  <span className="text-xs text-slate-300 w-24 shrink-0">
                    {namaBulan(item.bulan_tahun)}
                  </span>
                  <input
                    type="number"
                    value={item.jumlah}
                    onChange={(e) => handleJumlahChange(idx, e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleHapusItem(idx)}
                    className="text-rose-400 hover:text-rose-300 text-[10px] px-2"
                    title="Hapus bulan ini"
                  >
                    🗑️
                  </button>
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-center text-xs text-slate-500 py-4">
                  Semua bulan dihapus. Tidak bisa simpan kosong.
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
              Catatan
            </label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none"
            />
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Total Setor:</span>
              <strong className="text-white">{formatRupiah(total)}</strong>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || items.length === 0}
              className="w-1/2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-xs"
            >
              {submitting ? 'Menyimpan...' : '💾 Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { formatRupiahProyek } from '../../lib/proyek/constants';

export default function ModalEditTunai({ data, warga, proyek, onClose, onSave }) {
  const [nominal, setNominal] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [catatan, setCatatan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (data) {
      setNominal(String(data.jumlah || ''));
      setTanggal(data.tanggal || '');
      setCatatan(data.catatan || '');
    }
  }, [data]);

  if (!data) return null;

  const nominalNum = Number(nominal) || 0;
  const targetPerWarga = Number(proyek?.nominal_per_warga || 0);
  const terlaluKecil = nominalNum <= 0;
  
  // Validasi terlaluBesar DIHAPUS agar bisa input Total (Iuran + Donasi)

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (terlaluKecil) return;

    setSubmitting(true);
    try {
      await onSave({
        id: data.id,
        jumlah: nominalNum,
        tanggal,
        catatan: catatan || null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl my-8">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="font-bold text-white text-base">✏️ Edit Cicilan Tunai</h3>
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Warga:</span>
            <strong className="text-white">
              {warga?.no_rumah} — {warga?.nama_lengkap}
            </strong>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Proyek:</span>
            <strong className="text-amber-300">{proyek?.nama}</strong>
          </div>
          <div className="flex justify-between text-xs border-t border-slate-800 pt-1">
            <span className="text-slate-400">Target per warga:</span>
            <strong className="text-slate-300">{formatRupiahProyek(targetPerWarga)}</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
              Total Diterima (Rp)
            </label>
            <input
              type="number"
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              *Nominal di atas target akan otomatis dihitung sebagai Donasi.
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
              Tanggal
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
              disabled={submitting || terlaluKecil}
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

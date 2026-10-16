import { useState, useEffect } from 'react';
import { JENIS_PENGELUARAN } from '../../lib/keuangan/constants';

export default function ModalEditPengeluaran({ data, onClose, onSave }) {
  const [tanggal, setTanggal] = useState('');
  const [jenis, setJenis] = useState('Kebutuhan RT');
  const [jenisCustom, setJenisCustom] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [nominal, setNominal] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (data) {
      setTanggal(data.tanggal || '');
      const isCustom = !JENIS_PENGELUARAN.includes(data.jenis);
      setJenis(isCustom ? 'Lainnya' : data.jenis || 'Kebutuhan RT');
      setJenisCustom(isCustom ? data.jenis : '');
      setKeterangan(data.keterangan || '');
      setNominal(String(data.nominal || ''));
    }
  }, [data]);

  if (!data) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const jenisFinal = jenis === 'Lainnya' ? jenisCustom.trim() : jenis;
    if (!jenisFinal || !nominal) {
      alert('Lengkapi data');
      return;
    }
    setSubmitting(true);
    try {
      await onSave({
        id: data.id,
        tanggal,
        jenis: jenisFinal,
        keterangan: keterangan || null,
        nominal: Number(nominal),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl my-8">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="font-bold text-white text-base">✏️ Edit Pengeluaran</h3>
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
              Jenis
            </label>
            <select
              value={jenis}
              onChange={(e) => setJenis(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            >
              {JENIS_PENGELUARAN.map((j) => (
                <option key={j}>{j}</option>
              ))}
            </select>
          </div>

          {jenis === 'Lainnya' && (
            <input
              type="text"
              value={jenisCustom}
              onChange={(e) => setJenisCustom(e.target.value)}
              placeholder="Jenis baru"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
          )}

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
              Keterangan
            </label>
            <textarea
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
              Nominal (Rp)
            </label>
            <input
              type="number"
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
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
              disabled={submitting}
              className="w-1/2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-xs"
            >
              {submitting ? 'Menyimpan...' : '💾 Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
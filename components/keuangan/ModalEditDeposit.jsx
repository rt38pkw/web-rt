import { useState, useEffect } from 'react';

export default function ModalEditDeposit({ data, warga, onClose, onSave }) {
  const [tgl, setTgl] = useState('');
  const [jumlah, setJumlah] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (data) {
      setTgl(data.tanggal || '');
      setJumlah(String(data.jumlah || ''));
      setKeterangan(data.keterangan || '');
    }
  }, [data]);

  if (!data) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jumlah || Number(jumlah) <= 0) {
      alert('Jumlah harus lebih dari 0');
      return;
    }
    setSubmitting(true);
    try {
      await onSave({
        id: data.id,
        tanggal: tgl,
        jumlah: Number(jumlah),
        keterangan: keterangan || null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const w = warga?.find((x) => x.id === data.warga_id);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl my-8">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="font-bold text-white text-base">✏️ Edit Deposit</h3>
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Warga:</span>
            <strong className="text-white">
              {w?.no_rumah} — {w?.nama_lengkap}
            </strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
              Tanggal
            </label>
            <input
              type="date"
              value={tgl}
              onChange={(e) => setTgl(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
              Jumlah (Rp)
            </label>
            <input
              type="number"
              value={jumlah}
              onChange={(e) => setJumlah(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

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
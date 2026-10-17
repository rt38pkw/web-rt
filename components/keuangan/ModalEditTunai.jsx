import { useState, useEffect } from 'react';

export default function ModalEditTunai({ batch, warga, tarifList, onClose, onSave }) {
  const [nominal, setNominal] = useState('');
  const [catatan, setCatatan] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (batch) {
      setNominal(String(batch.totalNominal || 0));
      setCatatan(batch.items[0]?.catatan || '');
      setTanggal(batch.items[0]?.tanggal_transaksi || new Date().toISOString().split('T')[0]);
    }
  }, [batch]);

  if (!batch || !warga) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nominalNum = Number(nominal);
    if (nominalNum <= 0) return alert('Nominal harus lebih dari 0');
    setSubmitting(true);
    try {
      await onSave({ batchId: batch.batchId, nominalTotal: nominalNum, catatan, tanggal });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl my-8">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-white text-base">✏️ Edit Iuran Tunai</h3>
            <p className="text-[11px] text-slate-400">{warga.no_rumah} — {warga.nama_lengkap}</p>
          </div>
          <button onClick={onClose} disabled={submitting} className="w-8 h-8 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center text-sm">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Total Diterima (Rp)</label>
            <input type="number" value={nominal} onChange={(e) => setNominal(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono" />
            <p className="text-[10px] text-slate-500 mt-1">*Sistem akan menghitung ulang bulan mana saja yang lunas & sisa depositnya.</p>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Tanggal Bayar</label>
            <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Catatan</label>
            <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={submitting} className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs">Batal</button>
            <button type="submit" disabled={submitting} className="w-1/2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-xs">{submitting ? 'Menyimpan...' : '💾 Simpan'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

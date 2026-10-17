import { useState, useEffect } from 'react';
import { formatRupiahProyek } from '../../lib/proyek/constants';

export default function ModalKasProyek({ 
  show, 
  onClose, 
  mode, // 'pengeluaran' | 'refund' | 'edit'
  proyekList = [], 
  wargaList = [],
  dataEdit = null,
  onSubmit, 
  submitting 
}) {
  const [proyekId, setProyekId] = useState('');
  const [wargaId, setWargaId] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [nominal, setNominal] = useState('');
  const [keterangan, setKeterangan] = useState('');

  useEffect(() => {
    if (show) {
      if (mode === 'edit' && dataEdit) {
        setProyekId(dataEdit.proyek_id || '');
        setWargaId(dataEdit.warga_id || '');
        setTanggal(dataEdit.tanggal || '');
        setNominal(String(dataEdit.nominal || ''));
        setKeterangan(dataEdit.keterangan || '');
      } else {
        setProyekId(proyekList.length > 0 ? proyekList[0].id : '');
        setWargaId('');
        setTanggal(new Date().toISOString().split('T')[0]);
        setNominal('');
        setKeterangan('');
      }
    }
  }, [show, mode, dataEdit, proyekList]);

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!proyekId || !nominal || Number(nominal) <= 0) {
      alert('Pilih proyek dan isi nominal yang valid');
      return;
    }
    if (mode === 'refund' && !wargaId) {
      alert('Pilih warga yang akan menerima refund');
      return;
    }

    onSubmit({
      id: dataEdit?.id,
      proyek_id: proyekId,
      warga_id: mode === 'refund' || dataEdit?.warga_id ? wargaId : null,
      tipe: mode === 'edit' ? dataEdit.tipe : mode,
      tanggal,
      nominal: Number(nominal),
      keterangan: keterangan.trim() || null,
    });
  };

  const title = mode === 'pengeluaran' ? 'Catat Pengeluaran' : mode === 'refund' ? 'Catat Refund Warga' : 'Edit Transaksi Kas';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl my-8">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="font-bold text-white text-base">{title}</h3>
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Proyek</label>
            <select
              value={proyekId}
              onChange={(e) => setProyekId(e.target.value)}
              disabled={mode === 'edit'}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white disabled:opacity-50"
            >
              <option value="">-- Pilih Proyek --</option>
              {proyekList.map((p) => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>
          </div>

          {(mode === 'refund' || (mode === 'edit' && dataEdit?.tipe === 'refund')) && (
            <div>
              <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Warga Penerima</label>
              <select
                value={wargaId}
                onChange={(e) => setWargaId(e.target.value)}
                disabled={mode === 'edit'}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white disabled:opacity-50"
              >
                <option value="">-- Pilih Warga --</option>
                {wargaList.map((w) => (
                  <option key={w.id} value={w.id}>{w.no_rumah} - {w.nama_lengkap}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Tanggal</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Nominal (Rp)</label>
            <input
              type="number"
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Keterangan</label>
            <textarea
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              rows={2}
              placeholder="Contoh: Beli 4 kamera CCTV"
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
              className="w-1/2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-xs"
            >
              {submitting ? 'Menyimpan...' : '💾 Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

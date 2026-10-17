import { useState, useEffect } from 'react';
import { formatRupiahProyek } from '../../lib/proyek/constants';

export default function ModalRefundMassal({ show, onClose, proyek, wargaList, iuranList, kasList, onProcess, submitting }) {
  const [selectedWarga, setSelectedWarga] = useState([]);
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);

  // Hitung data warga yang berhak dapat refund
  const dataWarga = wargaList.map(w => {
    const iuran = iuranList
      .filter(i => i.warga_id === w.id && i.proyek_id === proyek?.id && i.status === 'approved')
      .reduce((sum, i) => sum + i.jumlah, 0);
      
    const donasi = kasList
      .filter(k => k.warga_id === w.id && k.proyek_id === proyek?.id && k.tipe === 'donasi')
      .reduce((sum, k) => sum + k.nominal, 0);
      
    const refunded = kasList
      .filter(k => k.warga_id === w.id && k.proyek_id === proyek?.id && k.tipe === 'refund')
      .reduce((sum, k) => sum + k.nominal, 0);

    const refundable = (iuran + donasi) - refunded;

    return {
      ...w,
      iuran,
      donasi,
      refunded,
      refundable
    };
  }).filter(w => w.refundable > 0); // Hanya tampilkan yang punya sisa uang

  useEffect(() => {
    if (show) {
      setSelectedWarga([]); // Reset saat dibuka
      setTanggal(new Date().toISOString().split('T')[0]);
    }
  }, [show]);

  if (!show) return null;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedWarga(dataWarga.map(w => w.id));
    } else {
      setSelectedWarga([]);
    }
  };

  const toggleSelect = (id) => {
    if (selectedWarga.includes(id)) {
      setSelectedWarga(selectedWarga.filter(wId => wId !== id));
    } else {
      setSelectedWarga([...selectedWarga, id]);
    }
  };

  const handleProcess = () => {
    if (selectedWarga.length === 0) {
      alert('Pilih minimal satu warga untuk di-refund.');
      return;
    }
    
    const wargaTerpilih = dataWarga.filter(w => selectedWarga.includes(w.id));
    onProcess(wargaTerpilih, tanggal);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-3xl p-6 space-y-4 shadow-2xl my-8">
        
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-white text-base">↩️ Refund Warga (Pembatalan Proyek)</h3>
            <p className="text-[10px] text-slate-400 mt-1">Proyek: {proyek?.nama}</p>
          </div>
          <button onClick={onClose} disabled={submitting} className="w-8 h-8 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center text-sm">✕</button>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-[50vh] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] sticky top-0">
              <tr>
                <th className="p-2 w-10 text-center">
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll} 
                    checked={dataWarga.length > 0 && selectedWarga.length === dataWarga.length}
                    className="w-4 h-4 accent-blue-500 cursor-pointer"
                  />
                </th>
                <th className="p-2">Warga</th>
                <th className="p-2 text-right">Total Bayar (Iuran+Donasi)</th>
                <th className="p-2 text-right">Sisa Hak Refund</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {dataWarga.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-6 text-center text-slate-500">
                    Tidak ada warga yang memiliki saldo untuk di-refund.
                  </td>
                </tr>
              ) : (
                dataWarga.map(w => (
                  <tr key={w.id} className="hover:bg-slate-800/40 cursor-pointer" onClick={() => toggleSelect(w.id)}>
                    <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedWarga.includes(w.id)}
                        onChange={() => toggleSelect(w.id)}
                        className="w-4 h-4 accent-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-2">
                      <div className="font-semibold text-white">{w.nama_lengkap}</div>
                      <div className="text-[10px] text-slate-500">{w.no_rumah}</div>
                    </td>
                    <td className="p-2 text-right font-mono text-slate-300">
                      {formatRupiahProyek(w.iuran + w.donasi)}
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-400">
                      {formatRupiahProyek(w.refundable)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-950 border border-slate-800 rounded-xl p-3 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Tanggal Refund:</span>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
            />
          </div>
          <div className="text-xs">
            Total Dipilih: <strong className="text-emerald-400">{selectedWarga.length} Warga</strong>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={submitting} className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs">
            Batal
          </button>
          <button 
            onClick={handleProcess} 
            disabled={submitting || selectedWarga.length === 0} 
            className="w-1/2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-xs"
          >
            {submitting ? 'Memproses...' : '💾 Proses Refund Terpilih'}
          </button>
        </div>

      </div>
    </div>
  );
}

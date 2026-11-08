// components/proyek/ModalRekapProjek.js
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { formatRupiahProyek } from '../../lib/proyek/constants';
import { getTotalTerbayar } from '../../lib/proyek/calculations';

export default function ModalRekapProjek({ 
  show, onClose, proyek, 
  wargaList = [], 
  iuranProyekList = [], 
  kasProyekList = [] 
}) {
  const [penghuniList, setPenghuniList] = useState([]);
  const [loadingPenghuni, setLoadingPenghuni] = useState(false);

  // Fetch data penghuni secara mandiri saat modal dibuka
  useEffect(() => {
    if (!show) return;

    const fetchPenghuni = async () => {
      setLoadingPenghuni(true);
      try {
        const { data, error } = await supabase
          .from('penghuni')
          .select('id, warga_id, nama_lengkap, hubungan')
          .eq('is_aktif', true);
        
        if (!error && data) setPenghuniList(data);
      } catch (err) {
        console.error('Gagal load data penghuni:', err);
      } finally {
        setLoadingPenghuni(false);
      }
    };

    fetchPenghuni();
  }, [show]);

  if (!show || !proyek) return null;

  const wargaSafe = Array.isArray(wargaList) ? wargaList : [];
  const iuranSafe = Array.isArray(iuranProyekList) ? iuranProyekList : [];
  const kasSafe = Array.isArray(kasProyekList) ? kasProyekList : [];
  const target = Number(proyek.nominal_per_warga || 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md h-[85vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
          <div className="min-w-0">
            <h3 className="font-bold text-white text-sm truncate">
              📋 Rekap: {proyek.nama}
            </h3>
            <p className="text-[10px] text-slate-400 flex items-center gap-2">
              Target: {formatRupiahProyek(target)} / KK
              {loadingPenghuni && <span className="text-amber-400 animate-pulse">(Memuat...)</span>}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center text-sm transition shrink-0">
            ✕
          </button>
        </div>

        {/* Tabel Compact */}
        <div className="flex-1 overflow-auto bg-slate-900">
          <table className="w-full text-left text-xs table-fixed">
            <thead className="sticky top-0 z-30 bg-slate-950 text-slate-400 uppercase text-[9px] border-b border-slate-800">
              <tr>
                <th className="p-2 w-[110px]">Rumah / KK</th>
                <th className="p-2 text-right w-[80px]">Bayar</th>
                <th className="p-2 text-right w-[70px]">Donasi</th>
                <th className="p-2 text-center w-[45px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {wargaSafe.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-slate-500">Tidak ada data.</td>
                </tr>
              ) : (
                wargaSafe.map((w) => {
                  const terbayar = getTotalTerbayar(iuranSafe, w.id, proyek.id);
                  const lunas = terbayar >= target;
                  
                  const donasiWarga = kasSafe
                    .filter(k => k.warga_id === w.id && k.proyek_id === proyek.id && k.tipe === 'donasi')
                    .reduce((sum, k) => sum + Number(k.nominal || 0), 0);

                  // Cari data Kepala Keluarga
                  const kkPenghuni = penghuniList.find(p => p.warga_id === w.id && p.hubungan === 'Kepala Keluarga');
                  const namaKK = kkPenghuni ? kkPenghuni.nama_lengkap : 'Belum didata';

                  return (
                    <tr key={w.id} className="hover:bg-slate-800/30 transition">
                      {/* Kolom Rumah + Nama KK */}
                      <td className="p-2">
                        <div className="font-mono font-bold text-white text-[11px]">
                          {w.no_rumah?.replace(/\s/g, '')}
                        </div>
                        <div className="text-[9px] text-slate-300 truncate w-[95px] mt-0.5">
                          {namaKK}
                        </div>
                      </td>

                      {/* Kolom Bayar */}
                      <td className="p-2 text-right font-mono text-[10px] text-slate-300">
                        {formatRupiahProyek(Math.min(terbayar, target))}
                      </td>

                      {/* Kolom Donasi */}
                      <td className="p-2 text-right font-mono text-[10px] text-purple-400 font-semibold">
                        {donasiWarga > 0 ? `+${donasiWarga / 1000}rb` : '-'}
                      </td>

                      {/* Kolom Status */}
                      <td className="p-2 text-center">
                        {lunas ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">✓</span>
                        ) : terbayar > 0 ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">🟡</span>
                        ) : (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-between items-center text-xs text-slate-400">
          <span>{wargaSafe.length} KK</span>
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

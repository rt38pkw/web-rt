// components/warga/ModalKasProyek.js
import { formatRupiahProyek, formatTanggalProyek } from '../../lib/proyek/constants';

export default function ModalKasProyek({ show, onClose, proyek, iuranList = [], kasList = [], wargaList = [] }) {
  if (!show || !proyek) return null;

  // 1. Hitung Total Iuran Proyek (Approved)
  const totalIuran = iuranList
    .filter(i => i.status === 'approved' && i.proyek_id === proyek.id)
    .reduce((s, i) => s + Number(i.jumlah || 0), 0);

  // 2. Filter & Hitung Donasi
  const donasiList = kasList
    .filter(k => k.tipe === 'donasi' && k.proyek_id === proyek.id)
    .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
  const totalDonasi = donasiList.reduce((s, k) => s + Number(k.nominal || 0), 0);

  // 3. Filter & Hitung Pengeluaran
  const pengeluaranList = kasList
    .filter(k => k.tipe === 'pengeluaran' && k.proyek_id === proyek.id)
    .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
  const totalPengeluaran = pengeluaranList.reduce((s, k) => s + Number(k.nominal || 0), 0);

  // 4. Kalkulasi Saldo
  const totalPemasukan = totalIuran + totalDonasi;
  const saldoAkhir = totalPemasukan - totalPengeluaran;

  // Helper untuk mencari nama KK dari id warga
  const getNamaWarga = (wargaId) => {
    const w = wargaList.find(x => x.id === wargaId);
    return w ? w.nama_lengkap : 'Hamba Allah';
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-slate-900 border-t sm:border border-slate-700 w-full max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl relative">
        
        {/* HEADER MODAL */}
        <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60 shrink-0">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">💰 Transparansi Kas Proyek</h3>
            <p className="text-[11px] text-teal-400 mt-0.5">{proyek.nama}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center text-sm transition">✕</button>
        </div>

        {/* BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
          
          {/* RINGKASAN SALDO (3 KOTAK SEJAJAR) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Total Pemasukan</span>
              <span className="text-base font-black text-emerald-400">{formatRupiahProyek(totalPemasukan)}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Total Pengeluaran</span>
              <span className="text-base font-black text-rose-400">{formatRupiahProyek(totalPengeluaran)}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Sisa Saldo Kas</span>
              <span className="text-base font-black text-white">{formatRupiahProyek(saldoAkhir)}</span>
            </div>
          </div>

          {/* ═══ BAGIAN PEMASUKAN ═══ */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-blue-400 flex items-center gap-1.5">
              <span>💵</span> Pemasukan
            </h4>
            
            {/* Iuran Proyek Total */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-300">Iuran Proyek (Total)</span>
              <span className="text-sm font-bold text-emerald-400">{formatRupiahProyek(totalIuran)}</span>
            </div>

            {/* Pemasukan Lainnya (Donasi) */}
            {donasiList.length > 0 && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <span>➕</span> Pemasukan Lainnya
                  </span>
                </div>
                <div className="divide-y divide-slate-800/60">
                  {donasiList.map((k) => (
                    <div key={k.id} className="p-3 flex justify-between items-start gap-3">
                      <div>
                        <div className="text-xs font-semibold text-white">Donasi</div>
                        <div className="text-[10px] text-slate-400 italic mt-0.5">
                          {getNamaWarga(k.warga_id)}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{formatTanggalProyek(k.tanggal)}</div>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 shrink-0">+ {formatRupiahProyek(k.nominal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ═══ BAGIAN PENGELUARAN ═══ */}
          {pengeluaranList.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-rose-400 flex items-center gap-1.5">
                <span>💸</span> Pengeluaran
              </h4>
              
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <span>➖</span> Rincian Pengeluaran
                  </span>
                </div>
                <div className="divide-y divide-slate-800/60">
                  {pengeluaranList.map((k) => (
                    <div key={k.id} className="p-3 flex justify-between items-start gap-3">
                      <div>
                        <div className="text-xs font-semibold text-white">{k.keterangan || 'Pengeluaran Proyek'}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{formatTanggalProyek(k.tanggal)}</div>
                      </div>
                      <span className="text-xs font-bold text-rose-400 shrink-0">- {formatRupiahProyek(k.nominal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Jika Kosong */}
          {donasiList.length === 0 && pengeluaranList.length === 0 && totalIuran === 0 && (
            <div className="text-center text-xs text-slate-500 py-6 bg-slate-950/50 rounded-xl border border-slate-800">
              Belum ada transaksi kas untuk proyek ini.
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

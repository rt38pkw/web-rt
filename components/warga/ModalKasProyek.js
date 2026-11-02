// components/warga/ModalKasProyek.js
import { formatRupiahProyek, formatTanggalProyek } from '../../lib/proyek/constants';

export default function ModalKasProyek({ show, onClose, proyek, iuranList = [], kasList = [], wargaList = [] }) {
  if (!show || !proyek) return null;

  // 1. Hitung Total Iuran Proyek (Approved)
  const totalIuran = iuranList
    .filter(i => i.status === 'approved' && i.proyek_id === proyek.id)
    .reduce((s, i) => s + Number(i.jumlah || 0), 0);

  // 2. Ambil Rincian Donasi
  const donasiList = kasList
    .filter(k => k.tipe === 'donasi' && k.proyek_id === proyek.id)
    .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  const totalDonasi = donasiList.reduce((s, k) => s + Number(k.nominal || 0), 0);

  // 3. Ambil Rincian Pengeluaran
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
      <div className="bg-slate-900 border-t sm:border border-slate-700 w-full max-w-lg h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl relative">
        
        {/* HEADER */}
        <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-950/60 shrink-0">
          <div>
            <h3 className="text-base font-bold text-white">💰 Kas Proyek</h3>
            <p className="text-[11px] text-teal-400">{proyek.nama}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center text-sm">✕</button>
        </div>

        {/* BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          
          {/* RINGKASAN SALDO */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3 flex flex-col justify-between">
              <div>
                <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mb-1">Total Pemasukan</div>
                <div className="text-sm font-bold text-white">{formatRupiahProyek(totalPemasukan)}</div>
              </div>
              <div className="mt-2 text-[9px] text-slate-400 space-y-0.5 border-t border-emerald-500/20 pt-1">
                <div className="flex justify-between"><span>Iuran Proyek:</span> <span>{formatRupiahProyek(totalIuran)}</span></div>
                <div className="flex justify-between"><span>Donasi:</span> <span>{formatRupiahProyek(totalDonasi)}</span></div>
              </div>
            </div>
            
            <div className="bg-rose-950/30 border border-rose-500/20 rounded-xl p-3 flex flex-col justify-between">
              <div>
                <div className="text-[10px] text-rose-400 font-semibold uppercase tracking-wider mb-1">Total Pengeluaran</div>
                <div className="text-sm font-bold text-white">{formatRupiahProyek(totalPengeluaran)}</div>
              </div>
              <div className="mt-2 text-[9px] text-slate-400">
                Digunakan untuk keperluan proyek.
              </div>
            </div>

            <div className="col-span-2 bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-500/30 rounded-xl p-3 flex justify-between items-center">
              <div className="text-xs text-blue-300 font-semibold uppercase tracking-wider">Sisa Saldo Proyek</div>
              <div className="text-lg font-black text-blue-400">{formatRupiahProyek(saldoAkhir)}</div>
            </div>
          </div>

          {/* RINCIAN PENGELUARAN */}
          {pengeluaranList.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                🛒 Rincian Pengeluaran
              </h4>
              <div className="space-y-2">
                {pengeluaranList.map((k) => (
                  <div key={k.id} className="bg-slate-950 border border-rose-500/20 rounded-xl p-3 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-white">{k.keterangan || 'Pengeluaran'}</span>
                      <span className="font-mono font-bold text-xs text-rose-400">- {formatRupiahProyek(k.nominal)}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {formatTanggalProyek(k.tanggal)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RINCIAN DONASI */}
          {donasiList.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                💚 Rincian Donasi
              </h4>
              <div className="space-y-2">
                {donasiList.map((k) => (
                  <div key={k.id} className="bg-slate-950 border border-purple-500/20 rounded-xl p-3 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-white">{getNamaWarga(k.warga_id)}</span>
                      <span className="font-mono font-bold text-xs text-purple-400">+ {formatRupiahProyek(k.nominal)}</span>
                    </div>
                    <div className="flex justify-between items-start text-[10px]">
                      <span className="text-slate-500">{formatTanggalProyek(k.tanggal)}</span>
                      <span className="text-slate-400 italic text-right max-w-[60%] truncate">{k.keterangan}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {donasiList.length === 0 && pengeluaranList.length === 0 && (
            <div className="text-center text-xs text-slate-500 py-4 bg-slate-950/50 rounded-xl border border-slate-800">
              Belum ada rincian transaksi untuk proyek ini.
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

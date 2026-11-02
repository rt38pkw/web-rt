// components/warga/ModalKasProyek.js
import { formatRupiahProyek, formatTanggalProyek } from '../../lib/proyek/constants';

export default function ModalKasProyek({ show, onClose, proyek, iuranList, kasList }) {
  if (!show || !proyek) return null;

  // Hitung Total Pemasukan (Iuran Approved + Donasi)
  const totalIuran = (iuranList || [])
    .filter(i => i.status === 'approved' && i.proyek_id === proyek.id)
    .reduce((s, i) => s + Number(i.jumlah || 0), 0);

  const totalDonasi = (kasList || [])
    .filter(k => k.tipe === 'donasi' && k.proyek_id === proyek.id)
    .reduce((s, k) => s + Number(k.nominal || 0), 0);

  // Hitung Total Pengeluaran
  const totalPengeluaran = (kasList || [])
    .filter(k => k.tipe === 'pengeluaran' && k.proyek_id === proyek.id)
    .reduce((s, k) => s + Number(k.nominal || 0), 0);

  const totalPemasukan = totalIuran + totalDonasi;
  const saldoAkhir = totalPemasukan - totalPengeluaran;

  // Gabungkan & urutkan riwayat kas (Donasi & Pengeluaran)
  const riwayatKas = (kasList || [])
    .filter(k => k.proyek_id === proyek.id && k.tipe !== 'refund')
    .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

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
            <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3">
              <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mb-1">Pemasukan</div>
              <div className="text-sm font-bold text-white">{formatRupiahProyek(totalPemasukan)}</div>
            </div>
            <div className="bg-rose-950/30 border border-rose-500/20 rounded-xl p-3">
              <div className="text-[10px] text-rose-400 font-semibold uppercase tracking-wider mb-1">Pengeluaran</div>
              <div className="text-sm font-bold text-white">{formatRupiahProyek(totalPengeluaran)}</div>
            </div>
            <div className="col-span-2 bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-500/30 rounded-xl p-3 flex justify-between items-center">
              <div className="text-xs text-blue-300 font-semibold uppercase tracking-wider">Sisa Saldo Proyek</div>
              <div className="text-lg font-black text-blue-400">{formatRupiahProyek(saldoAkhir)}</div>
            </div>
          </div>

          {/* RIWAYAT TRANSAKSI (CARD LIST) */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Riwayat Transaksi</h4>
            {riwayatKas.length === 0 ? (
              <div className="text-center text-xs text-slate-500 py-4 bg-slate-950/50 rounded-xl border border-slate-800">Belum ada transaksi kas untuk proyek ini.</div>
            ) : (
              <div className="space-y-2">
                {riwayatKas.map((k) => (
                  <div key={k.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-1.5">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          k.tipe === 'donasi' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {k.tipe === 'donasi' ? '💚 Donasi' : '🛒 Pengeluaran'}
                        </span>
                        <span className="text-[10px] text-slate-500">{formatTanggalProyek(k.tanggal)}</span>
                      </div>
                      <span className={`font-mono font-bold text-xs ${k.tipe === 'donasi' ? 'text-purple-400' : 'text-rose-400'}`}>
                        {k.tipe === 'donasi' ? '+' : '-'} {formatRupiahProyek(k.nominal)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 italic">
                      "{k.keterangan || 'Tanpa keterangan'}"
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

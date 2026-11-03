// components/warga/IuranGrid.js
import { getInfoBulan } from '../../lib/iuran/calculations';

export default function IuranGrid({ 
  iuranList, 
  tarifBulanan, 
  tarifMap = {}, 
  adaPending, 
  bulanTombolBayar, 
  onBayar, 
  periodeBulan = [], 
  isModePantau = false,
  tahunTerpilih,
  setTahunTerpilih,
  tahunTersedia = []
}) {
  const now = new Date();
  const bulanSekarang = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-xl">
      
      {/* HEADER & FILTER TAHUN */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Grid Iuran Bulanan</h3>
          <p className="text-xs text-slate-400">Riwayat lengkap pembayaran iuran Anda</p>
        </div>
        
        {/* DROPDOWN FILTER TAHUN */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-500">Tahun:</span>
          <select 
            value={tahunTerpilih} 
            onChange={(e) => setTahunTerpilih(Number(e.target.value))}
            className="bg-slate-950 border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {tahunTersedia.map(thn => (
              <option key={thn} value={thn}>{thn}</option>
            ))}
          </select>
        </div>
      </div>

      {adaPending && (
        <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl text-xs text-orange-300">
          ⏳ Ada pengajuan yang menunggu approve bendahara.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {periodeBulan.map((bln, idx) => {
          const safeTarif = tarifMap[bln.kode] !== undefined ? tarifMap[bln.kode] : tarifBulanan;
          
          const info = getInfoBulan(iuranList, bln.kode, safeTarif);
          const isPending = info.adaPendingBulan;
          const isRejected = info.adaRejectedBulan;
          const isLunas = !isPending && !isRejected && info.totalApproved >= safeTarif && safeTarif > 0;
          const isSebagian = !isPending && !isRejected && info.totalApproved > 0 && info.totalApproved < safeTarif;
          const isKosong = info.recs.length === 0;
          const isJatuhTempo = bln.kode <= bulanSekarang;

          // Cek apakah ini bulan yang harusnya ada tombol bayar
          // (bulanTombolBayar dikirim dari parent iuran.js sebagai bulan pertama yg belum lunas)
          const isTombolBayar = !adaPending && !isPending && !isLunas && bln.kode === bulanTombolBayar && !isModePantau;

          let cardClass = 'bg-slate-950/60 border-slate-800/60 text-slate-400';
          if (isLunas) cardClass = 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300';
          else if (isSebagian) cardClass = 'bg-amber-950/20 border-amber-500/30 text-amber-300';
          else if (isPending) cardClass = 'bg-orange-950/20 border-orange-500/30 text-orange-300';
          else if (isRejected) cardClass = 'bg-rose-950/30 border-rose-500/40 text-rose-300';
          else if (isKosong && isJatuhTempo) cardClass = 'bg-rose-950/20 border-rose-500/30 text-rose-300';

          const label = isLunas ? '✓ Lunas' : isSebagian ? `- Rp ${info.kurang.toLocaleString('id-ID')}` : isPending ? '⏳ Menunggu' : isRejected ? '❌ Ditolak' : isJatuhTempo ? '⚠️ Telat' : 'Belum';
          const badgeClass = isLunas ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : isSebagian ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : isPending ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' : isRejected ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : isJatuhTempo ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-slate-800/80 text-slate-400 border-slate-700/60';

          const lastTx = info.recs.find(r => r.status === 'approved' || r.status === 'pending');
          const tglTx = lastTx?.tanggal_transaksi 
            ? new Date(lastTx.tanggal_transaksi).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
            : null;

          return (
            <div key={idx} className={`p-3.5 rounded-2xl border transition-all duration-200 ${cardClass}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white tracking-wide">{bln.nama}</span>
                  <span className="text-[10px] text-slate-400">{bln.kode.split('-')[0]}</span>
                </div>
                <span className={`inline-block text-[10px] px-2.5 py-1 rounded-xl font-semibold border ${badgeClass}`}>{label}</span>
              </div>

              <div className="text-[11px] text-slate-400 flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span>
                    {isLunas ? `Rp ${info.totalApproved.toLocaleString('id-ID')}` : 
                     isSebagian ? `Terbayar Rp ${info.totalApproved.toLocaleString('id-ID')}` : 
                     `Rp 0 / ${safeTarif.toLocaleString('id-ID')}`}
                  </span>
                  {tglTx && (
                    <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                      📅 {tglTx}
                    </span>
                  )}
                </div>
              </div>

              {/* TOMBOL QRIS (HANYA MUNCUL 1 KALI DI BULAN YANG DITENTUKAN) */}
              {isTombolBayar && (
                <button onClick={onBayar} className="mt-3 w-full bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold py-2 rounded-xl transition shadow-lg shadow-blue-600/20">
                  📱 Bayar via QRIS
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

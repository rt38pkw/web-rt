// components/warga/IuranGrid.js
import { useRef, useEffect } from 'react';
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
  const scrollContainerRef = useRef(null);
  const unpaidRef = useRef(null);

  // Auto-scroll ke bulan belum lunas saat pertama kali dimuat
  useEffect(() => {
    if (unpaidRef.current) {
      unpaidRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [periodeBulan, iuranList]);

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl shadow-xl flex flex-col max-h-[65vh]">
      
      {/* HEADER & FILTER TAHUN */}
      <div className="bg-slate-900/95 backdrop-blur-md rounded-t-3xl p-4 sm:p-5 border-b border-slate-800/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">Grid Iuran Bulanan</h3>
          <p className="text-[10px] text-slate-400">Riwayat lengkap pembayaran iuran Anda</p>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-500">Tahun:</span>
          <select 
            value={tahunTerpilih} 
            onChange={(e) => setTahunTerpilih(Number(e.target.value))}
            className="bg-slate-950 border border-slate-700 text-white text-xs font-bold rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {tahunTersedia.map(thn => (
              <option key={thn} value={thn}>{thn}</option>
            ))}
          </select>
        </div>
      </div>

      {/* AREA SCROLLABLE */}
      <div ref={scrollContainerRef} className="p-4 sm:p-5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {adaPending && (
          <div className="mb-4 p-2.5 bg-orange-500/10 border border-orange-500/30 rounded-xl text-[10px] text-orange-300">
            ⏳ Ada pengajuan yang menunggu approve bendahara.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {periodeBulan.map((bln, idx) => {
            const safeTarif = tarifMap[bln.kode] !== undefined ? tarifMap[bln.kode] : tarifBulanan;
            
            const info = getInfoBulan(iuranList, bln.kode, safeTarif);
            const isPending = info.adaPendingBulan;
            const isRejected = info.adaRejectedBulan;
            const isLunas = !isPending && !isRejected && info.totalApproved >= safeTarif && safeTarif > 0;
            const isSebagian = !isPending && !isRejected && info.totalApproved > 0 && info.totalApproved < safeTarif;
            const isKosong = info.recs.length === 0;
            const isJatuhTempo = bln.kode <= bulanSekarang;

            const isTombolBayar = !adaPending && !isPending && !isLunas && bln.kode === bulanTombolBayar && !isModePantau;
            const isFirstUnpaid = (!isLunas && !isPending && !isRejected && isJatuhTempo) || isTombolBayar;

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

            const rejectRecord = info.recs.find(r => r.status === 'rejected');
            const alasanTolak = rejectRecord?.catatan ? rejectRecord.catatan.replace(/^Ditolak:\s*/i, '') : null;

            return (
              <div 
                key={idx} 
                ref={isFirstUnpaid ? unpaidRef : null}
                className={`p-3 rounded-xl border transition-all duration-200 ${cardClass}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-white tracking-wide">{bln.nama}</span>
                    <span className="text-[9px] text-slate-400">{bln.kode.split('-')[0]}</span>
                  </div>
                  <span className={`inline-block text-[9px] px-2 py-0.5 rounded-lg font-semibold border ${badgeClass}`}>{label}</span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="text-[10px] text-slate-400">
                    {isLunas ? `Rp ${info.totalApproved.toLocaleString('id-ID')}` : 
                     isSebagian ? `Terbayar Rp ${info.totalApproved.toLocaleString('id-ID')}` : 
                     `Rp 0 / ${safeTarif.toLocaleString('id-ID')}`}
                  </div>
                  
                  {tglTx && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[8px] text-slate-500">Tgl Transaksi:</span>
                      <span className="text-[8px] bg-slate-800 text-slate-300 px-1 py-0.5 rounded border border-slate-700 font-mono">
                        📅 {tglTx}
                      </span>
                    </div>
                  )}

                  {isRejected && alasanTolak && (
                    <div className="mt-1 text-[9px] bg-rose-500/10 text-rose-300 p-1.5 rounded-md border border-rose-500/20">
                      <span className="font-bold">Catatan:</span> {alasanTolak}
                    </div>
                  )}
                </div>

                {isTombolBayar && (
                  <button onClick={onBayar} className="mt-2 w-full bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-semibold py-1.5 rounded-lg transition shadow-lg shadow-blue-600/20">
                    📱 Bayar via QRIS
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

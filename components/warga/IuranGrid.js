import { PERIODE_BULAN } from '../../lib/iuran/constants';
import { getInfoBulan } from '../../lib/iuran/calculations';

export default function IuranGrid({
  iuranList,
  tarifBulanan,
  adaPending,
  bulanTombolBayar,
  onKlikDetail,
  onBayar,
}) {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-xl">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Grid Iuran Bulanan 2026
          </h3>
          <p className="text-xs text-slate-400">Klik grid untuk detail tanggal</p>
        </div>
        <span className="text-xs bg-slate-800/80 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700/60 font-medium">
          9 Bulan
        </span>
      </div>

      {adaPending && (
        <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl text-xs text-orange-300">
          ⏳ Ada pengajuan yang menunggu approve bendahara. Tunggu sampai disetujui sebelum mengajukan lagi.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {PERIODE_BULAN.map((bln, idx) => {
          const info = getInfoBulan(iuranList, bln.kode, tarifBulanan);
          const isPending = info.adaPendingBulan;
          const isLunas = !isPending && info.totalApproved >= tarifBulanan;
          const isSebagian = !isPending && info.totalApproved > 0 && info.totalApproved < tarifBulanan;
          const isKosong = info.recs.length === 0;

          const isTombolBayar =
            !adaPending && !isPending && !isLunas && bln.kode === bulanTombolBayar;

          let cardClass = 'bg-slate-950/60 border-slate-800/60 text-slate-400';
          if (isLunas) cardClass = 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300';
          else if (isSebagian) cardClass = 'bg-amber-950/20 border-amber-500/30 text-amber-300';
          else if (isPending) cardClass = 'bg-orange-950/20 border-orange-500/30 text-orange-300';

          const canClick = !isPending && !isKosong && info.totalApproved > 0;

          return (
            <div
              key={idx}
              onClick={() => {
                if (canClick) {
                  onKlikDetail({
                    namaBulan: bln.nama,
                    jumlah: info.totalApproved,
                    tanggal: info.recs.find((r) => r.status === 'approved')?.tanggal_transaksi,
                  });
                }
              }}
              className={`p-3.5 rounded-2xl border transition-all duration-200 ${cardClass} ${
                canClick ? 'cursor-pointer hover:scale-[1.01]' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white tracking-wide">{bln.nama}</span>
                  <span className="text-[10px] text-slate-400">2026</span>
                </div>
                <span
                  className={`inline-block text-[10px] px-2.5 py-1 rounded-xl font-semibold border ${
                    isLunas
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : isSebagian
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : isPending
                      ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700/60'
                  }`}
                >
                  {isLunas
                    ? '✓ Lunas'
                    : isSebagian
                    ? `- Rp ${info.kurang.toLocaleString('id-ID')}`
                    : isPending
                    ? '⏳ Menunggu'
                    : 'Belum'}
                </span>
              </div>

              <div className="text-[11px] mt-1 text-slate-400">
                {isLunas
                  ? `Rp ${info.totalApproved.toLocaleString('id-ID')}`
                  : isSebagian
                  ? `Terbayar Rp ${info.totalApproved.toLocaleString('id-ID')}`
                  : isPending
                  ? `Rp ${info.totalApproved.toLocaleString('id-ID')}`
                  : `Rp 0 / ${tarifBulanan.toLocaleString('id-ID')}`}
              </div>

              {isTombolBayar && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onBayar();
                  }}
                  className="mt-2.5 w-full bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold py-2 rounded-xl transition shadow-lg shadow-blue-600/20"
                >
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
import { formatRupiahProyek, formatTanggalProyek, hitungSisaHari, isProyekTelat } from '../../lib/proyek/constants';

export default function ProjekCard({ 
  proyek, 
  terbayar = 0, 
  sisa = 0, 
  statusWarga, 
  adaPending = false, 
  donasiWarga = 0, 
  onBayar,
  onLihatRekap,
}) {
  // ═══ GUARD UTAMA ═══
  if (!proyek || !proyek.id) return null;

  const target = Number(proyek.nominal_per_warga || 0);
  const persen = target > 0 ? Math.min(100, Math.round((terbayar / target) * 100)) : 0;
  const sisaHari = hitungSisaHari(proyek.deadline);
  const telat = isProyekTelat(proyek);

  let badgeLabel = '';
  let badgeClass = '';
  if (statusWarga === 'lunas') {
    badgeLabel = '✓ Lunas';
    badgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  } else if (adaPending) {
    badgeLabel = '⏳ Menunggu';
    badgeClass = 'bg-orange-500/10 text-orange-400 border-orange-500/30';
  } else if (statusWarga === 'kurang') {
    badgeLabel = '⚠️ Kurang';
    badgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  } else {
    badgeLabel = telat ? '🔴 Telat' : 'Belum';
    badgeClass = telat
      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
      : 'bg-slate-800 text-slate-400 border-slate-700';
  }

  const isLunas = statusWarga === 'lunas';
  const bisaBayar = !isLunas && !adaPending && proyek.status === 'aktif';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
      <div className="flex justify-between items-start gap-2 flex-wrap">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-white">🏗️ {proyek.nama}</h3>
          {proyek.deskripsi && (
            <p className="text-[11px] text-slate-400 mt-0.5">{proyek.deskripsi}</p>
          )}
          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 flex-wrap">
            <span>Target: <strong className="text-slate-300">{formatRupiahProyek(target)}</strong></span>
            <span>•</span>
            <span className={telat ? 'text-rose-400' : ''}>
              Deadline: {formatTanggalProyek(proyek.deadline)}
              {!telat && sisaHari > 0 && ` (${sisaHari} hari)`}
            </span>
          </div>
        </div>
        <span className={`text-[10px] px-2.5 py-1 rounded-xl font-semibold border ${badgeClass}`}>
          {badgeLabel}
        </span>
      </div>

      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-slate-400">Progress</span>
          <span className="text-white font-bold">{formatRupiahProyek(terbayar)} / {formatRupiahProyek(target)}</span>
        </div>
        <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all ${
              isLunas
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                : 'bg-gradient-to-r from-amber-500 to-amber-400'
            }`}
            style={{ width: `${persen}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] mt-1">
          <span className="text-slate-500">{persen}%</span>
          <span className={sisa > 0 ? 'text-amber-400' : 'text-emerald-400'}>
            {sisa > 0 ? `Sisa ${formatRupiahProyek(sisa)}` : '✓ Selesai'}
          </span>
        </div>
      </div>

      {donasiWarga > 0 && (
        <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-2.5 text-[11px] flex justify-between items-center">
          <span className="text-purple-300">💚 Donasi Anda untuk proyek ini:</span>
          <strong className="text-purple-400">{formatRupiahProyek(donasiWarga)}</strong>
        </div>
      )}

      {bisaBayar && (
        <button
          onClick={onBayar}
          className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold py-3 rounded-xl transition shadow-lg shadow-amber-600/20"
        >
          💰 Bayar Cicilan (bisa lebih → jadi donasi)
        </button>
      )}

      {adaPending && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-2.5 text-[10px] text-orange-300 text-center">
          ⏳ Menunggu approve bendahara. Tunggu sampai disetujui untuk bayar lagi.
        </div>
      )}

      {isLunas && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 text-[10px] text-emerald-300 text-center">
          ✓ Terima kasih! Cicilan Anda sudah lunas.
        </div>
      )}

      {proyek.status === 'selesai' && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-2.5 text-[10px] text-blue-300 text-center">
          Proyek sudah selesai.
        </div>
      )}

      <button
        onClick={onLihatRekap}
        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold py-2 rounded-xl border border-slate-700 transition"
      >
        📋 Lihat Rekap Warga
      </button>
    </div>
  );
}

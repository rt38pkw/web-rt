// components/warga/ProjekCard.js
import { formatRupiahProyek, formatTanggalProyek } from '../../lib/proyek/constants';

export default function ProjekCard({
  proyek,
  terbayar,
  sisa,
  statusWarga,
  adaPending,
  donasiWarga,
  onBayar,
  onLihatRekap,
}) {
  if (!proyek) return null;

  const target = Number(proyek.nominal_per_warga) || 0;
  const progress = target > 0 ? Math.min((terbayar / target) * 100, 100) : 0;
  
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
      
      {/* HEADER PROYEK */}
      <div className="flex justify-between items-start gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
              proyek.status === 'aktif' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {proyek.status === 'aktif' ? '🟢 Aktif' : '⚪ Selesai'}
            </span>
            {donasiWarga > 0 && (
              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase border bg-purple-500/10 text-purple-400 border-purple-500/20">
                💚 Donatur
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-white leading-tight">{proyek.nama || 'Tanpa Nama'}</h3>
          {proyek.deskripsi && <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{proyek.deskripsi}</p>}
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Target</div>
          <div className="text-sm font-bold text-amber-400">{formatRupiahProyek(target)}</div>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Terkumpul: <strong className="text-white">{formatRupiahProyek(terbayar)}</strong></span>
          <span className={`font-bold ${statusWarga === 'lunas' ? 'text-emerald-400' : 'text-orange-400'}`}>
            {statusWarga === 'lunas' ? '✅ Lunas' : statusWarga === 'kurang' ? '⏳ Belum Lunas' : '⚪ Belum Bayar'}
          </span>
        </div>
        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${statusWarga === 'lunas' ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* FOOTER & AKSI */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 border-t border-slate-800/60">
        <div className="text-[10px] text-slate-500">
          {proyek.deadline ? `Tenggat: ${formatTanggalProyek(proyek.deadline)}` : 'Tanpa tenggat waktu'}
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={onLihatRekap}
            className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-[10px] font-semibold transition"
          >
            📊 Rekap
          </button>
          
          {statusWarga !== 'lunas' && proyek.status === 'aktif' && (
            <button 
              onClick={onBayar}
              disabled={adaPending}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-bold transition shadow-lg ${
                adaPending 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
              }`}
            >
              {adaPending ? '⏳ Menunggu Verifikasi' : '💳 Bayar Cicilan'}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}

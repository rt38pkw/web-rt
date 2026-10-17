import { formatRupiahProyek, formatTanggalProyek, isProyekTelat } from '../../lib/proyek/constants';
import { getProgressProyek } from '../../lib/proyek/calculations';

export default function TabRingkasan({ proyekList = [], iuranProyekList = [], wargaList = [] }) {
  if (proyekList.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-2">🏗️</div>
        <h3 className="text-base font-bold text-white mb-1">Belum Ada Proyek</h3>
        <p className="text-xs text-slate-400">
          Buat proyek baru di sub-tab <strong className="text-amber-400">➕ Kelola Proyek</strong>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {proyekList.map((proyek) => {
        const progress = getProgressProyek(iuranProyekList, wargaList, proyek);
        const telat = isProyekTelat(proyek);

        return (
          <div key={proyek.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {/* Header Proyek */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-start gap-2 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-white">🏗️ {proyek.nama}</h3>
                  {proyek.status === 'aktif' && !telat && (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                      Aktif
                    </span>
                  )}
                  {telat && (
                    <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded">
                      🔴 Telat
                    </span>
                  )}
                  {proyek.status === 'selesai' && (
                    <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                      Selesai
                    </span>
                  )}
                </div>
                {proyek.deskripsi && (
                  <p className="text-[11px] text-slate-400 mt-1">{proyek.deskripsi}</p>
                )}
                <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 flex-wrap">
                  <span>Target: <strong className="text-amber-300">{formatRupiahProyek(proyek.nominal_per_warga)}</strong>/warga</span>
                  <span>•</span>
                  <span className={telat ? 'text-rose-400' : ''}>
                    Deadline: {formatTanggalProyek(proyek.deadline)}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
              <div className="bg-slate-950 rounded-xl p-3">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Total Target</div>
                <div className="text-sm font-bold text-white mt-1">{formatRupiahProyek(progress.totalTarget)}</div>
              </div>
              <div className="bg-slate-950 rounded-xl p-3">
                <div className="text-[10px] text-emerald-400 uppercase tracking-wider">Terbayar</div>
                <div className="text-sm font-bold text-emerald-400 mt-1">{formatRupiahProyek(progress.totalTerbayar)}</div>
              </div>
              <div className="bg-slate-950 rounded-xl p-3">
                <div className="text-[10px] text-amber-400 uppercase tracking-wider">Sisa</div>
                <div className="text-sm font-bold text-amber-400 mt-1">{formatRupiahProyek(progress.totalSisa)}</div>
              </div>
              <div className="bg-slate-950 rounded-xl p-3">
                <div className="text-[10px] text-blue-400 uppercase tracking-wider">Lunas</div>
                <div className="text-sm font-bold text-blue-400 mt-1">
                  {progress.jumlahLunas} / {progress.jumlahWarga} warga
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="px-4 pb-4">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1.5">
                <span>Progress keseluruhan</span>
                <span className="text-white font-bold">{progress.persen}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all ${
                    progress.persen === 100
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                      : 'bg-gradient-to-r from-amber-500 to-amber-400'
                  }`}
                  style={{ width: `${progress.persen}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

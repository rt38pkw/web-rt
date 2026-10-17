import { formatRupiahProyek } from '../../lib/proyek/constants';
import { getTotalTerbayar } from '../../lib/proyek/calculations';

export default function ModalRekapProjek({ show, onClose, proyek, wargaList, iuranProyekList }) {
  // ═══ GUARD: Kalau proyek belum ada, jangan render ═══
  if (!show || !proyek) return null;

  const wargaSafe = Array.isArray(wargaList) ? wargaList : [];
  const iuranSafe = Array.isArray(iuranProyekList) ? iuranProyekList : [];
  const target = Number(proyek.nominal_per_warga || 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl h-[85vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
          <div className="min-w-0">
            <h3 className="font-bold text-white text-sm sm:text-base truncate">
              📋 Rekap Warga: {proyek.nama}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-400">
              Target: {formatRupiahProyek(target)} / warga
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center text-sm transition shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-30 bg-slate-950 text-slate-400 uppercase text-[10px]">
              <tr className="border-b border-slate-800">
                <th className="p-2 sm:p-3 sticky left-0 bg-slate-950 z-30 w-[60px] border-r border-slate-800/80">Rumah</th>
                <th className="p-2 sm:p-3 sticky left-[60px] bg-slate-950 z-30 w-[150px] border-r border-slate-800/80">Nama</th>
                <th className="p-2 sm:p-3 text-right">Terbayar</th>
                <th className="p-2 sm:p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {wargaSafe.map((w) => {
                // Safe call — getTotalTerbayar juga sudah di-guard di dalamnya
                const terbayar = getTotalTerbayar(iuranSafe, w.id, proyek.id);
                const lunas = terbayar >= target;
                const kurang = target - terbayar;

                return (
                  <tr key={w.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-2 sm:p-3 sticky left-0 bg-slate-900 z-20 font-mono text-[10px] text-white border-r border-slate-800/80">
                      {w.no_rumah?.replace(/\s/g, '')}
                    </td>
                    <td className="p-2 sm:p-3 sticky left-[60px] bg-slate-900 z-20 truncate max-w-[150px] text-slate-300 border-r border-slate-800/80">
                      {w.nama_lengkap}
                    </td>
                    <td className="p-2 sm:p-3 text-right font-mono text-[10px] text-slate-300">
                      {formatRupiahProyek(Math.min(terbayar, target))}
                    </td>
                    <td className="p-2 sm:p-3 text-center">
                      {lunas ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          ✓ Lunas
                        </span>
                      ) : terbayar > 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          🟡 Kurang {formatRupiahProyek(kurang)}
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                          - Belum
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-between items-center text-xs text-slate-400">
          <span>{wargaSafe.length} warga total</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

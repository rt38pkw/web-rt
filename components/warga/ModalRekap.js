import { PERIODE_BULAN, isWargaUsaha, TARIF_NORMAL, TARIF_USAHA } from '../../lib/iuran/constants';
import { getTarifWarga } from '../../lib/iuran/tarif';

export default function ModalRekap({ show, onClose, allWargaList, allIuranList, tarifList }) {
  if (!show) return null;

  const wargaList = Array.isArray(allWargaList) ? allWargaList : [];
  const iuranList = Array.isArray(allIuranList) ? allIuranList : [];

  // ── Bulan sekarang (format: 'YYYY-MM') ──
  const now = new Date();
  const bulanSekarang = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-6xl h-[90vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden">
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
          <div className="min-w-0">
            <h3 className="font-bold text-white text-xs sm:text-base truncate">
              📋 Rekap Iuran RT 38 (2026)
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-400">
              Transparansi kas dan status setoran warga
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center text-sm transition shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse" style={{ minWidth: '440px' }}>
            <thead className="sticky top-0 z-30 bg-slate-950">
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="p-1.5 sm:p-3 text-[10px] sm:text-xs text-left sticky left-0 bg-slate-950 z-30 w-[80px] sm:w-[200px] border-r border-slate-800/80">
                  Warga
                </th>
                {PERIODE_BULAN.map((b, i) => {
                  const isJatuhTempo = b.kode <= bulanSekarang;
                  return (
                    <th
                      key={i}
                      className={`p-1 sm:p-3 text-[10px] sm:text-xs text-center w-[42px] sm:w-auto ${
                        isJatuhTempo ? 'text-rose-400/70' : 'text-slate-500'
                      }`}
                    >
                      <span className="hidden md:inline">{b.nama}</span>
                      <span className="md:hidden">{b.nama.substring(0, 3)}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {wargaList.map((w, idx) => {
                const usaha = isWargaUsaha(w);
                const tarifWarga =
                  tarifList && tarifList.length > 0
                    ? getTarifWarga(w, tarifList, 2026)
                    : usaha
                    ? TARIF_USAHA
                    : TARIF_NORMAL;

                const iuranWarga = iuranList.filter((i) => i.warga_id === w.id);
                const totalWargaSetor = iuranWarga
                  .filter((i) => i.status === 'approved')
                  .reduce((acc, curr) => acc + Number(curr.jumlah || 0), 0);

                return (
                  <tr key={idx} className="hover:bg-slate-800/30 transition">
                    <td className="p-1.5 sm:p-3 sticky left-0 bg-slate-900 z-20 w-[80px] sm:w-[200px] border-r border-slate-800/80">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] sm:text-xs font-bold text-white whitespace-nowrap">
                            {w.no_rumah?.replace(/\s/g, '')}
                          </span>
                          <span
                            className={`text-[8px] sm:text-[9px] px-1 py-0.5 rounded border font-medium whitespace-nowrap ${
                              usaha
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : 'bg-slate-800/60 text-slate-400 border-slate-700/60'
                            }`}
                          >
                            {usaha ? '🏪' : '🏠'}
                            <span className="hidden lg:inline">
                              {usaha ? ' Usaha' : ' Hunian'}
                            </span>
                          </span>
                        </div>
                        <div className="text-[9px] sm:text-[11px] text-slate-300 truncate max-w-[70px] sm:max-w-[180px]">
                          {w.nama_lengkap}
                        </div>
                        <div className="text-[9px] sm:text-[10px] font-bold text-blue-400 whitespace-nowrap">
                          Rp {totalWargaSetor.toLocaleString('id-ID')}
                        </div>
                      </div>
                    </td>
                    {PERIODE_BULAN.map((bln, bIdx) => {
                      const recsBulan = iuranWarga.filter((i) => i.bulan_tahun === bln.kode);
                      const totalApproved = recsBulan
                        .filter((r) => r.status === 'approved')
                        .reduce((s, r) => s + Number(r.jumlah || 0), 0);
                      const adaPendingBulan = recsBulan.some((r) => r.status === 'pending');
                      const kosong = recsBulan.length === 0 && !adaPendingBulan;
                      const lunas = !adaPendingBulan && totalApproved >= tarifWarga;
                      const sebagian =
                        !adaPendingBulan && totalApproved > 0 && totalApproved < tarifWarga;
                      const kurang = tarifWarga - totalApproved;

                      // ── Jatuh tempo ──
                      const isJatuhTempo = bln.kode <= bulanSekarang;

                      // ── Warna sel ──
                      if (kosong) {
                        // Kosong: merah (jatuh tempo) atau abu (belum)
                        if (isJatuhTempo) {
                          return (
                            <td key={bIdx} className="p-0.5 sm:p-2 text-center align-middle">
                              <span className="text-[9px] sm:text-[10px] font-semibold px-1 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                ⚠️
                              </span>
                            </td>
                          );
                        }
                        return (
                          <td key={bIdx} className="p-0.5 sm:p-2 text-center align-middle">
                            <span className="text-slate-600 text-[10px]">-</span>
                          </td>
                        );
                      }

                      if (adaPendingBulan) {
                        return (
                          <td key={bIdx} className="p-0.5 sm:p-2 text-center align-middle">
                            <span className="text-[9px] sm:text-[10px] font-semibold px-1 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                              ⏳
                            </span>
                          </td>
                        );
                      }

                      return (
                        <td key={bIdx} className="p-0.5 sm:p-2 text-center align-middle">
                          <div className="inline-flex flex-col items-center justify-center">
                            <span
                              className={`text-[9px] sm:text-[10px] font-semibold px-1 py-0.5 rounded whitespace-nowrap ${
                                lunas
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {totalApproved.toLocaleString('id-ID')}
                            </span>
                            {sebagian && (
                              <span className="text-[7px] sm:text-[8px] text-amber-500/80 whitespace-nowrap mt-0.5">
                                -{kurang.toLocaleString('id-ID')}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ═══ FOOTER + LEGENDA ═══ */}
        <div className="px-3 sm:px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[10px] sm:text-xs text-slate-400">
          <div className="flex flex-wrap gap-2.5">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/40 border border-emerald-500/60"></span>
              <span>Lunas</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-amber-500/40 border border-amber-500/60"></span>
              <span>Kurang</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-orange-500/40 border border-orange-500/60"></span>
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-rose-500/40 border border-rose-500/60"></span>
              <span>⚠️ Telat</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-slate-700/60 border border-slate-600/60"></span>
              <span>Belum tempo</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition shrink-0"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

import { formatRupiah, tarifWarga } from '../../lib/keuangan/helpers';
import { PERIODE_BULAN } from '../../lib/keuangan/constants';

export default function TabTunggakan({ warga, iuran, tunggakanBulan, setTunggakanBulan }) {
  const list = warga
    .map((w) => {
      const totalApproved = iuran
        .filter(
          (i) =>
            i.warga_id === w.id &&
            i.bulan_tahun === tunggakanBulan &&
            i.status === 'approved'
        )
        .reduce((s, i) => s + Number(i.jumlah || 0), 0);
      const adaPending = iuran.some(
        (i) =>
          i.warga_id === w.id &&
          i.bulan_tahun === tunggakanBulan &&
          i.status === 'pending'
      );
      const tarif = tarifWarga(w);
      return {
        ...w,
        totalApproved,
        adaPending,
        kurang: Math.max(0, tarif - totalApproved),
        lunas: totalApproved >= tarif,
        tarif,
      };
    })
    .filter((w) => !w.lunas);

  const totalTunggakan = list.reduce((s, w) => s + w.kurang, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <select
          value={tunggakanBulan}
          onChange={(e) => setTunggakanBulan(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
        >
          {PERIODE_BULAN.map((b) => (
            <option key={b.kode} value={b.kode}>
              {b.nama} 2026
            </option>
          ))}
        </select>
        <div className="text-xs text-slate-400">
          Total Tunggakan:{' '}
          <strong className="text-amber-400">{formatRupiah(totalTunggakan)}</strong>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-3">No</th>
                <th className="p-3">Warga</th>
                <th className="p-3">Kategori</th>
                <th className="p-3 text-right">Terbayar</th>
                <th className="p-3 text-right">Kurang</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {list.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-emerald-400">
                    🎉 Semua warga sudah lunas bulan ini!
                  </td>
                </tr>
              ) : (
                list.map((w, i) => (
                  <tr key={w.id} className="hover:bg-slate-800/40">
                    <td className="p-3 text-slate-500">{i + 1}</td>
                    <td className="p-3">
                      <div className="font-semibold text-white">{w.nama_lengkap}</div>
                      <div className="text-[10px] text-slate-500">{w.no_rumah}</div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded border ${
                          w.kategori === 'Usaha'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {w.kategori === 'Usaha' ? '🏪 Usaha' : '🏠 Hunian'}
                      </span>
                    </td>
                    <td className="p-3 text-right text-slate-300">
                      {formatRupiah(w.totalApproved)}
                    </td>
                    <td className="p-3 text-right font-bold text-amber-400">
                      {formatRupiah(w.kurang)}
                    </td>
                    <td className="p-3">
                      {w.adaPending ? (
                        <span className="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded border border-orange-500/20">
                          ⏳ Pending
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
                          Belum
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
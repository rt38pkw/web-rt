import { useState } from 'react';
import Layout from '../../components/proyek/Layout';
import { useProyekData, getPendingProyekCount } from '../../lib/proyek/hooks';
import { formatRupiahProyek, formatTanggalProyek, isProyekTelat } from '../../lib/proyek/constants';
import { getTotalTerbayar, getSisaWarga } from '../../lib/proyek/calculations';

export default function PageProyekTunggakan() {
  const { user, warga, proyekList, iuranProyekList, loading } = useProyekData();

  const [proyekId, setProyekId] = useState('');
  const [filter, setFilter] = useState('semua'); // 'semua' | 'belum' | 'kurang'

  if (typeof window === 'undefined') return null;

  const proyekTerpilih = proyekList.find((p) => p.id === proyekId);

  // Kalau proyek belum dipilih, auto-pilih proyek pertama (aktif dulu)
  const proyekDefault = proyekList.find((p) => p.status === 'aktif') || proyekList[0];
  const proyekAktif = proyekTerpilih || proyekDefault;

  if (loading) {
    return (
      <Layout user={user}>
        <div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div>
      </Layout>
    );
  }

  const pendingCount = getPendingProyekCount(iuranProyekList);

  // ═══ List tunggakan untuk proyek terpilih ═══
  const listTunggakan = proyekAktif
    ? warga.map((w) => {
        const terbayar = getTotalTerbayar(iuranProyekList, w.id, proyekAktif.id);
        const sisa = getSisaWarga(iuranProyekList, w.id, proyekAktif);
        const target = Number(proyekAktif.nominal_per_warga);

        let status = 'lunas';
        if (terbayar >= target) status = 'lunas';
        else if (terbayar > 0) status = 'kurang';
        else status = 'belum';

        return { ...w, terbayar, sisa, status };
      }).filter((w) => {
        if (filter === 'semua') return w.status !== 'lunas';
        return w.status === filter;
      })
    : [];

  const totalTunggakan = listTunggakan.reduce((s, w) => s + w.sisa, 0);
  const jumlahBelum = listTunggakan.filter((w) => w.status === 'belum').length;
  const jumlahKurang = listTunggakan.filter((w) => w.status === 'kurang').length;

  return (
    <Layout user={user} pendingCount={pendingCount}>
      <div className="space-y-4">
        {/* Header Filter */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-2">Proyek</label>
              <select
                value={proyekAktif?.id || ''}
                onChange={(e) => setProyekId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                {proyekList.length === 0 ? (
                  <option value="">-- Belum ada proyek --</option>
                ) : (
                  proyekList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} {p.status === 'selesai' ? '(selesai)' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-2">Filter</label>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setFilter('semua')}
                  className={`px-3 py-2 rounded-lg text-[11px] font-semibold border transition ${
                    filter === 'semua' ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  📋 Semua ({jumlahBelum + jumlahKurang})
                </button>
                <button
                  onClick={() => setFilter('belum')}
                  className={`px-3 py-2 rounded-lg text-[11px] font-semibold border transition ${
                    filter === 'belum' ? 'bg-rose-600 text-white border-rose-500' : 'bg-slate-950 text-rose-400 border-slate-800'
                  }`}
                >
                  🔴 Belum ({jumlahBelum})
                </button>
                <button
                  onClick={() => setFilter('kurang')}
                  className={`px-3 py-2 rounded-lg text-[11px] font-semibold border transition ${
                    filter === 'kurang' ? 'bg-amber-600 text-white border-amber-500' : 'bg-slate-950 text-amber-400 border-slate-800'
                  }`}
                >
                  🟡 Kurang ({jumlahKurang})
                </button>
              </div>
            </div>
          </div>

          {proyekAktif && (
            <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <span>Deadline: {formatTanggalProyek(proyekAktif.deadline)}</span>
                {isProyekTelat(proyekAktif) && (
                  <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded">
                    🔴 Telat
                  </span>
                )}
              </div>
              <span className="text-slate-400">
                Total Tunggakan: <strong className="text-amber-400">{formatRupiahProyek(totalTunggakan)}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Table */}
        {!proyekAktif ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-2">🏗️</div>
            <p className="text-xs text-slate-400">Belum ada proyek. Buat proyek dulu di tab Kelola.</p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">No</th>
                    <th className="p-3">Warga</th>
                    <th className="p-3 text-right">Terbayar</th>
                    <th className="p-3 text-right">Sisa</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {listTunggakan.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-emerald-400">
                        🎉 Semua warga sudah lunas untuk proyek ini!
                      </td>
                    </tr>
                  ) : (
                    listTunggakan.map((w, i) => (
                      <tr key={w.id} className="hover:bg-slate-800/40">
                        <td className="p-3 text-slate-500">{i + 1}</td>
                        <td className="p-3">
                          <div className="font-semibold text-white">{w.nama_lengkap}</div>
                          <div className="text-[10px] text-slate-500">{w.no_rumah}</div>
                        </td>
                        <td className="p-3 text-right text-slate-300">
                          {formatRupiahProyek(w.terbayar)}
                        </td>
                        <td className="p-3 text-right font-bold text-amber-400">
                          {formatRupiahProyek(w.sisa)}
                        </td>
                        <td className="p-3">
                          {w.status === 'belum' ? (
                            <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded">
                              🔴 Belum
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
                              🟡 Kurang
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
        )}
      </div>
    </Layout>
  );
}

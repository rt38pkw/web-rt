import { useState } from 'react';
import { formatRupiah, tarifWarga } from '../../lib/keuangan/helpers';
import { PERIODE_BULAN } from '../../lib/keuangan/constants';

export default function TabTunggakan({ warga = [], tarifList = [], iuran = [] }) {
  const [mode, setMode] = useState('per-bulan'); // 'per-bulan' | 'semua-bulan'
  const [bulanTerpilih, setBulanTerpilih] = useState('2026-10');
  const [filter, setFilter] = useState('semua'); // 'semua' | 'telat' | 'kurang'
  const [expandedWarga, setExpandedWarga] = useState(null);

  const wargaList = Array.isArray(warga) ? warga : [];
  const iuranList = Array.isArray(iuran) ? iuran : [];
  const tarifListSafe = Array.isArray(tarifList) ? tarifList : [];

  // ── Bulan sekarang (untuk cek jatuh tempo) ──
  const now = new Date();
  const bulanSekarang = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // ══════════════════════════════════════════════
  // HELPER: Hitung status per bulan untuk warga
  // ══════════════════════════════════════════════
  const getStatusBulan = (w, blnKode) => {
    const tarif = tarifWarga(w, tarifListSafe, 2026);
    const recsBulan = iuranList.filter(
      (i) => i.warga_id === w.id && i.bulan_tahun === blnKode
    );
    const totalApproved = recsBulan
      .filter((r) => r.status === 'approved')
      .reduce((s, r) => s + Number(r.jumlah || 0), 0);
    const adaPending = recsBulan.some((r) => r.status === 'pending');
    const kurang = Math.max(0, tarif - totalApproved);
    const isJatuhTempo = blnKode <= bulanSekarang;

    let status = 'lunas';
    if (adaPending) status = 'pending';
    else if (kurang === 0) status = 'lunas';
    else if (totalApproved > 0) status = 'kurang';
    else if (isJatuhTempo) status = 'telat';
    else status = 'belum-tempo';

    return { tarif, totalApproved, kurang, isJatuhTempo, status, adaPending };
  };

  // ══════════════════════════════════════════════
  // MODE 1: Per Bulan
  // ══════════════════════════════════════════════
  const listPerBulan = wargaList
    .map((w) => {
      const info = getStatusBulan(w, bulanTerpilih);
      return { ...w, ...info };
    })
    .filter((w) => {
      // Filter berdasarkan status
      if (filter === 'telat') return w.status === 'telat';
      if (filter === 'kurang') return w.status === 'kurang';
      // default 'semua': telat + kurang
      return w.status === 'telat' || w.status === 'kurang';
    })
    .sort((a, b) => {
      // Yang telat dulu, baru kurang
      if (a.status === 'telat' && b.status !== 'telat') return -1;
      if (a.status !== 'telat' && b.status === 'telat') return 1;
      return b.kurang - a.kurang;
    });

  const totalTunggakanPerBulan = listPerBulan.reduce((s, w) => s + w.kurang, 0);

  // ══════════════════════════════════════════════
  // MODE 2: Semua Bulan
  // ══════════════════════════════════════════════
  const listSemuaBulan = wargaList
    .map((w) => {
      let totalKurang = 0;
      let jumlahTelat = 0;
      let jumlahKurang = 0;
      const detailBulan = [];

      PERIODE_BULAN.forEach((bln) => {
        const info = getStatusBulan(w, bln.kode);
        if (info.status === 'telat') {
          totalKurang += info.kurang;
          jumlahTelat++;
          detailBulan.push({ bln, info });
        } else if (info.status === 'kurang') {
          totalKurang += info.kurang;
          jumlahKurang++;
          detailBulan.push({ bln, info });
        }
      });

      return {
        ...w,
        totalKurang,
        jumlahTelat,
        jumlahKurang,
        detailBulan,
      };
    })
    .filter((w) => {
      if (filter === 'telat') return w.jumlahTelat > 0;
      if (filter === 'kurang') return w.jumlahKurang > 0;
      return w.totalKurang > 0;
    })
    .sort((a, b) => b.totalKurang - a.totalKurang);

  const totalTunggakanSemuaBulan = listSemuaBulan.reduce((s, w) => s + w.totalKurang, 0);

  // ══════════════════════════════════════════════
  // HANDLE FILTER CHIP
  // ══════════════════════════════════════════════
  const handleFilterClick = (f) => {
    if (filter === f) {
      setFilter('semua'); // klik chip yang sama → balik ke Semua
    } else {
      setFilter(f);
    }
  };

  // ══════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* ═══ HEADER FILTER ═══ */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        {/* Mode Toggle */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-2">
            Mode
          </label>
          <div className="inline-flex bg-slate-950 rounded-xl p-1 border border-slate-800">
            <button
              onClick={() => setMode('per-bulan')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                mode === 'per-bulan'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📅 Per Bulan
            </button>
            <button
              onClick={() => setMode('semua-bulan')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                mode === 'semua-bulan'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📋 Semua Bulan
            </button>
          </div>
        </div>

        {/* Dropdown Bulan */}
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-2">
              Bulan {mode === 'semua-bulan' && <span className="text-slate-600">(non-aktif)</span>}
            </label>
            <select
              value={bulanTerpilih}
              onChange={(e) => setBulanTerpilih(e.target.value)}
              disabled={mode === 'semua-bulan'}
              className={`w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white transition ${
                mode === 'semua-bulan'
                  ? 'opacity-40 cursor-not-allowed'
                  : ''
              }`}
            >
              {PERIODE_BULAN.map((b) => (
                <option key={b.kode} value={b.kode}>
                  {b.nama} 2026
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-2">
              Filter
            </label>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setFilter('semua')}
                className={`px-3 py-2 rounded-lg text-[11px] font-semibold border transition ${
                  filter === 'semua'
                    ? 'bg-slate-700 text-white border-slate-600'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                📋 Semua
              </button>
              <button
                onClick={() => handleFilterClick('telat')}
                className={`px-3 py-2 rounded-lg text-[11px] font-semibold border transition ${
                  filter === 'telat'
                    ? 'bg-rose-600 text-white border-rose-500'
                    : 'bg-slate-950 text-rose-400 border-slate-800 hover:text-rose-300'
                }`}
              >
                ⚠️ Telat
              </button>
              <button
                onClick={() => handleFilterClick('kurang')}
                className={`px-3 py-2 rounded-lg text-[11px] font-semibold border transition ${
                  filter === 'kurang'
                    ? 'bg-amber-600 text-white border-amber-500'
                    : 'bg-slate-950 text-amber-400 border-slate-800 hover:text-amber-300'
                }`}
              >
                🟡 Kurang
              </button>
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
          <span className="text-slate-400">
            {mode === 'per-bulan' ? `Tunggakan ${PERIODE_BULAN.find(b => b.kode === bulanTerpilih)?.nama}` : 'Total Tunggakan'}
            :
          </span>
          <strong className="text-amber-400 text-base font-bold">
            {formatRupiah(mode === 'per-bulan' ? totalTunggakanPerBulan : totalTunggakanSemuaBulan)}
          </strong>
        </div>
      </div>

      {/* ═══ TABEL: MODE PER BULAN ═══ */}
      {mode === 'per-bulan' && (
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
                {listPerBulan.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-emerald-400">
                      🎉 {filter === 'telat'
                        ? 'Tidak ada warga yang telat bulan ini.'
                        : filter === 'kurang'
                        ? 'Tidak ada warga yang kurang bayar bulan ini.'
                        : 'Semua warga sudah lunas bulan ini!'}
                    </td>
                  </tr>
                ) : (
                  listPerBulan.map((w, i) => (
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
                        {w.status === 'telat' ? (
                          <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20">
                            ⚠️ Telat
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
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

      {/* ═══ TABEL: MODE SEMUA BULAN ═══ */}
      {mode === 'semua-bulan' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3 w-8"></th>
                  <th className="p-3">Warga</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3 text-center">Telat</th>
                  <th className="p-3 text-center">Kurang</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {listSemuaBulan.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-emerald-400">
                      🎉 Tidak ada tunggakan!
                    </td>
                  </tr>
                ) : (
                  listSemuaBulan.map((w) => (
                    <>
                      <tr
                        key={w.id}
                        className="hover:bg-slate-800/40 cursor-pointer"
                        onClick={() => setExpandedWarga(expandedWarga === w.id ? null : w.id)}
                      >
                        <td className="p-3 text-slate-500">
                          <span className={`inline-block transition ${expandedWarga === w.id ? 'rotate-90' : ''}`}>
                            ▶
                          </span>
                        </td>
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
                            {w.kategori === 'Usaha' ? '🏪' : '🏠'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {w.jumlahTelat > 0 ? (
                            <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20">
                              {w.jumlahTelat} bln
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {w.jumlahKurang > 0 ? (
                            <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
                              {w.jumlahKurang} bln
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-bold text-amber-400">
                          {formatRupiah(w.totalKurang)}
                        </td>
                      </tr>
                      {/* Expand Detail */}
                      {expandedWarga === w.id && (
                        <tr key={w.id + '-detail'} className="bg-slate-950/60">
                          <td colSpan="6" className="p-3">
                            <div className="space-y-1.5">
                              {w.detailBulan.map(({ bln, info }) => (
                                <div
                                  key={bln.kode}
                                  className="flex justify-between items-center text-[11px] bg-slate-900/60 rounded-lg px-3 py-2"
                                >
                                  <span className="text-slate-300">{bln.nama} 2026</span>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-[10px] px-2 py-0.5 rounded border ${
                                        info.status === 'telat'
                                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                      }`}
                                    >
                                      {info.status === 'telat' ? '⚠️ Telat' : '🟡 Kurang'}
                                    </span>
                                    <span className="text-amber-400 font-mono font-semibold w-24 text-right">
                                      {formatRupiah(info.kurang)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

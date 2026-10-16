import { useState } from 'react';
import { formatRupiah, formatTanggal } from '../../lib/keuangan/helpers';

export default function TabRiwayat({
  iuran = [],
  pengeluaran = [],
  pemasukanLain = [],
  depositList = [],
  warga = [],
  onEdit,
  onHapus,
}) {
  const [filter, setFilter] = useState('semua');

  const iuranSafe = Array.isArray(iuran) ? iuran : [];
  const pengeluaranSafe = Array.isArray(pengeluaran) ? pengeluaran : [];
  const pemasukanSafe = Array.isArray(pemasukanLain) ? pemasukanLain : [];
  const depositSafe = Array.isArray(depositList) ? depositList : [];
  const wargaSafe = Array.isArray(warga) ? warga : [];

  const iuranItems = iuranSafe.map((i) => ({
    id: 'i-' + i.id,
    recordId: i.id,
    batchId: i.batch_id,
    sumber: 'iuran',
    tanggal: i.tanggal_transaksi || i.created_at?.split('T')[0],
    tipe:
      i.metode === 'deposit'
        ? 'Iuran (Deposit)'
        : i.metode === 'tunai'
        ? 'Iuran (Tunai)'
        : i.status === 'approved'
        ? 'Iuran (QRIS)'
        : 'Iuran Pending',
    keterangan: `${
      wargaSafe.find((w) => w.id === i.warga_id)?.nama_lengkap || '-'
    } — ${i.bulan_tahun}`,
    nominal: Number(i.jumlah),
    arah: i.status === 'approved' ? 'in' : 'pending',
    metode: i.metode,
    status: i.status,
  }));

  const pengItems = pengeluaranSafe.map((p) => ({
    id: 'p-' + p.id,
    recordId: p.id,
    sumber: 'pengeluaran',
    tanggal: p.tanggal,
    tipe: 'Pengeluaran',
    keterangan: `${p.jenis} — ${p.keterangan || ''}`,
    nominal: Number(p.nominal),
    arah: 'out',
    dataAsli: p,
  }));

  const pemasukanItems = pemasukanSafe.map((m) => ({
    id: 'm-' + m.id,
    recordId: m.id,
    sumber: 'pemasukan_lain',
    tanggal: m.tanggal,
    tipe: 'Pemasukan Lain',
    keterangan: `${m.jenis} — ${m.keterangan || ''}`,
    nominal: Number(m.nominal),
    arah: 'in',
    dataAsli: m,
  }));

  const depositItems = depositSafe.map((d) => {
    const w = wargaSafe.find((x) => x.id === d.warga_id);
    return {
      id: 'd-' + d.id,
      recordId: d.id,
      sumber: 'deposit',
      tanggal: d.tanggal,
      tipe: d.tipe === 'masuk' ? 'Deposit Masuk' : 'Deposit Pakai',
      keterangan: `${w?.no_rumah || '-'} — ${w?.nama_lengkap || '-'} — ${d.keterangan || ''}`,
      nominal: Number(d.jumlah),
      arah: d.tipe === 'masuk' ? 'in' : 'out',
      depositTipe: d.tipe,
      dataAsli: d,
    };
  });

  const all = [...iuranItems, ...pengItems, ...pemasukanItems, ...depositItems].sort(
    (a, b) => new Date(b.tanggal) - new Date(a.tanggal)
  );

  const filtered =
    filter === 'semua'
      ? all
      : filter === 'in'
      ? all.filter((x) => x.arah === 'in')
      : filter === 'out'
      ? all.filter((x) => x.arah === 'out')
      : all.filter((x) => x.arah === 'pending');

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[
          { k: 'semua', l: '📋 Semua' },
          { k: 'in', l: '↑ Pemasukan' },
          { k: 'out', l: '↓ Pengeluaran' },
          { k: 'pending', l: '⏳ Pending' },
        ].map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              filter === f.k
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
              <tr>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Tipe</th>
                <th className="p-3">Keterangan</th>
                <th className="p-3 text-right">Nominal</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((x) => {
                // Tentukan aksi apa yang tersedia
                const bisaEdit =
                  x.sumber === 'pengeluaran' ||
                  x.sumber === 'pemasukan_lain' ||
                  (x.sumber === 'deposit' && x.depositTipe === 'masuk');

                const bisaHapus =
                  x.sumber === 'pengeluaran' ||
                  x.sumber === 'pemasukan_lain' ||
                  (x.sumber === 'deposit' && x.depositTipe === 'masuk') ||
                  (x.sumber === 'iuran' && x.status === 'approved');

                const bisaUndo =
                  x.sumber === 'deposit' && x.depositTipe === 'pakai';

                return (
                  <tr key={x.id} className="hover:bg-slate-800/40">
                    <td className="p-3 text-slate-400 whitespace-nowrap">
                      {formatTanggal(x.tanggal)}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded border ${
                          x.arah === 'in'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : x.arah === 'out'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                        }`}
                      >
                        {x.tipe}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300 text-[11px]">
                      {x.keterangan}
                    </td>
                    <td
                      className={`p-3 text-right font-mono font-semibold ${
                        x.arah === 'in'
                          ? 'text-emerald-400'
                          : x.arah === 'out'
                          ? 'text-rose-400'
                          : 'text-orange-400'
                      }`}
                    >
                      {x.arah === 'in' ? '+' : x.arah === 'out' ? '-' : ''}{' '}
                      {formatRupiah(x.nominal)}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex gap-1 justify-end">
                        {bisaEdit && (
                          <button
                            onClick={() => onEdit(x)}
                            title="Edit"
                            className="text-blue-400 hover:text-blue-300 text-[10px] font-semibold px-1"
                          >
                            ✏️
                          </button>
                        )}
                        {bisaHapus && (
                          <button
                            onClick={() => onHapus(x)}
                            title="Hapus"
                            className="text-rose-400 hover:text-rose-300 text-[10px] font-semibold px-1"
                          >
                            🗑️
                          </button>
                        )}
                        {bisaUndo && (
                          <button
                            onClick={() => onHapus(x)}
                            title="Undo distribusi"
                            className="text-amber-400 hover:text-amber-300 text-[10px] font-semibold px-1"
                          >
                            ↩️ Undo
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

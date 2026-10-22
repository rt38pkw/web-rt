import { formatRupiah, formatTanggal } from '../../lib/keuangan/helpers';

export default function TabVerifikasi({ pendingBatches, iuran, filterVerif, setFilterVerif, handleApprove, handleReject }) {
  const grouped = {};
  iuran.filter((i) => (filterVerif === 'all' ? true : i.status === filterVerif)).forEach((i) => {
    const key = i.batch_id || i.id;
    if (!grouped[key]) grouped[key] = { batchId: key, items: [], status: i.status, tanggal: i.tanggal_transaksi, catatan: i.catatan };
    grouped[key].items.push(i);
  });

  const list = Object.values(grouped).sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[{ k: 'pending', l: `⏳ Pending (${pendingBatches.length})` }, { k: 'approved', l: '✓ Approved' }, { k: 'rejected', l: '✗ Ditolak' }, { k: 'all', l: '📋 Semua' }].map((f) => (
          <button key={f.k} onClick={() => setFilterVerif(f.k)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${filterVerif === f.k ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>{f.l}</button>
        ))}
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
              <tr><th className="p-3">Warga</th><th className="p-3">Bulan</th><th className="p-3">Total</th><th className="p-3">Metode</th><th className="p-3">Bukti</th><th className="p-3">Status</th><th className="p-3">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {list.length === 0 ? (
                <tr><td colSpan="7" className="p-6 text-center text-slate-500">Tidak ada data.</td></tr>
              ) : (
                list.map((b) => {
                  const w = b.items[0]?.warga;
                  const total = b.items.reduce((s, i) => s + Number(i.jumlah || 0), 0);
                  const bukti = b.items[0]?.bukti_urls || [];
                  const metode = b.items[0]?.metode || '-';
                  const isRevisi = b.status === 'pending' && String(b.catatan || '').toLowerCase().includes('revisi');
                  let statusColor = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
                  if (b.status === 'approved') statusColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                  if (b.status === 'rejected') statusColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';

                  return (
                    <tr key={b.batchId} className="hover:bg-slate-800/40">
                      <td className="p-3"><div className="font-semibold text-white">{w?.nama_lengkap || '-'}</div><div className="text-[10px] text-slate-500">{w?.no_rumah}</div></td>
                      <td className="p-3"><div className="flex flex-wrap gap-1">{b.items.map((i) => (<span key={i.id} className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">{i.bulan_tahun.replace('2026-', '')}</span>))}</div></td>
                      <td className="p-3 font-mono">{formatRupiah(total)}</td>
                      <td className="p-3"><span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">{metode}</span></td>
                      <td className="p-3">
                        {bukti.length > 0 ? (<div className="flex gap-1">{bukti.map((u, i) => (<a key={i} href={u} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-[10px]">📎{i + 1}</a>))}</div>) : (<span className="text-slate-600">-</span>)}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${statusColor}`}>{b.status}</span>
                          {isRevisi && (<span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-blue-500/20 text-blue-300 border-blue-500/30">🔄 Revisi</span>)}
                          {b.status === 'rejected' && b.catatan && (<div className="text-[9px] text-rose-300 max-w-[120px] truncate" title={b.catatan}>{b.catatan}</div>)}
                        </div>
                      </td>
                      <td className="p-3">
                        {b.status === 'pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => handleApprove(b)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg">✓ Approve</button>
                            <button onClick={() => handleReject(b)} className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg">✗ Tolak</button>
                          </div>
                        )}
                        {b.status === 'approved' && b.tanggal && (<span className="text-[10px] text-slate-500">{formatTanggal(b.tanggal)}</span>)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

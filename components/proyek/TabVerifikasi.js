// components/proyek/TabVerifikasi.js
import { useState } from 'react';
import { formatRupiahProyek, formatTanggalProyek } from '../../lib/proyek/constants';

export default function TabVerifikasi({ proyekList = [], iuranProyekList = [], wargaList = [], onApprove, onReject }) {
  const [filterProyek, setFilterProyek] = useState('semua');
  const [processing, setProcessing] = useState(null);

  const pendingList = iuranProyekList.filter((i) => i.status === 'pending').filter((i) => filterProyek === 'semua' || i.proyek_id === filterProyek).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const handleApprove = async (item) => {
    if (!confirm(`Approve cicilan Rp${Number(item.jumlah).toLocaleString('id-ID')}?`)) return;
    setProcessing(item.id); try { await onApprove(item); } finally { setProcessing(null); }
  };

  const handleReject = async (item) => {
    setProcessing(item.id); try { await onReject(item); } finally { setProcessing(null); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-[10px] font-semibold text-slate-400 uppercase">Filter Proyek:</label>
          <select value={filterProyek} onChange={(e) => setFilterProyek(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
            <option value="semua">Semua Proyek ({iuranProyekList.filter((i) => i.status === 'pending').length} pending)</option>
            {proyekList.map((p) => {
              const count = iuranProyekList.filter((i) => i.status === 'pending' && i.proyek_id === p.id).length;
              return (<option key={p.id} value={p.id}>{p.nama} ({count} pending)</option>);
            })}
          </select>
        </div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
              <tr><th className="p-3">Tanggal</th><th className="p-3">Warga</th><th className="p-3">Proyek</th><th className="p-3 text-right">Nominal</th><th className="p-3">Bukti</th><th className="p-3">Catatan</th><th className="p-3 text-right">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {pendingList.length === 0 ? (
                <tr><td colSpan="7" className="p-6 text-center text-slate-500">Tidak ada cicilan yang menunggu verifikasi.</td></tr>
              ) : (
                pendingList.map((item) => {
                  const w = wargaList.find((x) => x.id === item.warga_id);
                  const p = proyekList.find((x) => x.id === item.proyek_id);
                  const bukti = item.bukti_urls || [];
                  const isRevisi = String(item.catatan || '').toLowerCase().includes('revisi');

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40">
                      <td className="p-3 text-slate-400 whitespace-nowrap text-[10px]">{formatTanggalProyek(item.tanggal)}</td>
                      <td className="p-3"><div className="font-semibold text-white">{w?.nama_lengkap || '-'}</div><div className="text-[10px] text-slate-500">{w?.no_rumah}</div></td>
                      <td className="p-3 text-slate-300 text-[11px]">{p?.nama || '-'}</td>
                      <td className="p-3 text-right font-mono font-bold text-amber-400">{formatRupiahProyek(item.jumlah)}</td>
                      <td className="p-3">
                        {/* ═══ PERBAIKAN: CEK URL 'DIHAPUS' ═══ */}
                        {bukti.length > 0 ? (
                          <div className="flex gap-1">
                            {bukti.map((u, i) => (
                              u === 'DIHAPUS' ? (
                                <span key={i} className="text-slate-500 italic text-[10px] px-1.5 py-0.5 bg-slate-800/50 rounded border border-slate-700">Terhapus</span>
                              ) : (
                                <a key={i} href={u} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-[10px] bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">📎{i + 1}</a>
                              )
                            ))}
                          </div>
                        ) : (<span className="text-slate-600">-</span>)}
                      </td>
                      <td className="p-3 text-slate-400 text-[10px] max-w-[200px] truncate">
                        {isRevisi ? (<span className="text-blue-300 font-semibold bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">🔄 Revisi</span>) : (item.catatan || '-')}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleApprove(item)} disabled={processing === item.id} className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg">{processing === item.id ? '...' : '✓ Approve'}</button>
                          <button onClick={() => handleReject(item)} disabled={processing === item.id} className="bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg">{processing === item.id ? '...' : '✗ Tolak'}</button>
                        </div>
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

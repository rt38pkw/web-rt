// components/proyek/TabVerifikasi.js
import { useState } from 'react';
import { formatRupiahProyek, formatTanggalProyek } from '../../lib/proyek/constants';

export default function TabVerifikasi({ proyekList = [], iuranProyekList = [], wargaList = [], onApprove, onReject }) {
  const [filterProyek, setFilterProyek] = useState('semua');
  const [processing, setProcessing] = useState(null);
  const [zoomImage, setZoomImage] = useState(null);

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
      
      {/* ═══ FILTER PROYEK ═══ */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-[10px] font-semibold text-slate-400 uppercase">Filter Proyek:</label>
          <select value={filterProyek} onChange={(e) => setFilterProyek(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500">
            <option value="semua">Semua Proyek ({iuranProyekList.filter((i) => i.status === 'pending').length} pending)</option>
            {proyekList.map((p) => {
              const count = iuranProyekList.filter((i) => i.status === 'pending' && i.proyek_id === p.id).length;
              return (<option key={p.id} value={p.id}>{p.nama} ({count} pending)</option>);
            })}
          </select>
        </div>
      </div>

      {/* ═══ LIST KARTU (Scrollable Vertikal) ═══ */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-3 space-y-3 max-h-[65vh] overflow-y-auto">
          {pendingList.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">Tidak ada cicilan yang menunggu verifikasi.</div>
          ) : (
            pendingList.map((item) => {
              const w = wargaList.find((x) => x.id === item.warga_id);
              const p = proyekList.find((x) => x.id === item.proyek_id);
              const bukti = item.bukti_urls || [];
              const isRevisi = String(item.catatan || '').toLowerCase().includes('revisi');

              return (
                <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-lg">
                  
                  {/* Header: Nama & Tanggal */}
                  <div className="flex justify-between items-start mb-2 border-b border-slate-800 pb-2">
                    <div>
                      <div className="font-bold text-white text-sm">{w?.nama_lengkap || '-'}</div>
                      <div className="text-[10px] text-slate-400">{w?.no_rumah}</div>
                    </div>
                    <div className="text-[9px] text-slate-500 bg-slate-950 px-2 py-1 rounded">
                      📅 {formatTanggalProyek(item.tanggal)}
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-slate-500 block text-[9px]">Proyek</span>
                      <span className="text-slate-200 font-semibold truncate block">{p?.nama || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">Nominal</span>
                      <span className="text-amber-400 font-bold font-mono">{formatRupiahProyek(item.jumlah)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">Bukti</span>
                      {bukti.length > 0 ? (
                        <div className="flex gap-1 mt-0.5">
                          {bukti.map((u, i) => (
                            u === 'DIHAPUS' ? (
                              <span key={i} className="text-slate-500 italic text-[9px]">Terhapus</span>
                            ) : (
                              <button key={i} onClick={() => setZoomImage(u)} className="text-blue-400 hover:text-blue-300 text-[10px] font-semibold underline decoration-blue-500/30">
                                👁️ Lihat Foto
                              </button>
                            )
                          ))}
                        </div>
                      ) : <span className="text-slate-600 text-[10px]">-</span>}
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">Catatan</span>
                      {isRevisi ? (
                        <span className="text-blue-300 font-semibold bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 text-[9px] inline-block mt-0.5">🔄 Revisi</span>
                      ) : (
                        <span className="text-slate-300 truncate block">{item.catatan || '-'}</span>
                      )}
                    </div>
                  </div>

                  {/* Tombol Aksi */}
                  <div className="flex gap-2 pt-2 border-t border-slate-800">
                    <button 
                      onClick={() => handleApprove(item)} 
                      disabled={processing === item.id} 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs py-2 rounded-lg font-bold transition active:scale-95 shadow-lg shadow-emerald-600/20"
                    >
                      {processing === item.id ? '...' : '✓ Approve'}
                    </button>
                    <button 
                      onClick={() => handleReject(item)} 
                      disabled={processing === item.id} 
                      className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 text-white text-xs py-2 rounded-lg font-bold transition active:scale-95 shadow-lg shadow-rose-600/20"
                    >
                      {processing === item.id ? '...' : '✗ Tolak'}
                    </button>
                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ═══ MODAL LIHAT GAMBAR ═══ */}
      {zoomImage && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setZoomImage(null)}>
          <button className="absolute top-4 right-4 text-white text-3xl font-bold z-10" onClick={() => setZoomImage(null)}>✕</button>
          <div className="w-full h-full overflow-auto flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
             <img src={zoomImage} alt="Bukti Transfer" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}

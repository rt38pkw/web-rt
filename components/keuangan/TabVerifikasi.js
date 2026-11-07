// components/keuangan/TabVerifikasi.js
import { useState } from 'react';
import { formatRupiah, formatTanggal } from '../../lib/keuangan/helpers';

export default function TabVerifikasi({ pendingBatches, iuran, filterVerif, setFilterVerif, handleApprove, handleReject }) {
  const [zoomImage, setZoomImage] = useState(null);
  const [visibleCount, setVisibleCount] = useState(10); // State untuk Load More

  // Logika Grouping (Sama seperti aslinya)
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

  const listToShow = list.slice(0, visibleCount);

  // Reset visibleCount jika filter berubah
  const handleFilterChange = (f) => {
    setFilterVerif(f);
    setVisibleCount(10);
  };

  return (
    <div className="space-y-4">
      
      {/* ═══ FILTER (Horizontal Scroll) ═══ */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { k: 'pending', l: `⏳ Pending (${pendingBatches.length})` }, 
          { k: 'approved', l: '✓ Approved' }, 
          { k: 'rejected', l: '✗ Ditolak' }, 
          { k: 'all', l: '📋 Semua' }
        ].map((f) => (
          <button 
            key={f.k} 
            onClick={() => handleFilterChange(f.k)} 
            className={`px-4 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap border transition ${
              filterVerif === f.k 
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20' 
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>

      {/* ═══ LIST KARTU (Menggantikan Tabel) ═══ */}
      <div className="space-y-3">
        {list.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-500">
            Tidak ada data.
          </div>
        ) : (
          listToShow.map((b) => {
            const w = b.items[0]?.warga;
            const total = b.items.reduce((s, i) => s + Number(i.jumlah || 0), 0);
            const bukti = b.items[0]?.bukti_urls || [];
            const metode = b.items[0]?.metode || '-';
            const isRevisi = b.status === 'pending' && String(b.catatan || '').toLowerCase().includes('revisi');
            
            let statusColor = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
            if (b.status === 'approved') statusColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            if (b.status === 'rejected') statusColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';

            return (
              <div key={b.batchId} className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-lg">
                
                {/* Header Kartu: Nama & Status */}
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-white text-sm">{w?.nama_lengkap || '-'}</div>
                    <div className="text-[10px] text-slate-400">{w?.no_rumah}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusColor}`}>
                      {b.status}
                    </span>
                    {isRevisi && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-blue-500/20 text-blue-300 border-blue-500/30">
                        🔄 Revisi
                      </span>
                    )}
                  </div>
                </div>

                {/* Detail Grid (2 Baris) */}
                <div className="grid grid-cols-2 gap-y-1.5 text-xs mb-3 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/50">
                  <div>
                    <span className="text-slate-500 block text-[9px]">Bulan</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {b.items.map((i) => (
                        <span key={i.id} className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                          {i.bulan_tahun.replace('2026-', '')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">Total</span>
                    <span className="font-mono text-emerald-400 font-bold">{formatRupiah(total)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">Metode</span>
                    <span className="text-slate-300 uppercase text-[10px]">{metode}</span>
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
                </div>

                {/* Catatan Ditolak (Jika ada) */}
                {b.status === 'rejected' && b.catatan && (
                  <div className="text-[10px] bg-rose-500/10 text-rose-300 p-2 rounded-lg border border-rose-500/20 mb-3">
                    <span className="font-bold">Catatan:</span> {b.catatan}
                  </div>
                )}

                {/* Tombol Aksi (Jika Pending) */}
                {b.status === 'pending' && (
                  <div className="flex gap-2 pt-2 border-t border-slate-800">
                    <button onClick={() => handleApprove(b)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2 rounded-lg font-bold transition active:scale-95 shadow-lg shadow-emerald-600/20">
                      ✓ Approve
                    </button>
                    <button onClick={() => handleReject(b)} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs py-2 rounded-lg font-bold transition active:scale-95 shadow-lg shadow-rose-600/20">
                      ✗ Tolak
                    </button>
                  </div>
                )}
                
                {/* Tanggal Disetujui (Jika Approved) */}
                {b.status === 'approved' && b.tanggal && (
                  <div className="text-[9px] text-slate-500 mt-2 pt-2 border-t border-slate-800 text-right">
                    Disetujui: {formatTanggal(b.tanggal)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ═══ TOMBOL LOAD MORE ═══ */}
      {list.length > visibleCount && (
        <button 
          onClick={() => setVisibleCount(v => v + 10)} 
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-3 rounded-xl border border-slate-700 transition"
        >
          Muat 10 Data Lagi (Sisa {list.length - visibleCount})
        </button>
      )}

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

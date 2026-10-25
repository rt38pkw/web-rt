import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/sekretaris/Layout';

export default function SekretarisVerifikasi() {
  const [activeTab, setActiveTab] = useState('pending');
  const [antrean, setAntrean] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // STATE BARU UNTUK ZOOM GAMBAR
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    fetchAntrean();
  }, [activeTab]);

  const fetchAntrean = async () => {
    setLoading(true);
    try {
      const { data: wPending } = await supabase.from('warga').select('id').eq('status_verifikasi_profil', activeTab);
      const { data: pPending } = await supabase.from('penghuni').select('warga_id').eq('status_verifikasi', activeTab).eq('is_aktif', true);

      const wargaIds = [
        ...new Set([
          ...(wPending || []).map(w => w.id),
          ...(pPending || []).map(p => p.warga_id)
        ])
      ];

      if (wargaIds.length === 0) {
        setAntrean([]);
        setLoading(false);
        return;
      }

      const { data: wargaData } = await supabase.from('warga').select('*').in('id', wargaIds);
      const { data: penghuniData } = await supabase.from('penghuni').select('*').in('warga_id', wargaIds).eq('is_aktif', true);

      const grouped = {};
      if (wargaData) {
        wargaData.forEach(w => {
          grouped[w.id] = { warga: w, pemilik: w, penyewa: null, anggotaKeluarga: [] };
        });
      }

      if (penghuniData) {
        penghuniData.forEach(p => {
          if (grouped[p.warga_id]) {
            if (p.hubungan === 'Kepala Keluarga') grouped[p.warga_id].penyewa = p;
            else grouped[p.warga_id].anggotaKeluarga.push(p);
          }
        });
      }

      setAntrean(Object.values(grouped));
    } catch (err) {
      console.error(err);
      alert('Gagal memuat data antrean.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePemilik = async (warga) => {
    if (!confirm(`Approve profil pemilik (${warga.nama_lengkap}) dan seluruh anggota keluarganya?`)) return;
    setProcessing(true);
    try {
      const updateData = { status_verifikasi_profil: 'approved', alasan_reject: null };
      if (warga.password_pending) {
        updateData.password = warga.password_pending;
        updateData.password_pending = null;
      }
      await supabase.from('warga').update(updateData).eq('id', warga.id);
      await supabase.from('penghuni').update({ status_verifikasi: 'approved', alasan_reject: null }).eq('warga_id', warga.id);
      alert('✅ Profil Pemilik & Keluarga berhasil disetujui!');
      fetchAntrean();
    } catch (err) { alert('Gagal approve: ' + err.message); } finally { setProcessing(false); }
  };

  const handleApprovePenyewa = async (penyewa) => {
    if (!confirm(`Approve data penyewa (${penyewa.nama_lengkap})?`)) return;
    setProcessing(true);
    try {
      await supabase.from('penghuni').update({ status_verifikasi: 'approved', alasan_reject: null }).eq('id', penyewa.id);
      alert('✅ Data Penyewa berhasil disetujui!');
      fetchAntrean();
    } catch (err) { alert('Gagal approve: ' + err.message); } finally { setProcessing(false); }
  };

  const handleRejectPemilik = async (warga) => {
    const alasan = prompt('Masukkan alasan penolakan (wajib diisi):');
    if (!alasan || !alasan.trim()) return;
    setProcessing(true);
    try {
      await supabase.from('warga').update({ status_verifikasi_profil: 'rejected', alasan_reject: alasan.trim() }).eq('id', warga.id);
      alert('❌ Profil Pemilik ditolak.');
      fetchAntrean();
    } catch (err) { alert('Gagal menolak: ' + err.message); } finally { setProcessing(false); }
  };

  const handleRejectPenyewa = async (penyewa) => {
    const alasan = prompt('Masukkan alasan penolakan (wajib diisi):');
    if (!alasan || !alasan.trim()) return;
    setProcessing(true);
    try {
      await supabase.from('penghuni').update({ status_verifikasi: 'rejected', alasan_reject: alasan.trim() }).eq('id', penyewa.id);
      alert('❌ Data Penyewa ditolak.');
      fetchAntrean();
    } catch (err) { alert('Gagal menolak: ' + err.message); } finally { setProcessing(false); }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-4">
        
        {/* MODAL PREVIEW GAMBAR (ZOOM) */}
        {previewImage && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
            <button className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-rose-500 transition" onClick={() => setPreviewImage(null)}>✕</button>
            <img src={previewImage} alt="Zoom KK" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </div>
        )}

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2 flex gap-2">
          <button onClick={() => setActiveTab('pending')} className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition ${activeTab === 'pending' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>⏳ Menunggu Verifikasi</button>
          <button onClick={() => setActiveTab('rejected')} className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition ${activeTab === 'rejected' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>✗ Riwayat Ditolak</button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-slate-500 text-xs animate-pulse">Memuat data antrean...</div>
        ) : antrean.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 text-center flex flex-col items-center justify-center">
            <div className="text-4xl mb-3">{activeTab === 'pending' ? '🎉' : '📂'}</div>
            <h3 className="text-base font-bold text-white mb-1">{activeTab === 'pending' ? 'Semua Beres!' : 'Belum Ada Riwayat Ditolak'}</h3>
            <p className="text-xs text-slate-400">{activeTab === 'pending' ? 'Tidak ada antrean verifikasi saat ini.' : 'Data yang Anda tolak akan muncul di sini.'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {antrean.map((item, idx) => {
              const isPemilikTabMatch = item.pemilik.status_verifikasi_profil === activeTab;
              const isPenyewaTabMatch = item.penyewa && item.penyewa.status_verifikasi === activeTab;

              if (!isPemilikTabMatch && !isPenyewaTabMatch) return null;

              return (
                <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                  <div className="bg-slate-950/60 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white bg-slate-800 px-3 py-1 rounded-lg">🏠 {item.warga.no_rumah}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${item.warga.status_huni === 'sewa' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                        {item.warga.status_huni === 'sewa' ? 'Disewakan' : 'Dihuni Pemilik'}
                      </span>
                    </div>
                  </div>

                  <div className={`p-4 grid grid-cols-1 ${isPemilikTabMatch && isPenyewaTabMatch ? 'md:grid-cols-2' : ''} gap-4`}>
                    
                    {/* DATA PEMILIK */}
                    {isPemilikTabMatch && (
                      <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-4">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 border-b border-slate-800 pb-2">Data Pemilik</h4>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                          {/* KOLOM TEKS DATA */}
                          <div className="flex-1 space-y-2">
                            <div>
                              <div className="text-[10px] text-slate-500">Nama Lengkap</div>
                              <div className="text-sm font-bold text-white">{item.pemilik.nama_lengkap}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-500">NIK</div>
                              <div className="text-xs text-slate-300 font-mono">{item.pemilik.nik || '-'}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-500">No WhatsApp</div>
                              <div className="text-xs text-slate-300">{item.pemilik.no_wa || '-'}</div>
                            </div>
                          </div>

                          {/* KOLOM GAMBAR KK */}
                          <div className="w-full sm:w-1/2 shrink-0">
                            {item.pemilik.url_kk ? (
                              <div className="relative group cursor-pointer" onClick={() => setPreviewImage(item.pemilik.url_kk)}>
                                <img src={item.pemilik.url_kk} alt="KK Pemilik" className="w-full h-32 object-cover rounded-lg border border-slate-700" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition">
                                  <span className="text-white text-xs font-semibold">🔍 Zoom KK</span>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-32 bg-slate-800/50 border border-slate-700 border-dashed rounded-lg flex items-center justify-center text-xs text-slate-500">Tidak ada KK</div>
                            )}
                          </div>
                        </div>

                        {item.anggotaKeluarga.length > 0 && (
                          <div className="border-t border-slate-800/60 pt-2">
                            <span className="text-[10px] text-slate-500 font-semibold mb-1 block">Anggota Keluarga:</span>
                            <ul className="text-[10px] text-slate-300 list-disc pl-4 space-y-0.5">
                              {item.anggotaKeluarga.map((a, i) => <li key={i}>{a.nama_lengkap} ({a.hubungan})</li>)}
                            </ul>
                          </div>
                        )}

                        {activeTab === 'rejected' && item.pemilik.alasan_reject && (
                          <div className="text-[10px] text-rose-400 bg-rose-500/10 p-2 rounded border border-rose-500/20 mt-2"><strong>Alasan Ditolak:</strong> {item.pemilik.alasan_reject}</div>
                        )}

                        {activeTab === 'pending' && (
                          <div className="flex gap-2 pt-2 border-t border-slate-800/60">
                            <button onClick={() => handleRejectPemilik(item.pemilik)} disabled={processing} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold py-2 rounded-lg transition">✗ Tolak</button>
                            <button onClick={() => handleApprovePemilik(item.pemilik)} disabled={processing} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold py-2 rounded-lg transition">✓ Approve</button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* DATA PENYEWA */}
                    {isPenyewaTabMatch && (
                      <div className="bg-orange-950/10 border border-orange-500/20 rounded-xl p-4 space-y-4">
                        <h4 className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1 border-b border-orange-500/20 pb-2">Data Penyewa</h4>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                          {/* KOLOM TEKS DATA */}
                          <div className="flex-1 space-y-2">
                            <div>
                              <div className="text-[10px] text-slate-500">Nama Lengkap</div>
                              <div className="text-sm font-bold text-white">{item.penyewa.nama_lengkap}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-500">NIK</div>
                              <div className="text-xs text-slate-300 font-mono">{item.penyewa.nik || '-'}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-500">No WhatsApp</div>
                              <div className="text-xs text-slate-300">{item.penyewa.no_hp || '-'}</div>
                            </div>
                          </div>

                          {/* KOLOM GAMBAR KK */}
                          <div className="w-full sm:w-1/2 shrink-0">
                            {item.penyewa.url_kk ? (
                              <div className="relative group cursor-pointer" onClick={() => setPreviewImage(item.penyewa.url_kk)}>
                                <img src={item.penyewa.url_kk} alt="KK Penyewa" className="w-full h-32 object-cover rounded-lg border border-orange-500/30" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition">
                                  <span className="text-white text-xs font-semibold">🔍 Zoom KK</span>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-32 bg-slate-800/50 border border-slate-700 border-dashed rounded-lg flex items-center justify-center text-xs text-slate-500">Tidak ada KK</div>
                            )}
                          </div>
                        </div>

                        {activeTab === 'rejected' && item.penyewa.alasan_reject && (
                          <div className="text-[10px] text-rose-400 bg-rose-500/10 p-2 rounded border border-rose-500/20 mt-2"><strong>Alasan Ditolak:</strong> {item.penyewa.alasan_reject}</div>
                        )}

                        {activeTab === 'pending' && (
                          <div className="flex gap-2 pt-2 border-t border-orange-500/20">
                            <button onClick={() => handleRejectPenyewa(item.penyewa)} disabled={processing} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold py-2 rounded-lg transition">✗ Tolak</button>
                            <button onClick={() => handleApprovePenyewa(item.penyewa)} disabled={processing} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold py-2 rounded-lg transition">✓ Approve</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

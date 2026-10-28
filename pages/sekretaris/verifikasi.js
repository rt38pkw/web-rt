// pages/sekretaris/verifikasi.js
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/sekretaris/Layout';

export default function SekretarisVerifikasi() {
  const [activeTab, setActiveTab] = useState('pending');
  const [antrean, setAntrean] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const [previewData, setPreviewData] = useState(null); 
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    fetchAntrean();
    
    const channel = supabase
      .channel('realtime-verifikasi-sekretaris')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'penghuni' }, () => fetchAntrean())
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [activeTab]);

  const fetchAntrean = async () => {
    setLoading(true);
    try {
      const { data: penghuniPending, error } = await supabase
        .from('penghuni')
        .select('*, warga: warga_id (no_rumah, status_huni)')
        .eq('status_verifikasi', activeTab)
        .eq('is_aktif', true)
        .order('nama_lengkap');

      if (error) throw error;

      const grouped = {};
      if (penghuniPending) {
        penghuniPending.forEach(p => {
          const wId = p.warga_id;
          if (!grouped[wId]) {
            grouped[wId] = {
              warga_id: wId,
              no_rumah: p.warga?.no_rumah,
              status_huni: p.warga?.status_huni,
              anggota: []
            };
          }
          grouped[wId].anggota.push(p);
        });
      }

      setAntrean(Object.values(grouped));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (item) => {
    if (!confirm(`Approve data penghuni untuk rumah ${item.no_rumah}?`)) return;
    setProcessing(true);
    try {
      const kepalaKeluarga = item.anggota.find(a => a.hubungan === 'Kepala Keluarga' && a.tipe_penghuni === 'pemilik');

      const { error: errPenghuni } = await supabase
        .from('penghuni')
        .update({ status_verifikasi: 'approved', alasan_reject: null })
        .eq('warga_id', item.warga_id)
        .eq('status_verifikasi', 'pending');
      
      if (errPenghuni) throw errPenghuni;

      if (kepalaKeluarga) {
        const { data: wargaData } = await supabase.from('warga').select('password_pending').eq('id', item.warga_id).single();
        
        const updateWarga = {
          nama_lengkap: kepalaKeluarga.nama_lengkap,
          nik: kepalaKeluarga.nik,
          no_kk: kepalaKeluarga.no_kk,
          no_wa: kepalaKeluarga.no_hp
        };

        if (wargaData?.password_pending) {
          updateWarga.password = wargaData.password_pending;
          updateWarga.password_pending = null;
        }

        await supabase.from('warga').update(updateWarga).eq('id', item.warga_id);
      }

      alert('✅ Data berhasil disetujui! (Password warga telah diperbarui).');
      fetchAntrean();
    } catch (err) {
      alert('Gagal approve: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (item) => {
    const alasan = prompt('Masukkan alasan penolakan (wajib diisi):');
    if (!alasan || !alasan.trim()) return;
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('penghuni')
        .update({ status_verifikasi: 'rejected', alasan_reject: alasan.trim() })
        .eq('warga_id', item.warga_id)
        .eq('status_verifikasi', 'pending');
      
      if (error) throw error;
      alert('❌ Data ditolak.');
      fetchAntrean();
    } catch (err) {
      alert('Gagal menolak: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const openPreview = (data) => {
    setPreviewData(data);
    setIsZoomed(false);
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-4">
        
        {/* MODAL SPLIT-SCREEN DENGAN TOMBOL CLOSE MELAYANG */}
        {previewData && (
          <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 animate-in fade-in">
            <div className="bg-slate-900 sm:border sm:border-slate-700 w-full max-w-6xl h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-3xl flex flex-col md:flex-row overflow-hidden shadow-2xl relative">
              
              {/* TOMBOL TUTUP (MELAYANG DI POJOK KANAN ATAS) */}
              <button 
                onClick={() => setPreviewData(null)} 
                className="absolute top-3 right-3 z-[150] bg-rose-600 hover:bg-rose-500 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-xl border border-rose-400/50 transition active:scale-90"
              >
                <span className="text-lg font-bold">✕</span>
              </button>

              <div className="w-full md:w-1/3 bg-slate-900 p-5 flex flex-col border-b md:border-b-0 md:border-r border-slate-800 shrink-0 overflow-y-auto max-h-[45vh] md:max-h-full">
                <div className="flex items-center justify-between mb-6 pr-12">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Pencocokan Data</h3>
                  <span className={`text-[10px] px-2 py-1 rounded font-bold border ${previewData.tipe === 'pemilik' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                    {previewData.tipe === 'pemilik' ? 'Pemilik' : 'Penyewa'}
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Nama Lengkap</div>
                    <div className="text-lg font-bold text-white leading-tight">{previewData.nama}</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">NIK (Cocokkan dengan KK)</div>
                    <div className="text-xl font-mono font-bold text-amber-400 tracking-wider break-all">{previewData.nik || '-'}</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">No. KK (Cocokkan dengan KK)</div>
                    <div className="text-xl font-mono font-bold text-blue-400 tracking-wider break-all">{previewData.noKk || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">No WhatsApp</div>
                    <div className="text-sm text-slate-300">{previewData.wa || '-'}</div>
                  </div>
                </div>
              </div>
              
              <div className="w-full md:w-2/3 bg-black/50 relative flex flex-col flex-1 overflow-hidden">
                <div className="absolute top-4 left-4 z-10 bg-slate-900/80 border border-slate-700 text-white text-[10px] px-3 py-1.5 rounded-lg pointer-events-none">{isZoomed ? '🔍 Klik gambar untuk perkecil' : '🔍 Klik gambar untuk Zoom'}</div>
                <div className={`flex-1 p-2 sm:p-6 overflow-auto flex ${isZoomed ? 'items-start justify-start' : 'items-center justify-center'} ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`} onClick={() => setIsZoomed(!isZoomed)}>
                  <img src={previewData.imageUrl} alt="Preview KK" className={`rounded-lg shadow-lg transition-all duration-200 ${isZoomed ? 'w-auto h-auto max-w-none max-h-none' : 'max-w-full max-h-full object-contain'}`} />
                </div>
              </div>
            </div>
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
              const kepalaKeluarga = item.anggota.find(a => a.hubungan === 'Kepala Keluarga');
              const anggotaLain = item.anggota.filter(a => a.hubungan !== 'Kepala Keluarga');
              const tipePenghuni = kepalaKeluarga?.tipe_penghuni || 'pemilik';
              const isPemilik = tipePenghuni === 'pemilik';

              return (
                <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                  <div className="bg-slate-950/60 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white bg-slate-800 px-3 py-1 rounded-lg">🏠 {item.no_rumah}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${item.status_huni === 'sewa' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                        {item.status_huni === 'sewa' ? 'Disewakan' : 'Dihuni Pemilik'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    {kepalaKeluarga && (
                      <div className={`rounded-xl p-4 space-y-4 border ${isPemilik ? 'bg-blue-950/10 border-blue-500/20' : 'bg-orange-950/10 border-orange-500/20'}`}>
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                          <div className="w-full">
                            <h4 className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isPemilik ? 'text-blue-400' : 'text-orange-400'}`}>
                              Kepala Keluarga ({isPemilik ? 'Pemilik' : 'Penyewa'})
                            </h4>
                            <div className="text-sm font-bold text-white">{kepalaKeluarga.nama_lengkap}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 break-all">NIK: {kepalaKeluarga.nik || '-'}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 break-all">No. KK: {kepalaKeluarga.no_kk || '-'}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 break-all">WA: {kepalaKeluarga.no_hp || '-'}</div>
                          </div>
                          {kepalaKeluarga.url_kk && (
                            <div className="relative group cursor-pointer w-full sm:w-24 h-32 sm:h-24 shrink-0 mt-2 sm:mt-0" onClick={() => openPreview({ imageUrl: kepalaKeluarga.url_kk, nama: kepalaKeluarga.nama_lengkap, nik: kepalaKeluarga.nik, noKk: kepalaKeluarga.no_kk, wa: kepalaKeluarga.no_hp, tipe: tipePenghuni })}>
                              <img src={kepalaKeluarga.url_kk} alt="KK" className="w-full h-full object-cover rounded-lg border border-slate-700" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition"><span className="text-white text-[10px] font-semibold">🔍 Zoom</span></div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {anggotaLain.length > 0 && (
                      <div className="border-t border-slate-800/60 pt-3">
                        <span className="text-[10px] text-slate-500 font-semibold mb-2 block uppercase tracking-wider">Anggota Keluarga:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {anggotaLain.map((a, i) => (
                            <div key={i} className="bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                              <div className="text-xs text-white font-semibold">{a.nama_lengkap}</div>
                              <div className="text-[9px] text-slate-400 break-all">{a.hubungan} • NIK: {a.nik || '-'}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTab === 'rejected' && kepalaKeluarga?.alasan_reject && (
                      <div className="text-[10px] text-rose-400 bg-rose-500/10 p-2 rounded border border-rose-500/20 mt-2">
                        <strong>Alasan Ditolak:</strong> {kepalaKeluarga.alasan_reject}
                      </div>
                    )}

                    {/* TOMBOL AKSI: Di HP menumpuk vertikal, di Laptop berjejer */}
                    {activeTab === 'pending' && (
                      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t border-slate-800/60">
                        <button onClick={() => handleReject(item)} disabled={processing} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-[11px] sm:text-xs font-semibold py-3 sm:py-2.5 rounded-xl transition">✗ Tolak Data</button>
                        <button onClick={() => handleApprove(item)} disabled={processing} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-semibold py-3 sm:py-2.5 rounded-xl transition">✓ Approve Data</button>
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

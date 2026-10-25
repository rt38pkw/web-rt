import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/sekretaris/Layout';

export default function SekretarisVerifikasi() {
  const [activeTab, setActiveTab] = useState('pending');
  const [antrean, setAntrean] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchAntrean();
  }, [activeTab]);

  const fetchAntrean = async () => {
    setLoading(true);
    try {
      // 1. Ambil data warga yang statusnya pending atau rejected
      const { data: wargaData, error: errWarga } = await supabase
        .from('warga')
        .select('*')
        .eq('status_verifikasi_profil', activeTab);

      if (errWarga) throw errWarga;

      // 2. Ambil data penghuni (penyewa/keluarga) yang statusnya pending atau rejected
      const { data: penghuniData, error: errPenghuni } = await supabase
        .from('penghuni')
        .select('*')
        .eq('status_verifikasi', activeTab)
        .eq('is_aktif', true);

      if (errPenghuni) throw errPenghuni;

      // 3. Gabungkan data berdasarkan warga_id (No Rumah)
      const grouped = {};

      // Masukkan data warga (Pemilik)
      if (wargaData) {
        wargaData.forEach(w => {
          if (!grouped[w.id]) {
            grouped[w.id] = {
              warga: w,
              pemilik: w, // Simpan objek pemilik
              penyewa: null,
              anggotaKeluarga: []
            };
          }
        });
      }

      // Masukkan data penghuni (Penyewa / Anggota Keluarga)
      if (penghuniData) {
        penghuniData.forEach(p => {
          if (grouped[p.warga_id]) {
            if (p.hubungan === 'Kepala Keluarga') {
              grouped[p.warga_id].penyewa = p;
            } else {
              grouped[p.warga_id].anggotaKeluarga.push(p);
            }
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
      // 1. Update status warga jadi approved & pindahkan password_pending jika ada
      const updateData = { status_verifikasi_profil: 'approved', alasan_reject: null };
      if (warga.password_pending) {
        updateData.password = warga.password_pending;
        updateData.password_pending = null; // Bersihkan
      }

      const { error: errWarga } = await supabase.from('warga').update(updateData).eq('id', warga.id);
      if (errWarga) throw errWarga;

      // 2. Auto-approve semua penghuni di rumah ini (karena 1x verifikasi)
      const { error: errPenghuni } = await supabase
        .from('penghuni')
        .update({ status_verifikasi: 'approved', alasan_reject: null })
        .eq('warga_id', warga.id);
      if (errPenghuni) throw errPenghuni;

      alert('✅ Profil Pemilik & Keluarga berhasil disetujui!');
      fetchAntrean();
    } catch (err) {
      alert('Gagal approve: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleApprovePenyewa = async (penyewa) => {
    if (!confirm(`Approve data penyewa (${penyewa.nama_lengkap})?`)) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('penghuni')
        .update({ status_verifikasi: 'approved', alasan_reject: null })
        .eq('id', penyewa.id);
      
      if (error) throw error;
      alert('✅ Data Penyewa berhasil disetujui!');
      fetchAntrean();
    } catch (err) {
      alert('Gagal approve: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectPemilik = async (warga) => {
    const alasan = prompt('Masukkan alasan penolakan (wajib diisi):');
    if (alasan === null) return;
    if (!alasan.trim()) { alert('Alasan tidak boleh kosong!'); return; }
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('warga')
        .update({ status_verifikasi_profil: 'rejected', alasan_reject: alasan.trim() })
        .eq('id', warga.id);
      
      if (error) throw error;
      alert('❌ Profil Pemilik ditolak. Warga dapat memperbaiki datanya.');
      fetchAntrean();
    } catch (err) {
      alert('Gagal menolak: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectPenyewa = async (penyewa) => {
    const alasan = prompt('Masukkan alasan penolakan (wajib diisi):');
    if (alasan === null) return;
    if (!alasan.trim()) { alert('Alasan tidak boleh kosong!'); return; }
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('penghuni')
        .update({ status_verifikasi: 'rejected', alasan_reject: alasan.trim() })
        .eq('id', penyewa.id);
      
      if (error) throw error;
      alert('❌ Data Penyewa ditolak. Penyewa dapat memperbaiki datanya.');
      fetchAntrean();
    } catch (err) {
      alert('Gagal menolak: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-4">
        
        {/* Header Tabs */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2 flex gap-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition ${
              activeTab === 'pending' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            ⏳ Menunggu Verifikasi
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition ${
              activeTab === 'rejected' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            ✗ Riwayat Ditolak
          </button>
        </div>

        {/* List Antrean */}
        {loading ? (
          <div className="py-10 text-center text-slate-500 text-xs animate-pulse">Memuat data antrean...</div>
        ) : antrean.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 text-center flex flex-col items-center justify-center">
            <div className="text-4xl mb-3">{activeTab === 'pending' ? '🎉' : '📂'}</div>
            <h3 className="text-base font-bold text-white mb-1">
              {activeTab === 'pending' ? 'Semua Beres!' : 'Belum Ada Riwayat Ditolak'}
            </h3>
            <p className="text-xs text-slate-400">
              {activeTab === 'pending' ? 'Tidak ada antrean verifikasi saat ini.' : 'Data yang Anda tolak akan muncul di sini.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {antrean.map((item, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                {/* Header Kartu Rumah */}
                <div className="bg-slate-950/60 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-white bg-slate-800 px-3 py-1 rounded-lg">
                      🏠 {item.warga.no_rumah}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
                      item.warga.status_huni === 'sewa' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      {item.warga.status_huni === 'sewa' ? 'Disewakan' : 'Dihuni Pemilik'}
                    </span>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* DATA PEMILIK */}
                  <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Data Pemilik</h4>
                        <div className="text-sm font-bold text-white">{item.pemilik.nama_lengkap}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">NIK: {item.pemilik.nik || '-'}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">WA: {item.pemilik.no_wa || '-'}</div>
                      </div>
                      {item.pemilik.url_kk && (
                        <a href={item.pemilik.url_kk} target="_blank" rel="noreferrer" className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1.5 rounded-lg hover:bg-blue-500/20 transition">
                          📄 Lihat KK
                        </a>
                      )}
                    </div>

                    {/* Anggota Keluarga */}
                    {item.anggotaKeluarga.length > 0 && (
                      <div className="mt-2 border-t border-slate-800/60 pt-2">
                        <span className="text-[10px] text-slate-500 font-semibold mb-1 block">Anggota Keluarga:</span>
                        <ul className="text-[10px] text-slate-300 list-disc pl-4 space-y-0.5">
                          {item.anggotaKeluarga.map((a, i) => (
                            <li key={i}>{a.nama_lengkap} ({a.hubungan})</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {activeTab === 'rejected' && item.pemilik.alasan_reject && (
                      <div className="text-[10px] text-rose-400 bg-rose-500/10 p-2 rounded border border-rose-500/20 mt-2">
                        <strong>Alasan Ditolak:</strong> {item.pemilik.alasan_reject}
                      </div>
                    )}

                    {activeTab === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => handleRejectPemilik(item.pemilik)} disabled={processing} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold py-2 rounded-lg transition">✗ Tolak</button>
                        <button onClick={() => handleApprovePemilik(item.pemilik)} disabled={processing} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold py-2 rounded-lg transition">✓ Approve Pemilik</button>
                      </div>
                    )}
                  </div>

                  {/* DATA PENYEWA (Jika Ada) */}
                  {item.penyewa ? (
                    <div className="bg-orange-950/10 border border-orange-500/20 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1">Data Penyewa</h4>
                          <div className="text-sm font-bold text-white">{item.penyewa.nama_lengkap}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">NIK: {item.penyewa.nik || '-'}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">WA: {item.penyewa.no_hp || '-'}</div>
                        </div>
                        {item.penyewa.url_kk && (
                          <a href={item.penyewa.url_kk} target="_blank" rel="noreferrer" className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-1.5 rounded-lg hover:bg-orange-500/20 transition">
                            📄 Lihat KK
                          </a>
                        )}
                      </div>

                      {activeTab === 'rejected' && item.penyewa.alasan_reject && (
                        <div className="text-[10px] text-rose-400 bg-rose-500/10 p-2 rounded border border-rose-500/20 mt-2">
                          <strong>Alasan Ditolak:</strong> {item.penyewa.alasan_reject}
                        </div>
                      )}

                      {activeTab === 'pending' && (
                        <div className="flex gap-2 pt-2">
                          <button onClick={() => handleRejectPenyewa(item.penyewa)} disabled={processing} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold py-2 rounded-lg transition">✗ Tolak</button>
                          <button onClick={() => handleApprovePenyewa(item.penyewa)} disabled={processing} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold py-2 rounded-lg transition">✓ Approve Penyewa</button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-950/20 border border-slate-800/50 border-dashed rounded-xl p-4 flex items-center justify-center">
                      <p className="text-xs text-slate-500 text-center">Tidak ada data penyewa yang perlu diverifikasi.</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

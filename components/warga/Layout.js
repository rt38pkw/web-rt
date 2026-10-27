// pages/dashboard-warga/ronda.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { uploadBuktiRonda } from '../../lib/ronda/storage';

export default function RondaWarga() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [jadwalList, setJadwalList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('warga_session');
    if (!savedUser) {
      router.replace('/');
      return;
    }
    const parsedUser = JSON.parse(savedUser);
    setUser(parsedUser);
    fetchJadwalWarga(parsedUser.id);
  }, [router]);

  async function fetchJadwalWarga(wargaId) {
    setLoading(true);
    try {
      const { data: penghuniData } = await supabase
        .from('penghuni')
        .select('id')
        .eq('warga_id', wargaId)
        .eq('is_aktif', true);
      
      if (!penghuniData || penghuniData.length === 0) {
        setLoading(false);
        return; 
      }

      const penghuniIds = penghuniData.map(p => p.id);

      const { data: jadwalData, error } = await supabase
        .from('petugas_ronda')
        .select(`
          id, jadwal_id, status_hadir, foto_bukti, waktu_absen, catatan,
          jadwal:jadwal_id ( tanggal, status, periode:periode_id (nama_periode, jam_mulai, jam_selesai) ),
          penghuni:penghuni_id ( nama_lengkap )
        `)
        .in('penghuni_id', penghuniIds)
        .eq('jadwal.status', 'aktif') 
        .order('jadwal(tanggal)', { ascending: true });

      if (error) throw error;
      setJadwalList(jadwalData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleUploadBukti = async (e, jadwalId, petugasId) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingId(jadwalId);
    try {
      const publicUrl = await uploadBuktiRonda(file, jadwalId);

      const { error } = await supabase
        .from('petugas_ronda')
        .update({
          status_hadir: 'pending',
          foto_bukti: publicUrl,
          waktu_absen: new Date().toISOString()
        })
        .eq('jadwal_id', jadwalId); 

      if (error) throw error;

      alert('✅ Bukti grup berhasil diupload! Menunggu verifikasi Sekretaris.');
      fetchJadwalWarga(user.id); 
    } catch (err) {
      alert('Gagal upload: ' + err.message);
    } finally {
      setUploadingId(null);
    }
  };

  const formatTanggal = (dateStr) => dateStr ? new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateStr)) : '-';
  
  if (loading) return <div className="min-h-screen bg-slate-950 text-white flex justify-center p-10">Memuat jadwal ronda...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-20">
      <div className="max-w-md mx-auto space-y-4">
        
        <button onClick={() => router.push('/dashboard-warga/iuran')} className="text-slate-400 text-xs mb-2 flex items-center gap-1 hover:text-white">
          ← Kembali ke Dashboard
        </button>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h1 className="text-lg font-bold text-white mb-1">Jadwal Ronda Saya</h1>
          <p className="text-xs text-slate-400">Cukup 1 orang dari grup Anda yang mengunggah foto grup (selfie bersama) sebagai bukti kehadiran.</p>
        </div>

        {jadwalList.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">Belum ada jadwal ronda untuk Anda.</div>
        ) : (
          <div className="space-y-3">
            {jadwalList.map((item) => (
              <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-white">{formatTanggal(item.jadwal.tanggal)}</div>
                    <div className="text-xs text-teal-400 mt-1">
                      🕒 {item.jadwal.periode?.jam_mulai?.substring(0,5)} - {item.jadwal.periode?.jam_selesai?.substring(0,5)} WIB
                    </div>
                  </div>
                  
                  {/* ═══ LOGIKA BADGE YANG DIPERBAIKI ═══ */}
                  <div>
                    {/* 1. Jika belum ada foto, berarti belum absen */}
                    {!item.foto_bukti && (
                      <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-1 rounded border border-slate-700">Belum Absen</span>
                    )}
                    {/* 2. Jika sudah foto, cek status verifikasi */}
                    {item.foto_bukti && item.status_hadir === 'pending' && (
                      <span className="bg-amber-500/20 text-amber-400 text-[10px] px-2 py-1 rounded border border-amber-500/30">⏳ Menunggu Verifikasi</span>
                    )}
                    {item.foto_bukti && item.status_hadir === 'hadir' && (
                      <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-1 rounded border border-emerald-500/30">✅ Hadir</span>
                    )}
                    {item.foto_bukti && item.status_hadir === 'tidak_hadir' && (
                      <span className="bg-rose-500/20 text-rose-400 text-[10px] px-2 py-1 rounded border border-rose-500/30">❌ Alpa</span>
                    )}
                  </div>
                </div>

                {item.foto_bukti && (
                  <div className="w-full h-40 bg-slate-950 rounded-lg overflow-hidden relative border border-slate-800">
                    <img src={item.foto_bukti} alt="Bukti Ronda" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-[10px] text-white text-center backdrop-blur-sm">
                      Foto Grup Terkirim
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                  <div className="text-[10px] text-slate-400">
                    🔔 Silakan upload bukti jika sudah waktunya.
                  </div>
                  
                  {/* Tombol muncul hanya jika belum ada foto */}
                  {(!item.foto_bukti) && (
                    <>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        id={`upload-${item.jadwal_id}`} 
                        className="hidden" 
                        onChange={(e) => handleUploadBukti(e, item.jadwal_id, item.id)} 
                      />
                      <label 
                        htmlFor={`upload-${item.jadwal_id}`} 
                        className={`bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-lg text-xs cursor-pointer transition shadow-lg ${uploadingId === item.jadwal_id ? 'opacity-50' : ''}`}
                      >
                        {uploadingId === item.jadwal_id ? 'Mengupload...' : '📸 Upload Bukti'}
                      </label>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

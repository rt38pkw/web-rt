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
      // 1. Cari ID Penghuni (baik Pemilik maupun Penyewa)
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

      // 2. Tarik data jadwal ronda mereka
      const { data: jadwalData, error } = await supabase
        .from('petugas_ronda')
        .select(`
          id, jadwal_id, status_hadir, foto_bukti, waktu_absen, catatan,
          jadwal:jadwal_id ( tanggal, status, periode:periode_id (nama_periode, jam_mulai, jam_selesai) ),
          penghuni:penghuni_id ( nama_lengkap )
        `)
        .in('penghuni_id', penghuniIds)
        .eq('jadwal.status', 'aktif') // Hanya ambil yang tidak libur
        .order('jadwal(tanggal)', { ascending: true });

      if (error) throw error;
      setJadwalList(jadwalData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // ═══ LOGIKA UPLOAD PER GRUP (JADWAL_ID) ═══
  const handleUploadBukti = async (e, jadwalId, petugasId) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingId(jadwalId);
    try {
      // 1. Upload foto fisik ke Storage (pakai jadwalId sebagai nama file)
      const publicUrl = await uploadBuktiRonda(file, jadwalId);

      // 2. Update SEMUA orang di grup ini (berdasarkan jadwal_id)
      const { error } = await supabase
        .from('petugas_ronda')
        .update({
          status_hadir: 'pending',
          foto_bukti: publicUrl,
          waktu_absen: new Date().toISOString()
        })
        .eq('jadwal_id', jadwalId); // Update semua yang punya jadwal_id ini

      if (error) throw error;

      alert('✅ Bukti grup berhasil diupload! Menunggu verifikasi Sekretaris.');
      fetchJadwalWarga(user.id); // Refresh data
    } catch (err) {
      alert('Gagal upload: ' + err.message);
    } finally {
      setUploadingId(null);
    }
  };

  const formatTanggal = (dateStr) => dateStr ? new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateStr)) : '-';
  
  // Cek apakah hari ini adalah hari H ronda
  const isToday = (dateStr) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  if (loading) return <div className="min-h-screen bg-slate-950 text-white flex justify-center p-10">Memuat jadwal ronda...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-20">
      <div className="max-w-md mx-auto space-y-4">
        
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
                    <div className="text-[10px] text-slate-500 mt-1">Anda bertugas bersama warga lain di grup ini.</div>
                  </div>
                  
                  {/* Status Badge */}
                  <div>
                    {item.status_hadir === 'pending' && <span className="bg-amber-500/20 text-amber-400 text-[10px] px-2 py-1 rounded border border-amber-500/30">⏳ Pending</span>}
                    {item.status_hadir === 'hadir' && <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-1 rounded border border-emerald-500/30">✅ Hadir</span>}
                    {item.status_hadir === 'tidak_hadir' && <span className="bg-rose-500/20 text-rose-400 text-[10px] px-2 py-1 rounded border border-rose-500/30">❌ Alpa</span>}
                    {(!item.status_hadir || item.status_hadir === null) && <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-1 rounded">Belum Absen</span>}
                  </div>
                </div>

                {/* Foto Bukti (Jika ada) */}
                {item.foto_bukti && (
                  <div className="w-full h-40 bg-slate-950 rounded-lg overflow-hidden relative border border-slate-800">
                    <img src={item.foto_bukti} alt="Bukti Ronda" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-[10px] text-white text-center backdrop-blur-sm">
                      Foto Grup Terkirim
                    </div>
                  </div>
                )}

                {/* Tombol Aksi Upload */}
                <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                  <div className="text-[10px] text-slate-400">
                    {isToday(item.jadwal.tanggal) ? '🔔 Jadwal Anda malam ini!' : 'Belum waktunya.'}
                  </div>
                  
                  {/* Tombol muncul jika BELUM ada foto, dan hari ini adalah jadwalnya */}
                  {(!item.foto_bukti) && isToday(item.jadwal.tanggal) && (
                    <>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" // Buka kamera langsung di HP
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

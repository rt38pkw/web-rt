// pages/dashboard-warga/ronda.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { uploadBuktiRonda } from '../../lib/ronda/storage';

export default function RondaWarga() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [jadwalSaya, setJadwalSaya] = useState([]); 
  const [jadwalFull, setJadwalFull] = useState([]); 
  const [leaderboard, setLeaderboard] = useState([]); 
  const [uploadingId, setUploadingId] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('warga_session');
    if (!savedUser) {
      router.replace('/');
      return;
    }
    const parsedUser = JSON.parse(savedUser);
    setUser(parsedUser);
    fetchData(parsedUser.id);
  }, [router]);

  async function fetchData(wargaId) {
    setLoading(true);
    try {
      const { data: penghuniData } = await supabase
        .from('penghuni').select('id').eq('warga_id', wargaId).eq('is_aktif', true);
      
      const penghuniIds = (penghuniData || []).map(p => p.id);

      if (penghuniIds.length > 0) {
        const { data: myJadwal } = await supabase
          .from('petugas_ronda')
          .select('id, jadwal_id, status_hadir, foto_bukti, jadwal:jadwal_id(tanggal, status, periode:periode_id(jam_mulai, jam_selesai))')
          .in('penghuni_id', penghuniIds)
          .order('jadwal(tanggal)', { ascending: true });
        setJadwalSaya(myJadwal || []);
      }

      const { data: fullJadwal } = await supabase
        .from('jadwal_ronda')
        .select(`
          id, tanggal, status, periode:periode_id(jam_mulai, jam_selesai),
          petugas:petugas_ronda( status_hadir, penghuni:penghuni_id(nama_lengkap, warga:warga_id(no_rumah)) )
        `)
        .eq('status', 'aktif')
        .order('tanggal', { ascending: true });
      setJadwalFull(fullJadwal || []);

      const { data: allPetugas } = await supabase
        .from('petugas_ronda')
        .select('penghuni_id, penghuni:penghuni_id(nama_lengkap, warga:warga_id(no_rumah))')
        .eq('status_hadir', 'hadir');

      const tally = {};
      (allPetugas || []).forEach(p => {
        const pid = p.penghuni_id;
        if (!tally[pid]) {
          tally[pid] = { id: pid, nama: p.penghuni?.nama_lengkap, no_rumah: p.penghuni?.warga?.no_rumah, total_hadir: 0 };
        }
        tally[pid].total_hadir += 1;
      });
      const sortedLeaderboard = Object.values(tally).sort((a, b) => b.total_hadir - a.total_hadir);
      setLeaderboard(sortedLeaderboard);

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
        .update({ status_hadir: 'pending', foto_bukti: publicUrl, waktu_absen: new Date().toISOString() })
        .eq('jadwal_id', jadwalId); 

      if (error) throw error;
      alert('✅ Bukti berhasil diupload! Menunggu verifikasi Sekretaris.');
      fetchData(user.id); 
    } catch (err) {
      alert('Gagal upload: ' + err.message);
    } finally {
      setUploadingId(null);
    }
  };

  const formatTanggal = (dateStr) => dateStr ? new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr)) : '-';

  // ═══ LOGIKA TIMER ABSEN ═══
  const cekStatusWaktu = (tanggalJadwal, jamSelesai) => {
    if (!tanggalJadwal || !jamSelesai) return 'closed';
    
    // Gabungkan tanggal dan jam selesai (contoh: 2026-12-01T02:00:00)
    const deadline = new Date(`${tanggalJadwal}T${jamSelesai}`);
    
    // Jika jam selesai adalah jam 00:00 - 06:00 pagi, berarti ronda berakhir BESOK harinya
    const jam = parseInt(jamSelesai.split(':')[0]);
    if (jam < 12) {
      deadline.setDate(deadline.getDate() + 1); 
    }
    
    // Beri toleransi 2 jam setelah jam selesai
    deadline.setHours(deadline.getHours() + 2);

    const now = new Date();
    
    // Jika sekarang sudah melewati deadline
    if (now > deadline) return 'closed';
    
    // Jika sekarang masih H-1 atau Hari-H
    return 'open';
  };

  if (loading) return <div className="min-h-screen bg-slate-950 text-white flex justify-center p-10">Memuat data ronda...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <button onClick={() => router.push('/dashboard-warga/iuran')} className="text-slate-400 text-xs flex items-center gap-1 hover:text-white">
          ← Kembali ke Dashboard
        </button>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h1 className="text-xl font-bold text-white mb-1">Jadwal Ronda RT 38</h1>
          <p className="text-xs text-slate-400">Pantau jadwal, lakukan absensi, dan lihat siapa yang paling rajin!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">📅 Jadwal Ronda Terdekat</h2>
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3 whitespace-nowrap">Tanggal</th>
                      <th className="p-3">Petugas (Status)</th>
                      <th className="p-3 text-right">Aksi Anda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {jadwalFull.slice(0, 15).map((j) => {
                      const myPetugasData = jadwalSaya.find(ms => ms.jadwal_id === j.id);
                      const isMySchedule = !!myPetugasData;
                      const statusWaktu = cekStatusWaktu(j.tanggal, j.periode?.jam_selesai);
                      
                      return (
                        <tr key={j.id} className={isMySchedule ? 'bg-indigo-900/20' : 'hover:bg-slate-800/40'}>
                          <td className="p-3 align-top text-slate-200 whitespace-nowrap font-semibold">
                            {formatTanggal(j.tanggal)}
                          </td>
                          <td className="p-3 align-top">
                            <div className="flex flex-wrap gap-1.5">
                              {j.petugas.map((p, idx) => (
                                <span key={idx} className={`px-2 py-1 rounded text-[10px] border ${
                                  p.status_hadir === 'hadir' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                  p.status_hadir === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                  p.status_hadir === 'tidak_hadir' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                  'bg-slate-800 text-slate-400 border-slate-700'
                                }`}>
                                  {p.penghuni?.nama_lengkap.split(' ')[0]} <span className="opacity-50">({p.penghuni?.warga?.no_rumah})</span>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 align-top text-right">
                            {isMySchedule ? (
                              !myPetugasData.foto_bukti ? (
                                statusWaktu === 'open' ? (
                                  <>
                                    <input type="file" accept="image/*" capture="environment" id={`up-${j.id}`} className="hidden" onChange={(e) => handleUploadBukti(e, j.id, myPetugasData.id)} />
                                    <label htmlFor={`up-${j.id}`} className={`bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3 py-1.5 rounded-lg text-[10px] cursor-pointer transition ${uploadingId === j.id ? 'opacity-50' : ''}`}>
                                      {uploadingId === j.id ? 'Upload...' : '📸 Absen'}
                                    </label>
                                  </>
                                ) : (
                                  <span className="text-[10px] text-rose-400 italic font-bold">Waktu Habis</span>
                                )
                              ) : (
                                <span className="text-[10px] text-teal-400">Terkirim</span>
                              )
                            ) : (
                              <span className="text-[10px] text-slate-600">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">🏆 Papan Kehadiran</h2>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
              {leaderboard.length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-6">Belum ada data kehadiran.</div>
              ) : (
                <div className="space-y-3">
                  {leaderboard.slice(0, 10).map((lb, index) => (
                    <div key={lb.id} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                        index === 0 ? 'bg-amber-400 text-amber-900' : index === 1 ? 'bg-slate-300 text-slate-800' : index === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>{index + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate">{lb.nama}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{lb.no_rumah}</div>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded text-[10px] font-bold text-emerald-400 shrink-0">{lb.total_hadir} x</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

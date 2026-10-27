// pages/dashboard-warga/ronda.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { uploadBuktiRonda } from '../../lib/ronda/storage';
import Layout from '../../components/warga/Layout';

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

      // 1. Ambil Jadwal MILIK SAYA (untuk keperluan absen di bawah)
      if (penghuniIds.length > 0) {
        const { data: myJadwal } = await supabase
          .from('petugas_ronda')
          .select('id, jadwal_id, status_hadir, foto_bukti, jadwal:jadwal_id(tanggal, status, periode:periode_id(jam_mulai, jam_selesai))')
          .in('penghuni_id', penghuniIds)
          .order('jadwal(tanggal)', { ascending: true });
        setJadwalSaya(myJadwal || []);
      }

      // 2. Ambil Jadwal FULL RT (Tabel Utama)
      const { data: fullJadwal } = await supabase
        .from('jadwal_ronda')
        .select(`
          id, tanggal, status, periode:periode_id(jam_mulai, jam_selesai),
          petugas:petugas_ronda( status_hadir, penghuni:penghuni_id(nama_lengkap, warga:warga_id(no_rumah)) )
        `)
        .eq('status', 'aktif')
        .order('tanggal', { ascending: true });
      setJadwalFull(fullJadwal || []);

      // 3. Ambil Leaderboard
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

  const handleLogout = () => {
    if (!confirm('Keluar dari akun warga?')) return;
    localStorage.removeItem('warga_session'); 
    router.replace('/');
  };

  const formatTanggal = (dateStr) => dateStr ? new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr)) : '-';
  
  const cekStatusWaktu = (tanggalJadwal, jamSelesai) => {
    if (!tanggalJadwal || !jamSelesai) return 'closed';
    const deadline = new Date(`${tanggalJadwal}T${jamSelesai}`);
    const jam = parseInt(jamSelesai.split(':')[0]);
    if (jam < 12) {
      deadline.setDate(deadline.getDate() + 1); 
    }
    deadline.setHours(deadline.getHours() + 2);
    const now = new Date();
    if (now > deadline) return 'closed';
    return 'open';
  };

  if (loading) return <div className="min-h-screen bg-slate-950 text-white flex justify-center p-10">Memuat data ronda...</div>;
  if (!user) return null;

  return (
    <Layout warga={user} onLogout={handleLogout}>
      <div className="space-y-6">
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h1 className="text-xl font-bold text-white mb-1">Jadwal Ronda RT 38</h1>
          <p className="text-xs text-slate-400">Pantau jadwal, lakukan absensi, dan lihat siapa yang paling rajin!</p>
        </div>

        {/* ═══ ATAS: JADWAL FULL & LEADERBOARD ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">📅 Jadwal Ronda Lengkap</h2>
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs min-w-[500px]">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-4 whitespace-nowrap">Tanggal</th>
                      <th className="p-4">Petugas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {jadwalFull.slice(0, 15).map((j) => {
                      const myPetugasData = jadwalSaya.find(ms => ms.jadwal_id === j.id);
                      const isMySchedule = !!myPetugasData;
                      
                      return (
                        <tr key={j.id} className={isMySchedule ? 'bg-indigo-900/20' : 'hover:bg-slate-800/40'}>
                          <td className="p-4 align-middle text-slate-200 whitespace-nowrap font-semibold">
                            {formatTanggal(j.tanggal)}
                            {isMySchedule && <span className="ml-2 text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded">Anda</span>}
                          </td>
                          <td className="p-4 align-middle">
                            <div className="flex flex-wrap gap-1.5">
                              {j.petugas.map((p, idx) => (
                                <span key={idx} className={`px-2 py-1.5 rounded-lg text-[10px] border flex items-center gap-1 ${
                                  p.status_hadir === 'hadir' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                  p.status_hadir === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                  p.status_hadir === 'tidak_hadir' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                  'bg-slate-800 text-slate-400 border-slate-700'
                                }`}>
                                  {p.status_hadir === 'hadir' ? '✅' : p.status_hadir === 'pending' ? '⏳' : p.status_hadir === 'tidak_hadir' ? '❌' : '⚪'}
                                  {p.penghuni?.nama_lengkap.split(' ')[0]} <span className="opacity-50">({p.penghuni?.warga?.no_rumah})</span>
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {jadwalFull.length > 15 && <p className="text-center text-xs text-slate-500">Menampilkan 15 jadwal terdekat...</p>}
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">🏆 Papan Kehadiran</h2>
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

        {/* ═══ BAWAH: AREA ABSENSI SAYA ═══ */}
        <div className="pt-6 border-t border-slate-800">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">📸 Absensi Ronda Saya</h2>
          
          {jadwalSaya.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-500">
              Anda tidak memiliki jadwal ronda di periode ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jadwalSaya.map((item) => {
                const statusWaktu = cekStatusWaktu(item.jadwal.tanggal, item.jadwal.periode?.jam_selesai);
                
                return (
                  <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden">
                    {/* Garis warna di pinggir card sesuai status */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                      item.status_hadir === 'hadir' ? 'bg-emerald-500' : 
                      item.status_hadir === 'pending' ? 'bg-amber-500' : 
                      item.status_hadir === 'tidak_hadir' ? 'bg-rose-500' : 'bg-slate-600'
                    }`}></div>

                    <div>
                      <div className="font-bold text-white text-sm">{formatTanggal(item.jadwal.tanggal)}</div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                        🕒 {item.jadwal.periode?.jam_mulai?.substring(0,5)} - {item.jadwal.periode?.jam_selesai?.substring(0,5)} WIB
                      </div>
                    </div>

                    {item.foto_bukti ? (
                      <div className="w-full h-32 bg-slate-950 rounded-lg overflow-hidden relative border border-slate-800">
                        <img src={item.foto_bukti} alt="Bukti" className="w-full h-full object-cover opacity-90" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold border shadow-lg ${
                            item.status_hadir === 'hadir' ? 'bg-emerald-500 text-white border-emerald-400' : 
                            item.status_hadir === 'pending' ? 'bg-amber-500 text-white border-amber-400' : 
                            'bg-rose-500 text-white border-rose-400'
                          }`}>
                            {item.status_hadir === 'hadir' ? '✅ Terverifikasi' : item.status_hadir === 'pending' ? '⏳ Menunggu Cek' : '❌ Alpa'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-32 bg-slate-950/50 rounded-lg border border-slate-800 border-dashed flex items-center justify-center">
                        <span className="text-xs text-slate-500">Belum ada foto bukti</span>
                      </div>
                    )}

                    <div className="mt-auto pt-2">
                      {!item.foto_bukti ? (
                        statusWaktu === 'open' ? (
                          <>
                            <input type="file" accept="image/*" capture="environment" id={`up-${item.jadwal_id}`} className="hidden" onChange={(e) => handleUploadBukti(e, item.jadwal_id, item.id)} />
                            <label htmlFor={`up-${item.jadwal_id}`} className={`w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs cursor-pointer transition shadow-lg ${uploadingId === item.jadwal_id ? 'opacity-50' : ''}`}>
                              {uploadingId === item.jadwal_id ? 'Mengupload...' : '📸 Upload Bukti Sekarang'}
                            </label>
                          </>
                        ) : (
                          <div className="w-full text-center bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold py-2.5 rounded-xl text-xs">
                            Waktu Absen Habis
                          </div>
                        )
                      ) : (
                         <div className="w-full text-center bg-slate-800 border border-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs">
                           Absensi Selesai
                         </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}

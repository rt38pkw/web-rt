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
  
  // State untuk Pop-up Leaderboard
  const [showLeaderboard, setShowLeaderboard] = useState(false);

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

  const handleUploadBukti = async (e, jadwalId) => {
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
    if (jam < 12) deadline.setDate(deadline.getDate() + 1); 
    deadline.setHours(deadline.getHours() + 2);
    const now = new Date();
    if (now > deadline) return 'closed';
    return 'open';
  };

  if (loading) return <div className="min-h-screen bg-slate-950 text-white flex justify-center p-10">Memuat data ronda...</div>;
  if (!user) return null;

  return (
    <Layout warga={user} onLogout={handleLogout}>
      <div className="space-y-6 pb-10">
        
        {/* ═══ HEADER ═══ */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center shadow-lg">
          <div>
            <h1 className="text-lg font-bold text-white mb-0.5">Jadwal Ronda</h1>
            <p className="text-[11px] text-slate-400">RT 38 Puri Kencana Wagir</p>
          </div>
          <button 
            onClick={() => setShowLeaderboard(true)}
            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition"
          >
            🏆 Peringkat
          </button>
        </div>

        {/* ═══ BAGIAN 1: ABSENSI SAYA (PALING ATAS) ═══ */}
        <div>
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            📸 Tugas Ronda Saya
          </h2>
          
          {jadwalSaya.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-xs text-slate-400">Anda tidak memiliki jadwal ronda di periode ini.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jadwalSaya.map((item) => {
                const statusWaktu = cekStatusWaktu(item.jadwal.tanggal, item.jadwal.periode?.jam_selesai);
                
                return (
                  <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    {/* Garis status di pinggir kiri */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      item.status_hadir === 'hadir' ? 'bg-emerald-500' : 
                      item.status_hadir === 'pending' ? 'bg-amber-500' : 
                      item.status_hadir === 'tidak_hadir' ? 'bg-rose-500' : 'bg-indigo-500'
                    }`}></div>

                    <div className="flex-1 pl-2">
                      <div className="font-bold text-white text-sm">{formatTanggal(item.jadwal.tanggal)}</div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                        🕒 {item.jadwal.periode?.jam_mulai?.substring(0,5)} - {item.jadwal.periode?.jam_selesai?.substring(0,5)} WIB
                      </div>
                      
                      {/* Tampilkan Foto jika ada */}
                      {item.foto_bukti && (
                        <div className="mt-3 flex items-center gap-2">
                          <img src={item.foto_bukti} alt="Bukti" className="w-12 h-12 rounded-lg object-cover border border-slate-700" />
                          <div>
                            <div className={`text-[10px] font-bold ${
                              item.status_hadir === 'hadir' ? 'text-emerald-400' : 
                              item.status_hadir === 'pending' ? 'text-amber-400' : 'text-rose-400'
                            }`}>
                              {item.status_hadir === 'hadir' ? '✅ Terverifikasi' : item.status_hadir === 'pending' ? '⏳ Menunggu Cek' : '❌ Alpa'}
                            </div>
                            <div className="text-[9px] text-slate-500">Bukti terkirim</div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="w-full sm:w-auto mt-2 sm:mt-0">
                      {!item.foto_bukti ? (
                        statusWaktu === 'open' ? (
                          <>
                            <input type="file" accept="image/*" capture="environment" id={`up-${item.jadwal_id}`} className="hidden" onChange={(e) => handleUploadBukti(e, item.jadwal_id)} />
                            <label htmlFor={`up-${item.jadwal_id}`} className={`w-full sm:w-auto flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-2.5 rounded-xl text-xs cursor-pointer transition shadow-lg ${uploadingId === item.jadwal_id ? 'opacity-50' : ''}`}>
                              {uploadingId === item.jadwal_id ? 'Upload...' : '📸 Absen'}
                            </label>
                          </>
                        ) : (
                          <div className="w-full sm:w-auto text-center bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold px-4 py-2.5 rounded-xl text-xs">
                            Waktu Habis
                          </div>
                        )
                      ) : (
                         <div className="w-full sm:w-auto text-center text-slate-500 text-[10px] font-semibold px-4">
                           Selesai
                         </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ═══ BAGIAN 2: JADWAL LENGKAP (LIST VIEW) ═══ */}
        <div className="pt-2">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            📅 Jadwal Ronda RT (Terdekat)
          </h2>
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            {jadwalFull.slice(0, 15).map((j, idx) => {
              const myPetugasData = jadwalSaya.find(ms => ms.jadwal_id === j.id);
              const isMySchedule = !!myPetugasData;
              
              return (
                <div key={j.id} className={`p-4 border-b border-slate-800/50 last:border-0 flex flex-col gap-2 ${isMySchedule ? 'bg-indigo-900/10' : ''}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-200 text-sm">{formatTanggal(j.tanggal)}</span>
                    {isMySchedule && <span className="text-[9px] bg-indigo-500 text-white px-2 py-0.5 rounded shadow-sm">Anda Bertugas</span>}
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {j.petugas.map((p, pIdx) => (
                      <span key={pIdx} className={`px-2 py-1.5 rounded-lg text-[10px] border flex items-center gap-1 ${
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
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ═══ POP-UP MODAL LEADERBOARD ═══ */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowLeaderboard(false)}>
          <div 
            className="bg-slate-900 border-t sm:border border-slate-700 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">🏆 Papan Kehadiran</h3>
              <button onClick={() => setShowLeaderboard(false)} className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full">✕</button>
            </div>
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {leaderboard.length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-6">Belum ada data kehadiran.</div>
              ) : (
                leaderboard.slice(0, 10).map((lb, index) => (
                  <div key={lb.id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      index === 0 ? 'bg-amber-400 text-amber-900 shadow-[0_0_10px_rgba(251,191,36,0.3)]' : 
                      index === 1 ? 'bg-slate-300 text-slate-800' : 
                      index === 2 ? 'bg-amber-700 text-white' : 
                      'bg-slate-800 text-slate-400'
                    }`}>{index + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate">{lb.nama}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{lb.no_rumah}</div>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-400 shrink-0">{lb.total_hadir} x</div>
                  </div>
                ))
              )}
            </div>
            <p className="text-center text-[9px] text-slate-500 mt-4">Berdasarkan verifikasi Sekretaris RT.</p>
          </div>
        </div>
      )}
    </Layout>
  );
}

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
  
  const [showRekap, setShowRekap] = useState(false);
  const [catatanMap, setCatatanMap] = useState({});

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
      // 1. Cek Penghuni (Bisa jadi kosong)
      const { data: penghuniData } = await supabase
        .from('penghuni').select('id').eq('warga_id', wargaId).eq('is_aktif', true);
      const penghuniIds = (penghuniData || []).map(p => p.id);

      // 2. Ambil Jadwal MILIK SAYA (Jika punya)
      if (penghuniIds.length > 0) {
        const { data: myJadwal } = await supabase
          .from('petugas_ronda')
          .select('id, jadwal_id, status_hadir, foto_bukti, catatan, jadwal:jadwal_id!inner(tanggal, status, periode:periode_id!inner(jam_mulai, jam_selesai, status))')
          .in('penghuni_id', penghuniIds)
          .eq('jadwal.status', 'aktif')
          .eq('jadwal.periode.status', 'published')
          .order('jadwal(tanggal)', { ascending: true });
        setJadwalSaya(myJadwal || []);
      } else {
        setJadwalSaya([]);
      }

      // 3. Ambil Jadwal FULL RT (Selalu dijalankan, tidak peduli punya jadwal atau tidak)
      const { data: fullJadwal } = await supabase
        .from('jadwal_ronda')
        .select(`
          id, tanggal, status, 
          periode:periode_id!inner(jam_mulai, jam_selesai, status),
          petugas:petugas_ronda( status_hadir, penghuni:penghuni_id(nama_lengkap, warga:warga_id(no_rumah)) )
        `)
        .eq('status', 'aktif')
        .eq('periode.status', 'published')
        .order('tanggal', { ascending: true });
      setJadwalFull(fullJadwal || []);

      // 4. Ambil Leaderboard
      const { data: allPetugas } = await supabase
        .from('petugas_ronda')
        .select('penghuni_id, jadwal:jadwal_id!inner(periode:periode_id!inner(status)), penghuni:penghuni_id(nama_lengkap, warga:warga_id(no_rumah))')
        .eq('status_hadir', 'hadir')
        .eq('jadwal.periode.status', 'published');

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
      const catatanTeks = catatanMap[jadwalId] || null;
      const { error } = await supabase.from('petugas_ronda').update({ status_hadir: 'pending', foto_bukti: publicUrl, waktu_absen: new Date().toISOString(), catatan: catatanTeks }).eq('jadwal_id', jadwalId); 
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
    const now = new Date();
    const deadline = new Date(`${tanggalJadwal}T${jamSelesai}`);
    const jam = parseInt(jamSelesai.split(':')[0]);
    if (jam < 12) deadline.setDate(deadline.getDate() + 1); 
    deadline.setHours(deadline.getHours() + 2);
    const startDate = new Date(tanggalJadwal);
    startDate.setDate(startDate.getDate() - 1);
    startDate.setHours(12, 0, 0, 0); 

    if (now > deadline) return 'closed';
    if (now < startDate) return 'wait';
    return 'open'; 
  };

  if (loading) return <div className="min-h-screen bg-slate-950 text-white flex justify-center p-10">Memuat data ronda...</div>;
  if (!user) return null;

  return (
    <Layout warga={user} onLogout={handleLogout}>
      <div className="space-y-6 pb-10">
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center shadow-lg">
          <div>
            <h1 className="text-lg font-bold text-white mb-0.5">Jadwal Ronda</h1>
            <p className="text-[11px] text-slate-400">RT 38 Puri Kencana Wagir</p>
          </div>
          <button onClick={() => setShowRekap(true)} className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition">📊 Rekap Kehadiran</button>
        </div>

        {/* BAGIAN 1: ABSENSI SAYA */}
        <div>
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">📸 Tugas Ronda Saya</h2>
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
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${item.status_hadir === 'hadir' ? 'bg-emerald-500' : item.status_hadir === 'pending' ? 'bg-amber-500' : item.status_hadir === 'tidak_hadir' ? 'bg-rose-500' : 'bg-indigo-500'}`}></div>
                    <div className="flex-1 pl-2">
                      <div className="font-bold text-white text-sm">{formatTanggal(item.jadwal.tanggal)}</div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">🕒 {item.jadwal.periode?.jam_mulai?.substring(0,5)} - {item.jadwal.periode?.jam_selesai?.substring(0,5)} WIB</div>
                      <div className="text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1.5 rounded-md mt-2 inline-block">💡 Absen cukup di salah satu HP warga, foto bersama.</div>
                      {item.foto_bukti && (
                        <div className="mt-3 flex items-center gap-2 bg-slate-950/50 p-2 rounded-xl border border-slate-800">
                          <img src={item.foto_bukti} alt="Bukti" className="w-10 h-10 rounded-lg object-cover border border-slate-700" />
                          <div>
                            <div className={`text-[10px] font-bold ${item.status_hadir === 'hadir' ? 'text-emerald-400' : item.status_hadir === 'pending' ? 'text-amber-400' : 'text-rose-400'}`}>{item.status_hadir === 'hadir' ? '✅ Terverifikasi' : item.status_hadir === 'pending' ? '⏳ Menunggu Cek' : '❌ Alpa'}</div>
                            {item.catatan && <div className="text-[9px] text-slate-400 italic mt-0.5">" {item.catatan} "</div>}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="w-full sm:w-auto mt-2 sm:mt-0 flex flex-col gap-2">
                      {!item.foto_bukti ? (
                        statusWaktu === 'open' ? (
                          <>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] text-slate-400">Ada tukar jadwal? Tulis di sini:</label>
                              <input type="text" placeholder="Cth: Pak Hezki tukar dengan Pak Untung" className="w-full sm:w-64 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-indigo-500" value={catatanMap[item.jadwal_id] || ''} onChange={(e) => setCatatanMap({ ...catatanMap, [item.jadwal_id]: e.target.value })} />
                            </div>
                            <input type="file" accept="image/*" capture="environment" id={`up-${item.jadwal_id}`} className="hidden" onChange={(e) => handleUploadBukti(e, item.jadwal_id)} />
                            <label htmlFor={`up-${item.jadwal_id}`} className={`w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-2.5 rounded-xl text-xs cursor-pointer transition shadow-lg ${uploadingId === item.jadwal_id ? 'opacity-50' : ''}`}>{uploadingId === item.jadwal_id ? 'Mengupload...' : '📸 Upload Bukti'}</label>
                          </>
                        ) : (
                          <div className={`w-full sm:w-auto text-center font-semibold px-4 py-2.5 rounded-xl text-xs border ${statusWaktu === 'wait' ? 'bg-slate-800/50 border-slate-700 text-slate-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>{statusWaktu === 'wait' ? 'Belum Waktunya Absen' : 'Waktu Absen Habis'}</div>
                        )
                      ) : (
                         <div className="w-full sm:w-auto text-center text-slate-500 text-[10px] font-semibold px-4 py-2 border border-slate-800 rounded-lg">Absensi Selesai</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* BAGIAN 2: JADWAL LENGKAP (LIST VIEW) */}
        <div className="pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">📅 Jadwal Ronda RT</h2>
            <div className="flex flex-wrap gap-2 text-[9px] font-semibold">
              <span className="flex items-center gap-1 text-slate-400"><span className="w-2 h-2 rounded-full bg-slate-700"></span> Belum</span>
              <span className="flex items-center gap-1 text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Pending</span>
              <span className="flex items-center gap-1 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Hadir</span>
              <span className="flex items-center gap-1 text-rose-400"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Alpa</span>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg max-h-[450px] overflow-y-auto custom-scrollbar">
            {jadwalFull.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">Belum ada jadwal yang di-publish.</div>
            ) : (
              jadwalFull.map((j) => {
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
                        <span key={pIdx} className={`px-2 py-1.5 rounded-lg text-[10px] border flex items-center gap-1 ${p.status_hadir === 'hadir' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : p.status_hadir === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : p.status_hadir === 'tidak_hadir' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                          {p.status_hadir === 'hadir' ? '✅' : p.status_hadir === 'pending' ? '⏳' : p.status_hadir === 'tidak_hadir' ? '❌' : '⚪'}
                          {p.penghuni?.nama_lengkap.split(' ')[0]} <span className="opacity-50">({p.penghuni?.warga?.no_rumah})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* POP-UP MODAL REKAP KEHADIRAN */}
      {showRekap && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowRekap(false)}>
          <div className="bg-slate-900 border-t sm:border border-slate-700 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">📊 Rekap Kehadiran Warga</h3>
              <button onClick={() => setShowRekap(false)} className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full">✕</button>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              {leaderboard.length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-6">Belum ada data kehadiran yang diverifikasi.</div>
              ) : (
                leaderboard.map((lb, index) => (
                  <div key={lb.id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${index === 0 ? 'bg-amber-400 text-amber-900 shadow-[0_0_10px_rgba(251,191,36,0.3)]' : index === 1 ? 'bg-slate-300 text-slate-800' : index === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'}`}>{index + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate">{lb.nama}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{lb.no_rumah}</div>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-400 shrink-0">{lb.total_hadir} x</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

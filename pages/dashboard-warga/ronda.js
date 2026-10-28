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
  const [alpaList, setAlpaList] = useState([]); // Ganti nama state jadi alpaList
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
      const { data: penghuniData } = await supabase
        .from('penghuni').select('id').eq('warga_id', wargaId).eq('is_aktif', true);
      
      const penghuniIds = (penghuniData || []).map(p => p.id);

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

      const { data: fullJadwal } = await supabase
        .from('jadwal_ronda')
        .select(`
          id, tanggal, status, 
          periode:periode_id!inner(jam_mulai, jam_selesai, status),
          petugas:petugas_ronda( status_hadir, foto_bukti, penghuni:penghuni_id(nama_lengkap, warga:warga_id(no_rumah)) )
        `)
        .eq('status', 'aktif')
        .eq('periode.status', 'published')
        .order('tanggal', { ascending: true });
      setJadwalFull(fullJadwal || []);

      // ═══ LOGIKA BARU: HITUNG TOTAL ALPA ═══
      const { data: allAlpa } = await supabase
        .from('petugas_ronda')
        .select('penghuni_id, jadwal:jadwal_id!inner(periode:periode_id!inner(status)), penghuni:penghuni_id(nama_lengkap, warga:warga_id(no_rumah))')
        .eq('status_hadir', 'tidak_hadir') // HANYA AMBIL YANG ALPA
        .eq('jadwal.periode.status', 'published');

      const tally = {};
      (allAlpa || []).forEach(p => {
        const pid = p.penghuni_id;
        if (!tally[pid]) {
          tally[pid] = { id: pid, nama: p.penghuni?.nama_lengkap, no_rumah: p.penghuni?.warga?.no_rumah, total_alpa: 0 };
        }
        tally[pid].total_alpa += 1;
      });
      
      // Urutkan dari yang paling sering alpa
      const sortedAlpa = Object.values(tally).sort((a, b) => b.total_alpa - a.total_alpa);
      setAlpaList(sortedAlpa);

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
      alert('✅ Absen berhasil dikirim!');
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

  const formatTanggal = (dateStr) => dateStr ? new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(dateStr)) : '-';
  
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

  const getBadgeStatus = (p) => {
    if (p.status_hadir === 'hadir') return { icon: '✅', text: 'Hadir', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (p.status_hadir === 'tidak_hadir') return { icon: '❌', text: 'Alpa', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
    if (p.status_hadir === 'pending' && p.foto_bukti) return { icon: '⏳', text: 'Pending', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    return { icon: '⚪', text: 'Belum', color: 'text-slate-400 bg-slate-800 border-slate-700' };
  };

  const sortedJadwalSaya = [...jadwalSaya].sort((a, b) => {
    const getWeight = (item) => {
      if (item.status_hadir === 'hadir' || item.status_hadir === 'tidak_hadir') return 2;
      if (item.foto_bukti) return 1;
      return 0;
    };
    const weightA = getWeight(a);
    const weightB = getWeight(b);
    if (weightA !== weightB) return weightA - weightB;
    return new Date(a.jadwal.tanggal) - new Date(b.jadwal.tanggal);
  });

  if (!user && !loading) return null;

  return (
    <Layout warga={user} onLogout={handleLogout}>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-slate-400 text-xs animate-pulse">Memuat data ronda...</div>
        </div>
      ) : (
        <div className="flex flex-col h-[calc(100dvh-140px)] gap-2 pb-2 animate-in fade-in">
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex justify-between items-center shadow-sm shrink-0">
            <div>
              <h1 className="text-sm font-bold text-white">Ronda RT 38</h1>
            </div>
            <button onClick={() => setShowRekap(true)} className="bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold px-2.5 py-1.5 rounded-lg text-[10px] flex items-center gap-1 transition">⚠️ Daftar Alpa</button>
          </div>

          <div className="flex-1 flex flex-col min-h-0 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="p-2 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center shrink-0">
              <h2 className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">📅 Jadwal Ronda RT</h2>
              <div className="flex gap-1.5 text-[8px] font-semibold">
                <span className="text-amber-400">⏳ Pending</span>
                <span className="text-emerald-400">✅ Hadir</span>
                <span className="text-rose-400">❌ Alpa</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {jadwalFull.length === 0 ? (
                <div className="p-4 text-center text-[10px] text-slate-500">Belum ada jadwal.</div>
              ) : (
                jadwalFull.map((j) => {
                  const myPetugasData = jadwalSaya.find(ms => ms.jadwal_id === j.id);
                  const isMySchedule = !!myPetugasData;
                  
                  return (
                    <div key={j.id} className={`p-2 border-b border-slate-800/50 last:border-0 flex flex-col gap-1 ${isMySchedule ? 'bg-indigo-900/10' : ''}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-200 text-[11px]">{formatTanggal(j.tanggal)}</span>
                        {isMySchedule && <span className="text-[8px] bg-indigo-500 text-white px-1.5 py-0.5 rounded">Anda</span>}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {j.petugas.map((p, pIdx) => {
                          const badge = getBadgeStatus(p);
                          return (
                            <span key={pIdx} className={`px-1.5 py-0.5 rounded text-[9px] border flex items-center gap-1 ${badge.color}`}>
                              {badge.icon} {p.penghuni?.nama_lengkap.split(' ')[0]} <span className="opacity-50">({p.penghuni?.warga?.no_rumah})</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="shrink-0 bg-slate-900 border border-indigo-500/30 rounded-xl overflow-hidden shadow-lg flex">
            {jadwalSaya.length === 0 ? (
               <div className="w-full p-3 text-center text-[10px] text-slate-400">Tidak ada tugas ronda untuk Anda.</div>
            ) : (
              <div className="flex overflow-x-auto w-full snap-x snap-mandatory custom-scrollbar">
                {sortedJadwalSaya.map((item) => {
                  const statusWaktu = cekStatusWaktu(item.jadwal.tanggal, item.jadwal.periode?.jam_selesai);
                  const isDone = !!item.foto_bukti;
                  
                  return (
                    <div key={item.id} className="min-w-full snap-center p-3 flex flex-col gap-2 relative">
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="font-bold text-white text-xs">Tugas: {formatTanggal(item.jadwal.tanggal)}</span>
                          <span className="text-[9px] text-slate-400">🕒 {item.jadwal.periode?.jam_mulai?.substring(0,5)} - {item.jadwal.periode?.jam_selesai?.substring(0,5)} WIB</span>
                        </div>
                        {isDone && (
                           <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${item.status_hadir === 'hadir' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : item.status_hadir === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                             {item.status_hadir === 'hadir' ? '✅ Selesai' : item.status_hadir === 'pending' ? '⏳ Dicek' : '❌ Alpa'}
                           </span>
                        )}
                      </div>

                      {!isDone ? (
                        statusWaktu === 'open' ? (
                          <div className="flex gap-2 items-center mt-1">
                            <input 
                              type="text" 
                              placeholder="Tukar jadwal? (Cth: A ganti B)" 
                              className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-[10px] text-white placeholder:text-slate-600 focus:border-indigo-500"
                              value={catatanMap[item.jadwal_id] || ''}
                              onChange={(e) => setCatatanMap({ ...catatanMap, [item.jadwal_id]: e.target.value })}
                            />
                            <input type="file" accept="image/*" capture="environment" id={`up-${item.jadwal_id}`} className="hidden" onChange={(e) => handleUploadBukti(e, item.jadwal_id)} />
                            <label htmlFor={`up-${item.jadwal_id}`} className={`bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] whitespace-nowrap cursor-pointer transition shadow ${uploadingId === item.jadwal_id ? 'opacity-50' : ''}`}>
                              {uploadingId === item.jadwal_id ? '...' : '📸 Absen'}
                            </label>
                          </div>
                        ) : (
                          <div className={`mt-1 text-center font-semibold px-2 py-1.5 rounded-lg text-[10px] border ${statusWaktu === 'wait' ? 'bg-slate-800/50 border-slate-700 text-slate-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                            {statusWaktu === 'wait' ? 'Belum Waktunya Absen' : 'Waktu Absen Habis'}
                          </div>
                        )
                      ) : (
                        <div className="flex items-center gap-2 mt-1">
                          {item.foto_bukti === 'DIHAPUS' ? (
                             <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-xs">📄</div>
                          ) : (
                             <img src={item.foto_bukti} alt="Bukti" className="w-8 h-8 rounded object-cover border border-slate-700" />
                          )}
                          <div className="text-[9px] text-slate-400 italic truncate">"{item.catatan || 'Tanpa catatan'}"</div>
                        </div>
                      )}
                      
                      {jadwalSaya.length > 1 && (
                        <div className="flex justify-center gap-1 mt-1">
                          {sortedJadwalSaya.map((_, idx) => (
                            <div key={idx} className={`w-1.5 h-1.5 rounded-full ${item.id === sortedJadwalSaya[idx].id ? 'bg-indigo-500' : 'bg-slate-700'}`} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ POP-UP MODAL DAFTAR ALPA (DIPERBARUI) ═══ */}
      {showRekap && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowRekap(false)}>
          <div className="bg-slate-900 border-t sm:border border-rose-500/30 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">⚠️ Daftar Warga Alpa</h3>
              <button onClick={() => setShowRekap(false)} className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full">✕</button>
            </div>
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              {alpaList.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🎉</div>
                  <div className="text-sm font-bold text-emerald-400">Luar Biasa!</div>
                  <div className="text-xs text-slate-400 mt-1">Tidak ada warga yang alpa. Semua disiplin!</div>
                </div>
              ) : (
                alpaList.map((lb, index) => (
                  <div key={lb.id} className="flex items-center gap-3 bg-slate-950/50 p-2 rounded-xl border border-slate-800">
                    <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">{lb.nama}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{lb.no_rumah}</div>
                    </div>
                    <div className="bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold text-rose-400 shrink-0">
                      {lb.total_alpa} x Alpa
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {alpaList.length > 0 && (
              <p className="text-center text-[9px] text-slate-500 mt-4">Mohon tingkatkan kedisiplinan ronda. Terima kasih.</p>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}

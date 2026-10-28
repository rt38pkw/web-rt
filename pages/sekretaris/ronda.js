// pages/sekretaris/ronda.js
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/sekretaris/Layout';
import { generateJadwalRonda } from '../../lib/ronda/generator';
import { simpanJadwalRonda } from '../../lib/ronda/rpc';
import { hapusBuktiRonda } from '../../lib/ronda/storage'; 
import ModalBuatPeriode from '../../components/ronda/ModalBuatPeriode';
import ModalSetupOtomatis from '../../components/ronda/ModalSetupOtomatis';
import ModalImportExcel from '../../components/ronda/ModalImportExcel';
import TabelJadwal from '../../components/ronda/TabelJadwal';

export default function SekretarisRonda() {
  const [activeTab, setActiveTab] = useState('jadwal'); 
  const [periodeList, setPeriodeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [viewMode, setViewMode] = useState('list'); 
  const [selectedPeriode, setSelectedPeriode] = useState(null);

  const [showModalPeriode, setShowModalPeriode] = useState(false);
  const [showSetupOtomatis, setShowSetupOtomatis] = useState(false);
  const [showImportExcel, setShowImportExcel] = useState(false);

  const [draftData, setDraftData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [hasConflict, setHasConflict] = useState(false);

  const [wargaList, setWargaList] = useState([]);
  const [loadingWarga, setLoadingWarga] = useState(false);

  const [verifikasiData, setVerifikasiData] = useState([]);
  const [loadingVerifikasi, setLoadingVerifikasi] = useState(false);
  const [verifikasiEdits, setVerifikasiEdits] = useState({}); 
  const [zoomImage, setZoomImage] = useState(null);

  useEffect(() => {
    fetchPeriode();
    fetchWargaRonda(); 
  }, []);

  useEffect(() => {
    if (activeTab === 'verifikasi') {
      fetchVerifikasiRonda();
      
      const channel = supabase
        .channel('realtime-ronda-sekretaris')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'petugas_ronda' }, (payload) => {
          fetchVerifikasiRonda(true);
        })
        .subscribe();

      return () => supabase.removeChannel(channel);
    }
  }, [activeTab]);

  async function fetchPeriode() {
    setLoading(true);
    const { data, error } = await supabase.from('periode_ronda').select('*').order('created_at', { ascending: false });
    if (!error && data) setPeriodeList(data);
    setLoading(false);
  }

  // ═══ PERBAIKAN: CEK JAM SELESAI ═══
  const isTimePassed = (tanggal, jamSelesai) => {
    if (!tanggal || !jamSelesai) return false;
    
    // Ambil YYYY-MM-DD dan pisahkan jam
    const dateStr = tanggal.split('T')[0];
    const [selesaiH, selesaiM] = jamSelesai.split(':');

    let endDateTime = new Date(`${dateStr}T${selesaiH}:${selesaiM}:00`);
    const startDateTime = new Date(`${dateStr}T00:00:00`);
    
    // Jika jam selesai dini hari (misal 02:00), berarti besok harinya
    if (endDateTime < startDateTime || parseInt(selesaiH) < 12) {
       endDateTime.setDate(endDateTime.getDate() + 1);
    }

    const now = new Date();
    return now > endDateTime; // True jika waktu sudah habis
  };

  async function fetchVerifikasiRonda(isSilent = false) {
    if (!isSilent) setLoadingVerifikasi(true);
    try {
      const { data, error } = await supabase
        .from('petugas_ronda')
        .select(`
          id, jadwal_id, status_hadir, foto_bukti, catatan,
          jadwal:jadwal_id!inner ( tanggal, periode:periode_id!inner(nama_periode, jam_selesai, status) ),
          penghuni:penghuni_id ( nama_lengkap, warga:warga_id(no_rumah) )
        `)
        .eq('status_hadir', 'pending')
        .eq('jadwal.periode.status', 'published')
        .order('jadwal(tanggal)', { ascending: true });

      if (error) throw error;

      const grouped = (data || []).reduce((acc, curr) => {
        if (!acc[curr.jadwal_id]) {
          acc[curr.jadwal_id] = {
            jadwal_id: curr.jadwal_id,
            tanggal: curr.jadwal.tanggal,
            periode: curr.jadwal.periode.nama_periode,
            jam_selesai: curr.jadwal.periode.jam_selesai,
            foto_bukti: curr.foto_bukti, 
            catatan: curr.catatan,
            petugas: []
          };
        }
        acc[curr.jadwal_id].petugas.push(curr);
        return acc;
      }, {});

      // Filter: Tampilkan jika (Ada Foto) ATAU (Waktu sudah lewat dan tidak ada foto)
      const filteredGroups = Object.values(grouped).filter(group => {
        // 1. Jika sudah ada foto, PASTI tampilkan (untuk diverifikasi)
        if (group.foto_bukti) return true;
        
        // 2. Jika tidak ada foto, cek apakah waktu ronda sudah lewat?
        return isTimePassed(group.tanggal, group.jam_selesai);
      });

      setVerifikasiData(filteredGroups);

      const initialEdits = {};
      (data || []).forEach(p => { initialEdits[p.id] = 'hadir'; });
      setVerifikasiEdits(initialEdits);

    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setLoadingVerifikasi(false);
    }
  }

  const handleSimpanVerifikasi = async (jadwalId, petugasList, fotoUrl) => {
    if (!confirm('Simpan hasil verifikasi? Foto bukti akan dihapus otomatis untuk menghemat kuota.')) return;
    setProcessing(true);
    try {
      const savedUser = JSON.parse(localStorage.getItem('pengurusSession'));
      const verifierId = savedUser?.id || null;

      for (const p of petugasList) {
        const newStatus = verifikasiEdits[p.id];
        const { error } = await supabase
          .from('petugas_ronda')
          .update({ 
            status_hadir: newStatus, 
            verified_by: verifierId,
            foto_bukti: fotoUrl ? 'DIHAPUS' : null 
          })
          .eq('id', p.id);
        if (error) throw error;
      }

      if (fotoUrl && fotoUrl !== 'DIHAPUS') {
        await hapusBuktiRonda(fotoUrl);
      }

      alert('✅ Verifikasi berhasil!');
      fetchVerifikasiRonda(true); 
    } catch (err) {
      alert('Gagal memverifikasi: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleBuatPeriode = async (formData) => {
    setProcessing(true);
    try {
      await supabase.from('periode_ronda').insert([formData]);
      setShowModalPeriode(false); fetchPeriode();
    } catch (err) { alert('Gagal: ' + err.message); } finally { setProcessing(false); }
  };

  const handleHapusPeriode = async (id, nama, status) => {
    if (status === 'published') return alert('❌ Gagal: Batalkan Publish terlebih dahulu.');
    if (!confirm(`Hapus periode "${nama}"?`)) return;
    setProcessing(true);
    try { await supabase.from('periode_ronda').delete().eq('id', id); fetchPeriode(); } catch (err) { alert('Gagal: ' + err.message); } finally { setProcessing(false); }
  };

  const handleLihatDetail = async (periode) => {
    setSelectedPeriode(periode); setViewMode('detail'); setIsPublished(periode.status === 'published'); setHasConflict(false); setLoading(true);
    try {
      const { data } = await supabase.from('jadwal_ronda').select('*, petugas:petugas_ronda(*, penghuni:penghuni_id(*, warga:warga_id(no_rumah)))').eq('periode_id', periode.id).order('tanggal');
      if (data && data.length > 0) {
        setDraftData(data.map(j => ({
          id: j.id, tanggal: j.tanggal, hari: new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(new Date(j.tanggal)),
          grup_id: j.grup_id, is_libur: j.status === 'libur', has_conflict: false, catatan: j.catatan_sistem || '',
          petugas: j.petugas.map(p => p.penghuni)
        })));
      } else { setDraftData([]); }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleGenerateDraft = async (setupData) => {
    setIsGenerating(true);
    try {
      const { data: penghuni } = await supabase.from('penghuni').select('*, warga:warga_id(no_rumah)').eq('is_aktif', true).eq('status_verifikasi', 'approved').eq('ikut_ronda', true);
      const { data: historyData } = await supabase.from('jadwal_ronda').select('tanggal, petugas:petugas_ronda(penghuni_id), periode:periode_id(status)').lt('tanggal', setupData.tanggal_mulai).order('tanggal', { ascending: false });
      let historyMap = {};
      if (historyData) {
        historyData.forEach(j => { if (j.periode?.status === 'published' && j.petugas) j.petugas.forEach(p => { if (!historyMap[p.penghuni_id]) historyMap[p.penghuni_id] = j.tanggal; }); });
      }
      const mergedPeriode = { ...selectedPeriode, ...setupData };
      const { draft, hasConflict } = generateJadwalRonda(penghuni, mergedPeriode, historyMap);
      setDraftData(draft); setHasConflict(hasConflict); setShowSetupOtomatis(false);
    } catch (err) { alert('Gagal: ' + err.message); } finally { setIsGenerating(false); }
  };

  const handleSaveExcelToDraft = async (excelData) => {
    setIsSaving(true);
    try {
      await simpanJadwalRonda(selectedPeriode.id, 'draft', excelData);
      if (excelData.length > 0) {
        const dates = excelData.map(d => new Date(d.tanggal));
        const minDate = new Date(Math.min.apply(null, dates)).toISOString().split('T')[0];
        await supabase.from('periode_ronda').update({ tanggal_mulai: minDate, tipe_periode: 'custom_excel' }).eq('id', selectedPeriode.id);
      }
      setShowImportExcel(false); handleLihatDetail({ ...selectedPeriode, tanggal_mulai: excelData[0].tanggal }); fetchPeriode();
    } catch (err) { alert('Gagal: ' + err.message); } finally { setIsSaving(false); }
  };

  const handleToggleLibur = (index) => { if (isPublished) return; const newDraft = [...draftData]; newDraft[index].is_libur = !newDraft[index].is_libur; setDraftData(newDraft); };

  const handleSimpanJadwal = async (targetStatus) => {
    if (draftData.length === 0) return;
    if (targetStatus === 'published' && hasConflict) return alert('❌ Tidak bisa Publish!');
    if (!confirm(`Simpan sebagai ${targetStatus.toUpperCase()}?`)) return;
    setIsSaving(true);
    try {
      await simpanJadwalRonda(selectedPeriode.id, targetStatus, draftData);
      setIsPublished(targetStatus === 'published'); setSelectedPeriode({ ...selectedPeriode, status: targetStatus }); fetchPeriode();
    } catch (err) { alert('Gagal: ' + err.message); } finally { setIsSaving(false); }
  };

  const handleBatalPublish = async () => {
    if (!confirm('Batalkan publish?')) return;
    setIsSaving(true);
    try { await supabase.from('periode_ronda').update({ status: 'draft' }).eq('id', selectedPeriode.id); setIsPublished(false); setSelectedPeriode({ ...selectedPeriode, status: 'draft' }); fetchPeriode(); } catch (err) { alert('Gagal: ' + err.message); } finally { setIsSaving(false); }
  };

  const handleHapusDraft = async () => {
    if (!confirm('Hapus semua jadwal draft?')) return;
    setIsSaving(true);
    try {
      const { data: jadwalIds } = await supabase.from('jadwal_ronda').select('id').eq('periode_id', selectedPeriode.id);
      if (jadwalIds && jadwalIds.length > 0) {
        const ids = jadwalIds.map(j => j.id);
        await supabase.from('petugas_ronda').delete().in('jadwal_id', ids);
        await supabase.from('jadwal_ronda').delete().eq('periode_id', selectedPeriode.id);
      }
      setDraftData([]);
    } catch (err) { alert('Gagal: ' + err.message); } finally { setIsSaving(false); }
  };

  const fetchWargaRonda = async () => {
    setLoadingWarga(true);
    const { data } = await supabase.from('warga').select('*, penghuni:penghuni(*)').order('no_rumah');
    if (data) setWargaList(data.map(w => ({ ...w, kk_data: w.penghuni?.find(p => p.is_aktif && p.hubungan === 'Kepala Keluarga') })).filter(w => w.kk_data));
    setLoadingWarga(false);
  };

  const handleUpdateAturan = async (penghuniId, field, value) => {
    setProcessing(true);
    try { await supabase.from('penghuni').update({ [field]: value }).eq('id', penghuniId); fetchWargaRonda(); } catch (err) { alert('Gagal: ' + err.message); } finally { setProcessing(false); }
  };

  const formatTanggal = (dateStr) => dateStr ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr)) : '-';

  if (viewMode === 'detail' && selectedPeriode) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => { setViewMode('list'); fetchPeriode(); }} className="bg-slate-800 hover:bg-slate-700 text-white p-2.5 rounded-xl transition">← Kembali</button>
              <div>
                <h2 className="text-lg font-bold text-white">{selectedPeriode.nama_periode} {isPublished && <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded ml-2 uppercase">Published</span>}</h2>
                <p className="text-xs text-slate-400">{selectedPeriode.tanggal_mulai ? `Mulai ${formatTanggal(selectedPeriode.tanggal_mulai)}` : 'Belum ada tanggal'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!isPublished && draftData.length > 0 && (
                <>
                  <button onClick={() => handleSimpanJadwal('draft')} disabled={isSaving} className="bg-orange-600 hover:bg-orange-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs">💾 Simpan Draft</button>
                  <button onClick={() => handleSimpanJadwal('published')} disabled={isSaving || hasConflict} className={`font-semibold px-4 py-2.5 rounded-xl text-xs ${hasConflict ? 'bg-slate-700 text-slate-500' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>🚀 Publish</button>
                  <button onClick={handleHapusDraft} disabled={isSaving} className="bg-rose-600/20 text-rose-400 font-semibold px-4 py-2.5 rounded-xl text-xs">🗑️ Kosongkan</button>
                </>
              )}
              {isPublished && <button onClick={handleBatalPublish} disabled={isSaving} className="bg-rose-600/20 text-rose-400 font-semibold px-4 py-2.5 rounded-xl text-xs">🔓 Batalkan Publish</button>}
            </div>
          </div>

          {draftData.length === 0 && !isPublished ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
              <div className="text-5xl mb-4">📝</div>
              <h3 className="text-lg font-bold text-white mb-2">Meja Draft Kosong</h3>
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <button onClick={() => setShowSetupOtomatis(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl text-sm">⚡ Setup Otomatis</button>
                <button onClick={() => setShowImportExcel(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl text-sm">📥 Import Excel</button>
              </div>
            </div>
          ) : (
            <TabelJadwal draftData={draftData} selectedPeriode={selectedPeriode} isPublished={isPublished} onToggleLibur={handleToggleLibur} />
          )}
        </div>
        
        <ModalSetupOtomatis 
          isOpen={showSetupOtomatis} 
          onClose={() => setShowSetupOtomatis(false)} 
          onGenerate={handleGenerateDraft} 
          isGenerating={isGenerating} 
          wargaList={wargaList}
          loadingWarga={loadingWarga}
          onUpdateAturan={handleUpdateAturan}
        />
        <ModalImportExcel isOpen={showImportExcel} onClose={() => setShowImportExcel(false)} onSave={handleSaveExcelToDraft} wargaList={wargaList} isSaving={isSaving} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2 flex gap-2 overflow-x-auto">
          <button onClick={() => setActiveTab('jadwal')} className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl whitespace-nowrap ${activeTab === 'jadwal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>📅 Jadwal Ronda</button>
          <button onClick={() => setActiveTab('verifikasi')} className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl whitespace-nowrap ${activeTab === 'verifikasi' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>✅ Verifikasi & Alpa</button>
        </div>
        
        {activeTab === 'jadwal' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div><h2 className="text-lg font-bold text-white">Jadwal Ronda Warga</h2></div>
              <button onClick={() => setShowModalPeriode(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs">+ Buat Periode</button>
            </div>
            {loading ? <div className="text-center py-8 text-slate-500">Memuat...</div> : periodeList.length === 0 ? <div className="text-center py-8 text-slate-500">Belum ada periode.</div> : (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400"><tr><th className="p-4">Nama Periode</th><th className="p-4">Info</th><th className="p-4">Status</th><th className="p-4 text-right">Aksi</th></tr></thead>
                  <tbody className="divide-y divide-slate-800">
                    {periodeList.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40">
                        <td className="p-4 font-bold text-white">{p.nama_periode}</td>
                        <td className="p-4 text-slate-300">{p.tanggal_mulai ? formatTanggal(p.tanggal_mulai) : 'Belum diset'}</td>
                        <td className="p-4"><span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${p.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>{p.status}</span></td>
                        <td className="p-4 text-right flex justify-end gap-2">
                          <button onClick={() => handleLihatDetail(p)} className="bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-lg">👁️ Masuk</button>
                          {p.status !== 'published' ? <button onClick={() => handleHapusPeriode(p.id, p.nama_periode, p.status)} className="bg-rose-600/20 text-rose-400 px-3 py-1.5 rounded-lg">🗑️</button> : <button disabled className="bg-slate-800/50 text-slate-600 px-3 py-1.5 rounded-lg">🔒</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'verifikasi' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <h2 className="text-lg font-bold text-white">Verifikasi Kehadiran Ronda</h2>
              <p className="text-xs text-slate-400">Periksa foto grup. Jika tidak ada foto padahal waktu sudah lewat, Anda bisa memverifikasi manual (Hadir/Alpa) berdasarkan konfirmasi WA.</p>
            </div>

            {loadingVerifikasi ? (
              <div className="py-12 text-center text-slate-500 animate-pulse">Memuat data absensi...</div>
            ) : verifikasiData.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 text-center flex flex-col items-center">
                <div className="text-5xl mb-3">📭</div>
                <h3 className="text-base font-bold text-white mb-1">Tidak Ada Absensi Pending</h3>
                <p className="text-xs text-slate-400">Semua bukti ronda sudah diverifikasi.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {verifikasiData.map((group) => {
                  const hasPhoto = !!group.foto_bukti;
                  return (
                    <div key={group.jadwal_id} className={`border rounded-2xl overflow-hidden shadow-lg flex flex-col ${!hasPhoto ? 'bg-rose-950/20 border-rose-500/30' : 'bg-slate-900 border-slate-800'}`}>
                      
                      {hasPhoto ? (
                        <div className="h-48 bg-black relative cursor-zoom-in" onClick={() => setZoomImage(group.foto_bukti)}>
                          <img src={group.foto_bukti} alt="Bukti" className="w-full h-full object-cover opacity-80" />
                          <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-[10px] text-white border border-slate-700">🔍 Perbesar</div>
                          <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/90 p-3">
                            <div className="text-xs font-bold text-white">{formatTanggal(group.tanggal)}</div>
                            <div className="text-[10px] text-teal-400">{group.periode}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-32 bg-rose-950/40 flex flex-col items-center justify-center p-4 text-center border-b border-rose-500/20">
                          <div className="text-2xl mb-1">⚠️</div>
                          <div className="text-xs font-bold text-rose-400">Tidak Ada Bukti Foto!</div>
                          <div className="text-[10px] text-rose-300/70 mt-1">Waktu ronda sudah lewat. Silakan konfirmasi ke warga.</div>
                        </div>
                      )}

                      <div className="p-4 flex-1 flex flex-col gap-3">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                          <span className="text-xs text-slate-300">Petugas:</span>
                          <div className="text-right">
                            {!hasPhoto && <div className="text-[10px] text-rose-400 font-bold">{formatTanggal(group.tanggal)}</div>}
                            {group.catatan && <div className="text-[9px] text-amber-400 italic mt-1">Catatan: "{group.catatan}"</div>}
                          </div>
                        </div>
                        
                        <div className="space-y-2 flex-1">
                          {group.petugas.map(p => {
                            const statusSekarang = verifikasiEdits[p.id] || 'hadir';
                            return (
                              <div key={p.id} className="flex justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-800">
                                <div>
                                  <div className="text-xs font-semibold text-white">{p.penghuni?.nama_lengkap}</div>
                                  <div className="text-[10px] text-slate-500 font-mono">{p.penghuni?.warga?.no_rumah}</div>
                                </div>
                                <button
                                  onClick={() => setVerifikasiEdits({ ...verifikasiEdits, [p.id]: statusSekarang === 'hadir' ? 'tidak_hadir' : 'hadir' })}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition border ${statusSekarang === 'hadir' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}
                                >
                                  {statusSekarang === 'hadir' ? '✅ Hadir' : '❌ Alpa'}
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        <button 
                          onClick={() => handleSimpanVerifikasi(group.jadwal_id, group.petugas, group.foto_bukti)}
                          disabled={processing}
                          className={`w-full mt-2 text-white font-bold py-2.5 rounded-xl text-xs transition ${!hasPhoto ? 'bg-rose-600 hover:bg-rose-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                        >
                          {processing ? 'Menyimpan...' : !hasPhoto ? 'Simpan Verifikasi Manual' : 'Simpan & Hapus Foto'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <ModalBuatPeriode isOpen={showModalPeriode} onClose={() => setShowModalPeriode(false)} onSave={handleBuatPeriode} processing={processing} />
      
      {zoomImage && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setZoomImage(null)}>
          <button className="absolute top-4 right-4 text-white text-3xl font-bold" onClick={() => setZoomImage(null)}>✕</button>
          <div className="w-full h-full overflow-auto flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
             <img src={zoomImage} alt="Zoom" className="min-w-full min-h-full object-contain" />
          </div>
        </div>
      )}
    </Layout>
  );
}

// pages/sekretaris/ronda.js
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/sekretaris/Layout';
import { generateJadwalRonda } from '../../lib/ronda/generator';
import { simpanJadwalRonda } from '../../lib/ronda/rpc';
import ModalBuatPeriode from '../../components/ronda/ModalBuatPeriode';
import ModalSetupOtomatis from '../../components/ronda/ModalSetupOtomatis';
import ModalImportExcel from '../../components/ronda/ModalImportExcel';
import TabelJadwal from '../../components/ronda/TabelJadwal';
import TabelAturanKhusus from '../../components/ronda/TabelAturanKhusus';

export default function SekretarisRonda() {
  const [activeTab, setActiveTab] = useState('jadwal'); 
  const [periodeList, setPeriodeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [viewMode, setViewMode] = useState('list'); 
  const [selectedPeriode, setSelectedPeriode] = useState(null);

  // Modal States
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
  const [searchWarga, setSearchWarga] = useState('');

  // ═══ STATE UNTUK VERIFIKASI ═══
  const [verifikasiData, setVerifikasiData] = useState([]);
  const [loadingVerifikasi, setLoadingVerifikasi] = useState(false);
  const [verifikasiEdits, setVerifikasiEdits] = useState({}); // Menyimpan status sementara (hadir/alpa)
  const [zoomImage, setZoomImage] = useState(null);

  useEffect(() => {
    if (activeTab === 'jadwal') fetchPeriode();
    else if (activeTab === 'aturan') fetchWargaRonda();
    else if (activeTab === 'verifikasi') fetchVerifikasiRonda();
  }, [activeTab]);

  async function fetchPeriode() {
    setLoading(true);
    const { data, error } = await supabase.from('periode_ronda').select('*').order('created_at', { ascending: false });
    if (!error && data) setPeriodeList(data);
    setLoading(false);
  }

  // ═══ FUNGSI VERIFIKASI ═══
  async function fetchVerifikasiRonda() {
    setLoadingVerifikasi(true);
    try {
      const { data, error } = await supabase
        .from('petugas_ronda')
        .select(`
          id, jadwal_id, status_hadir, foto_bukti,
          jadwal:jadwal_id ( tanggal, periode:periode_id(nama_periode) ),
          penghuni:penghuni_id ( nama_lengkap, warga:warga_id(no_rumah) )
        `)
        .not('foto_bukti', 'is', null) // Hanya ambil yang ada fotonya
        .eq('status_hadir', 'pending'); // Hanya yang butuh verifikasi

      if (error) throw error;

      // Kelompokkan berdasarkan jadwal_id (karena 1 foto untuk 1 grup)
      const grouped = (data || []).reduce((acc, curr) => {
        if (!acc[curr.jadwal_id]) {
          acc[curr.jadwal_id] = {
            jadwal_id: curr.jadwal_id,
            tanggal: curr.jadwal.tanggal,
            periode: curr.jadwal.periode.nama_periode,
            foto_bukti: curr.foto_bukti,
            petugas: []
          };
        }
        acc[curr.jadwal_id].petugas.push(curr);
        return acc;
      }, {});

      setVerifikasiData(Object.values(grouped));

      // Inisialisasi edit: Semua dianggap "hadir" sampai Sekretaris mengubahnya
      const initialEdits = {};
      (data || []).forEach(p => { initialEdits[p.id] = 'hadir'; });
      setVerifikasiEdits(initialEdits);

    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVerifikasi(false);
    }
  }

  const handleSimpanVerifikasi = async (jadwalId, petugasList) => {
    if (!confirm('Simpan hasil verifikasi untuk grup ini?')) return;
    setProcessing(true);
    try {
      const savedUser = JSON.parse(localStorage.getItem('pengurusSession'));
      const verifierId = savedUser?.id || null;

      for (const p of petugasList) {
        const newStatus = verifikasiEdits[p.id];
        const { error } = await supabase
          .from('petugas_ronda')
          .update({ status_hadir: newStatus, verified_by: verifierId })
          .eq('id', p.id);
        if (error) throw error;
      }

      alert('✅ Verifikasi berhasil disimpan!');
      fetchVerifikasiRonda(); // Refresh list
    } catch (err) {
      alert('Gagal memverifikasi: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // ═══ FUNGSI PERIODE & DRAFT LAINNYA ═══
  const handleBuatPeriode = async (formData) => {
    setProcessing(true);
    try {
      const { error } = await supabase.from('periode_ronda').insert([formData]);
      if (error) throw error;
      alert('✅ Wadah Periode berhasil dibuat!');
      setShowModalPeriode(false);
      fetchPeriode();
    } catch (err) { alert('Gagal: ' + err.message); } finally { setProcessing(false); }
  };

  const handleHapusPeriode = async (id, nama, status) => {
    if (status === 'published') return alert('❌ Gagal: Batalkan Publish terlebih dahulu.');
    if (!confirm(`Hapus periode "${nama}"?`)) return;
    setProcessing(true);
    try {
      await supabase.from('periode_ronda').delete().eq('id', id);
      fetchPeriode();
    } catch (err) { alert('❌ Gagal: ' + err.message); } finally { setProcessing(false); }
  };

  const handleLihatDetail = async (periode) => {
    setSelectedPeriode(periode);
    setViewMode('detail');
    setIsPublished(periode.status === 'published');
    setHasConflict(false);
    setLoading(true);
    try {
      const { data, error } = await supabase.from('jadwal_ronda').select('*, petugas:petugas_ronda(*, penghuni:penghuni_id(*, warga:warga_id(no_rumah)))').eq('periode_id', periode.id).order('tanggal');
      if (error) throw error;
      
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
      const { data: penghuni, error } = await supabase.from('penghuni').select('*, warga:warga_id(no_rumah)').eq('is_aktif', true).eq('status_verifikasi', 'approved').eq('ikut_ronda', true);
      if (error) throw error;

      const { data: historyData } = await supabase.from('jadwal_ronda').select('tanggal, petugas:petugas_ronda(penghuni_id), periode:periode_id(status)').lt('tanggal', setupData.tanggal_mulai).order('tanggal', { ascending: false });
      let historyMap = {};
      if (historyData) {
        historyData.forEach(j => {
          if (j.periode?.status === 'published' && j.petugas) {
            j.petugas.forEach(p => { if (!historyMap[p.penghuni_id]) historyMap[p.penghuni_id] = j.tanggal; });
          }
        });
      }
      
      const mergedPeriode = { ...selectedPeriode, ...setupData };
      const { draft, hasConflict } = generateJadwalRonda(penghuni, mergedPeriode, historyMap);
      
      setDraftData(draft);
      setHasConflict(hasConflict);
      setShowSetupOtomatis(false);
    } catch (err) { alert('Gagal generate: ' + err.message); } finally { setIsGenerating(false); }
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
      alert('✅ Data Excel berhasil disimpan!');
      setShowImportExcel(false);
      handleLihatDetail({ ...selectedPeriode, tanggal_mulai: excelData[0].tanggal });
      fetchPeriode();
    } catch (err) { alert('Gagal simpan: ' + err.message); } finally { setIsSaving(false); }
  };

  const handleToggleLibur = (index) => {
    if (isPublished) return;
    const newDraft = [...draftData];
    newDraft[index].is_libur = !newDraft[index].is_libur;
    setDraftData(newDraft);
  };

  const handleSimpanJadwal = async (targetStatus) => {
    if (draftData.length === 0) return alert('Draft kosong!');
    if (targetStatus === 'published' && hasConflict) return alert('❌ Tidak bisa Publish! Masih ada jadwal yang bentrok.');
    if (!confirm(`Simpan jadwal sebagai ${targetStatus.toUpperCase()}?`)) return;

    setIsSaving(true);
    try {
      await simpanJadwalRonda(selectedPeriode.id, targetStatus, draftData);
      alert(`✅ Berhasil disimpan sebagai ${targetStatus.toUpperCase()}!`);
      setIsPublished(targetStatus === 'published');
      setSelectedPeriode({ ...selectedPeriode, status: targetStatus });
      fetchPeriode();
    } catch (err) { alert('Gagal menyimpan: ' + err.message); } finally { setIsSaving(false); }
  };

  const handleBatalPublish = async () => {
    if (!confirm('Batalkan publish?')) return;
    setIsSaving(true);
    try {
      await supabase.from('periode_ronda').update({ status: 'draft' }).eq('id', selectedPeriode.id);
      setIsPublished(false);
      setSelectedPeriode({ ...selectedPeriode, status: 'draft' });
      fetchPeriode();
    } catch (err) { alert('Gagal: ' + err.message); } finally { setIsSaving(false); }
  };

  const handleHapusDraft = async () => {
    if (!confirm('Hapus semua jadwal draft saat ini?')) return;
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
    if (data) {
      setWargaList(data.map(w => ({ ...w, kk_data: w.penghuni?.find(p => p.is_aktif && p.hubungan === 'Kepala Keluarga') })).filter(w => w.kk_data));
    }
    setLoadingWarga(false);
  };

  const handleUpdateAturan = async (penghuniId, field, value) => {
    setProcessing(true);
    try {
      await supabase.from('penghuni').update({ [field]: value }).eq('id', penghuniId);
      fetchWargaRonda(); 
    } catch (err) { alert('Gagal update: ' + err.message); } finally { setProcessing(false); }
  };

  const formatTanggal = (dateStr) => dateStr ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr)) : '-';
  const formatJam = (timeStr) => timeStr ? timeStr.substring(0, 5) : '-';

  // ═══ RENDER DETAIL JADWAL (MEJA DRAFT) ═══
  if (viewMode === 'detail' && selectedPeriode) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => { setViewMode('list'); fetchPeriode(); }} className="bg-slate-800 hover:bg-slate-700 text-white p-2.5 rounded-xl transition">← Kembali</button>
              <div>
                <h2 className="text-lg font-bold text-white">{selectedPeriode.nama_periode} {isPublished && <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded ml-2 uppercase">Published</span>}</h2>
                <p className="text-xs text-slate-400">{selectedPeriode.tanggal_mulai ? `Mulai ${formatTanggal(selectedPeriode.tanggal_mulai)}` : 'Belum ada tanggal'} • {formatJam(selectedPeriode.jam_mulai)} WIB</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!isPublished && draftData.length > 0 && (
                <>
                  <button onClick={() => handleSimpanJadwal('draft')} disabled={isSaving} className="bg-orange-600 hover:bg-orange-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition shadow-lg">💾 Simpan Draft</button>
                  <button onClick={() => handleSimpanJadwal('published')} disabled={isSaving || hasConflict} className={`font-semibold px-4 py-2.5 rounded-xl text-xs transition shadow-lg ${hasConflict ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>🚀 Publish</button>
                  <button onClick={handleHapusDraft} disabled={isSaving} className="bg-rose-600/20 border border-rose-500/30 hover:bg-rose-600 hover:text-white text-rose-400 font-semibold px-4 py-2.5 rounded-xl text-xs transition shadow-lg">🗑️ Kosongkan Draft</button>
                </>
              )}
              {isPublished && (
                <button onClick={handleBatalPublish} disabled={isSaving} className="bg-rose-600/20 border border-rose-500/30 hover:bg-rose-600 hover:text-white text-rose-400 font-semibold px-4 py-2.5 rounded-xl text-xs transition shadow-lg">🔓 Batalkan Publish</button>
              )}
            </div>
          </div>
          
          {hasConflict && <div className="bg-rose-950/40 border border-rose-500/50 rounded-xl p-3 text-xs text-rose-400 flex items-center gap-2"><span className="text-lg">⚠️</span> Terdapat jadwal yang bentrok.</div>}

          {draftData.length === 0 && !isPublished ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
              <div className="text-5xl mb-4">📝</div>
              <h3 className="text-lg font-bold text-white mb-2">Meja Draft Kosong</h3>
              <p className="text-xs text-slate-400 mb-6 max-w-md">Silakan pilih metode pengisian jadwal untuk periode ini.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => setShowSetupOtomatis(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2">⚡ Setup Otomatis</button>
                <button onClick={() => setShowImportExcel(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2">📥 Import Excel</button>
              </div>
            </div>
          ) : (
            <TabelJadwal draftData={draftData} selectedPeriode={selectedPeriode} isPublished={isPublished} onToggleLibur={handleToggleLibur} />
          )}
        </div>

        <ModalSetupOtomatis isOpen={showSetupOtomatis} onClose={() => setShowSetupOtomatis(false)} onGenerate={handleGenerateDraft} isGenerating={isGenerating} />
        <ModalImportExcel isOpen={showImportExcel} onClose={() => setShowImportExcel(false)} onSave={handleSaveExcelToDraft} wargaList={wargaList} isSaving={isSaving} />
      </Layout>
    );
  }

  // ═══ RENDER HALAMAN UTAMA ═══
  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* TAB NAVIGATION */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2 flex gap-2 overflow-x-auto">
          <button onClick={() => setActiveTab('jadwal')} className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl transition whitespace-nowrap ${activeTab === 'jadwal' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}>📅 Jadwal Ronda</button>
          <button onClick={() => setActiveTab('verifikasi')} className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl transition whitespace-nowrap ${activeTab === 'verifikasi' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}>✅ Verifikasi Absen</button>
          <button onClick={() => setActiveTab('aturan')} className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl transition whitespace-nowrap ${activeTab === 'aturan' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}>⚙️ Aturan Khusus</button>
        </div>
        
        {/* TAB 1: JADWAL */}
        {activeTab === 'jadwal' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div><h2 className="text-lg font-bold text-white">Jadwal Ronda Warga</h2><p className="text-xs text-slate-400">Buat wadah periode, lalu isi jadwalnya.</p></div>
              <button onClick={() => setShowModalPeriode(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition shadow-lg shrink-0">+ Buat Periode Baru</button>
            </div>
            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs animate-pulse">Memuat...</div>
            ) : periodeList.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 text-center flex flex-col items-center justify-center"><div className="text-5xl mb-3">🛡️</div><h3 className="text-base font-bold text-white mb-1">Belum Ada Periode</h3></div>
            ) : (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400"><tr><th className="p-4">Nama Periode</th><th className="p-4">Info</th><th className="p-4">Status</th><th className="p-4 text-right">Aksi</th></tr></thead>
                  <tbody className="divide-y divide-slate-800">
                    {periodeList.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40">
                        <td className="p-4"><div className="font-bold text-white text-sm">{p.nama_periode}</div></td>
                        <td className="p-4 text-slate-300">
                          {p.tanggal_mulai ? formatTanggal(p.tanggal_mulai) : 'Belum diset'}
                          <div className="text-[10px] text-indigo-400 mt-0.5">{formatJam(p.jam_mulai)} WIB</div>
                        </td>
                        <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${p.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>{p.status}</span></td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleLihatDetail(p)} className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-semibold transition">👁️ Masuk ke Draft</button>
                            {p.status !== 'published' ? (
                              <button onClick={() => handleHapusPeriode(p.id, p.nama_periode, p.status)} disabled={processing} className="bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-semibold transition">🗑️</button>
                            ) : (
                              <button disabled className="bg-slate-800/50 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-semibold cursor-not-allowed">🔒</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: VERIFIKASI ABSEN */}
        {activeTab === 'verifikasi' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <h2 className="text-lg font-bold text-white">Verifikasi Kehadiran Ronda</h2>
              <p className="text-xs text-slate-400">Periksa foto grup yang diunggah warga. Matikan tombol jika ada warga yang tidak hadir di foto.</p>
            </div>

            {loadingVerifikasi ? (
              <div className="py-12 text-center text-slate-500 text-xs animate-pulse">Memuat data absensi...</div>
            ) : verifikasiData.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 text-center flex flex-col items-center justify-center">
                <div className="text-5xl mb-3">📭</div>
                <h3 className="text-base font-bold text-white mb-1">Tidak Ada Absensi Pending</h3>
                <p className="text-xs text-slate-400">Semua bukti ronda sudah diverifikasi.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {verifikasiData.map((group) => (
                  <div key={group.jadwal_id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col">
                    
                    {/* Bagian Foto */}
                    <div 
                      className="h-48 bg-black relative cursor-zoom-in group"
                      onClick={() => setZoomImage(group.foto_bukti)}
                    >
                      <img src={group.foto_bukti} alt="Bukti Ronda" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                      <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-[10px] text-white backdrop-blur-sm border border-slate-700">
                        🔍 Klik untuk Perbesar
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                        <div className="text-xs font-bold text-white">{formatTanggal(group.tanggal)}</div>
                        <div className="text-[10px] text-teal-400">{group.periode}</div>
                      </div>
                    </div>

                    {/* Bagian Daftar Petugas (Toggle) */}
                    <div className="p-4 flex-1 flex flex-col gap-3">
                      <p className="text-xs text-slate-300 border-b border-slate-800 pb-2">Daftar Petugas Bertugas:</p>
                      
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
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition border ${
                                  statusSekarang === 'hadir' 
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                                    : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                }`}
                              >
                                {statusSekarang === 'hadir' ? '✅ Hadir' : '❌ Alpa'}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <button 
                        onClick={() => handleSimpanVerifikasi(group.jadwal_id, group.petugas)}
                        disabled={processing}
                        className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg"
                      >
                        {processing ? 'Menyimpan...' : 'Simpan Verifikasi'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ATURAN KHUSUS */}
        {activeTab === 'aturan' && (
          <TabelAturanKhusus wargaList={wargaList} loading={loadingWarga} search={searchWarga} setSearch={setSearchWarga} onUpdateAturan={handleUpdateAturan} />
        )}
      </div>

      <ModalBuatPeriode isOpen={showModalPeriode} onClose={() => setShowModalPeriode(false)} onSave={handleBuatPeriode} processing={processing} />

      {/* MODAL ZOOM FOTO */}
      {zoomImage && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setZoomImage(null)}>
          <button className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-rose-500 transition z-10" onClick={() => setZoomImage(null)}>✕</button>
          <div className="w-full h-full overflow-auto flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
             <img src={zoomImage} alt="Zoom Bukti" className="min-w-full min-h-full object-contain rounded-lg shadow-2xl" />
          </div>
        </div>
      )}
    </Layout>
  );
}

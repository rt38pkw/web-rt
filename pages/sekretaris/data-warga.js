import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadKK } from '../../lib/iuran/storage';
import Layout from '../../components/sekretaris/Layout';

export default function SekretarisDataWarga() {
  // Default tab sekarang adalah 'penghuni'
  const [activeTab, setActiveTab] = useState('penghuni'); 
  
  // State Data
  const [wargaList, setWargaList] = useState([]);
  const [penghuniList, setPenghuniList] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // State Form Tambah Data Rumah
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [namaLengkap, setNamaLengkap] = useState('');
  const [noRumah, setNoRumah] = useState('');
  const [nik, setNik] = useState('');
  const [noKk, setNoKk] = useState('');
  const [noWa, setNoWa] = useState('');
  const [kategori, setKategori] = useState('Warga');
  const [password, setPassword] = useState('123456');
  const [statusHuni, setStatusHuni] = useState('pemilik');

  // State Modal Detail Rumah
  const [showDetailRumah, setShowDetailRumah] = useState(false);
  const [detailRumah, setDetailRumah] = useState(null);

  // State Modal Edit Data Rumah
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editNama, setEditNama] = useState('');
  const [editNoRumah, setEditNoRumah] = useState('');
  const [editNik, setEditNik] = useState('');
  const [editNoKk, setEditNoKk] = useState('');
  const [editNoWa, setEditNoWa] = useState('');
  const [editKategori, setEditKategori] = useState('Warga');
  const [editStatusHuni, setEditStatusHuni] = useState('pemilik');

  // State Modal Kartu Keluarga
  const [showKKModal, setShowKKModal] = useState(false);
  const [selectedKKWarga, setSelectedKKWarga] = useState(null);
  const [kkData, setKKData] = useState([]); 
  const [isAddingNewKK, setIsAddingNewKK] = useState(false); 
  const [isKelolaMode, setIsKelolaMode] = useState(false); 

  // State Form Tambah/Edit KK & Anggota
  const [newNama, setNewNama] = useState('');
  const [newNik, setNewNik] = useState('');
  const [newNoKk, setNewNoKk] = useState('');
  const [newNoHp, setNewNoHp] = useState('');
  const [newTglLahir, setNewTglLahir] = useState(''); // BARU
  const [newJenisKelamin, setNewJenisKelamin] = useState('L'); // BARU
  const [newPekerjaan, setNewPekerjaan] = useState(''); // BARU
  const [newHubungan, setNewHubungan] = useState('Kepala Keluarga');
  const [newFileKK, setNewFileKK] = useState(null);
  const [previewKK, setPreviewKK] = useState(null);
  const [zoomImage, setZoomImage] = useState(null);

  useEffect(() => { 
    if (activeTab === 'pemilik') fetchWarga(); 
    else fetchPenghuni();
  }, [activeTab]);

  const handleAngkaChange = (e, setter) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 16) setter(val);
  };

  async function fetchWarga() {
    setLoading(true);
    const { data } = await supabase.from('warga').select('*').order('no_rumah', { ascending: true });
    if (data) setWargaList(data);
    setLoading(false);
  }

  async function fetchPenghuni() {
    setLoading(true);
    const [wargaData, penghuniData] = await Promise.all([
      supabase.from('warga').select('*').order('no_rumah', { ascending: true }),
      // Hanya ambil yang approved
      supabase.from('penghuni').select('*').eq('is_aktif', true).eq('status_verifikasi', 'approved')
    ]);
    if (wargaData.data) setWargaList(wargaData.data);
    if (penghuniData.data) setPenghuniList(penghuniData.data);
    setLoading(false);
  }

  // ═══ LOGIKA TAB DATA RUMAH ═══
  const handleTambahWarga = async (e) => {
    e.preventDefault();
    if (nik.length > 0 && nik.length < 16) { alert('NIK harus 16 digit angka!'); return; }
    if (noKk.length > 0 && noKk.length < 16) { alert('No. KK harus 16 digit angka!'); return; }

    setIsSubmitting(true);
    const { data: existing } = await supabase.from('warga').select('id').eq('no_rumah', noRumah.trim()).maybeSingle();
    if (existing) {
      alert(`Nomor rumah "${noRumah}" sudah terdaftar!`);
      setIsSubmitting(false);
      return;
    }
    const { error } = await supabase.from('warga').insert([{
      nama_lengkap: namaLengkap.trim(), no_rumah: noRumah.trim(), nik: nik.trim() || null, no_kk: noKk.trim() || null, no_wa: noWa.trim() || null,
      kategori, password: password.trim() || '123456', status_huni: statusHuni
    }]);
    setIsSubmitting(false);
    if (error) alert(`Gagal: ${error.message}`);
    else {
      alert('✅ Data Rumah ditambahkan!');
      setNamaLengkap(''); setNoRumah(''); setNik(''); setNoKk(''); setNoWa('');
      fetchWarga();
    }
  };

  const openDetailRumah = (w) => {
    setDetailRumah(w);
    setShowDetailRumah(true);
  };

  const openEditModal = (w) => {
    setShowDetailRumah(false); // Tutup modal detail dulu
    setEditId(w.id); setEditNama(w.nama_lengkap || ''); setEditNoRumah(w.no_rumah || '');
    setEditNik(w.nik?.length === 16 ? w.nik : ''); setEditNoKk(w.no_kk?.length === 16 ? w.no_kk : ''); 
    setEditNoWa(w.no_wa || ''); setEditKategori(w.kategori || 'Warga'); setEditStatusHuni(w.status_huni || 'pemilik');
    setShowEditModal(true);
  };

  const handleUpdateWarga = async (e) => {
    e.preventDefault();
    setProcessingId(editId);
    const { error } = await supabase.from('warga').update({
      nama_lengkap: editNama.trim(), no_rumah: editNoRumah.trim(), nik: editNik.trim() || null, no_kk: editNoKk.trim() || null,
      no_wa: editNoWa.trim() || null, kategori: editKategori, status_huni: editStatusHuni,
    }).eq('id', editId);
    setProcessingId(null);
    if (error) alert('Gagal: ' + error.message);
    else { setShowEditModal(false); fetchWarga(); }
  };

  const handleResetPassword = async (w) => {
    if (!confirm(`Reset password untuk rumah ${w.no_rumah} menjadi "123456"?`)) return;
    setProcessingId(w.id);
    const { error } = await supabase.from('warga').update({ password: '123456', password_pending: null }).eq('id', w.id);
    setProcessingId(null);
    if (error) alert('Gagal: ' + error.message);
    else { alert('✅ Password berhasil direset ke 123456.'); setShowDetailRumah(false); }
  };

  const handleSelesaikanSewa = async (w) => {
    if (!confirm(`Selesaikan masa sewa rumah ${w.no_rumah}?\n\nStatus akan menjadi KOSONG, penyewa diarsipkan, dan data Pemilik akan diaktifkan kembali.`)) return;
    
    setProcessingId(w.id);
    try {
      await supabase.from('warga').update({ status_huni: 'kosong' }).eq('id', w.id);
      await supabase.from('penghuni').update({ is_aktif: false }).eq('warga_id', w.id).eq('tipe_penghuni', 'penyewa').eq('is_aktif', true);
      
      const { data: pemilikArsip } = await supabase.from('penghuni')
        .select('*').eq('warga_id', w.id).eq('tipe_penghuni', 'pemilik').eq('is_aktif', false).maybeSingle();
      
      if (pemilikArsip) {
        await supabase.from('penghuni').update({ is_aktif: true }).eq('id', pemilikArsip.id);
      } else {
        await supabase.from('penghuni').insert([{
          warga_id: w.id, nama_lengkap: w.nama_lengkap, nik: w.nik, no_kk: w.no_kk, no_hp: w.no_wa,
          hubungan: 'Kepala Keluarga', tipe_penghuni: 'pemilik', is_aktif: true, status_verifikasi: 'approved'
        }]);
      }
      alert('✅ Sewa selesai. Rumah kosong, penyewa diarsipkan, Pemilik diaktifkan.');
      setShowDetailRumah(false);
      fetchWarga(); fetchPenghuni();
    } catch (err) { alert('Gagal: ' + err.message); } finally { setProcessingId(null); }
  };

  const handleHapusWarga = async (w) => {
    if (!confirm(`Hapus permanen Data Rumah ${w.no_rumah} (Pemilik: ${w.nama_lengkap})?`)) return;
    setProcessingId(w.id);
    try {
      await supabase.from('warga').delete().eq('id', w.id);
      setShowDetailRumah(false);
      fetchWarga();
    } catch (err) { alert('Gagal: ' + err.message); } finally { setProcessingId(null); }
  };

  // ═══ LOGIKA TAB PENGHUNI & MODAL KK ═══
  const openLihatKK = (warga, kk, anggota) => {
    setSelectedKKWarga(warga);
    setKKData([kk, ...anggota]);
    setIsAddingNewKK(false);
    setIsKelolaMode(false);
    setNewFileKK(null);
    setPreviewKK(null);
    setShowKKModal(true);
  };

  const openTambahKK = (warga) => {
    setSelectedKKWarga(warga);
    setKKData([]);
    setIsAddingNewKK(true);
    setIsKelolaMode(false);
    
    setNewNama(''); setNewNik(''); setNewNoKk(''); setNewNoHp(''); 
    setNewTglLahir(''); setNewJenisKelamin('L'); setNewPekerjaan(''); // RESET FIELD BARU
    setNewHubungan('Kepala Keluarga'); setNewFileKK(null); setPreviewKK(null);
    setShowKKModal(true);
  };

  const handleFileKKChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewFileKK(file);
    setPreviewKK(URL.createObjectURL(file));
  };

  const handleTambahKKSubmit = async (e) => {
    e.preventDefault();
    if (!selectedKKWarga) return;
    if (!newNama.trim()) { alert('Nama wajib diisi!'); return; }
    if (newNik.length > 0 && newNik.length < 16) { alert('NIK harus 16 digit!'); return; }
    if (newNoKk.length > 0 && newNoKk.length < 16) { alert('No. KK harus 16 digit!'); return; }
    if (!newFileKK) { alert('Foto KK wajib diupload untuk pendaftaran baru!'); return; }

    setProcessingId(selectedKKWarga.id);
    try {
      const urlKK = await uploadKK(newFileKK, selectedKKWarga.id);

      const { error } = await supabase.from('penghuni').insert([{
        warga_id: selectedKKWarga.id, 
        nama_lengkap: newNama.trim(), 
        nik: newNik.trim() || null, 
        no_kk: newNoKk.trim() || null,
        no_hp: newNoHp.trim() || null, 
        tanggal_lahir: newTglLahir || null, // FIELD BARU
        jenis_kelamin: newJenisKelamin, // FIELD BARU
        pekerjaan: newPekerjaan.trim() || null, // FIELD BARU
        hubungan: newHubungan, 
        tipe_penghuni: 'penyewa', 
        is_aktif: true, 
        status_verifikasi: 'approved',
        url_kk: urlKK
      }]);
      if (error) throw error;

      alert('✅ Data Kartu Keluarga berhasil disimpan!');
      setShowKKModal(false);
      fetchPenghuni(); 
    } catch (err) { alert('Gagal: ' + err.message); } finally { setProcessingId(null); }
  };

  const handleTambahAnggotaSubmit = async (e) => {
    e.preventDefault();
    if (!newNama.trim()) { alert('Nama wajib diisi!'); return; }
    if (newNik.length > 0 && newNik.length < 16) { alert('NIK harus 16 digit!'); return; }

    setProcessingId(selectedKKWarga.id);
    try {
      let urlKK = kkData[0]?.url_kk || null;
      if (newFileKK) {
        urlKK = await uploadKK(newFileKK, selectedKKWarga.id);
        await supabase.from('penghuni').update({ url_kk: urlKK }).eq('id', kkData[0].id);
      }

      const { error } = await supabase.from('penghuni').insert([{
        warga_id: selectedKKWarga.id,
        nama_lengkap: newNama.trim(),
        nik: newNik.trim() || null,
        tanggal_lahir: newTglLahir || null, // FIELD BARU
        jenis_kelamin: newJenisKelamin, // FIELD BARU
        pekerjaan: newPekerjaan.trim() || null, // FIELD BARU
        hubungan: newHubungan,
        tipe_penghuni: 'penyewa', 
        is_aktif: true, 
        status_verifikasi: 'approved'
      }]);
      if (error) throw error;

      alert('✅ Anggota keluarga berhasil ditambahkan!');
      setNewNama(''); setNewNik(''); setNewTglLahir(''); setNewJenisKelamin('L'); setNewPekerjaan(''); setNewHubungan('Istri'); setNewFileKK(null); setPreviewKK(null);
      
      const { data } = await supabase.from('penghuni').select('*').eq('warga_id', selectedKKWarga.id).eq('is_aktif', true);
      const kk = data.find(p => p.hubungan === 'Kepala Keluarga');
      const anggota = data.filter(p => p.hubungan !== 'Kepala Keluarga');
      setKKData([kk, ...anggota]);
      fetchPenghuni();
    } catch (err) { alert('Gagal: ' + err.message); } finally { setProcessingId(null); }
  };

  const handleHapusAnggota = async (id, nama) => {
    if (!confirm(`Keluarkan ${nama} dari daftar penghuni aktif? (Data akan masuk arsip)`)) return;
    setProcessingId(id);
    await supabase.from('penghuni').update({ is_aktif: false }).eq('id', id);
    
    const { data } = await supabase.from('penghuni').select('*').eq('warga_id', selectedKKWarga.id).eq('is_aktif', true);
    const kk = data.find(p => p.hubungan === 'Kepala Keluarga');
    const anggota = data.filter(p => p.hubungan !== 'Kepala Keluarga');
    setKKData([kk, ...anggota]);
    fetchPenghuni();
    setProcessingId(null);
  };

  // ═══ DEFINISI FILTER & GROUPING ═══
  const filteredWarga = wargaList.filter(w => 
    w.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) || 
    w.no_rumah?.toLowerCase().includes(search.toLowerCase())
  );

  const listRumahPenghuni = wargaList.map(w => {
    const penghuniRumah = penghuniList.filter(p => p.warga_id === w.id);
    const kk = penghuniRumah.find(p => p.hubungan === 'Kepala Keluarga');
    const anggota = penghuniRumah.filter(p => p.hubungan !== 'Kepala Keluarga');
    return {
      warga: w,
      kepalaKeluarga: kk || null,
      anggota: anggota
    };
  }).filter(item => {
    const searchLower = search.toLowerCase();
    const matchRumah = item.warga.no_rumah?.toLowerCase().includes(searchLower);
    const matchNama = item.kepalaKeluarga?.nama_lengkap?.toLowerCase().includes(searchLower) || 
                      item.anggota.some(a => a.nama_lengkap?.toLowerCase().includes(searchLower));
    return matchRumah || matchNama;
  });

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* HEADER TABS */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2 flex gap-2">
          <button onClick={() => setActiveTab('penghuni')} className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition ${activeTab === 'penghuni' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>👥 Data Penghuni (Aktif)</button>
          <button onClick={() => setActiveTab('pemilik')} className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition ${activeTab === 'pemilik' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>🏠 Data Rumah</button>
        </div>

        {/* ═══ TAB 1: DATA PENGHUNI (DEFAULT) ═══ */}
        {activeTab === 'penghuni' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="flex gap-3">
              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex-1"><input type="text" placeholder="Cari nama penghuni atau no. rumah..." className="w-full bg-transparent text-xs text-white focus:outline-none" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400">
                  <tr><th className="p-4">Nama / Rumah</th><th className="p-4">Peran</th><th className="p-4">Tipe</th><th className="p-4 text-right">Aksi</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {loading ? <tr><td colSpan="4" className="text-center py-8 text-slate-500">Memuat...</td></tr> : 
                   listRumahPenghuni.length === 0 ? <tr><td colSpan="4" className="text-center py-8 text-slate-500">Data tidak ditemukan.</td></tr> :
                   listRumahPenghuni.map((item, idx) => {
                     const { warga, kepalaKeluarga, anggota } = item;
                     const bisaTambahKK = warga.status_huni === 'sewa' && !kepalaKeluarga;

                     return (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="p-4 align-top">
                          {kepalaKeluarga ? (
                            <>
                              <div className="font-bold text-white text-sm">{kepalaKeluarga.nama_lengkap}</div>
                              <div className="text-[11px] text-teal-400 font-mono mt-0.5">{warga.no_rumah}</div>
                              
                              {anggota.length > 0 && (
                                <div className="mt-3 pl-3 border-l-2 border-slate-700 space-y-1">
                                  {anggota.map((a, i) => (
                                    <div key={i} className="text-[11px] text-slate-300">
                                      <span className="text-slate-500 mr-1">↳</span> 
                                      {a.nama_lengkap} <span className="text-[9px] text-slate-500">({a.hubungan})</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <div>
                              <div className="text-slate-500 italic text-sm">
                                {warga.status_huni === 'sewa' ? 'Belum ada Penyewa' : 'Tidak ada data penghuni'}
                              </div>
                              <div className="text-[11px] text-teal-400 font-mono mt-0.5">{warga.no_rumah}</div>
                            </div>
                          )}
                        </td>
                        <td className="p-4 align-top">
                          {kepalaKeluarga ? (
                            <span className="text-slate-300">Kepala Keluarga</span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="p-4 align-top">
                          {kepalaKeluarga ? (
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${kepalaKeluarga.tipe_penghuni === 'penyewa' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                              {kepalaKeluarga.tipe_penghuni === 'penyewa' ? '🔑 Penyewa' : '👑 Pemilik'}
                            </span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${warga.status_huni === 'sewa' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                              {warga.status_huni === 'sewa' ? 'Sewa (Kosong)' : warga.status_huni}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right align-top">
                          {kepalaKeluarga ? (
                            <button onClick={() => openLihatKK(warga, kepalaKeluarga, anggota)} className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] whitespace-nowrap transition flex items-center gap-1 ml-auto">
                              📄 Lihat Kartu Keluarga
                            </button>
                          ) : bisaTambahKK ? (
                            <button onClick={() => openTambahKK(warga)} className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] whitespace-nowrap transition flex items-center gap-1 ml-auto">
                              + Tambah Kartu Keluarga
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ TAB 2: DATA RUMAH ═══ */}
        {activeTab === 'pemilik' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
            <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 h-fit">
              <h2 className="text-base font-bold text-white">➕ Tambah Data Rumah</h2>
              <form onSubmit={handleTambahWarga} className="space-y-3">
                <input type="text" required placeholder="Nama Lengkap Pemilik *" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={namaLengkap} onChange={(e) => setNamaLengkap(e.target.value)} />
                <input type="text" required placeholder="No. Rumah (Cth: A1 - 06) *" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={noRumah} onChange={(e) => setNoRumah(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={statusHuni} onChange={(e) => setStatusHuni(e.target.value)}>
                    <option value="pemilik">Dihuni Pemilik</option>
                    <option value="sewa">Disewakan</option>
                    <option value="kosong">Kosong</option>
                  </select>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={kategori} onChange={(e) => setKategori(e.target.value)}>
                    <option value="Warga">Warga</option>
                    <option value="Usaha">Usaha</option>
                  </select>
                </div>
                <input type="text" inputMode="numeric" placeholder="NIK (16 digit)" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={nik} onChange={(e) => handleAngkaChange(e, setNik)} />
                <input type="text" inputMode="numeric" placeholder="No. KK (16 digit)" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={noKk} onChange={(e) => handleAngkaChange(e, setNoKk)} />
                <input type="text" placeholder="No. WhatsApp" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={noWa} onChange={(e) => setNoWa(e.target.value)} />
                <button type="submit" disabled={isSubmitting} className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2.5 rounded-xl text-xs transition">{isSubmitting ? 'Menyimpan...' : 'Simpan Data Rumah'}</button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-3">
              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl"><input type="text" placeholder="Cari nama pemilik atau no. rumah..." className="w-full bg-transparent text-xs text-white focus:outline-none" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400"><tr><th className="p-4">Pemilik / Rumah</th><th className="p-4">Status</th><th className="p-4 text-right">Aksi</th></tr></thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredWarga.map(w => (
                      <tr key={w.id} className="hover:bg-slate-800/40">
                        <td className="p-4"><div className="font-semibold text-white">{w.nama_lengkap}</div><div className="text-[10px] text-teal-400 font-mono">{w.no_rumah}</div></td>
                        <td className="p-4"><span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${w.status_huni === 'sewa' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>{w.status_huni}</span></td>
                        <td className="p-4 text-right">
                          <button onClick={() => openDetailRumah(w)} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-[10px] whitespace-nowrap transition flex items-center gap-1 ml-auto">
                            👁️ Lihat Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODAL DETAIL RUMAH */}
      {showDetailRumah && detailRumah && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">🏠 Detail Data Rumah</h3>
              <button onClick={() => setShowDetailRumah(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-slate-800/50 pb-2">
                <span className="text-slate-400">No. Rumah</span>
                <span className="text-teal-400 font-bold font-mono">{detailRumah.no_rumah}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/50 pb-2">
                <span className="text-slate-400">Nama Pemilik</span>
                <span className="text-white font-bold">{detailRumah.nama_lengkap}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/50 pb-2">
                <span className="text-slate-400">NIK</span>
                <span className="text-white font-mono">{detailRumah.nik || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/50 pb-2">
                <span className="text-slate-400">No. KK</span>
                <span className="text-white font-mono">{detailRumah.no_kk || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/50 pb-2">
                <span className="text-slate-400">WhatsApp</span>
                <span className="text-white">{detailRumah.no_wa || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/50 pb-2">
                <span className="text-slate-400">Kategori</span>
                <span className="text-white">{detailRumah.kategori}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-slate-400">Status Huni</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${detailRumah.status_huni === 'sewa' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>{detailRumah.status_huni}</span>
              </div>
            </div>

            {/* TOMBOL AKSI DI DALAM MODAL DETAIL */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800">
              <button onClick={() => openEditModal(detailRumah)} className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white font-semibold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1">
                ✏️ Edit Data
              </button>
              <button onClick={() => handleResetPassword(detailRumah)} disabled={processingId === detailRumah.id} className="bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white font-semibold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1">
                🔑 Reset Sandi
              </button>
              {detailRumah.status_huni === 'sewa' && (
                <button onClick={() => handleSelesaikanSewa(detailRumah)} disabled={processingId === detailRumah.id} className="col-span-2 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white font-semibold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1">
                  🚪 Selesaikan Sewa
                </button>
              )}
              <button onClick={() => handleHapusWarga(detailRumah)} disabled={processingId === detailRumah.id} className="col-span-2 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white font-semibold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1">
                🗑️ Hapus Data Rumah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT RUMAH */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">✏️ Edit Data Rumah</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleUpdateWarga} className="space-y-3">
              <input type="text" required placeholder="Nama Lengkap Pemilik *" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={editNama} onChange={(e) => setEditNama(e.target.value)} />
              <input type="text" required placeholder="No. Rumah *" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={editNoRumah} onChange={(e) => setEditNoRumah(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={editStatusHuni} onChange={(e) => setEditStatusHuni(e.target.value)}>
                  <option value="pemilik">Dihuni Pemilik</option>
                  <option value="sewa">Disewakan</option>
                  <option value="kosong">Kosong</option>
                </select>
                <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={editKategori} onChange={(e) => setEditKategori(e.target.value)}>
                  <option value="Warga">Warga</option>
                  <option value="Usaha">Usaha</option>
                </select>
              </div>
              <input type="text" inputMode="numeric" placeholder="NIK (16 digit)" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={editNik} onChange={(e) => handleAngkaChange(e, setEditNik)} />
              <input type="text" inputMode="numeric" placeholder="No. KK (16 digit)" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={editNoKk} onChange={(e) => handleAngkaChange(e, setEditNoKk)} />
              <input type="text" placeholder="No. WhatsApp" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={editNoWa} onChange={(e) => setEditNoWa(e.target.value)} />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs">Batal</button>
                <button type="submit" disabled={processingId === editId} className="w-2/3 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-xs">{processingId === editId ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KARTU KELUARGA (SPLIT-SCREEN) */}
      {showKKModal && selectedKKWarga && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-6xl h-[95vh] rounded-3xl flex flex-col overflow-hidden shadow-2xl">
            
            <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-950/60 shrink-0">
              <div>
                <h3 className="text-base font-bold text-white">📄 Kartu Keluarga ({selectedKKWarga.no_rumah})</h3>
                <p className="text-xs text-slate-400">Pemilik: {selectedKKWarga.nama_lengkap}</p>
              </div>
              <button onClick={() => setShowKKModal(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Sisi Kiri: Data KK */}
              <div className="w-full md:w-1/2 bg-slate-900 p-4 border-b md:border-b-0 md:border-r border-slate-800 overflow-y-auto space-y-4">
                
                {isAddingNewKK ? (
                  <form onSubmit={handleTambahKKSubmit} className="space-y-3">
                    <h4 className="text-sm font-bold text-indigo-400">Tambah Kepala Keluarga Baru</h4>
                    <input type="text" required placeholder="Nama Lengkap KK *" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={newNama} onChange={(e) => setNewNama(e.target.value)} />
                    <input type="text" inputMode="numeric" placeholder="NIK KK (16 digit)" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={newNik} onChange={(e) => handleAngkaChange(e, setNewNik)} />
                    <input type="text" inputMode="numeric" placeholder="No. KK (16 digit)" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={newNoKk} onChange={(e) => handleAngkaChange(e, setNewNoKk)} />
                    <input type="text" placeholder="No. WhatsApp" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={newNoHp} onChange={(e) => setNewNoHp(e.target.value)} />
                    
                    {/* FIELD BARU */}
                    <div className="grid grid-cols-2 gap-2">
                      <input type="date" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={newTglLahir} onChange={(e) => setNewTglLahir(e.target.value)} />
                      <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={newJenisKelamin} onChange={(e) => setNewJenisKelamin(e.target.value)}>
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                      </select>
                    </div>
                    <input type="text" placeholder="Pekerjaan (Opsional)" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={newPekerjaan} onChange={(e) => setNewPekerjaan(e.target.value)} />
                    {/* END FIELD BARU */}

                    <div className="pt-2">
                      <label className="block text-xs text-slate-300 mb-1">Upload Foto KK *</label>
                      <input type="file" accept="image/*" onChange={handleFileKKChange} className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-600/20 file:text-indigo-400 hover:file:bg-indigo-600/30" />
                    </div>

                    <button type="submit" disabled={processingId === selectedKKWarga.id} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl text-xs mt-4">
                      {processingId === selectedKKWarga.id ? 'Menyimpan...' : 'Simpan Kartu Keluarga'}
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold text-slate-300">Data Terdaftar</h4>
                      <button onClick={() => setIsKelolaMode(!isKelolaMode)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${isKelolaMode ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>
                        {isKelolaMode ? '✕ Tutup Kelola' : '✏️ Kelola Anggota'}
                      </button>
                    </div>

                    {/* List Anggota KK */}
                    <div className="space-y-2">
                      {kkData.map((a, i) => (
                        <div key={i} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex justify-between items-center">
                          <div>
                            <div className="text-sm font-bold text-white">{a.nama_lengkap}</div>
                            <div className="text-[10px] text-slate-400">NIK: {a.nik || '-'}</div>
                            <div className="text-[10px] text-slate-400">Tgl Lahir: {a.tanggal_lahir || '-'} | {a.jenis_kelamin === 'P' ? 'Perempuan' : 'Laki-laki'}</div>
                            {a.pekerjaan && <div className="text-[10px] text-slate-400">Kerja: {a.pekerjaan}</div>}
                            <div className={`text-[10px] font-bold mt-1 ${a.hubungan === 'Kepala Keluarga' ? 'text-indigo-400' : 'text-slate-400'}`}>{a.hubungan}</div>
                          </div>
                          {isKelolaMode && a.hubungan !== 'Kepala Keluarga' && (
                            <button onClick={() => handleHapusAnggota(a.id, a.nama_lengkap)} className="bg-rose-600/20 text-rose-400 p-2 rounded-lg text-[10px] hover:bg-rose-600 hover:text-white transition">Keluarkan</button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Form Tambah Anggota & Update KK */}
                    {isKelolaMode && (
                      <form onSubmit={handleTambahAnggotaSubmit} className="bg-indigo-950/20 border border-indigo-500/30 p-3 rounded-xl space-y-3 mt-4">
                        <h5 className="text-xs font-bold text-indigo-300">+ Tambah Anggota / Update KK</h5>
                        
                        <div className="pt-1 pb-2 border-b border-slate-800">
                          <label className="block text-[10px] text-slate-400 mb-1">Ganti Foto KK (Opsional)</label>
                          <input type="file" accept="image/*" onChange={handleFileKKChange} className="w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30" />
                          {previewKK && <p className="text-[9px] text-emerald-400 mt-1">✓ Foto baru siap disimpan</p>}
                        </div>

                        <input type="text" required placeholder="Nama Lengkap Anggota *" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" value={newNama} onChange={(e) => setNewNama(e.target.value)} />
                        <input type="text" inputMode="numeric" placeholder="NIK Anggota (16 digit)" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" value={newNik} onChange={(e) => handleAngkaChange(e, setNewNik)} />
                        
                        {/* FIELD BARU */}
                        <div className="grid grid-cols-2 gap-2">
                          <input type="date" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" value={newTglLahir} onChange={(e) => setNewTglLahir(e.target.value)} />
                          <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" value={newJenisKelamin} onChange={(e) => setNewJenisKelamin(e.target.value)}>
                            <option value="L">Laki-laki</option>
                            <option value="P">Perempuan</option>
                          </select>
                        </div>
                        <input type="text" placeholder="Pekerjaan (Opsional)" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" value={newPekerjaan} onChange={(e) => setNewPekerjaan(e.target.value)} />
                        {/* END FIELD BARU */}

                        <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" value={newHubungan} onChange={(e) => setNewHubungan(e.target.value)}>
                          <option value="Istri">Istri</option>
                          <option value="Anak">Anak</option>
                          <option value="Saudara">Saudara</option>
                          <option value="Lainnya">Lainnya</option>
                        </select>
                        
                        <button type="submit" disabled={processingId === selectedKKWarga.id} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded-xl text-xs transition mt-2">Simpan Perubahan</button>
                      </form>
                    )}
                  </>
                )}
              </div>

              {/* Sisi Kanan: Gambar KK */}
              <div className="w-full md:w-1/2 bg-black/50 relative flex items-center justify-center overflow-auto p-4">
                {previewKK ? (
                   <div className="relative w-full h-full flex items-center justify-center">
                     <img src={previewKK} alt="Preview Foto Baru" className="max-w-full max-h-full object-contain rounded-lg cursor-zoom-in" onClick={() => setZoomImage(previewKK)} />
                     <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] px-2 py-1 rounded">Foto Baru</span>
                   </div>
                ) : isAddingNewKK ? (
                  <div className="text-slate-500 text-sm flex flex-col items-center gap-2">
                    <span className="text-4xl">📸</span>
                    <p>Pilih file foto KK di sebelah kiri.</p>
                  </div>
                ) : (
                  kkData[0]?.url_kk ? (
                    <img src={kkData[0].url_kk} alt="KK Terdaftar" className="max-w-full max-h-full object-contain rounded-lg cursor-zoom-in" onClick={() => setZoomImage(kkData[0].url_kk)} />
                  ) : (
                    <div className="text-slate-500 text-sm flex flex-col items-center gap-2">
                      <span className="text-4xl">📄</span>
                      <p>Foto KK belum di-upload.</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ZOOM GAMBAR */}
      {zoomImage && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setZoomImage(null)}>
          <button className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-rose-500 transition z-10" onClick={() => setZoomImage(null)}>✕</button>
          <div className="w-full h-full overflow-auto flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
             <img src={zoomImage} alt="Zoom KK" className="min-w-full min-h-full object-contain rounded-lg shadow-2xl" />
          </div>
        </div>
      )}
    </Layout>
  );
}

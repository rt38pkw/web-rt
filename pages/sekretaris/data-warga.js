// pages/sekretaris/data-warga.js
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadKK } from '../../lib/iuran/storage';
import Layout from '../../components/sekretaris/Layout';

// Import komponen-komponen yang sudah dipecah
import TabelPenghuni from '../../components/sekretaris/data-warga/TabelPenghuni';
import TabelDataRumah from '../../components/sekretaris/data-warga/TabelDataRumah';
import ModalDetailRumah from '../../components/sekretaris/data-warga/ModalDetailRumah';
import ModalEditRumah from '../../components/sekretaris/data-warga/ModalEditRumah';
import ModalKK from '../../components/sekretaris/data-warga/ModalKK';

export default function SekretarisDataWarga() {
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
  const [noRumah, setNoRumah] = useState(''); // State ini akan diisi otomatis oleh TabelDataRumah
  const [nik, setNik] = useState('');
  const [noKk, setNoKk] = useState('');
  const [noWa, setNoWa] = useState('');
  const [kategori, setKategori] = useState('Warga');
  const [password, setPassword] = useState('123456');
  const [statusHuni, setStatusHuni] = useState('pemilik');

  // State Modal Detail & Edit Rumah
  const [showDetailRumah, setShowDetailRumah] = useState(false);
  const [detailRumah, setDetailRumah] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editNama, setEditNama] = useState('');
  const [editNoRumah, setEditNoRumah] = useState('');
  const [editNik, setEditNik] = useState('');
  const [editNoKk, setEditNoKk] = useState('');
  const [editNoWa, setEditNoWa] = useState('');
  const [editKategori, setEditKategori] = useState('Warga');
  const [editStatusHuni, setEditStatusHuni] = useState('pemilik');

  // State Modal KK
  const [showKKModal, setShowKKModal] = useState(false);
  const [selectedKKWarga, setSelectedKKWarga] = useState(null);
  const [kkData, setKkData] = useState([]); 
  const [isAddingNewKK, setIsAddingNewKK] = useState(false); 
  const [isKelolaMode, setIsKelolaMode] = useState(false); 
  
  // State Form KK
  const [newNama, setNewNama] = useState('');
  const [newNik, setNewNik] = useState('');
  const [newNoKk, setNewNoKk] = useState('');
  const [newNoHp, setNewNoHp] = useState('');
  const [newTglLahir, setNewTglLahir] = useState('');
  const [newJenisKelamin, setNewJenisKelamin] = useState('L');
  const [newPekerjaan, setNewPekerjaan] = useState('');
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
      supabase.from('penghuni').select('*').eq('is_aktif', true).eq('status_verifikasi', 'approved')
    ]);
    if (wargaData.data) setWargaList(wargaData.data);
    if (penghuniData.data) setPenghuniList(penghuniData.data);
    setLoading(false);
  }

  // ═══ FUNGSI DATA RUMAH ═══
  const handleTambahWarga = async (e, overrideNoRumah) => {
    e.preventDefault();
    const finalNoRumah = overrideNoRumah || noRumah;
    
    if (nik.length > 0 && nik.length < 16) { alert('NIK harus 16 digit angka!'); return; }
    if (noKk.length > 0 && noKk.length < 16) { alert('No. KK harus 16 digit angka!'); return; }
    if (!finalNoRumah) { alert('Nomor rumah tidak valid!'); return; }

    setIsSubmitting(true);
    const { data: existing } = await supabase.from('warga').select('id').eq('no_rumah', finalNoRumah.trim()).maybeSingle();
    if (existing) {
      alert(`Nomor rumah "${finalNoRumah}" sudah terdaftar!`);
      setIsSubmitting(false);
      return;
    }
    const { error } = await supabase.from('warga').insert([{
      nama_lengkap: namaLengkap.trim(), no_rumah: finalNoRumah.trim(), nik: nik.trim() || null, no_kk: noKk.trim() || null, no_wa: noWa.trim() || null,
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
    setShowDetailRumah(false); 
    setEditId(w.id); setEditNama(w.nama_lengkap || ''); setEditNoRumah(w.no_rumah || '');
    setEditNik(w.nik?.length === 16 ? w.nik : ''); setEditNoKk(w.no_kk?.length === 16 ? w.no_kk : ''); 
    setEditNoWa(w.no_wa || ''); setEditKategori(w.kategori || 'Warga'); setEditStatusHuni(w.status_huni || 'pemilik');
    setShowEditModal(true);
  };

  const handleUpdateWarga = async (e, overrideNoRumah) => {
    e.preventDefault();
    const finalNoRumah = overrideNoRumah || editNoRumah;
    if (!finalNoRumah) { alert('Nomor rumah tidak valid!'); return; }

    setProcessingId(editId);
    const { error } = await supabase.from('warga').update({
      nama_lengkap: editNama.trim(), no_rumah: finalNoRumah.trim(), nik: editNik.trim() || null, no_kk: editNoKk.trim() || null,
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
      
      const { data: pemilikArsip } = await supabase.from('penghuni').select('*').eq('warga_id', w.id).eq('tipe_penghuni', 'pemilik').eq('is_aktif', false).maybeSingle();
      
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

  // ═══ FUNGSI MODAL KK ═══
  const openLihatKK = (warga, kk, anggota) => {
    setSelectedKKWarga(warga);
    setKkData([kk, ...anggota]);
    setIsAddingNewKK(false);
    setIsKelolaMode(false);
    setNewFileKK(null);
    setPreviewKK(null);
    setShowKKModal(true);
  };

  const openTambahKK = (warga) => {
    setSelectedKKWarga(warga);
    setKkData([]);
    setIsAddingNewKK(true);
    setIsKelolaMode(false);
    
    setNewNama(''); setNewNik(''); setNewNoKk(''); setNewNoHp(''); 
    setNewTglLahir(''); setNewJenisKelamin('L'); setNewPekerjaan('');
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
        warga_id: selectedKKWarga.id, nama_lengkap: newNama.trim(), nik: newNik.trim() || null, no_kk: newNoKk.trim() || null,
        no_hp: newNoHp.trim() || null, tanggal_lahir: newTglLahir || null, jenis_kelamin: newJenisKelamin, pekerjaan: newPekerjaan.trim() || null,
        hubungan: newHubungan, tipe_penghuni: 'penyewa', is_aktif: true, status_verifikasi: 'approved', url_kk: urlKK
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
        warga_id: selectedKKWarga.id, nama_lengkap: newNama.trim(), nik: newNik.trim() || null,
        tanggal_lahir: newTglLahir || null, jenis_kelamin: newJenisKelamin, pekerjaan: newPekerjaan.trim() || null,
        hubungan: newHubungan, tipe_penghuni: 'penyewa', is_aktif: true, status_verifikasi: 'approved'
      }]);
      if (error) throw error;

      alert('✅ Anggota keluarga berhasil ditambahkan!');
      setNewNama(''); setNewNik(''); setNewTglLahir(''); setNewJenisKelamin('L'); setNewPekerjaan(''); setNewHubungan('Istri'); setNewFileKK(null); setPreviewKK(null);
      
      const { data } = await supabase.from('penghuni').select('*').eq('warga_id', selectedKKWarga.id).eq('is_aktif', true);
      const kk = data.find(p => p.hubungan === 'Kepala Keluarga');
      const anggota = data.filter(p => p.hubungan !== 'Kepala Keluarga');
      setKkData([kk, ...anggota]);
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
    setKkData([kk, ...anggota]);
    fetchPenghuni();
    setProcessingId(null);
  };

  // ═══ FILTERING ═══
  const filteredWarga = wargaList.filter(w => 
    w.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) || 
    w.no_rumah?.toLowerCase().includes(search.toLowerCase())
  );

  const listRumahPenghuni = wargaList.map(w => {
    const penghuniRumah = penghuniList.filter(p => p.warga_id === w.id);
    const kk = penghuniRumah.find(p => p.hubungan === 'Kepala Keluarga');
    const anggota = penghuniRumah.filter(p => p.hubungan !== 'Kepala Keluarga');
    return { warga: w, kepalaKeluarga: kk || null, anggota: anggota };
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
        
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2 flex gap-2">
          <button onClick={() => setActiveTab('penghuni')} className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition ${activeTab === 'penghuni' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>👥 Data Penghuni (Aktif)</button>
          <button onClick={() => setActiveTab('pemilik')} className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition ${activeTab === 'pemilik' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>🏠 Data Rumah</button>
        </div>

        {activeTab === 'penghuni' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="flex gap-3">
              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex-1">
                <input type="text" placeholder="Cari nama penghuni atau no. rumah..." className="w-full bg-transparent text-xs text-white focus:outline-none" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <TabelPenghuni 
              loading={loading} 
              listRumahPenghuni={listRumahPenghuni} 
              openLihatKK={openLihatKK} 
              openTambahKK={openTambahKK} 
            />
          </div>
        )}

        {activeTab === 'pemilik' && (
          <TabelDataRumah 
            isSubmitting={isSubmitting} 
            handleTambahWarga={handleTambahWarga} 
            namaLengkap={namaLengkap} setNamaLengkap={setNamaLengkap} 
            noRumah={noRumah} setNoRumah={setNoRumah} 
            statusHuni={statusHuni} setStatusHuni={setStatusHuni} 
            kategori={kategori} setKategori={setKategori} 
            nik={nik} setNik={setNik} noKk={noKk} setNoKk={setNoKk} 
            noWa={noWa} setNoWa={setNoWa} handleAngkaChange={handleAngkaChange} 
            search={search} setSearch={setSearch} filteredWarga={filteredWarga} 
            openDetailRumah={openDetailRumah} 
          />
        )}
      </div>

      {/* RENDER SEMUA MODAL */}
      <ModalDetailRumah 
        detailRumah={detailRumah} setShowDetailRumah={setShowDetailRumah} 
        openEditModal={openEditModal} handleResetPassword={handleResetPassword} 
        handleSelesaikanSewa={handleSelesaikanSewa} handleHapusWarga={handleHapusWarga} 
        processingId={processingId} 
      />

      <ModalEditRumah 
        showEditModal={showEditModal} setShowEditModal={setShowEditModal} 
        handleUpdateWarga={handleUpdateWarga} editNama={editNama} setEditNama={setEditNama} 
        editNoRumah={editNoRumah} setEditNoRumah={setEditNoRumah} editStatusHuni={editStatusHuni} setEditStatusHuni={setEditStatusHuni} 
        editKategori={editKategori} setEditKategori={setEditKategori} editNik={editNik} setEditNik={setEditNik} 
        editNoKk={editNoKk} setEditNoKk={setEditNoKk} editNoWa={editNoWa} setEditNoWa={setEditNoWa} 
        handleAngkaChange={handleAngkaChange} processingId={processingId} editId={editId} 
      />

      <ModalKK 
        showKKModal={showKKModal} setShowKKModal={setShowKKModal} selectedKKWarga={selectedKKWarga} 
        kkData={kkData} isAddingNewKK={isAddingNewKK} isKelolaMode={isKelolaMode} setIsKelolaMode={setIsKelolaMode} 
        previewKK={previewKK} setPreviewKK={setPreviewKK} setZoomImage={setZoomImage} processingId={processingId} 
        handleTambahKKSubmit={handleTambahKKSubmit} handleTambahAnggotaSubmit={handleTambahAnggotaSubmit} 
        handleHapusAnggota={handleHapusAnggota} handleFileKKChange={handleFileKKChange} 
        newNama={newNama} setNewNama={setNewNama} newNik={newNik} setNewNik={setNewNik} 
        newNoKk={newNoKk} setNewNoKk={setNewNoKk} newNoHp={newNoHp} setNewNoHp={setNewNoHp} 
        newTglLahir={newTglLahir} setNewTglLahir={setNewTglLahir} newJenisKelamin={newJenisKelamin} setNewJenisKelamin={setNewJenisKelamin} 
        newPekerjaan={newPekerjaan} setNewPekerjaan={setNewPekerjaan} newHubungan={newHubungan} setNewHubungan={setNewHubungan} 
        handleAngkaChange={handleAngkaChange} 
      />

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

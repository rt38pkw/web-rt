import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/sekretaris/Layout';

export default function SekretarisDataWarga() {
  const [activeTab, setActiveTab] = useState('pemilik'); // 'pemilik' | 'penghuni'
  
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

  // State Form Tambah Kepala Keluarga Baru
  const [showTambahPenghuni, setShowTambahPenghuni] = useState(false);
  const [targetRumahId, setTargetRumahId] = useState('');
  const [selectedRumahInfo, setSelectedRumahInfo] = useState(null);
  const [newNama, setNewNama] = useState('');
  const [newNik, setNewNik] = useState('');
  const [newNoKk, setNewNoKk] = useState('');
  const [newNoHp, setNewNoHp] = useState('');
  const [newHubungan, setNewHubungan] = useState('Kepala Keluarga');

  // STATE MODAL KELOLA KELUARGA (GABUNGAN EDIT KK & ANGGOTA)
  const [showKelolaModal, setShowKelolaModal] = useState(false);
  const [targetKepalaKeluarga, setTargetKepalaKeluarga] = useState(null); 
  const [anggotaNama, setAnggotaNama] = useState('');
  const [anggotaNik, setAnggotaNik] = useState('');
  const [anggotaHubungan, setAnggotaHubungan] = useState('Istri');

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
    const { data } = await supabase.from('penghuni').select('*, warga: warga_id (no_rumah)').eq('is_aktif', true).order('nama_lengkap');
    if (data) setPenghuniList(data);
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

  const openEditModal = (w) => {
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

  // ═══ LOGIKA SELESAIKAN SEWA (ARSIP PENYEWA, AKTIFKAN PEMILIK) ═══
  const handleSelesaikanSewa = async (w) => {
    if (!confirm(`Selesaikan masa sewa rumah ${w.no_rumah}?\n\nStatus akan menjadi KOSONG, penyewa diarsipkan, dan data Pemilik akan diaktifkan kembali.`)) return;
    
    setProcessingId(w.id);
    try {
      // 1. Ubah status rumah jadi kosong
      await supabase.from('warga').update({ status_huni: 'kosong' }).eq('id', w.id);
      
      // 2. Arsipkan Penyewa
      await supabase.from('penghuni').update({ is_aktif: false }).eq('warga_id', w.id).eq('tipe_penghuni', 'penyewa').eq('is_aktif', true);
      
      // 3. Aktifkan kembali Pemilik yang ada di arsip
      const { data: pemilikArsip } = await supabase.from('penghuni')
        .select('*').eq('warga_id', w.id).eq('tipe_penghuni', 'pemilik').eq('is_aktif', false).maybeSingle();
      
      if (pemilikArsip) {
        await supabase.from('penghuni').update({ is_aktif: true }).eq('id', pemilikArsip.id);
      } else {
        // Jika Pemilik belum pernah masuk tabel penghuni, masukkan sekarang
        await supabase.from('penghuni').insert([{
          warga_id: w.id, nama_lengkap: w.nama_lengkap, nik: w.nik, no_kk: w.no_kk, no_hp: w.no_wa,
          hubungan: 'Kepala Keluarga', tipe_penghuni: 'pemilik', is_aktif: true, status_verifikasi: 'approved'
        }]);
      }

      alert('✅ Sewa selesai. Rumah kosong, penyewa diarsipkan, Pemilik diaktifkan.');
      fetchWarga();
      fetchPenghuni();
    } catch (err) { alert('Gagal: ' + err.message); } finally { setProcessingId(null); }
  };

  const handleHapusWarga = async (w) => {
    if (!confirm(`Hapus permanen Data Rumah ${w.no_rumah} (Pemilik: ${w.nama_lengkap})?`)) return;
    setProcessingId(w.id);
    try {
      await supabase.from('warga').delete().eq('id', w.id);
      fetchWarga();
    } catch (err) { alert('Gagal: ' + err.message); } finally { setProcessingId(null); }
  };

  // ═══ LOGIKA TAB PENGHUNI ═══
  const handlePilihRumah = (e) => {
    const rId = e.target.value;
    setTargetRumahId(rId);
    if (!rId) { setSelectedRumahInfo(null); return; }
    
    const rumah = wargaList.find(w => w.id === rId);
    setSelectedRumahInfo(rumah);
    
    if (rumah && rumah.status_huni === 'pemilik') {
      setNewNama(rumah.nama_lengkap || '');
      setNewNik(rumah.nik || '');
      setNewNoKk(rumah.no_kk || '');
      setNewNoHp(rumah.no_wa || '');
    } else {
      setNewNama(''); setNewNik(''); setNewNoKk(''); setNewNoHp('');
    }
  };

  const handleTambahPenghuniSubmit = async (e) => {
    e.preventDefault();
    if (!targetRumahId) { alert('Pilih Nomor Rumah!'); return; }
    if (newNik.length > 0 && newNik.length < 16) { alert('NIK harus 16 digit!'); return; }
    if (newNoKk.length > 0 && newNoKk.length < 16) { alert('No. KK harus 16 digit!'); return; }

    setProcessingId(targetRumahId);
    try {
      // CEK PROTEKSI: Apakah rumah sudah punya KK aktif?
      const { data: existingKK } = await supabase.from('penghuni')
        .select('*').eq('warga_id', targetRumahId).eq('hubungan', 'Kepala Keluarga').eq('is_aktif', true).maybeSingle();
      
      if (existingKK) {
        alert(`❌ GAGAL.\n\nRumah ini sudah memiliki Kepala Keluarga aktif (${existingKK.nama_lengkap}).\n\nJika ingin mengganti penyewa, silakan ke Tab "Data Rumah" dan klik tombol "Selesaikan Sewa" (ikon 🚪) terlebih dahulu.`);
        setProcessingId(null); return;
      }

      const tipe = selectedRumahInfo.status_huni === 'sewa' ? 'penyewa' : 'pemilik';

      const { error } = await supabase.from('penghuni').insert([{
        warga_id: targetRumahId, nama_lengkap: newNama.trim(), nik: newNik.trim() || null, no_kk: newNoKk.trim() || null,
        no_hp: newNoHp.trim() || null, hubungan: newHubungan, tipe_penghuni: tipe, is_aktif: true, status_verifikasi: 'approved'
      }]);
      if (error) throw error;

      alert('✅ Kepala Keluarga baru berhasil ditambahkan!');
      setShowTambahPenghuni(false);
      setTargetRumahId(''); setSelectedRumahInfo(null); setNewNama(''); setNewNik(''); setNewNoKk(''); setNewNoHp('');
      fetchPenghuni(); fetchWarga();
    } catch (err) { alert('Gagal: ' + err.message); } finally { setProcessingId(null); }
  };

  // FUNGSI KELOLA KELUARGA (MODAL EDIT ANGGOTA)
  const openKelolaModal = (kepalaKeluarga) => {
    setTargetKepalaKeluarga(kepalaKeluarga);
    setAnggotaNama('');
    setAnggotaNik('');
    setAnggotaHubungan('Istri');
    setShowKelolaModal(true);
  };

  const handleTambahAnggotaSubmit = async (e) => {
    e.preventDefault();
    if (!anggotaNama.trim()) { alert('Nama wajib diisi!'); return; }
    if (anggotaNik.length > 0 && anggotaNik.length < 16) { alert('NIK harus 16 digit!'); return; }

    setProcessingId(targetKepalaKeluarga.warga_id);
    try {
      const { error } = await supabase.from('penghuni').insert([{
        warga_id: targetKepalaKeluarga.warga_id,
        nama_lengkap: anggotaNama.trim(),
        nik: anggotaNik.trim() || null,
        hubungan: anggotaHubungan,
        tipe_penghuni: targetKepalaKeluarga.tipe_penghuni, 
        is_aktif: true, 
        status_verifikasi: 'approved'
      }]);
      if (error) throw error;

      alert('✅ Anggota keluarga berhasil ditambahkan!');
      setAnggotaNama(''); setAnggotaNik(''); setAnggotaHubungan('Istri');
      fetchPenghuni();
    } catch (err) { alert('Gagal: ' + err.message); } finally { setProcessingId(null); }
  };

  const handleHapusAnggota = async (id, nama) => {
    if (!confirm(`Keluarkan ${nama} dari daftar penghuni aktif? (Data akan masuk arsip)`)) return;
    setProcessingId(id);
    await supabase.from('penghuni').update({ is_aktif: false }).eq('id', id);
    fetchPenghuni();
    setProcessingId(null);
  };

  // ═══ PERBAIKAN: DEFINE filteredWarga DAN groupedPenghuni ═══
  const filteredWarga = wargaList.filter(w => 
    w.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) || 
    w.no_rumah?.toLowerCase().includes(search.toLowerCase())
  );

  const groupedPenghuni = {};
  if (activeTab === 'penghuni') {
    const filteredPenghuni = penghuniList.filter(p => 
      p.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) || 
      p.warga?.no_rumah?.toLowerCase().includes(search.toLowerCase())
    );
    
    filteredPenghuni.forEach(p => {
      const key = p.warga_id;
      if (!groupedPenghuni[key]) groupedPenghuni[key] = { no_rumah: p.warga?.no_rumah, kepalaKeluarga: null, anggota: [] };
      
      if (p.hubungan === 'Kepala Keluarga') groupedPenghuni[key].kepalaKeluarga = p;
      else groupedPenghuni[key].anggota.push(p);
    });
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* HEADER TABS */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2 flex gap-2">
          <button onClick={() => setActiveTab('pemilik')} className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition ${activeTab === 'pemilik' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>🏠 Data Rumah</button>
          <button onClick={() => setActiveTab('penghuni')} className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition ${activeTab === 'penghuni' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>👥 Data Penghuni (Aktif)</button>
        </div>

        {/* ═══ TAB 1: DATA RUMAH ═══ */}
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
                        <td className="p-4 text-right flex justify-end gap-1.5">
                          <button onClick={() => openEditModal(w)} className="bg-blue-600/20 text-blue-400 p-2 rounded-lg" title="Edit Data Rumah">✏️</button>
                          <button onClick={() => { if(confirm('Reset password ke 123456?')) supabase.from('warga').update({password:'123456'}).eq('id',w.id).then(()=>alert('Password direset!')) }} className="bg-amber-600/20 text-amber-400 p-2 rounded-lg" title="Reset Password">🔑</button>
                          {w.status_huni === 'sewa' && <button onClick={() => handleSelesaikanSewa(w)} className="bg-purple-600/20 text-purple-400 p-2 rounded-lg" title="Selesaikan Sewa">🚪</button>}
                          <button onClick={() => handleHapusWarga(w)} className="bg-rose-600/20 text-rose-400 p-2 rounded-lg" title="Hapus Data Rumah">🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB 2: PENGHUNI ═══ */}
        {activeTab === 'penghuni' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="flex gap-3">
              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex-1"><input type="text" placeholder="Cari nama penghuni atau no. rumah..." className="w-full bg-transparent text-xs text-white focus:outline-none" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
              <button onClick={() => setShowTambahPenghuni(!showTambahPenghuni)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition shadow-lg shrink-0">
                {showTambahPenghuni ? '✕ Tutup Form' : '+ Tambah Kepala Keluarga'}
              </button>
            </div>

            {showTambahPenghuni && (
              <form onSubmit={handleTambahPenghuniSubmit} className="bg-slate-900 border border-indigo-500/30 p-4 rounded-2xl space-y-3 shadow-xl animate-in slide-in-from-top-2">
                <h4 className="text-sm font-bold text-white">Tambah Kepala Keluarga Baru</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={targetRumahId} onChange={handlePilihRumah}>
                    <option value="">-- Pilih Nomor Rumah --</option>
                    {wargaList.map(w => <option key={w.id} value={w.id}>{w.no_rumah} ({w.status_huni})</option>)}
                  </select>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={newHubungan} onChange={(e) => {
                    setNewHubungan(e.target.value);
                    if (e.target.value !== 'Kepala Keluarga') { setNewNama(''); setNewNik(''); setNewNoKk(''); setNewNoHp(''); }
                    else if (selectedRumahInfo) handlePilihRumah({ target: { value: targetRumahId } });
                  }}>
                    <option value="Kepala Keluarga">Kepala Keluarga</option>
                    <option value="Istri">Istri</option>
                    <option value="Anak">Anak</option>
                    <option value="Saudara">Saudara</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                
                {selectedRumahInfo && selectedRumahInfo.status_huni === 'pemilik' && newHubungan === 'Kepala Keluarga' ? (
                  <div className="bg-blue-950/30 border border-blue-500/20 p-3 rounded-xl">
                    <p className="text-[11px] text-blue-300">ℹ️ Data Pemilik otomatis terisi. Anda tidak perlu mengetik ulang.</p>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="text" required placeholder="Nama Lengkap *" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={newNama} onChange={(e) => setNewNama(e.target.value)} readOnly={selectedRumahInfo?.status_huni === 'pemilik' && newHubungan === 'Kepala Keluarga'} />
                  <input type="text" placeholder="No. WhatsApp" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={newNoHp} onChange={(e) => setNewNoHp(e.target.value)} readOnly={selectedRumahInfo?.status_huni === 'pemilik' && newHubungan === 'Kepala Keluarga'} />
                  <input type="text" inputMode="numeric" placeholder="NIK (16 digit)" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={newNik} onChange={(e) => handleAngkaChange(e, setNewNik)} readOnly={selectedRumahInfo?.status_huni === 'pemilik' && newHubungan === 'Kepala Keluarga'} />
                  <input type="text" inputMode="numeric" placeholder="No. KK (16 digit)" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={newNoKk} onChange={(e) => handleAngkaChange(e, setNewNoKk)} readOnly={selectedRumahInfo?.status_huni === 'pemilik' && newHubungan === 'Kepala Keluarga'} />
                </div>
                <button type="submit" disabled={processingId !== null} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs transition mt-2">Simpan Kepala Keluarga</button>
              </form>
            )}

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400">
                  <tr><th className="p-4">Nama / Rumah</th><th className="p-4">Peran</th><th className="p-4">Tipe</th><th className="p-4 text-right">Aksi</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {loading ? <tr><td colSpan="4" className="text-center py-8 text-slate-500">Memuat...</td></tr> : 
                   Object.values(groupedPenghuni).length === 0 ? <tr><td colSpan="4" className="text-center py-8 text-slate-500">Data tidak ditemukan.</td></tr> :
                   Object.values(groupedPenghuni).map((grup, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="p-4 align-top">
                        {grup.kepalaKeluarga ? (
                          <>
                            <div className="font-bold text-white text-sm">{grup.kepalaKeluarga.nama_lengkap}</div>
                            <div className="text-[11px] text-teal-400 font-mono mt-0.5">{grup.no_rumah}</div>
                            
                            {/* List Anggota Keluarga (Read-Only di sini) */}
                            {grup.anggota.length > 0 && (
                              <div className="mt-3 pl-3 border-l-2 border-slate-700 space-y-1">
                                {grup.anggota.map((a, i) => (
                                  <div key={i} className="text-[11px] text-slate-300">
                                    <span className="text-slate-500 mr-1">↳</span> 
                                    {a.nama_lengkap} <span className="text-[9px] text-slate-500">({a.hubungan})</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-slate-500 italic">Data KK tidak ditemukan</div>
                        )}
                      </td>
                      <td className="p-4 align-top">
                        <span className="text-slate-300">Kepala Keluarga</span>
                      </td>
                      <td className="p-4 align-top">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${grup.kepalaKeluarga?.tipe_penghuni === 'penyewa' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                          {grup.kepalaKeluarga?.tipe_penghuni === 'penyewa' ? '🔑 Penyewa' : '👑 Pemilik'}
                        </span>
                      </td>
                      <td className="p-4 text-right align-top">
                         {/* HANYA ADA TOMBOL EDIT (KELOLA KELUARGA) */}
                         <button onClick={() => openKelolaModal(grup.kepalaKeluarga)} className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] whitespace-nowrap transition flex items-center gap-1 ml-auto">
                           ✏️ Kelola
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

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

      {/* MODAL KELOLA KELUARGA (EDIT ANGGOTA) */}
      {showKelolaModal && targetKepalaKeluarga && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">👥 Kelola Keluarga</h3>
                <p className="text-xs text-slate-400">KK: {targetKepalaKeluarga.nama_lengkap} ({targetKepalaKeluarga.warga?.no_rumah})</p>
              </div>
              <button onClick={() => setShowKelolaModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {/* List Anggota Keluarga Aktif */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-300">Anggota Keluarga Aktif</h4>
              {penghuniList.filter(p => p.warga_id === targetKepalaKeluarga.warga_id && p.hubungan !== 'Kepala Keluarga').length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">Belum ada anggota keluarga.</div>
              ) : (
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400">
                      <tr><th className="p-3">Nama</th><th className="p-3">NIK</th><th className="p-3">Hubungan</th><th className="p-3 text-right">Aksi</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {penghuniList.filter(p => p.warga_id === targetKepalaKeluarga.warga_id && p.hubungan !== 'Kepala Keluarga').map((a) => (
                        <tr key={a.id}>
                          <td className="p-3 font-semibold text-white">{a.nama_lengkap}</td>
                          <td className="p-3 font-mono text-slate-400">{a.nik || '-'}</td>
                          <td className="p-3 text-slate-300">{a.hubungan}</td>
                          <td className="p-3 text-right">
                            <button onClick={() => handleHapusAnggota(a.id, a.nama_lengkap)} className="text-rose-400 hover:text-rose-300 text-[10px] bg-rose-500/10 px-2 py-1 rounded">Keluarkan</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Form Tambah Anggota Baru */}
            <div className="border-t border-slate-800 pt-4">
              <h4 className="text-sm font-semibold text-slate-300 mb-3">➕ Tambah Anggota Keluarga Baru</h4>
              <form onSubmit={handleTambahAnggotaSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2"><input type="text" required placeholder="Nama Lengkap *" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" value={anggotaNama} onChange={(e) => setAnggotaNama(e.target.value)} /></div>
                <div><input type="text" inputMode="numeric" placeholder="NIK (16 digit)" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" value={anggotaNik} onChange={(e) => handleAngkaChange(e, setAnggotaNik)} /></div>
                <div>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" value={anggotaHubungan} onChange={(e) => setAnggotaHubungan(e.target.value)}>
                    <option value="Istri">Istri</option>
                    <option value="Anak">Anak</option>
                    <option value="Saudara">Saudara</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <button type="submit" disabled={processingId === targetKepalaKeluarga.warga_id} className="sm:col-span-2 w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2.5 rounded-xl text-xs transition">Simpan Anggota</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

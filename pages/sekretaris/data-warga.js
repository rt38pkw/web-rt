import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/sekretaris/Layout';

export default function SekretarisDataWarga() {
  const [wargaList, setWargaList] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  // State Form Tambah
  const [namaLengkap, setNamaLengkap] = useState('');
  const [noRumah, setNoRumah] = useState('');
  const [nik, setNik] = useState('');
  const [noKk, setNoKk] = useState('');
  const [noWa, setNoWa] = useState('');
  const [kategori, setKategori] = useState('Warga');
  const [password, setPassword] = useState('123456');
  const [statusHuni, setStatusHuni] = useState('pemilik');

  // State Modal Edit
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editNama, setEditNama] = useState('');
  const [editNoRumah, setEditNoRumah] = useState('');
  const [editNik, setEditNik] = useState('');
  const [editNoKk, setEditNoKk] = useState('');
  const [editNoWa, setEditNoWa] = useState('');
  const [editKategori, setEditKategori] = useState('Warga');
  const [editStatusHuni, setEditStatusHuni] = useState('pemilik');

  useEffect(() => { fetchWarga(); }, []);

  async function fetchWarga() {
    setLoading(true);
    const { data, error } = await supabase.from('warga').select('*').order('nama_lengkap', { ascending: true });
    if (!error && data) setWargaList(data);
    setLoading(false);
  }

  const handleTambahWarga = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { data: existing } = await supabase.from('warga').select('id').eq('no_rumah', noRumah.trim()).maybeSingle();
    if (existing) {
      alert(`Nomor rumah "${noRumah}" sudah terdaftar!`);
      setIsSubmitting(false);
      return;
    }
    const { error } = await supabase.from('warga').insert([{
      nama_lengkap: namaLengkap.trim(),
      no_rumah: noRumah.trim(),
      nik: nik.trim() || null,
      no_kk: noKk.trim() || null,
      no_wa: noWa.trim() || null,
      kategori: kategori,
      password: password.trim() || '123456',
      status_huni: statusHuni,
      status_verifikasi_profil: 'approved'
    }]);
    setIsSubmitting(false);
    if (error) {
      alert(`Gagal menambah data warga: ${error.message}`);
    } else {
      alert('✅ Data warga berhasil ditambahkan!');
      setNamaLengkap(''); setNoRumah(''); setNik(''); setNoKk(''); setNoWa('');
      setKategori('Warga'); setPassword('123456'); setStatusHuni('pemilik');
      fetchWarga();
    }
  };

  // ═══ FUNGSI EDIT DATA ═══
  const openEditModal = (w) => {
    setEditId(w.id);
    setEditNama(w.nama_lengkap || '');
    setEditNoRumah(w.no_rumah || '');
    setEditNik(w.nik || '');
    setEditNoKk(w.no_kk || '');
    setEditNoWa(w.no_wa || '');
    setEditKategori(w.kategori || 'Warga');
    setEditStatusHuni(w.status_huni || 'pemilik');
    setShowEditModal(true);
  };

  const handleUpdateWarga = async (e) => {
    e.preventDefault();
    setProcessingId(editId);
    const { error } = await supabase.from('warga').update({
      nama_lengkap: editNama.trim(),
      no_rumah: editNoRumah.trim(),
      nik: editNik.trim() || null,
      no_kk: editNoKk.trim() || null,
      no_wa: editNoWa.trim() || null,
      kategori: editKategori,
      status_huni: editStatusHuni,
    }).eq('id', editId);

    setProcessingId(null);
    if (error) {
      alert('Gagal update data: ' + error.message);
    } else {
      alert('✅ Data warga berhasil diperbarui!');
      setShowEditModal(false);
      fetchWarga();
    }
  };

  // ═══ FUNGSI RESET PASSWORD ═══
  const handleResetPassword = async (w) => {
    if (!confirm(`Reset password untuk ${w.nama_lengkap} (${w.no_rumah}) menjadi "123456"?`)) return;
    setProcessingId(w.id);
    const { error } = await supabase.from('warga').update({ password: '123456', password_pending: null }).eq('id', w.id);
    setProcessingId(null);
    if (error) alert('Gagal reset password: ' + error.message);
    else alert('✅ Password berhasil direset ke 123456.');
  };

  // ═══ FUNGSI SELESAIKAN SEWA (ARSIP PENYEWA) ═══
  const handleSelesaikanSewa = async (w) => {
    const pilihan = prompt(`Selesaikan masa sewa untuk rumah ${w.no_rumah}.\n\nKetik "PEMILIK" jika akan dihuni pemilik.\nKetik "KOSONG" jika rumah akan kosong.`, "PEMILIK");
    
    if (!pilihan) return;
    const newStatusHuni = pilihan.toUpperCase() === 'PEMILIK' ? 'pemilik' : 'kosong';
    
    if (!confirm(`Yakin ubah status menjadi ${newStatusHuni.toUpperCase()} dan arsipkan penyewa lama?`)) return;

    setProcessingId(w.id);
    try {
      // 1. Ubah status rumah
      const { error: errWarga } = await supabase.from('warga').update({ status_huni: newStatusHuni }).eq('id', w.id);
      if (errWarga) throw errWarga;

      // 2. Arsipkan semua penghuni (is_aktif = false)
      const { error: errPenghuni } = await supabase.from('penghuni').update({ is_aktif: false }).eq('warga_id', w.id).eq('is_aktif', true);
      if (errPenghuni) throw errPenghuni;

      alert('✅ Masa sewa selesai. Penyewa telah diarsipkan.');
      fetchWarga();
    } catch (err) {
      alert('Gagal menyelesaikan sewa: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  // ═══ FUNGSI HAPUS WARGA (DENGAN PROTEKSI) ═══
  const handleHapusWarga = async (w) => {
    if (!confirm(`⚠️ PERINGATAN KERAS ⚠️\n\nHapus permanen data warga ${w.nama_lengkap} (${w.no_rumah})?\n\nData iuran dan riwayat transaksi yang terkait tidak akan ikut terhapus.`)) return;
    
    setProcessingId(w.id);
    try {
      // Cek apakah punya riwayat iuran
      const { count: countIuran } = await supabase.from('iuran').select('*', { count: 'exact', head: true }).eq('warga_id', w.id);
      const { count: countProyek } = await supabase.from('iuran_proyek').select('*', { count: 'exact', head: true }).eq('warga_id', w.id);

      if (countIuran > 0 || countProyek > 0) {
        alert(`❌ GAGAL MENGHAPUS.\n\nWarga ini sudah memiliki riwayat transaksi (Iuran/Proyek). Untuk keamanan data keuangan, data warga tidak bisa dihapus.`);
        setProcessingId(null);
        return;
      }

      // Jika aman, hapus (Supabase akan otomatis hapus data penghuni terkait jika ada CASCADE)
      const { error } = await supabase.from('warga').delete().eq('id', w.id);
      if (error) throw error;
      
      alert('✅ Data warga berhasil dihapus.');
      fetchWarga();
    } catch (err) {
      alert('Gagal menghapus warga: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredWarga = wargaList.filter(w => w.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) || w.no_rumah?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FORM TAMBAH WARGA */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 h-fit">
          <h2 className="text-base font-bold text-white flex items-center gap-2"><span>➕</span> Tambah Data Warga</h2>
          <form onSubmit={handleTambahWarga} className="space-y-4 pt-2">
            <div><label className="block text-xs font-semibold text-slate-300 mb-1">Nama Lengkap *</label><input type="text" required placeholder="Contoh: Ahmad Subagja" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white" value={namaLengkap} onChange={(e) => setNamaLengkap(e.target.value)} /></div>
            <div><label className="block text-xs font-semibold text-slate-300 mb-1">No. Rumah *</label><input type="text" required placeholder="Contoh: A1 - 06" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white" value={noRumah} onChange={(e) => setNoRumah(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Status Huni</label>
                <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={statusHuni} onChange={(e) => setStatusHuni(e.target.value)}>
                  <option value="pemilik">Dihuni Pemilik</option>
                  <option value="sewa">Disewakan (Kontrak)</option>
                  <option value="kosong">Kosong</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Kategori</label>
                <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={kategori} onChange={(e) => setKategori(e.target.value)}>
                  <option value="Warga">Warga</option>
                  <option value="Usaha">Usaha</option>
                </select>
              </div>
            </div>
            <div><label className="block text-xs font-semibold text-slate-300 mb-1">NIK</label><input type="text" placeholder="16 digit (opsional)" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white" value={nik} onChange={(e) => setNik(e.target.value)} /></div>
            <div><label className="block text-xs font-semibold text-slate-300 mb-1">No. KK</label><input type="text" placeholder="16 digit (opsional)" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white" value={noKk} onChange={(e) => setNoKk(e.target.value)} /></div>
            <div><label className="block text-xs font-semibold text-slate-300 mb-1">No. WhatsApp</label><input type="text" placeholder="08123456789" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white" value={noWa} onChange={(e) => setNoWa(e.target.value)} /></div>
            <div><label className="block text-xs font-semibold text-slate-300 mb-1">Password Login</label><input type="text" placeholder="Default: 123456" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-xs transition shadow-lg shadow-teal-600/30 active:scale-[0.98]">{isSubmitting ? 'Menyimpan...' : 'Simpan Data Warga'}</button>
          </form>
        </div>

        {/* TABEL WARGA */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3"><span className="text-slate-400 pl-2">🔍</span><input type="text" placeholder="Cari nama warga atau no. rumah..." className="w-full bg-transparent text-xs text-white focus:outline-none" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800"><th className="p-4">Nama / No. Rumah</th><th className="p-4">Status / Kategori</th><th className="p-4">Verifikasi</th><th className="p-4 text-right">Aksi</th></tr></thead>
                <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                  {loading ? (<tr><td colSpan="4" className="text-center py-8 text-slate-500">Memuat data...</td></tr>) : filteredWarga.length === 0 ? (<tr><td colSpan="4" className="text-center py-8 text-slate-500">Data tidak ditemukan.</td></tr>) : (
                    filteredWarga.map((w) => {
                      const isUsaha = w.kategori === 'Usaha';
                      const isProcessing = processingId === w.id;
                      return (
                        <tr key={w.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-4">
                            <div className="font-semibold text-white">{w.nama_lengkap}</div>
                            <div className="text-[10px] text-teal-400 font-mono mt-0.5">{w.no_rumah}</div>
                          </td>
                          <td className="p-4 space-y-1">
                            <div>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${w.status_huni === 'sewa' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : w.status_huni === 'kosong' ? 'bg-slate-800/60 text-slate-400 border-slate-700/60' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                {w.status_huni || 'Pemilik'}
                              </span>
                            </div>
                            <div>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${isUsaha ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-800/60 text-slate-400 border-slate-700/60'}`}>
                                {isUsaha ? '🏪 Usaha' : '🏠 Warga'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${w.status_verifikasi_profil === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : w.status_verifikasi_profil === 'pending' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                              {w.status_verifikasi_profil || 'Belum'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <button onClick={() => openEditModal(w)} disabled={isProcessing} className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white p-2 rounded-lg transition" title="Edit Data">✏️</button>
                              <button onClick={() => handleResetPassword(w)} disabled={isProcessing} className="bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white p-2 rounded-lg transition" title="Reset Password ke 123456">🔑</button>
                              {w.status_huni === 'sewa' && (
                                <button onClick={() => handleSelesaikanSewa(w)} disabled={isProcessing} className="bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white p-2 rounded-lg transition" title="Selesaikan Sewa (Arsipkan Penyewa)">🚪</button>
                              )}
                              <button onClick={() => handleHapusWarga(w)} disabled={isProcessing} className="bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white p-2 rounded-lg transition" title="Hapus Warga">🗑️</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL EDIT WARGA */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">✏️ Edit Data Warga</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleUpdateWarga} className="space-y-4">
              <div><label className="block text-xs font-semibold text-slate-300 mb-1">Nama Lengkap *</label><input type="text" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white" value={editNama} onChange={(e) => setEditNama(e.target.value)} /></div>
              <div><label className="block text-xs font-semibold text-slate-300 mb-1">No. Rumah *</label><input type="text" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white" value={editNoRumah} onChange={(e) => setEditNoRumah(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status Huni</label>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={editStatusHuni} onChange={(e) => setEditStatusHuni(e.target.value)}>
                    <option value="pemilik">Dihuni Pemilik</option>
                    <option value="sewa">Disewakan (Kontrak)</option>
                    <option value="kosong">Kosong</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Kategori</label>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={editKategori} onChange={(e) => setEditKategori(e.target.value)}>
                    <option value="Warga">Warga</option>
                    <option value="Usaha">Usaha</option>
                  </select>
                </div>
              </div>
              <div><label className="block text-xs font-semibold text-slate-300 mb-1">NIK</label><input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white" value={editNik} onChange={(e) => setEditNik(e.target.value)} /></div>
              <div><label className="block text-xs font-semibold text-slate-300 mb-1">No. KK</label><input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white" value={editNoKk} onChange={(e) => setEditNoKk(e.target.value)} /></div>
              <div><label className="block text-xs font-semibold text-slate-300 mb-1">No. WhatsApp</label><input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white" value={editNoWa} onChange={(e) => setEditNoWa(e.target.value)} /></div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs">Batal</button>
                <button type="submit" disabled={processingId === editId} className="w-2/3 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-xs">{processingId === editId ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

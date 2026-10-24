import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/sekretaris/Layout';

export default function SekretarisDataWarga() {
  const [wargaList, setWargaList] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [namaLengkap, setNamaLengkap] = useState('');
  const [noRumah, setNoRumah] = useState('');
  const [nik, setNik] = useState('');
  const [noKk, setNoKk] = useState('');
  const [noWa, setNoWa] = useState('');
  const [kategori, setKategori] = useState('Warga');
  const [password, setPassword] = useState('123456');
  const [statusHuni, setStatusHuni] = useState('pemilik');

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

  const filteredWarga = wargaList.filter(w => w.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) || w.no_rumah?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 h-fit">
          <h2 className="text-base font-bold text-white flex items-center gap-2"><span>➕</span> Tambah Data Warga Baru</h2>
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
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3"><span className="text-slate-400 pl-2">🔍</span><input type="text" placeholder="Cari nama warga atau no. rumah..." className="w-full bg-transparent text-xs text-white focus:outline-none" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800"><th className="p-4">Nama Warga</th><th className="p-4">No. Rumah</th><th className="p-4">Status Huni</th><th className="p-4">Kategori</th><th className="p-4">Verifikasi</th></tr></thead>
                <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                  {loading ? (<tr><td colSpan="5" className="text-center py-8 text-slate-500">Memuat data...</td></tr>) : filteredWarga.length === 0 ? (<tr><td colSpan="5" className="text-center py-8 text-slate-500">Data tidak ditemukan.</td></tr>) : (
                    filteredWarga.map((w) => {
                      const isUsaha = w.kategori === 'Usaha';
                      return (
                        <tr key={w.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-4"><div className="font-semibold text-white">{w.nama_lengkap}</div><div className="text-[10px] text-slate-500 font-mono mt-0.5">{w.no_wa || '-'}</div></td>
                          <td className="p-4 font-mono text-teal-400 font-semibold">{w.no_rumah}</td>
                          <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${w.status_huni === 'sewa' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : w.status_huni === 'kosong' ? 'bg-slate-800/60 text-slate-400 border-slate-700/60' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>{w.status_huni || 'Pemilik'}</span></td>
                          <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${isUsaha ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-800/60 text-slate-400 border-slate-700/60'}`}>{isUsaha ? '🏪 Usaha' : '🏠 Warga'}</span></td>
                          <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${w.status_verifikasi_profil === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>{w.status_verifikasi_profil || 'Belum'}</span></td>
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
    </Layout>
  );
}

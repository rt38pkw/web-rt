import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function DataWarga() {
  const [wargaList, setWargaList] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Form State untuk Tambah Warga
  const [nama, setNama] = useState('');
  const [nik, setNik] = useState('');
  const [blok, setBlok] = useState('');
  const [noHp, setNoHp] = useState('');
  const [status, setStatus] = useState('Tetap');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchWarga();
  }, []);

  async function fetchWarga() {
    setLoading(true);
    const { data, error } = await supabase
      .from('warga')
      .select('*')
      .order('nama', { ascending: true });

    if (!error && data) {
      setWargaList(data);
    }
    setLoading(false);
  }

  const handleTambahWarga = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase.from('warga').insert([
      {
        nama,
        nik,
        blok_rumah: blok,
        no_hp: noHp,
        status_tinggal: status,
      },
    ]);

    setIsSubmitting(false);

    if (error) {
      alert(`Gagal menambah data warga: ${error.message}`);
    } else {
      alert('Data warga berhasil ditambahkan!');
      setNama('');
      setNik('');
      setBlok('');
      setNoHp('');
      fetchWarga();
    }
  };

  // Filter carian nama / blok
  const filteredWarga = wargaList.filter(
    (w) =>
      w.nama?.toLowerCase().includes(search.toLowerCase()) ||
      w.blok_rumah?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Background Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-80 bg-indigo-600/10 blur-[120px] pointer-events-none rounded-full"></div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        {/* Header Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/80 border border-slate-800 p-6 rounded-2xl backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center text-2xl font-bold border border-indigo-500/20">
              👥
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">Data Kependudukan Warga</h1>
              <p className="text-xs text-slate-400">Direktori maklumat warga & Ketua Keluarga terdaftar</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href="/"
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-4 py-2.5 rounded-xl transition active:scale-95"
            >
              &larr; Beranda
            </Link>
            <Link
              href="/admin"
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              Portal Admin
            </Link>
          </div>
        </div>

        {/* Form Registration & Search Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Tambah Warga (1 Column) */}
          <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 h-fit">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>➕</span> Tambah Data Warga Baru
            </h2>
            <p className="text-xs text-slate-400">Daftarkan warga baru ke dalam sistem database RT.</p>

            <form onSubmit={handleTambahWarga} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ahmad Subagja"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">NIK (Nombor KTP)</label>
                <input
                  type="text"
                  placeholder="16 digit NIK"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  value={nik}
                  onChange={(e) => setNik(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Blok / No. Rumah</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: B2/05"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    value={blok}
                    onChange={(e) => setBlok(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status Tinggal</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="Tetap">Tetap</option>
                    <option value="Kontrak">Kontrak / Sewa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">No. WhatsApp / HP</label>
                <input
                  type="text"
                  placeholder="08123456789"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  value={noHp}
                  onChange={(e) => setNoHp(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold py-3 rounded-xl text-xs transition shadow-lg shadow-indigo-600/30 active:scale-[0.98]"
              >
                {isSubmitting ? 'Simpan...' : 'Simpan Data Warga'}
              </button>
            </form>
          </div>

          {/* Table Directory Warga (2 Columns) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search Input Card */}
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
              <span className="text-slate-400 pl-2">🔍</span>
              <input
                type="text"
                placeholder="Cari nama warga atau blok rumah..."
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Table Container */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                      <th className="p-4">Nama Warga</th>
                      <th className="p-4">Blok Rumah</th>
                      <th className="p-4">No. HP</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="text-center py-8 text-slate-500">
                          Memuat data kependudukan...
                        </td>
                      </tr>
                    ) : filteredWarga.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-8 text-slate-500">
                          Data warga tidak ditemukan.
                        </td>
                      </tr>
                    ) : (
                      filteredWarga.map((w) => (
                        <tr key={w.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-4">
                            <div className="font-semibold text-white">{w.nama}</div>
                            {w.nik && <div className="text-[10px] text-slate-500 font-mono">NIK: {w.nik}</div>}
                          </td>
                          <td className="p-4 font-mono text-indigo-400 font-semibold">{w.blok_rumah}</td>
                          <td className="p-4 text-slate-400">{w.no_hp || '-'}</td>
                          <td className="p-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                w.status_tinggal === 'Tetap'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {w.status_tinggal || 'Tetap'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

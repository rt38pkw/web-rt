import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [pengumuman, setPengumuman] = useState([]);

  useEffect(() => {
    async function fetchPengumuman() {
      const { data } = await supabase.from('pengumuman').select('*').order('created_at', { ascending: false }).limit(3);
      if (data) setPengumuman(data);
    }
    fetchPengumuman();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Background Glow Deco */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-blue-600/10 blur-[120px] pointer-events-none rounded-full"></div>

      {/* Navbar Modern */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-blue-500/30">
              RT
            </div>
            <div>
              <h1 className="font-bold text-white text-base leading-none">Layanan Warga RT</h1>
              <p className="text-[11px] text-slate-400 mt-0.5">Portal Digital Lingkungan Sejahtera</p>
            </div>
          </div>
          <Link
            href="/admin"
            className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 px-4 py-2 rounded-xl transition duration-200 active:scale-95"
          >
            Portal Pengurus &rarr;
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-10 space-y-12 relative z-10">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            ✨ Layanan Mandiri Online 24/7
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Kemudahan Administrasi <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Dalam Genggaman</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Bayar iuran QRIS, cek status kependudukan, hingga ajukan surat pengantar secara cepat dan transparan.
          </p>
        </div>

        {/* Quick Menu Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Link href="/iuran" className="group bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/50 p-6 rounded-2xl shadow-xl transition-all duration-300 relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition duration-300">
              💳
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition">Bayar Iuran RT</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">Pembayaran iuran kebersihan & keamanan via scan QRIS otomatis.</p>
            <div className="mt-4 text-xs font-semibold text-blue-400 flex items-center gap-1 group-hover:translate-x-1 transition">Bayar Sekarang &rarr;</div>
          </Link>

          <Link href="/surat" className="group bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 p-6 rounded-2xl shadow-xl transition-all duration-300 relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition duration-300">
              📄
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition">Surat Pengantar</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">Ajukan surat pengantar RT untuk KTP, KK, dan keperluaan domisili.</p>
            <div className="mt-4 text-xs font-semibold text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition">Buat Surat &rarr;</div>
          </Link>

          <Link href="/warga" className="group bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-2xl shadow-xl transition-all duration-300 relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition duration-300">
              👥
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition">Pendataan Warga</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">Cek & daftarkan data anggota keluarga untuk pendataan resmi RT.</p>
            <div className="mt-4 text-xs font-semibold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition">Lihat Data &rarr;</div>
          </Link>
        </div>

        {/* Pengumuman Feed */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-md">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">📢 Pengumuman Lingkungan</h3>
              <p className="text-xs text-slate-400">Informasi dan kegiatan terbaru warga</p>
            </div>
          </div>

          <div className="space-y-4">
            {pengumuman.length > 0 ? (
              pengumuman.map((item) => (
                <div key={item.id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1">
                  <h4 className="font-semibold text-sm text-white">{item.judul}</h4>
                  <p className="text-xs text-slate-400">{item.isi}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">Belum ada pengumuman terbaru.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// pages/dashboard-warga/pengaturan.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import Layout from '../../components/warga/Layout';

export default function PengaturanWarga() {
  const router = useRouter();
  const [warga, setWarga] = useState(null);

  useEffect(() => {
    const savedSession = localStorage.getItem('warga_session');
    if (!savedSession) {
      router.replace('/');
      return;
    }
    setWarga(JSON.parse(savedSession));
  }, []);

  const handleLogout = () => {
    if (!confirm('Yakin ingin keluar dari akun ini? Anda harus login kembali besok.')) return;
    localStorage.removeItem('warga_session');
    router.replace('/');
  };

  const handleTutupAplikasi = () => {
    if (Capacitor.isNativePlatform()) {
      App.exitApp();
    } else {
      alert('Silakan tutup tab ini secara manual.');
    }
  };

  if (!warga) return null;

  return (
    <>
      <Head><title>Pengaturan Akun - Portal Warga RT 38</title></Head>
      <Layout warga={warga}>
        <div className="max-w-md mx-auto space-y-4">

          {/* HEADER HALAMAN — dengan tombol Kembali */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-5 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-white">⚙️ Pengaturan Akun</h2>
                <p className="text-xs text-slate-400 mt-1">Kelola sesi dan akses aplikasi Anda.</p>
              </div>
              <Link
                href="/dashboard-warga"
                className="shrink-0 text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg text-slate-300 border border-slate-700 transition active:scale-95"
              >
                ← Kembali
              </Link>
            </div>
          </div>

          {/* INFO AKUN */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Nama</span>
              <span className="text-white font-semibold">{warga.nama_lengkap}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">No. Rumah</span>
              <span className="text-white font-semibold">{warga.no_rumah}</span>
            </div>
          </div>

          {/* AKSI */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <button
              onClick={handleLogout}
              className="w-full text-left p-4 hover:bg-slate-800/60 transition flex items-center justify-between border-b border-slate-800"
            >
              <div>
                <div className="text-sm font-bold text-rose-400">🚪 Logout Akun</div>
                <div className="text-[10px] text-slate-500">Hapus sesi login di HP ini.</div>
              </div>
              <span className="text-slate-600">&rarr;</span>
            </button>

            <button
              onClick={handleTutupAplikasi}
              className="w-full text-left p-4 hover:bg-slate-800/60 transition flex items-center justify-between"
            >
              <div>
                <div className="text-sm font-bold text-slate-300">✕ Tutup Aplikasi</div>
                <div className="text-[10px] text-slate-500">Keluar dari aplikasi (sesi tetap tersimpan).</div>
              </div>
              <span className="text-slate-600">&rarr;</span>
            </button>
          </div>

          <p className="text-center text-[10px] text-slate-600 mt-4">
            Fitur Ubah PIN ada di halaman Status Iuran (Profil Anda).
          </p>
        </div>
      </Layout>
    </>
  );
}

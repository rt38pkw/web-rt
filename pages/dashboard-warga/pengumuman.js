import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../components/warga/Layout';
import ProfileCard from '../../components/warga/ProfileCard';
import { getTarif, isWargaUsaha } from '../../lib/iuran/constants';

export default function DashboardWargaPengumuman() {
  const [warga, setWarga] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const savedSession = localStorage.getItem('warga_session');
    if (!savedSession) {
      router.push('/');
      return;
    }
    setWarga(JSON.parse(savedSession));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('warga_session');
    router.push('/');
  };

  if (!warga) return null;

  const tarifBulanan = getTarif(warga);
  const usaha = isWargaUsaha(warga);

  return (
    <>
      <Head>
        <title>Pengumuman - Portal Warga RT 38</title>
      </Head>
      <Layout warga={warga} onLogout={handleLogout}>
        <ProfileCard warga={warga} tarifBulanan={tarifBulanan} isUsaha={usaha} />

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-4 animate-in fade-in duration-200">
          <h3 className="text-base font-bold text-white">📢 Pengumuman Lingkungan RT 38</h3>
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
              Penting
            </span>
            <h4 className="text-sm font-bold text-white">
              Peluncuran Portal Mandiri Warga RT 38
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Selamat datang di Portal Digital RT 38 Puri Kencana Wagir! Warga dapat memantau
              riwayat pembayaran iuran bulanan dan informasi lingkungan secara real-time.
            </p>
            <span className="text-[10px] text-slate-500 block pt-1">Diunggah: Oktober 2026</span>
          </div>
        </div>
      </Layout>
    </>
  );
}
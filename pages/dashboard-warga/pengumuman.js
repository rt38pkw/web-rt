import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../components/warga/Layout';
import ProfileCard from '../../components/warga/ProfileCard';
import { isWargaUsaha } from '../../lib/iuran/constants';
import { fetchTarifList, getTarifWarga } from '../../lib/iuran/tarif';

export default function DashboardWargaSurat() {
  const [warga, setWarga] = useState(null);
  const [tarifList, setTarifList] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const savedSession = localStorage.getItem('warga_session');
    if (!savedSession) {
      router.push('/');
      return;
    }
    setWarga(JSON.parse(savedSession));
    loadTarif();
  }, []);

  const loadTarif = async () => {
    try {
      const data = await fetchTarifList();
      setTarifList(data);
    } catch (err) {
      console.error('Gagal ambil tarif:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('warga_session');
    router.push('/');
  };

  if (!warga) return null;

  const tarifBulanan = getTarifWarga(warga, tarifList, 2026);
  const usaha = isWargaUsaha(warga);

  return (
    <>
      <Head>
        <title>Surat Mandiri - Portal Warga RT 38</title>
      </Head>
      <Layout warga={warga} onLogout={handleLogout}>
        <ProfileCard warga={warga} tarifBulanan={tarifBulanan} isUsaha={usaha} />

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 text-center space-y-3 animate-in fade-in duration-200">
          <div className="text-4xl">📄</div>
          <h3 className="text-base font-bold text-white">Pengajuan Surat Pengantar</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Fitur pencetakan dan pengajuan Surat Pengantar RT online sedang dalam tahap
            pengembangan dan akan segera diaktifkan.
          </p>
          <button
            disabled
            className="px-4 py-2 bg-slate-800/60 text-slate-500 rounded-xl text-xs font-semibold cursor-not-allowed border border-slate-800"
          >
            Segera Hadir 🚧
          </button>
        </div>
      </Layout>
    </>
  );
}

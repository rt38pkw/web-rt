import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../components/warga/Layout';
import ProfileCard from '../../components/warga/ProfileCard';
import IuranGrid from '../../components/warga/IuranGrid';
import ModalBayar from '../../components/warga/ModalBayar';
import ModalRekap from '../../components/warga/ModalRekap';
import ModalDetailBulan from '../../components/warga/ModalDetailBulan';
import { PERIODE_BULAN, getTarif, isWargaUsaha } from '../../lib/iuran/constants';
import { getInfoBulan, hitungBelumLunas } from '../../lib/iuran/calculations';
import {
  fetchWargaById,
  fetchIuranByWarga,
  fetchAllWarga,
  fetchAllIuran,
  insertPengajuanIuran,
} from '../../lib/iuran/queries';
import { uploadBukti } from '../../lib/iuran/storage';

export default function DashboardWargaIuran() {
  const [warga, setWarga] = useState(null);
  const [iuranList, setIuranList] = useState([]);
  const [allWargaList, setAllWargaList] = useState([]);
  const [allIuranList, setAllIuranList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRekap, setLoadingRekap] = useState(false);
  const [showRekapModal, setShowRekapModal] = useState(false);
  const [selectedBulanDetail, setSelectedBulanDetail] = useState(null);
  const [showModalBayar, setShowModalBayar] = useState(false);
  const [bulanDipilih, setBulanDipilih] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const savedSession = localStorage.getItem('warga_session');
    if (!savedSession) {
      router.push('/');
      return;
    }
    const userData = JSON.parse(savedSession);
    setWarga(userData);
    loadIuran(userData.id);
    refreshSession(userData.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshSession = async (wargaId) => {
    try {
      const data = await fetchWargaById(wargaId);
      setWarga(data);
      localStorage.setItem('warga_session', JSON.stringify(data));
    } catch (err) {
      console.error('Gagal refresh session:', err);
    }
  };

  const loadIuran = async (wargaId) => {
    try {
      const data = await fetchIuranByWarga(wargaId);
      setIuranList(data);
    } catch (err) {
      console.error('Gagal mengambil data iuran:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRekap = async () => {
    if (allWargaList.length > 0) {
      setShowRekapModal(true);
      return;
    }
    setLoadingRekap(true);
    try {
      const [wargaData, iuranData] = await Promise.all([fetchAllWarga(), fetchAllIuran()]);
      setAllWargaList(wargaData);
      setAllIuranList(iuranData);
      setShowRekapModal(true);
    } catch (err) {
      console.error('Gagal memuat rekap:', err);
    } finally {
      setLoadingRekap(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('warga_session');
    router.push('/');
  };

  if (!warga) return null;

  const tarifBulanan = getTarif(warga);
  const usaha = isWargaUsaha(warga);

  const totalDisetor = iuranList
    .filter((i) => i.status === 'approved')
    .reduce((acc, curr) => acc + Number(curr.jumlah || 0), 0);

  const adaPending = iuranList.some((i) => i.status === 'pending');
  const belumLunasList = hitungBelumLunas(iuranList, PERIODE_BULAN, tarifBulanan);
  const bulanTombolBayar = belumLunasList[0]?.kode || null;

  const handleOpenModalBayar = () => {
    setBulanDipilih(belumLunasList.map((b) => b.kode));
    setShowModalBayar(true);
  };

  const handleSubmitBayar = async ({ fileBukti, catatan, bulanDipilih: bulanPilih }) => {
    setSubmitting(true);
    try {
      const batchId = crypto.randomUUID();
      const uploadedUrls = [];

      for (let i = 0; i < 3; i++) {
        const file = fileBukti[i];
        if (!file) continue;
        const url = await uploadBukti(file, warga.id, batchId, i);
        uploadedUrls.push(url);
      }

      const records = bulanPilih
        .map((bln) => {
          const info = getInfoBulan(iuranList, bln, tarifBulanan);
          return {
            warga_id: warga.id,
            bulan_tahun: bln,
            jumlah: info.kurang,
            status: 'pending',
            batch_id: batchId,
            bukti_urls: uploadedUrls,
            catatan: catatan || null,
            tanggal_transaksi: null,
          };
        })
        .filter((r) => r.jumlah > 0);

      if (records.length === 0) throw new Error('Tidak ada nominal yang perlu dibayar');

      await insertPengajuanIuran(records);

      alert('✅ Pengajuan berhasil dikirim! Menunggu approve bendahara.');
      setShowModalBayar(false);
      loadIuran(warga.id);
    } catch (err) {
      console.error(err);
      alert('Gagal mengirim: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Status Iuran - Portal Warga RT 38</title>
      </Head>
      <Layout warga={warga} onLogout={handleLogout}>
        <ProfileCard warga={warga} tarifBulanan={tarifBulanan} isUsaha={usaha} />

        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/30 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                📊 Transparansi Kas RT 38
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Lihat rekapitulasi pembayaran iuran seluruh warga secara lengkap.
              </p>
            </div>
            <button
              onClick={loadRekap}
              disabled={loadingRekap}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 shrink-0"
            >
              {loadingRekap ? 'Memuat Data...' : '📋 Lihat Rekap Seluruh Warga'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                Total Setor Warga
              </span>
              <span className="text-lg sm:text-2xl font-black text-white mt-1">
                Rp {totalDisetor.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="bg-slate-900/60 border border-emerald-500/20 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
              <span className="text-[11px] text-emerald-400 uppercase tracking-wider font-medium">
                Total Donasi 💚
              </span>
              <span className="text-lg sm:text-2xl font-black text-emerald-400 mt-1">Rp 0</span>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Memuat data iuran...</div>
          ) : (
            <IuranGrid
              iuranList={iuranList}
              tarifBulanan={tarifBulanan}
              adaPending={adaPending}
              bulanTombolBayar={bulanTombolBayar}
              onKlikDetail={setSelectedBulanDetail}
              onBayar={handleOpenModalBayar}
            />
          )}
        </div>
      </Layout>

      <ModalDetailBulan
        detail={selectedBulanDetail}
        onClose={() => setSelectedBulanDetail(null)}
      />

      <ModalBayar
        show={showModalBayar}
        onClose={() => setShowModalBayar(false)}
        iuranList={iuranList}
        tarifBulanan={tarifBulanan}
        belumLunasList={belumLunasList}
        bulanDipilih={bulanDipilih}
        setBulanDipilih={setBulanDipilih}
        onSubmit={handleSubmitBayar}
        submitting={submitting}
      />

      <ModalRekap
        show={showRekapModal}
        onClose={() => setShowRekapModal(false)}
        allWargaList={allWargaList}
        allIuranList={allIuranList}
      />
    </>
  );
}
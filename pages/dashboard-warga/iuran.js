import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/warga/Layout';
import ProfileCard from '../../components/warga/ProfileCard';
import IuranGrid from '../../components/warga/IuranGrid';
import ModalBayar from '../../components/warga/ModalBayar';
import ModalRekap from '../../components/warga/ModalRekap';
import ModalDetailBulan from '../../components/warga/ModalDetailBulan';
import ModalKasRT from '../../components/warga/ModalKasRT';

import {
  getPeriodeBulan,
  TAHUN_TERSEDIA,
  getTahunSekarang,
  isWargaUsaha,
} from '../../lib/iuran/constants';
import { getInfoBulan, hitungBelumLunas, formatTanggal } from '../../lib/iuran/calculations';
import {
  fetchWargaById,
  fetchIuranByWarga,
  fetchAllWarga,
  fetchAllIuran, // <-- Kita butuh ini
  insertPengajuanIuran,
} from '../../lib/iuran/queries';
import { uploadBukti } from '../../lib/iuran/storage';
import { fetchTarifList, getTarifWarga } from '../../lib/iuran/tarif';

export default function DashboardWargaIuran() {
  const [warga, setWarga] = useState(null);
  const [iuranList, setIuranList] = useState([]);
  const [depositList, setDepositList] = useState([]);
  const [tarifList, setTarifList] = useState([]);
  const [allWargaList, setAllWargaList] = useState([]);
  const [allIuranList, setAllIuranList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRekap, setLoadingRekap] = useState(false);
  
  const [showRekapModal, setShowRekapModal] = useState(false);
  const [showKasRTModal, setShowKasRTModal] = useState(false);
  
  // State untuk Kas RT (Global)
  const [kasRTIuranList, setKasRTIuranList] = useState([]); // Khusus narik semua iuran
  const [pengeluaranList, setPengeluaranList] = useState([]);
  const [pemasukanLainList, setPemasukanLainList] = useState([]);

  const [selectedBulanDetail, setSelectedBulanDetail] = useState(null);
  const [showModalBayar, setShowModalBayar] = useState(false);
  const [bulanDipilih, setBulanDipilih] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [tahunTerpilih, setTahunTerpilih] = useState(getTahunSekarang());

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
    loadDeposit(userData.id);
    loadTarif();
    refreshSession(userData.id);
  }, []);

  // ═══ REALTIME ═══
  useEffect(() => {
    if (!warga?.id) return;
    const channel = supabase
      .channel('warga-iuran-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'iuran' }, () => loadIuran(warga.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposit_warga' }, () => loadDeposit(warga.id))
      // Jangan lupa realtime pengeluaran/pemasukan kalau modal kas RT sedang terbuka
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pengeluaran' }, () => { if(showKasRTModal) loadKasRT(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pemasukan_lain' }, () => { if(showKasRTModal) loadKasRT(); })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [warga?.id, showKasRTModal]);

  // ... (refreshSession, loadIuran, loadDeposit, loadTarif tetap sama seperti kodemu) ...
  const refreshSession = async (wargaId) => {
    try {
      const data = await fetchWargaById(wargaId);
      setWarga(data);
      const { password: _, ...profilAman } = data;
      localStorage.setItem('warga_session', JSON.stringify(profilAman));
    } catch (err) {}
  };

  const loadIuran = async (wargaId) => {
    try {
      const data = await fetchIuranByWarga(wargaId);
      setIuranList(data);
    } catch (err) {} finally { setLoading(false); }
  };

  const loadDeposit = async (wargaId) => {
    try {
      const { data, error } = await supabase.from('deposit_warga').select('*').eq('warga_id', wargaId).order('tanggal', { ascending: false });
      if (!error && data) setDepositList(data);
    } catch (err) {}
  };

  const loadTarif = async () => {
    try {
      const data = await fetchTarifList();
      setTarifList(data);
    } catch (err) {}
  };

  // ═══ FUNGSI BARU: Ambil data KAS RT GLOBAL ═══
  const loadKasRT = async () => {
    try {
      const [resIuranGlobal, resPengeluaran, resPemasukan] = await Promise.all([
        fetchAllIuran(), // <-- Ambil SEMUA iuran dari semua warga
        supabase.from('pengeluaran').select('*').order('tanggal', { ascending: false }),
        supabase.from('pemasukan_lain').select('*').order('tanggal', { ascending: false })
      ]);
      setKasRTIuranList(resIuranGlobal || []);
      setPengeluaranList(resPengeluaran.data || []);
      setPemasukanLainList(resPemasukan.data || []);
    } catch (err) {
      console.error('Gagal load kas RT:', err);
    }
  };

  const handleBukaKasRT = () => {
    loadKasRT(); // Tarik data terbaru dulu
    setShowKasRTModal(true);
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
      alert('Gagal memuat rekap.');
    } finally {
      setLoadingRekap(false);
    }
  };

  const handleLogout = () => {
    if (!confirm('Keluar dari akun warga?')) return;
    localStorage.removeItem('warga_session');
    router.replace('/');
  };

  if (!warga) return null;

  const periodeBulanAktif = getPeriodeBulan(tahunTerpilih);
  const tarifBulanan = getTarifWarga(warga, tarifList, tahunTerpilih);
  const usaha = isWargaUsaha(warga);

  const totalDisetor = iuranList.filter((i) => i.status === 'approved').reduce((acc, curr) => acc + Number(curr.jumlah || 0), 0);
  const saldoDeposit = depositList.reduce((s, d) => s + (d.tipe === 'masuk' ? Number(d.jumlah) : -Number(d.jumlah)), 0);
  const estimasiBulan = tarifBulanan > 0 ? Math.floor(saldoDeposit / tarifBulanan) : 0;

  const adaPending = iuranList.some((i) => i.status === 'pending');
  const belumLunasList = hitungBelumLunas(iuranList, periodeBulanAktif, tarifBulanan);
  const bulanTombolBayar = belumLunasList[0]?.kode || null;

  const handleOpenModalBayar = () => {
    setBulanDipilih(belumLunasList.map((b) => b.kode));
    setShowModalBayar(true);
  };

  const handleSubmitBayar = async ({ fileBukti, catatan, bulanDipilih: bulanPilih }) => {
    // ... (logika bayar tetap sama) ...
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
      const records = bulanPilih.map((bln) => {
          const info = getInfoBulan(iuranList, bln, tarifBulanan);
          return { warga_id: warga.id, bulan_tahun: bln, jumlah: info.kurang, status: 'pending', batch_id: batchId, bukti_urls: uploadedUrls, catatan: catatan || null, tanggal_transaksi: null };
        }).filter((r) => r.jumlah > 0);
      if (records.length === 0) throw new Error('Tidak ada nominal');
      await insertPengajuanIuran(records);
      alert('✅ Pengajuan berhasil!');
      setShowModalBayar(false);
      loadIuran(warga.id);
    } catch (err) { alert('Gagal: ' + err.message); } finally { setSubmitting(false); }
  };

  return (
    <>
      <Head><title>Status Iuran - Portal Warga RT 38</title></Head>
      <Layout warga={warga} onLogout={handleLogout}>
        <ProfileCard warga={warga} tarifBulanan={tarifBulanan} isUsaha={usaha} />

        <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/30 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">📊 Transparansi Kas RT 38</h4>
            <p className="text-xs text-slate-400 mt-0.5">Lihat rekapitulasi iuran dan arus kas RT secara terbuka.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
            <button onClick={loadRekap} disabled={loadingRekap} className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition border border-slate-700 flex items-center justify-center gap-2">
              {loadingRekap ? 'Memuat...' : '📋 Rekap Warga'}
            </button>
            {/* TOMBOL KAS RT PANGGIL FUNGSI BARU */}
            <button onClick={handleBukaKasRT} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">
              💰 Saldo Kas RT
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Total Setor</span>
            <span className="text-lg font-black text-white mt-1">Rp {totalDisetor.toLocaleString('id-ID')}</span>
          </div>
          <div className="bg-slate-900/60 border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[11px] text-emerald-400 uppercase tracking-wider font-medium">Total Donasi 💚</span>
            <span className="text-lg font-black text-emerald-400 mt-1">Rp 0</span>
          </div>
          <div className="bg-gradient-to-br from-purple-950/40 to-slate-900 border border-purple-500/30 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[11px] text-purple-300 uppercase tracking-wider font-medium">💎 Saldo Deposit</span>
            <span className="text-lg font-black text-purple-300 mt-1">Rp {saldoDeposit.toLocaleString('id-ID')}</span>
            {saldoDeposit > 0 && tarifBulanan > 0 && (
              <span className="text-[9px] text-slate-400 mt-0.5">Cukup untuk ±{estimasiBulan} bulan</span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Memuat data iuran...</div>
        ) : (
          <IuranGrid
            iuranList={iuranList} tarifBulanan={tarifBulanan} adaPending={adaPending} bulanTombolBayar={bulanTombolBayar} onKlikDetail={setSelectedBulanDetail} onBayar={handleOpenModalBayar}
          />
        )}
      </Layout>

      <ModalDetailBulan detail={selectedBulanDetail} onClose={() => setSelectedBulanDetail(null)} />
      
      <ModalBayar
        show={showModalBayar} onClose={() => setShowModalBayar(false)} iuranList={iuranList} tarifBulanan={tarifBulanan} belumLunasList={belumLunasList} bulanDipilih={bulanDipilih} setBulanDipilih={setBulanDipilih} onSubmit={handleSubmitBayar} submitting={submitting} tahun={tahunTerpilih}
      />

      {showRekapModal && (
        <ModalRekap show={showRekapModal} onClose={() => setShowRekapModal(false)} allWargaList={allWargaList} allIuranList={allIuranList} tarifList={tarifList} />
      )}

      {/* MODAL KAS RT PAKAI DATA GLOBAL */}
      <ModalKasRT
        show={showKasRTModal}
        onClose={() => setShowKasRTModal(false)}
        iuranList={kasRTIuranList} // <-- Ini data SEMUA warga, bukan cuma 1
        pemasukanLainList={pemasukanLainList}
        pengeluaranList={pengeluaranList}
      />
    </>
  );
}

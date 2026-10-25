import { useEffect, useState, useRef } from 'react';
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
import ModalLengkapiProfil from '../../components/warga/ModalLengkapiProfil'; 

import { getPeriodeBulan, TAHUN_TERSEDIA, getTahunSekarang, isWargaUsaha } from '../../lib/iuran/constants';
import { getInfoBulan, hitungBelumLunas, formatTanggal } from '../../lib/iuran/calculations';
import { fetchWargaById, fetchIuranByWarga, fetchAllWarga, fetchAllIuran, insertPengajuanIuran, updatePengajuanIuran } from '../../lib/iuran/queries';
import { uploadBukti } from '../../lib/iuran/storage';
import { fetchTarifList, getTarifWarga } from '../../lib/iuran/tarif';

export default function DashboardWargaIuran() {
  const [sessionData, setSessionData] = useState(null); // Menyimpan session lengkap
  const [warga, setWarga] = useState(null); // Data Rumah (Tabel Warga)
  const [penghuniData, setPenghuniData] = useState(null); // Data Penghuni (Tabel Penghuni)
  
  const [iuranList, setIuranList] = useState([]);
  const [depositList, setDepositList] = useState([]);
  const [tarifList, setTarifList] = useState([]);
  
  const [allWargaList, setAllWargaList] = useState([]);
  const [allIuranList, setAllIuranList] = useState([]);
  const [allPenghuniList, setAllPenghuniList] = useState([]); 
  
  const [loading, setLoading] = useState(true);
  const [loadingRekap, setLoadingRekap] = useState(false);
  
  const [showRekapModal, setShowRekapModal] = useState(false);
  const [showKasRTModal, setShowKasRTModal] = useState(false);
  const [showModalProfil, setShowModalProfil] = useState(false); 
  
  const [kasRTIuranList, setKasRTIuranList] = useState([]);
  const [pengeluaranList, setPengeluaranList] = useState([]);
  const [pemasukanLainList, setPemasukanLainList] = useState([]);

  const [selectedBulanDetail, setSelectedBulanDetail] = useState(null);
  const [showModalBayar, setShowModalBayar] = useState(false);
  const [bulanDipilih, setBulanDipilih] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [tahunTerpilih, setTahunTerpilih] = useState(getTahunSekarang());

  const router = useRouter();
  const showKasRTModalRef = useRef(false);

  useEffect(() => { showKasRTModalRef.current = showKasRTModal; }, [showKasRTModal]);

  // ═══ INISIALISASI SESSION BARU ═══
  useEffect(() => {
    const savedSession = localStorage.getItem('warga_session');
    if (!savedSession) { router.push('/'); return; }
    
    const parsed = JSON.parse(savedSession);
    setSessionData(parsed);
    setWarga(parsed); // Data rumah ada di root session
    setPenghuniData(parsed.penghuni_data); // Data penghuni ada di dalam properti ini

    loadIuran(parsed.id);
    loadDeposit(parsed.id);
    loadTarif();
    refreshDataRumah(parsed.id);
  }, []);

  // ═══ REALTIME LISTENER ═══
  useEffect(() => {
    if (!warga?.id) return;
    const channelName = `realtime-dashboard-warga-${warga.id}-${Math.random()}`;
    
    const channel = supabase.channel(channelName)
      // Dengarkan perubahan pada tabel warga (misal: ganti password)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'warga', filter: `id=eq.${warga.id}` }, () => refreshDataRumah(warga.id))
      // Dengarkan perubahan pada tabel penghuni (misal: verifikasi di-approve/reject)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'penghuni', filter: `warga_id=eq.${warga.id}` }, () => refreshDataRumah(warga.id))
      // Dengarkan perubahan iuran
      .on('postgres_changes', { event: '*', schema: 'public', table: 'iuran' }, () => loadIuran(warga.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposit_warga' }, () => loadDeposit(warga.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pengeluaran' }, () => { if (showKasRTModalRef.current) loadKasRT(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pemasukan_lain' }, () => { if (showKasRTModalRef.current) loadKasRT(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [warga?.id]); 

  // Fungsi untuk update data dari database & sinkronkan ke LocalStorage
  const refreshDataRumah = async (wargaId) => {
    try {
      const { data: w } = await supabase.from('warga').select('*').eq('id', wargaId).single();
      const { data: p } = await supabase.from('penghuni').select('*').eq('warga_id', wargaId).eq('is_aktif', true).maybeSingle();
      
      if (w) {
        // Ambil role_login dan mode_akses dari session lama agar tidak hilang
        const currentSession = JSON.parse(localStorage.getItem('warga_session'));
        
        const newSessionData = {
          ...w,
          role_login: currentSession.role_login,
          mode_akses: currentSession.mode_akses,
          penghuni_data: p || null
        };
        
        setWarga(w);
        setPenghuniData(p || null);
        setSessionData(newSessionData);
        
        // Update localStorage agar saat direfresh tidak hilang
        const { password: _, password_pending: __, ...profilAman } = newSessionData;
        localStorage.setItem('warga_session', JSON.stringify(profilAman));
      }
    } catch (err) {}
  };

  const loadIuran = async (wargaId) => {
    try { const data = await fetchIuranByWarga(wargaId); setIuranList(data); } catch (err) {} finally { setLoading(false); }
  };

  const loadDeposit = async (wargaId) => {
    try { const { data, error } = await supabase.from('deposit_warga').select('*').eq('warga_id', wargaId).order('tanggal', { ascending: false }); if (!error && data) setDepositList(data); } catch (err) {}
  };

  const loadTarif = async () => {
    try { const data = await fetchTarifList(); setTarifList(data); } catch (err) {}
  };

  const loadKasRT = async () => {
    try {
      const [resIuranGlobal, resPengeluaran, resPemasukan] = await Promise.all([fetchAllIuran(), supabase.from('pengeluaran').select('*').order('tanggal', { ascending: false }), supabase.from('pemasukan_lain').select('*').order('tanggal', { ascending: false })]);
      setKasRTIuranList(resIuranGlobal || []); setPengeluaranList(resPengeluaran.data || []); setPemasukanLainList(resPemasukan.data || []);
    } catch (err) { console.error('Gagal load kas RT:', err); }
  };

  const handleBukaKasRT = () => { loadKasRT(); setShowKasRTModal(true); };

  const loadRekap = async () => {
    if (allWargaList.length > 0) { setShowRekapModal(true); return; }
    setLoadingRekap(true);
    try {
      const [wargaData, iuranData, penghuniDataRes] = await Promise.all([
        fetchAllWarga(), fetchAllIuran(), supabase.from('penghuni').select('*').eq('is_aktif', true)
      ]);
      setAllWargaList(wargaData); setAllIuranList(iuranData); setAllPenghuniList(penghuniDataRes.data || []); setShowRekapModal(true);
    } catch (err) { alert('Gagal memuat rekap.'); } finally { setLoadingRekap(false); }
  };

  const handleLogout = () => {
    if (!confirm('Keluar dari akun warga?')) return;
    localStorage.removeItem('warga_session'); router.replace('/');
  };

  if (!warga || !sessionData) return null;

  const isPenyewa = sessionData.role_login === 'penyewa';
  const isModePantau = sessionData.mode_akses === 'pantau';

  const periodeBulanAktif = getPeriodeBulan(tahunTerpilih);
  const tarifBulanan = getTarifWarga(warga, tarifList, tahunTerpilih);
  const usaha = isWargaUsaha(warga);

  const totalDisetor = iuranList.filter((i) => i.status === 'approved').reduce((acc, curr) => acc + Number(curr.jumlah || 0), 0);
  const saldoDeposit = depositList.reduce((s, d) => s + (d.tipe === 'masuk' ? Number(d.jumlah) : -Number(d.jumlah)), 0);
  const estimasiBulan = tarifBulanan > 0 ? Math.floor(saldoDeposit / tarifBulanan) : 0;

  const adaPending = iuranList.some((i) => i.status === 'pending');
  const adaDitolak = iuranList.some((i) => i.status === 'rejected');
  const belumLunasList = hitungBelumLunas(iuranList, periodeBulanAktif, tarifBulanan);
  const bulanTombolBayar = belumLunasList[0]?.kode || null;

  const handleOpenModalBayar = () => { 
    if (isModePantau) { alert('Anda dalam Mode Pantau, tidak bisa membayar iuran.'); return; }
    setBulanDipilih(belumLunasList.map((b) => b.kode)); 
    setShowModalBayar(true); 
  };

  const handleSubmitBayar = async ({ fileBukti, catatan, bulanDipilih: bulanPilih }) => {
    if (isModePantau) return;
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

      for (const bln of bulanPilih) {
        const info = getInfoBulan(iuranList, bln, tarifBulanan);
        if (info.kurang <= 0) continue;
        const existingRejected = info.recs.find(r => r.status === 'rejected');
        if (existingRejected) {
          const newCatatan = existingRejected.catatan ? `${existingRejected.catatan} | Revisi : ${catatan || 'Diperbaiki warga'}` : `Revisi : ${catatan || 'Diperbaiki warga'}`;
          await updatePengajuanIuran(existingRejected.id, { jumlah: info.kurang, status: 'pending', batch_id: batchId, bukti_urls: uploadedUrls, catatan: newCatatan, tanggal_transaksi: null });
        } else {
          await insertPengajuanIuran([{ warga_id: warga.id, bulan_tahun: bln, jumlah: info.kurang, status: 'pending', batch_id: batchId, bukti_urls: uploadedUrls, catatan: catatan || null, tanggal_transaksi: null }]);
        }
      }
      alert('✅ Pengajuan berhasil dikirim!'); setShowModalBayar(false); loadIuran(warga.id);
    } catch (err) { alert('Gagal: ' + err.message); } finally { setSubmitting(false); }
  };

  // ═══ LOGIKA BANNER VERIFIKASI ═══
  const statusPenghuni = penghuniData?.status_verifikasi;
  const alasanReject = penghuniData?.alasan_reject;

  const isBelumLengkap = !penghuniData || statusPenghuni === 'belum';
  const isPending = statusPenghuni === 'pending';
  const isRejected = statusPenghuni === 'rejected';

  return (
    <>
      <Head><title>Status Iuran - Portal Warga RT 38</title></Head>
      <Layout warga={warga} onLogout={handleLogout}>
        <ProfileCard 
          warga={warga} 
          penghuniData={penghuniData} 
          roleLogin={sessionData.role_login} 
          modeAkses={sessionData.mode_akses} 
          tarifBulanan={tarifBulanan} 
          isUsaha={usaha} 
        />

        {/* BANNER: BELUM LENGKAP */}
        {isBelumLengkap && (
          <div className="bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-500/50 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <h4 className="text-sm font-bold text-amber-300">Profil Penghuni Belum Lengkap</h4>
                <p className="text-xs text-amber-400 mt-0.5">Silakan lengkapi data diri, keluarga & upload KK agar tervalidasi oleh Sekretaris RT.</p>
              </div>
            </div>
            <button onClick={() => setShowModalProfil(true)} className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs px-4 py-2.5 rounded-xl shrink-0 transition active:scale-95">Lengkapi Sekarang</button>
          </div>
        )}

        {/* BANNER: PENDING */}
        {isPending && (
          <div className="bg-blue-950/40 border border-blue-500/30 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-xl">⏳</span>
            <div>
              <h4 className="text-sm font-bold text-blue-300">Menunggu Verifikasi Sekretaris</h4>
              <p className="text-xs text-blue-400 mt-0.5">Data Anda sudah kami terima. Mohon tunggu Sekretaris memvalidasi data dan KK Anda.</p>
            </div>
          </div>
        )}

        {/* BANNER: REJECTED */}
        {isRejected && (
          <div className="bg-gradient-to-r from-rose-950/60 to-slate-900 border border-rose-500/50 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="text-xl">❌</span>
              <div>
                <h4 className="text-sm font-bold text-rose-300">Data Penghuni Ditolak</h4>
                <p className="text-xs text-rose-400 mt-0.5">Alasan: {alasanReject}</p>
              </div>
            </div>
            <button onClick={() => setShowModalProfil(true)} className="w-full sm:w-auto bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs px-4 py-2.5 rounded-xl shrink-0 transition active:scale-95">Perbaiki Sekarang</button>
          </div>
        )}

        {/* BANNER: IURAN DITOLAK */}
        {adaDitolak && (
          <div className="bg-rose-950/40 border border-rose-500/50 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-xl">❌</span>
            <div>
              <h4 className="text-sm font-bold text-rose-300">Ada Pembayaran yang Ditolak</h4>
              <p className="text-xs text-rose-400 mt-0.5">Silakan periksa bulan yang berwarna merah di bawah, lalu lakukan pembayaran ulang dengan bukti yang benar.</p>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/30 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">📊 Transparansi Kas RT 38</h4>
            <p className="text-xs text-slate-400 mt-0.5">Lihat rekapitulasi iuran dan arus kas RT secara terbuka.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
            <button onClick={loadRekap} disabled={loadingRekap} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2">{loadingRekap ? 'Memuat...' : '📋 Rekap Warga'}</button>
            <button onClick={handleBukaKasRT} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">💰 Saldo Kas RT</button>
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
            {saldoDeposit > 0 && tarifBulanan > 0 && (<span className="text-[9px] text-slate-400 mt-0.5">Cukup untuk ±{estimasiBulan} bulan</span>)}
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
            periodeBulan={periodeBulanAktif} 
            isModePantau={isModePantau} 
          />
        )}
      </Layout>

      <ModalDetailBulan detail={selectedBulanDetail} onClose={() => setSelectedBulanDetail(null)} />
      <ModalBayar show={showModalBayar} onClose={() => setShowModalBayar(false)} iuranList={iuranList} tarifBulanan={tarifBulanan} belumLunasList={belumLunasList} bulanDipilih={bulanDipilih} setBulanDipilih={setBulanDipilih} onSubmit={handleSubmitBayar} submitting={submitting} tahun={tahunTerpilih} />
      
      {showRekapModal && (
        <ModalRekap show={showRekapModal} onClose={() => setShowRekapModal(false)} allWargaList={allWargaList} allIuranList={allIuranList} allPenghuniList={allPenghuniList} tarifList={tarifList} />
      )}
      
      <ModalKasRT show={showKasRTModal} onClose={() => setShowKasRTModal(false)} iuranList={kasRTIuranList} pemasukanLainList={pemasukanLainList} pengeluaranList={pengeluaranList} />
      
      <ModalLengkapiProfil 
        show={showModalProfil} 
        onClose={() => setShowModalProfil(false)} 
        warga={warga} 
        role={sessionData.role_login} 
        dataPenyewaAktif={penghuniData} // Gunakan penghuniData sebagai data awal
        alasanReject={alasanReject} 
        onSuccess={() => refreshDataRumah(warga.id)} 
      />
    </>
  );
}

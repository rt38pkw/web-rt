// pages/dashboard-warga/iuran.js
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
import ModalUbahPin from '../../components/warga/ModalUbahPin'; 

import { getPeriodeBulan, getTahunTersedia, getTahunSekarang, isWargaUsaha } from '../../lib/iuran/constants';
import { getInfoBulan, hitungBelumLunas, formatTanggal } from '../../lib/iuran/calculations';
import { fetchWargaById, fetchIuranByWarga, fetchAllWarga, fetchAllIuran, insertPengajuanIuran, updatePengajuanIuran } from '../../lib/iuran/queries';
import { uploadBukti } from '../../lib/iuran/storage';
import { fetchTarifList, getTarifWarga } from '../../lib/iuran/tarif';
import { setupPushNotifications } from '../../lib/push-notifications';

export default function DashboardWargaIuran() {
  const [sessionData, setSessionData] = useState(null); 
  const [warga, setWarga] = useState(null); 
  const [penghuniData, setPenghuniData] = useState(null); 
  
  const [iuranList, setIuranList] = useState([]);
  const [depositList, setDepositList] = useState([]);
  const [tarifList, setTarifList] = useState([]);
  const [riwayatList, setRiwayatList] = useState([]); 
  
  const [allWargaList, setAllWargaList] = useState([]);
  const [allIuranList, setAllIuranList] = useState([]);
  const [allPenghuniList, setAllPenghuniList] = useState([]); 
  
  const [loading, setLoading] = useState(true);
  const [loadingRekap, setLoadingRekap] = useState(false);
  
  const [showRekapModal, setShowRekapModal] = useState(false);
  const [showKasRTModal, setShowKasRTModal] = useState(false);
  const [showModalProfil, setShowModalProfil] = useState(false); 
  const [showModalUbahPin, setShowModalUbahPin] = useState(false);
  
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

  useEffect(() => {
    const savedSession = localStorage.getItem('warga_session');
    if (!savedSession) { router.push('/'); return; }
    
    const parsed = JSON.parse(savedSession);
    setSessionData(parsed);
    setWarga(parsed); 
    setPenghuniData(parsed.penghuni_data); 

    loadIuran(parsed.id);
    loadDeposit(parsed.id);
    loadTarif();
    loadRiwayatKategori(parsed.id); 
    refreshDataRumah(parsed.id);
    
    setupPushNotifications('warga', parsed.id);
  }, []);

  useEffect(() => {
    if (!warga?.id) return;
    const channelName = `realtime-dashboard-warga-${warga.id}-${Math.random()}`;
    
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'warga', filter: `id=eq.${warga.id}` }, () => refreshDataRumah(warga.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'penghuni', filter: `warga_id=eq.${warga.id}` }, () => refreshDataRumah(warga.id))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'iuran', filter: `warga_id=eq.${warga.id}` }, (payload) => {
        setIuranList(prev => [...prev, payload.new]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'iuran', filter: `warga_id=eq.${warga.id}` }, (payload) => {
        setIuranList(prev => prev.map(item => item.id === payload.new.id ? payload.new : item));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'iuran', filter: `warga_id=eq.${warga.id}` }, (payload) => {
        setIuranList(prev => prev.filter(item => item.id !== payload.old.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposit_warga' }, () => loadDeposit(warga.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pengeluaran' }, () => { if (showKasRTModalRef.current) loadKasRT(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pemasukan_lain' }, () => { if (showKasRTModalRef.current) loadKasRT(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [warga?.id]); 

  const refreshDataRumah = async (wargaId) => {
    try {
      const { data: w } = await supabase.from('warga').select('*').eq('id', wargaId).single();
      const { data: p } = await supabase.from('penghuni').select('*').eq('warga_id', wargaId).eq('is_aktif', true).maybeSingle();
      
      if (w) {
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

  const loadRiwayatKategori = async (wargaId) => {
    try {
      const { data, error } = await supabase
        .from('riwayat_kategori_warga')
        .select('*')
        .eq('warga_id', wargaId)
        .order('tanggal_mulai', { ascending: true });
      if (!error && data) setRiwayatList(data);
    } catch (err) {}
  };

  const loadKasRT = async () => {
    try {
      const [resIuranGlobal, resPengeluaran, resPemasukan] = await Promise.all([fetchAllIuran(), supabase.from('pengeluaran').select('*').order('tanggal', { ascending: false }), supabase.from('pemasukan_lain').select('*').order('tanggal', { ascending: false })]);
      setKasRTIuranList(resIuranGlobal || []); setPengeluaranList(resPengeluaran.data || []); setPemasukanLainList(resPemasukan.data || []);
    } catch (err) {}
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

  const isModePantau = sessionData.mode_akses === 'pantau';

  const periodeBulanAktif = getPeriodeBulan(tahunTerpilih);
  const tarifBulanan = getTarifWarga(warga, tarifList, tahunTerpilih);
  const usaha = isWargaUsaha(warga);

  const tarifMap = {};
  periodeBulanAktif.forEach(bln => {
    tarifMap[bln.kode] = getTarifWarga(warga, tarifList, bln.kode, riwayatList);
  });

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
        const tarifSpesifik = tarifMap[bln] !== undefined ? tarifMap[bln] : tarifBulanan;
        const info = getInfoBulan(iuranList, bln, tarifSpesifik);
        
        if (info.kurang <= 0) continue;
        const existingRejected = info.recs.find(r => r.status === 'rejected');
        if (existingRejected) {
          const newCatatan = existingRejected.catatan ? `${existingRejected.catatan} | Revisi : ${catatan || 'Diperbaiki warga'}` : `Revisi : ${catatan || 'Diperbaiki warga'}`;
          await updatePengajuanIuran(existingRejected.id, { jumlah: info.kurang, status: 'pending', batch_id: batchId, bukti_urls: uploadedUrls, catatan: newCatatan, tanggal_transaksi: null });
        } else {
          await insertPengajuanIuran([{ warga_id: warga.id, bulan_tahun: bln, jumlah: info.kurang, status: 'pending', batch_id: batchId, bukti_urls: uploadedUrls, catatan: catatan || null, tanggal_transaksi: null }]);
        }
      }

      try {
        const namaWarga = warga.nama_lengkap || 'Warga';
        const listBulan = bulanPilih.join(', ');
        await supabase.functions.invoke('smart-handler', {
          body: { role_target: 'bendahara', title: '💰 Bukti Transfer Baru', body: `${namaWarga} upload bukti transfer bulan ${listBulan}.`, url: '/keuangan/verifikasi' }
        });
      } catch (notifErr) {}

      alert('✅ Pengajuan berhasil dikirim!'); setShowModalBayar(false); 
    } catch (err) { alert('Gagal: ' + err.message); } finally { setSubmitting(false); }
  };

  const statusPenghuni = penghuniData?.status_verifikasi;
  const alasanReject = penghuniData?.alasan_reject;
  const punyaNik = !!penghuniData?.nik && penghuniData.nik !== '0';
  const punyaKK = !!penghuniData?.url_kk;
  const isBelumLengkap = !penghuniData || statusPenghuni === 'belum' || (statusPenghuni === 'approved' && (!punyaNik || !punyaKK));
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
          onUbahPin={() => setShowModalUbahPin(true)}
          isProfileComplete={!isBelumLengkap} 
        />

        {/* BANNER LENGKAPI DATA (DIBUAT TIPIS) */}
        {isBelumLengkap && (
          <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-2.5 flex justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">⚠️</span>
              <p className="text-[10px] text-amber-300 leading-tight">Data Diri & KK belum lengkap. Segera validasi agar tidak terhambat.</p>
            </div>
            <button onClick={() => setShowModalProfil(true)} className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-[10px] px-3 py-1.5 rounded-lg shrink-0 transition">Lengkapi</button>
          </div>
        )}

        {isPending && (
          <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-2.5 flex items-center gap-2">
            <span className="text-sm">⏳</span>
            <p className="text-[10px] text-blue-300 leading-tight">Data sedang ditinjau Sekretaris.</p>
          </div>
        )}

        {isRejected && (
          <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-2.5 flex justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">❌</span>
              <p className="text-[10px] text-rose-300 leading-tight">Ditolak: {alasanReject}</p>
            </div>
            <button onClick={() => setShowModalProfil(true)} className="bg-rose-500 hover:bg-rose-400 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg shrink-0 transition">Perbaiki</button>
          </div>
        )}

        {adaDitolak && (
          <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-2.5 flex items-center gap-2">
            <span className="text-sm">❌</span>
            <p className="text-[10px] text-rose-300 leading-tight">Ada pembayaran iuran yang ditolak. Cek bulan berwarna merah di bawah.</p>
          </div>
        )}

        {/* ═══ KARTU GABUNGAN RINGKASAN & TRANSPARANSI (COMPACT) ═══ */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col gap-3">
          {/* Baris 1: Angka Setor & Deposit */}
          <div className="flex justify-between items-center px-1">
            <div className="text-center">
              <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Total Setor</div>
              <div className="text-sm font-bold text-white">Rp {totalDisetor.toLocaleString('id-ID')}</div>
            </div>
            <div className="w-px h-6 bg-slate-700"></div>
            <div className="text-center">
              <div className="text-[9px] text-purple-400 uppercase tracking-wider mb-0.5">Saldo Deposit</div>
              <div className="text-sm font-bold text-purple-300">Rp {saldoDeposit.toLocaleString('id-ID')}</div>
            </div>
          </div>

          {/* Baris 2: Tombol Transparansi */}
          <div className="flex gap-2">
            <button onClick={loadRekap} disabled={loadingRekap} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold py-2 rounded-lg transition border border-slate-700 flex justify-center items-center gap-1.5">
              {loadingRekap ? '...' : '📋 Rekap Warga'}
            </button>
            <button onClick={handleBukaKasRT} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold py-2 rounded-lg transition border border-slate-700 flex justify-center items-center gap-1.5">
              💰 Saldo Kas RT
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Memuat data iuran...</div>
        ) : (
          <IuranGrid 
            iuranList={iuranList} 
            tarifBulanan={tarifBulanan} 
            tarifMap={tarifMap}
            adaPending={adaPending} 
            bulanTombolBayar={bulanTombolBayar} 
            onKlikDetail={setSelectedBulanDetail} 
            onBayar={handleOpenModalBayar} 
            periodeBulan={periodeBulanAktif} 
            isModePantau={isModePantau} 
            tahunTerpilih={tahunTerpilih}
            setTahunTerpilih={setTahunTerpilih}
            tahunTersedia={getTahunTersedia()}
          />
        )}
      </Layout>

      <ModalDetailBulan detail={selectedBulanDetail} onClose={() => setSelectedBulanDetail(null)} />
      
      <ModalBayar 
        show={showModalBayar} 
        onClose={() => setShowModalBayar(false)} 
        iuranList={iuranList} 
        tarifBulanan={tarifBulanan} 
        tarifMap={tarifMap}
        belumLunasList={belumLunasList} 
        bulanDipilih={bulanDipilih} 
        setBulanDipilih={setBulanDipilih} 
        onSubmit={handleSubmitBayar} 
        submitting={submitting} 
        tahun={tahunTerpilih} 
      />
      
      {showRekapModal && (
        <ModalRekap 
          show={showRekapModal} 
          onClose={() => setShowRekapModal(false)} 
          allWargaList={allWargaList} 
          allIuranList={allIuranList} 
          allPenghuniList={allPenghuniList} 
          tarifList={tarifList} 
          tahunTerpilih={tahunTerpilih}
        />
      )}
      
      <ModalKasRT show={showKasRTModal} onClose={() => setShowKasRTModal(false)} iuranList={kasRTIuranList} pemasukanLainList={pemasukanLainList} pengeluaranList={pengeluaranList} />
      
      <ModalLengkapiProfil 
        show={showModalProfil} 
        onClose={() => setShowModalProfil(false)} 
        warga={warga} 
        role={sessionData.role_login} 
        dataPenyewaAktif={penghuniData} 
        alasanReject={alasanReject} 
        onSuccess={() => refreshDataRumah(warga.id)} 
      />

      <ModalUbahPin 
        show={showModalUbahPin} 
        onClose={() => setShowModalUbahPin(false)} 
        wargaId={warga.id} 
      />
    </>
  );
}

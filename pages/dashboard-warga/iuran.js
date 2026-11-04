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

// IMPORT YANG SUDAH DINAMIS
import { getPeriodeBulan, getTahunTersedia, getTahunSekarang, isWargaUsaha } from '../../lib/iuran/constants';
import { getInfoBulan, hitungBelumLunas, formatTanggal } from '../../lib/iuran/calculations';
import { fetchWargaById, fetchIuranByWarga, fetchAllWarga, fetchAllIuran, insertPengajuanIuran, updatePengajuanIuran } from '../../lib/iuran/queries';
import { uploadBukti } from '../../lib/iuran/storage';
import { fetchTarifList, getTarifWarga } from '../../lib/iuran/tarif';
import { setupPushNotifications } from '../../lib/push-notifications'; // <-- TAMBAHAN BARU

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
  
  // STATE TAHUN YANG DINAMIS
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
    
    // <-- TAMBAHAN BARU (Panggil fungsi notifikasi)
    setupPushNotifications('warga', parsed.id);
  }, []);

  useEffect(() => {
    if (!warga?.id) return;
    const channelName = `realtime-dashboard-warga-${warga.id}-${Math.random()}`;
    
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'warga', filter: `id=eq.${warga.id}` }, () => refreshDataRumah(warga.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'penghuni', filter: `warga_id=eq.${warga.id}` }, () => refreshDataRumah(warga.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'iuran' }, () => loadIuran(warga.id))
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
        .select

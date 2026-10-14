import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

import {
  PERIODE_BULAN,
  VALID_TABS,
  getBulanTahun,
} from '../lib/keuangan/constants';
import { tarifWarga } from '../lib/keuangan/helpers';

import TabDashboard from '../components/keuangan/TabDashboard';
import TabVerifikasi from '../components/keuangan/TabVerifikasi';
import TabTunai from '../components/keuangan/TabTunai';
import TabPemasukan from '../components/keuangan/TabPemasukan';
import TabPengeluaran from '../components/keuangan/TabPengeluaran';
import TabDeposit from '../components/keuangan/TabDeposit';
import TabTunggakan from '../components/keuangan/TabTunggakan';
import TabRiwayat from '../components/keuangan/TabRiwayat';
import ModalPakaiDeposit from '../components/keuangan/ModalPakaiDeposit';

export default function AdminKeuangan() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  const [iuran, setIuran] = useState([]);
  const [warga, setWarga] = useState([]);
  const [pengeluaran, setPengeluaran] = useState([]);
  const [pemasukanLain, setPemasukanLain] = useState([]);
  const [depositList, setDepositList] = useState([]);

  const [filterVerif, setFilterVerif] = useState('pending');

  // Form tunai
  const [tunaiWargaId, setTunaiWargaId] = useState('');
  const [tunaiBulan, setTunaiBulan] = useState([]);
  const [tunaiTanggal, setTunaiTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [tunaiCatatan, setTunaiCatatan] = useState('');
  const [tunaiSubmitting, setTunaiSubmitting] = useState(false);

  // Form pengeluaran
  const [pengTgl, setPengTgl] = useState(new Date().toISOString().split('T')[0]);
  const [pengJenis, setPengJenis] = useState('Kebutuhan RT');
  const [pengJenisCustom, setPengJenisCustom] = useState('');
  const [pengKet, setPengKet] = useState('');
  const [pengNominal, setPengNominal] = useState('');
  const [pengSubmitting, setPengSubmitting] = useState(false);

  // Form pemasukan
  const [masukTgl, setMasukTgl] = useState(new Date().toISOString().split('T')[0]);
  const [masukJenis, setMasukJenis] = useState('Donasi');
  const [masukJenisCustom, setMasukJenisCustom] = useState('');
  const [masukKet, setMasukKet] = useState('');
  const [masukNominal, setMasukNominal] = useState('');
  const [masukSubmitting, setMasukSubmitting] = useState(false);

  // Form deposit
  const [depWargaId, setDepWargaId] = useState('');
  const [depTgl, setDepTgl] = useState(new Date().toISOString().split('T')[0]);
  const [depJumlah, setDepJumlah] = useState('');
  const [depKet, setDepKet] = useState('');
  const [depSubmitting, setDepSubmitting] = useState(false);

  // Modal pakai deposit
  const [modalPakaiDeposit, setModalPakaiDeposit] = useState(null);
  const [pakaiTahun, setPakaiTahun] = useState(2027);
  const [pakaiBulan, setPakaiBulan] = useState([]);

  // Tunggakan
  const [tunggakanBulan, setTunggakanBulan] = useState('2026-10');

  // ===== SESSION & INIT =====
  useEffect(() => {
    const savedUser = sessionStorage.getItem('pengurusSession');
    if (!savedUser) {
      window.location.href = '/admin';
      return;
    }
    setUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    if (t && VALID_TABS.includes(t)) setTab(t);
  }, []);

  useEffect(() => {
    if (user) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [r1, r2, r3, r4, r5] = await Promise.all([
        supabase.from('iuran').select('*, warga:warga_id (id, nama_lengkap, no_rumah, kategori)'),
        supabase.from('warga').select('*').order('no_rumah'),
        supabase.from('pengeluaran').select('*').order('tanggal', { ascending: false }),
        supabase.from('pemasukan_lain').select('*').order('tanggal', { ascending: false }),
        supabase.from('deposit_warga').select('*').order('tanggal', { ascending: false }),
      ]);
      setIuran(r1.data || []);
      setWarga(r2.data || []);
      setPengeluaran(r3.data || []);
      setPemasukanLain(r4.data || []);
      setDepositList(r5.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // ===== PERHITUNGAN =====
  const totalIuranApproved = iuran
    .filter((i) => i.status === 'approved')
    .reduce((s, i) => s + Number(i.jumlah || 0), 0);
  const totalPemasukanLain = pemasukanLain.reduce((s, p) => s + Number(p.nominal || 0), 0);
  const totalPemasukan = totalIuranApproved + totalPemasukanLain;
  const totalPengeluaran = pengeluaran.reduce((s, p) => s + Number(p.nominal || 0), 0);

  const saldoDepositTotal = depositList.reduce(
    (s, d) => s + (d.tipe === 'masuk' ? Number(d.jumlah) : -Number(d.jumlah)),
    0
  );

  const saldoKasBebas = totalPemasukan - totalPengeluaran - saldoDepositTotal;

  const getSaldoDepositWarga = (wargaId) =>
    depositList
      .filter((d) => d.warga_id === wargaId)
      .reduce((s, d) => s + (d.tipe === 'masuk' ? Number(d.jumlah) : -Number(d.jumlah)), 0);

  const pendingBatches = (() => {
    const grouped = {};
    iuran
      .filter((i) => i.status === 'pending')
      .forEach((i) => {
        const key = i.batch_id || i.id;
        if (!grouped[key]) grouped[key] = { batchId: key, items: [] };
        grouped[key].items.push(i);
      });
    return Object.values(grouped);
  })();

  // ===== HANDLE APPROVE =====
  const getPathFromUrl = (url) => {
    if (!url) return null;
    const marker = '/bukti-transfer/';
    const idx = url.indexOf(marker);
    return idx === -1 ? null : url.substring(idx + marker.length);
  };

  async function handleApprove(batch) {
    if (!confirm('Approve pembayaran ini?')) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const batchId = batch.batchId;
      await supabase
        .from('iuran')
        .update({ status: 'approved', tanggal_transaksi: today, metode: 'qris' })
        .eq('batch_id', batchId);
      const urls = batch.items[0]?.bukti_urls || [];
      const paths = urls.map(getPathFromUrl).filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from('bukti-transfer').remove(paths);
        await supabase.from('iuran').update({ bukti_urls: null }).eq('batch_id', batchId);
      }
      alert('✅ Berhasil di-approve.');
      fetchAll();
    } catch (err) {
      alert('Gagal approve: ' + err.message);
    }
  }

  // ===== INPUT TUNAI =====
  const iuranWargaTerpilih = iuran.filter((i) => i.warga_id === tunaiWargaId);
  const bulanBelumLunas = PERIODE_BULAN.filter((bln) => {
    const totalApproved = iuranWargaTerpilih
      .filter((i) => i.bulan_tahun === bln.kode && i.status === 'approved')
      .reduce((s, i) => s + Number(i.jumlah || 0), 0);
    const adaPending = iuranWargaTerpilih.some(
      (i) => i.bulan_tahun === bln.kode && i.status === 'pending'
    );
    return !adaPending && totalApproved < tarifWarga(warga.find((w) => w.id === tunaiWargaId));
  });

  const totalTunai = (() => {
    const w = warga.find((x) => x.id === tunaiWargaId);
    if (!w) return 0;
    const tarif = tarifWarga(w);
    return tunaiBulan.reduce((sum, bln) => {
      const totalApproved = iuranWargaTerpilih
        .filter((i) => i.bulan_tahun === bln && i.status === 'approved')
        .reduce((s, i) => s + Number(i.jumlah || 0), 0);
      return sum + Math.max(0, tarif - totalApproved);
    }, 0);
  })();

  async function handleSubmitTunai(e) {
    e.preventDefault();
    if (!tunaiWargaId || tunaiBulan.length === 0) {
      alert('Pilih warga dan minimal 1 bulan');
      return;
    }
    setTunaiSubmitting(true);
    try {
      const batchId = crypto.randomUUID();
      const w = warga.find((x) => x.id === tunaiWargaId);
      const tarif = tarifWarga(w);
      const records = tunaiBulan
        .map((bln) => {
          const totalApproved = iuranWargaTerpilih
            .filter((i) => i.bulan_tahun === bln && i.status === 'approved')
            .reduce((s, i) => s + Number(i.jumlah || 0), 0);
          return {
            warga_id: tunaiWargaId,
            bulan_tahun: bln,
            jumlah: Math.max(0, tarif - totalApproved),
            status: 'approved',
            metode: 'tunai',
            batch_id: batchId,
            bukti_urls: null,
            catatan: tunaiCatatan || null,
            tanggal_transaksi: tunaiTanggal,
          };
        })
        .filter((r) => r.jumlah > 0);
      if (records.length === 0) throw new Error('Tidak ada nominal');
      const { error } = await supabase.from('iuran').insert(records);
      if (error) throw error;
      alert('✅ Iuran tunai berhasil dicatat!');
      setTunaiWargaId('');
      setTunaiBulan([]);
      setTunaiCatatan('');
      fetchAll();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setTunaiSubmitting(false);
    }
  }

  // ===== INPUT PENGELUARAN =====
  async function handleSubmitPengeluaran(e) {
    e.preventDefault();
    const jenisFinal = pengJenis === 'Lainnya' ? pengJenisCustom.trim() : pengJenis;
    if (!jenisFinal || !pengNominal) {
      alert('Lengkapi data');
      return;
    }
    setPengSubmitting(true);
    try {
      const { error } = await supabase.from('pengeluaran').insert([
        {
          tanggal: pengTgl,
          jenis: jenisFinal,
          keterangan: pengKet || null,
          nominal: Number(pengNominal),
          created_by: user.id,
        },
      ]);
      if (error) throw error;
      alert('✅ Pengeluaran dicatat!');
      setPengKet('');
      setPengNominal('');
      setPengJenisCustom('');
      fetchAll();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setPengSubmitting(false);
    }
  }

  // ===== INPUT PEMASUKAN =====
  async function handleSubmitPemasukan(e) {
    e.preventDefault();
    const jenisFinal = masukJenis === 'Lainnya' ? masukJenisCustom.trim() : masukJenis;
    if (!jenisFinal || !masukNominal) {
      alert('Lengkapi data');
      return;
    }
    setMasukSubmitting(true);
    try {
      const { error } = await supabase.from('pemasukan_lain').insert([
        {
          tanggal: masukTgl,
          jenis: jenisFinal,
          keterangan: masukKet || null,
          nominal: Number(masukNominal),
          created_by: user.id,
        },
      ]);
      if (error) throw error;
      alert('✅ Pemasukan dicatat!');
      setMasukKet('');
      setMasukNominal('');
      setMasukJenisCustom('');
      fetchAll();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setMasukSubmitting(false);
    }
  }

  // ===== INPUT DEPOSIT =====
  async function handleSubmitDeposit(e) {
    e.preventDefault();
    if (!depWargaId || !depJumlah) {
      alert('Pilih warga dan isi jumlah');
      return;
    }
    setDepSubmitting(true);
    try {
      const { error } = await supabase.from('deposit_warga').insert([
        {
          warga_id: depWargaId,
          tanggal: depTgl,
          tipe: 'masuk',
          jumlah: Number(depJumlah),
          keterangan: depKet || null,
          created_by: user.id,
        },
      ]);
      if (error) throw error;
      alert('✅ Deposit dicatat!');
      setDepWargaId('');
      setDepJumlah('');
      setDepKet('');
      fetchAll();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setDepSubmitting(false);
    }
  }

  // ===== PAKAI DEPOSIT =====
  const bulanPakaiDeposit = getBulanTahun(pakaiTahun);
  const wargaPakaiDeposit = warga.find((w) => w.id === modalPakaiDeposit?.wargaId);
  const saldoDepositWargaIni = wargaPakaiDeposit ? getSaldoDepositWarga(wargaPakaiDeposit.id) : 0;
  const tarifPakaiDeposit = tarifWarga(wargaPakaiDeposit);
  const totalPakaiDeposit = pakaiBulan.length * tarifPakaiDeposit;
  const sisaDepositSetelah = saldoDepositWargaIni - totalPakaiDeposit;

  async function handleSubmitPakaiDeposit() {
    if (pakaiBulan.length === 0) {
      alert('Pilih minimal 1 bulan');
      return;
    }
    if (totalPakaiDeposit > saldoDepositWargaIni) {
      alert('Saldo deposit tidak cukup');
      return;
    }
    try {
      const batchId = crypto.randomUUID();
      const today = new Date().toISOString().split('T')[0];

      const iuranRecords = pakaiBulan.map((bln) => ({
        warga_id: wargaPakaiDeposit.id,
        bulan_tahun: bln,
        jumlah: tarifPakaiDeposit,
        status: 'approved',
        metode: 'deposit',
        batch_id: batchId,
        bukti_urls: null,
        catatan: `Dibayar via deposit ${today}`,
        tanggal_transaksi: today,
      }));
      const { error: e1 } = await supabase.from('iuran').insert(iuranRecords);
      if (e1) throw e1;

      const { error: e2 } = await supabase.from('deposit_warga').insert([
        {
          warga_id: wargaPakaiDeposit.id,
          tanggal: today,
          tipe: 'pakai',
          jumlah: totalPakaiDeposit,
          keterangan: `Pakai deposit untuk ${pakaiBulan.length} bulan (${pakaiBulan.join(', ')})`,
          created_by: user.id,
        },
      ]);
      if (e2) throw e2;

      alert('✅ Deposit berhasil dipakai untuk iuran!');
      setModalPakaiDeposit(null);
      setPakaiBulan([]);
      fetchAll();
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  }

  // ===== GUARD =====
  if (!user) return null;
  const canAccess = user.role === 'ketua' || user.role === 'bendahara';
  if (!canAccess) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <p className="text-sm">Halaman ini khusus Ketua & Bendahara.</p>
          <Link href="/admin" className="text-xs text-blue-400 mt-3 inline-block">
            ← Kembali ke Admin
          </Link>
        </div>
      </div>
    );
  }

  // ===== RENDER TAB =====
  const renderTab = () => {
    if (loading)
      return <div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div>;

    switch (tab) {
      case 'dashboard':
        return (
          <TabDashboard
            {...{
              saldoKasBebas,
              saldoDepositTotal,
              totalPemasukan,
              totalPengeluaran,
              totalIuranApproved,
              totalPemasukanLain,
              pendingBatches,
              pengeluaran,
              setTab,
            }}
          />
        );
      case 'verifikasi':
        return (
          <TabVerifikasi
            {...{ pendingBatches, iuran, filterVerif, setFilterVerif, handleApprove }}
          />
        );
      case 'tunai':
        return (
          <TabTunai
            {...{
              warga,
              tunaiWargaId,
              setTunaiWargaId,
              tunaiBulan,
              setTunaiBulan,
              tunaiTanggal,
              setTunaiTanggal,
              tunaiCatatan,
              setTunaiCatatan,
              bulanBelumLunas,
              totalTunai,
              tunaiSubmitting,
              handleSubmitTunai,
            }}
          />
        );
      case 'pemasukan':
        return (
          <TabPemasukan
            {...{
              pemasukanLain,
              masukTgl,
              setMasukTgl,
              masukJenis,
              setMasukJenis,
              masukJenisCustom,
              setMasukJenisCustom,
              masukKet,
              setMasukKet,
              masukNominal,
              setMasukNominal,
              masukSubmitting,
              handleSubmitPemasukan,
            }}
          />
        );
      case 'pengeluaran':
        return (
          <TabPengeluaran
            {...{
              pengeluaran,
              pengTgl,
              setPengTgl,
              pengJenis,
              setPengJenis,
              pengJenisCustom,
              setPengJenisCustom,
              pengKet,
              setPengKet,
              pengNominal,
              setPengNominal,
              pengSubmitting,
              handleSubmitPengeluaran,
            }}
          />
        );
      case 'deposit':
        return (
          <TabDeposit
            {...{
              warga,
              depositList,
              getSaldoDepositWarga,
              depWargaId,
              setDepWargaId,
              depTgl,
              setDepTgl,
              depJumlah,
              setDepJumlah,
              depKet,
              setDepKet,
              depSubmitting,
              handleSubmitDeposit,
              setModalPakaiDeposit,
            }}
          />
        );
      case 'tunggakan':
        return <TabTunggakan {...{ warga, iuran, tunggakanBulan, setTunggakanBulan }} />;
      case 'riwayat':
        return <TabRiwayat {...{ iuran, pengeluaran, pemasukanLain, depositList, warga }} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      <div className="bg-slate-900/70 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white">💰 Dashboard Keuangan</h1>
            <p className="text-[11px] text-slate-400">RT 38 Puri Kencana Wagir</p>
          </div>
          <Link
            href="/admin"
            className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg text-slate-300 border border-slate-700"
          >
            ← Kembali
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { k: 'dashboard', l: '📊 Dashboard' },
            { k: 'verifikasi', l: '⏳ Verifikasi' },
            { k: 'tunai', l: '💵 Input Tunai' },
            { k: 'pemasukan', l: '➕ Pemasukan' },
            { k: 'pengeluaran', l: '➖ Pengeluaran' },
            { k: 'deposit', l: '💎 Deposit' },
            { k: 'tunggakan', l: '⚠️ Tunggakan' },
            { k: 'riwayat', l: '📋 Riwayat' },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition shrink-0 ${
                tab === t.k
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {t.l}
              {t.k === 'verifikasi' && pendingBatches.length > 0 && (
                <span className="ml-1 inline-block bg-orange-500 text-white text-[9px] px-1.5 rounded-full">
                  {pendingBatches.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div>{renderTab()}</div>
      </div>

      {modalPakaiDeposit && wargaPakaiDeposit && (
        <ModalPakaiDeposit
          {...{
            modalPakaiDeposit,
            setModalPakaiDeposit,
            pakaiTahun,
            setPakaiTahun,
            pakaiBulan,
            setPakaiBulan,
            bulanPakaiDeposit,
            tarifPakaiDeposit,
            totalPakaiDeposit,
            saldoDepositWargaIni,
            sisaDepositSetelah,
            handleSubmitPakaiDeposit,
          }}
        />
      )}
    </div>
  );
}

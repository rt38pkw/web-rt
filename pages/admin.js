import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

const PERIODE_BULAN = [
  { kode: '2026-04', nama: 'April' },
  { kode: '2026-05', nama: 'Mei' },
  { kode: '2026-06', nama: 'Juni' },
  { kode: '2026-07', nama: 'Juli' },
  { kode: '2026-08', nama: 'Agustus' },
  { kode: '2026-09', nama: 'September' },
  { kode: '2026-10', nama: 'Oktober' },
  { kode: '2026-11', nama: 'November' },
  { kode: '2026-12', nama: 'Desember' },
];

function getBulanTahun(tahun) {
  const nama = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return Array.from({ length: 12 }, (_, i) => ({
    kode: `${tahun}-${String(i + 1).padStart(2, '0')}`,
    nama: nama[i],
  }));
}

const JENIS_PENGELUARAN = [
  'Kebutuhan RT', 'Kegiatan', 'Perkunjungan Sosial',
  'Peringatan Hari', 'Pertemuan Rutin Warga', 'Partisipasi', 'Lainnya',
];

const JENIS_PEMASUKAN = ['Mutasi Saldo', 'Donasi', 'Bunga Bank', 'Lainnya'];

const formatRupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const formatTanggal = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};
const tarifWarga = (w) => (w?.kategori === 'Usaha' ? 30000 : 15000);

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
    const validTabs = ['dashboard', 'verifikasi', 'tunai', 'pemasukan', 'pengeluaran', 'deposit', 'tunggakan', 'riwayat'];
    if (t && validTabs.includes(t)) setTab(t);
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

  const saldoDepositTotal = depositList.reduce((s, d) => {
    return s + (d.tipe === 'masuk' ? Number(d.jumlah) : -Number(d.jumlah));
  }, 0);

  const saldoKasBebas = totalPemasukan - totalPengeluaran - saldoDepositTotal;

  const getSaldoDepositWarga = (wargaId) =>
    depositList
      .filter((d) => d.warga_id === wargaId)
      .reduce((s, d) => s + (d.tipe === 'masuk' ? Number(d.jumlah) : -Number(d.jumlah)), 0);

  const pendingBatches = (() => {
    const grouped = {};
    iuran.filter((i) => i.status === 'pending').forEach((i) => {
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
      await supabase.from('iuran').update({ status: 'approved', tanggal_transaksi: today, metode: 'qris' }).eq('batch_id', batchId);
      const urls = batch.items[0]?.bukti_urls || [];
      const paths = urls.map(getPathFromUrl).filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from('bukti-transfer').remove(paths);
        await supabase.from('iuran').update({ bukti_urls: null }).eq('batch_id', batchId);
      }
      alert('✅ Berhasil di-approve.');
      fetchAll();
    } catch (err) { alert('Gagal approve: ' + err.message); }
  }

  // ===== TAMBAH TAHUN =====
  function handleTambahTahun() {
    if (!confirm('Ini akan menambah periode tahun 2027 ke semua warga. Lanjutkan?')) return;
    alert('Fitur ini akan tersedia setelah template tahun baru disiapkan. Untuk sementara, gunakan "Pakai Deposit" per warga.');
  }

  // ===== INPUT TUNAI =====
  const iuranWargaTerpilih = iuran.filter((i) => i.warga_id === tunaiWargaId);
  const bulanBelumLunas = PERIODE_BULAN.filter((bln) => {
    const totalApproved = iuranWargaTerpilih
      .filter((i) => i.bulan_tahun === bln.kode && i.status === 'approved')
      .reduce((s, i) => s + Number(i.jumlah || 0), 0);
    const adaPending = iuranWargaTerpilih.some((i) => i.bulan_tahun === bln.kode && i.status === 'pending');
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
    if (!tunaiWargaId || tunaiBulan.length === 0) { alert('Pilih warga dan minimal 1 bulan'); return; }
    setTunaiSubmitting(true);
    try {
      const batchId = crypto.randomUUID();
      const w = warga.find((x) => x.id === tunaiWargaId);
      const tarif = tarifWarga(w);
      const records = tunaiBulan.map((bln) => {
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
      }).filter((r) => r.jumlah > 0);
      if (records.length === 0) throw new Error('Tidak ada nominal');
      const { error } = await supabase.from('iuran').insert(records);
      if (error) throw error;
      alert('✅ Iuran tunai berhasil dicatat!');
      setTunaiWargaId(''); setTunaiBulan([]); setTunaiCatatan('');
      fetchAll();
    } catch (err) { alert('Gagal: ' + err.message); }
    finally { setTunaiSubmitting(false); }
  }

  // ===== INPUT PENGELUARAN =====
  async function handleSubmitPengeluaran(e) {
    e.preventDefault();
    const jenisFinal = pengJenis === 'Lainnya' ? pengJenisCustom.trim() : pengJenis;
    if (!jenisFinal || !pengNominal) { alert('Lengkapi data'); return; }
    setPengSubmitting(true);
    try {
      const { error } = await supabase.from('pengeluaran').insert([{
        tanggal: pengTgl, jenis: jenisFinal,
        keterangan: pengKet || null, nominal: Number(pengNominal),
        created_by: user.id,
      }]);
      if (error) throw error;
      alert('✅ Pengeluaran dicatat!');
      setPengKet(''); setPengNominal(''); setPengJenisCustom('');
      fetchAll();
    } catch (err) { alert('Gagal: ' + err.message); }
    finally { setPengSubmitting(false); }
  }

  // ===== INPUT PEMASUKAN =====
  async function handleSubmitPemasukan(e) {
    e.preventDefault();
    const jenisFinal = masukJenis === 'Lainnya' ? masukJenisCustom.trim() : masukJenis;
    if (!jenisFinal || !masukNominal) { alert('Lengkapi data'); return; }
    setMasukSubmitting(true);
    try {
      const { error } = await supabase.from('pemasukan_lain').insert([{
        tanggal: masukTgl, jenis: jenisFinal,
        keterangan: masukKet || null, nominal: Number(masukNominal),
        created_by: user.id,
      }]);
      if (error) throw error;
      alert('✅ Pemasukan dicatat!');
      setMasukKet(''); setMasukNominal(''); setMasukJenisCustom('');
      fetchAll();
    } catch (err) { alert('Gagal: ' + err.message); }
    finally { setMasukSubmitting(false); }
  }

  // ===== INPUT DEPOSIT =====
  async function handleSubmitDeposit(e) {
    e.preventDefault();
    if (!depWargaId || !depJumlah) { alert('Pilih warga dan isi jumlah'); return; }
    setDepSubmitting(true);
    try {
      const { error } = await supabase.from('deposit_warga').insert([{
        warga_id: depWargaId, tanggal: depTgl, tipe: 'masuk',
        jumlah: Number(depJumlah), keterangan: depKet || null, created_by: user.id,
      }]);
      if (error) throw error;
      alert('✅ Deposit dicatat!');
      setDepWargaId(''); setDepJumlah(''); setDepKet('');
      fetchAll();
    } catch (err) { alert('Gagal: ' + err.message); }
    finally { setDepSubmitting(false); }
  }

  // ===== PAKAI DEPOSIT =====
  const bulanPakaiDeposit = getBulanTahun(pakaiTahun);
  const wargaPakaiDeposit = warga.find((w) => w.id === modalPakaiDeposit?.wargaId);
  const saldoDepositWargaIni = wargaPakaiDeposit ? getSaldoDepositWarga(wargaPakaiDeposit.id) : 0;
  const tarifPakaiDeposit = tarifWarga(wargaPakaiDeposit);
  const totalPakaiDeposit = pakaiBulan.length * tarifPakaiDeposit;
  const sisaDepositSetelah = saldoDepositWargaIni - totalPakaiDeposit;

  async function handleSubmitPakaiDeposit() {
    if (pakaiBulan.length === 0) { alert('Pilih minimal 1 bulan'); return; }
    if (totalPakaiDeposit > saldoDepositWargaIni) { alert('Saldo deposit tidak cukup'); return; }
    try {
      const batchId = crypto.randomUUID();
      const today = new Date().toISOString().split('T')[0];

      // 1. Insert iuran records
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

      // 2. Insert deposit_warga (tipe pakai)
      const { error: e2 } = await supabase.from('deposit_warga').insert([{
        warga_id: wargaPakaiDeposit.id,
        tanggal: today,
        tipe: 'pakai',
        jumlah: totalPakaiDeposit,
        keterangan: `Pakai deposit untuk ${pakaiBulan.length} bulan (${pakaiBulan.join(', ')})`,
        created_by: user.id,
      }]);
      if (e2) throw e2;

      alert('✅ Deposit berhasil dipakai untuk iuran!');
      setModalPakaiDeposit(null);
      setPakaiBulan([]);
      fetchAll();
    } catch (err) { alert('Gagal: ' + err.message); }
  }

  if (!user) return null;
  const canAccess = user.role === 'ketua' || user.role === 'bendahara';
  if (!canAccess) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <p className="text-sm">Halaman ini khusus Ketua & Bendahara.</p>
          <Link href="/admin" className="text-xs text-blue-400 mt-3 inline-block">← Kembali ke Admin</Link>
        </div>
      </div>
    );
  }

  const renderTab = () => {
    if (loading) return <div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div>;
    switch (tab) {
      case 'dashboard':
        return <TabDashboard {...{ saldoKasBebas, saldoDepositTotal, totalPemasukan, totalPengeluaran, totalIuranApproved, totalPemasukanLain, pendingBatches, pengeluaran, setTab }} />;
      case 'verifikasi':
        return <TabVerifikasi {...{ pendingBatches, iuran, filterVerif, setFilterVerif, handleApprove }} />;
      case 'tunai':
        return <TabTunai {...{ warga, tunaiWargaId, setTunaiWargaId, tunaiBulan, setTunaiBulan, tunaiTanggal, setTunaiTanggal, tunaiCatatan, setTunaiCatatan, bulanBelumLunas, totalTunai, tunaiSubmitting, handleSubmitTunai }} />;
      case 'pemasukan':
        return <TabPemasukan {...{ pemasukanLain, masukTgl, setMasukTgl, masukJenis, setMasukJenis, masukJenisCustom, setMasukJenisCustom, masukKet, setMasukKet, masukNominal, setMasukNominal, masukSubmitting, handleSubmitPemasukan }} />;
      case 'pengeluaran':
        return <TabPengeluaran {...{ pengeluaran, pengTgl, setPengTgl, pengJenis, setPengJenis, pengJenisCustom, setPengJenisCustom, pengKet, setPengKet, pengNominal, setPengNominal, pengSubmitting, handleSubmitPengeluaran }} />;
      case 'deposit':
        return <TabDeposit {...{ warga, depositList, getSaldoDepositWarga, depWargaId, setDepWargaId, depTgl, setDepTgl, depJumlah, setDepJumlah, depKet, setDepKet, depSubmitting, handleSubmitDeposit, setModalPakaiDeposit }} />;
      case 'tunggakan':
        return <TabTunggakan {...{ warga, iuran, tunggakanBulan, setTunggakanBulan }} />;
      case 'riwayat':
        return <TabRiwayat {...{ iuran, pengeluaran, pemasukanLain, depositList, warga }} />;
      default: return null;
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
          <Link href="/admin" className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg text-slate-300 border border-slate-700">← Kembali</Link>
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
            <button key={t.k} onClick={() => setTab(t.k)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition shrink-0 ${
                tab === t.k ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}>
              {t.l}
              {t.k === 'verifikasi' && pendingBatches.length > 0 && (
                <span className="ml-1 inline-block bg-orange-500 text-white text-[9px] px-1.5 rounded-full">{pendingBatches.length}</span>
              )}
            </button>
          ))}
        </div>

        <div>{renderTab()}</div>
      </div>

      {modalPakaiDeposit && wargaPakaiDeposit && (
        <ModalPakaiDeposit {...{ modalPakaiDeposit, setModalPakaiDeposit, pakaiTahun, setPakaiTahun, pakaiBulan, setPakaiBulan, bulanPakaiDeposit, tarifPakaiDeposit, totalPakaiDeposit, saldoDepositWargaIni, sisaDepositSetelah, handleSubmitPakaiDeposit }} />
      )}
    </div>
  );
}
/* ============================================================ */
/* ======================= SUB-TABS =========================== */
/* ============================================================ */

function TabDashboard({ saldoKasBebas, saldoDepositTotal, totalPemasukan, totalPengeluaran, totalIuranApproved, totalPemasukanLain, pendingBatches, pengeluaran, setTab }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="col-span-2 bg-gradient-to-br from-blue-950/60 to-slate-900 border border-blue-500/30 rounded-2xl p-5">
          <span className="text-[10px] text-blue-300 uppercase tracking-wider font-semibold">Saldo Kas Bebas</span>
          <div className="text-2xl font-black text-white mt-1">{formatRupiah(saldoKasBebas)}</div>
          <p className="text-[10px] text-slate-500 mt-1">Saldo setelah dikurangi deposit warga</p>
        </div>
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5">
          <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">Total Pemasukan</span>
          <div className="text-xl font-black text-emerald-400 mt-1">{formatRupiah(totalPemasukan)}</div>
          <div className="text-[10px] text-slate-500 mt-1">Iuran: {formatRupiah(totalIuranApproved)} • Lain: {formatRupiah(totalPemasukanLain)}</div>
        </div>
        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-5">
          <span className="text-[10px] text-rose-400 uppercase tracking-wider font-semibold">Total Pengeluaran</span>
          <div className="text-xl font-black text-rose-400 mt-1">{formatRupiah(totalPengeluaran)}</div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-950/40 to-slate-900 border border-purple-500/30 rounded-2xl p-5 flex justify-between items-center flex-wrap gap-3">
        <div>
          <span className="text-[10px] text-purple-300 uppercase tracking-wider font-semibold">💎 Saldo Deposit Warga</span>
          <div className="text-2xl font-black text-purple-300 mt-1">{formatRupiah(saldoDepositTotal)}</div>
          <p className="text-[10px] text-slate-500 mt-1">Titipan warga untuk iuran tahun berikutnya</p>
        </div>
        <button onClick={() => setTab('deposit')} className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl">
          Kelola Deposit →
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-white">⏳ Menunggu Verifikasi</h3>
            {pendingBatches.length > 0 && (
              <button onClick={() => setTab('verifikasi')} className="text-[10px] text-blue-400 hover:underline">Lihat semua →</button>
            )}
          </div>
          {pendingBatches.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">Tidak ada pending.</p>
          ) : (
            <div className="space-y-2">
              {pendingBatches.slice(0, 3).map((b) => (
                <div key={b.batchId} className="flex justify-between items-center bg-slate-950/60 rounded-xl p-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{b.items[0]?.warga?.nama_lengkap}</div>
                    <div className="text-[10px] text-slate-500">{b.items.length} bulan • {formatRupiah(b.items.reduce((s, i) => s + Number(i.jumlah || 0), 0))}</div>
                  </div>
                  <button onClick={() => setTab('verifikasi')} className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded-lg">Lihat</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-white">➖ Pengeluaran Terbaru</h3>
            <button onClick={() => setTab('pengeluaran')} className="text-[10px] text-blue-400 hover:underline">Lihat semua →</button>
          </div>
          <div className="space-y-2">
            {pengeluaran.slice(0, 4).map((p) => (
              <div key={p.id} className="flex justify-between items-start gap-2 bg-slate-950/60 rounded-xl p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-slate-500">{formatTanggal(p.tanggal)} • {p.jenis}</div>
                  <div className="text-xs text-slate-300 truncate">{p.keterangan || '-'}</div>
                </div>
                <div className="text-xs font-bold text-rose-400 whitespace-nowrap">{formatRupiah(p.nominal)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabVerifikasi({ pendingBatches, iuran, filterVerif, setFilterVerif, handleApprove }) {
  const grouped = {};
  iuran.filter((i) => (filterVerif === 'all' ? true : i.status === filterVerif)).forEach((i) => {
    const key = i.batch_id || i.id;
    if (!grouped[key]) grouped[key] = { batchId: key, items: [], status: i.status, tanggal: i.tanggal_transaksi };
    grouped[key].items.push(i);
  });
  const list = Object.values(grouped).sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[
          { k: 'pending', l: `⏳ Pending (${pendingBatches.length})` },
          { k: 'approved', l: '✓ Approved' },
          { k: 'all', l: '📋 Semua' },
        ].map((f) => (
          <button key={f.k} onClick={() => setFilterVerif(f.k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              filterVerif === f.k ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}>{f.l}</button>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-3">Warga</th>
                <th className="p-3">Bulan</th>
                <th className="p-3">Total</th>
                <th className="p-3">Metode</th>
                <th className="p-3">Bukti</th>
                <th className="p-3">Status</th>
                <th className="p-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {list.length === 0 ? (
                <tr><td colSpan="7" className="p-6 text-center text-slate-500">Tidak ada data.</td></tr>
              ) : (
                list.map((b) => {
                  const w = b.items[0]?.warga;
                  const total = b.items.reduce((s, i) => s + Number(i.jumlah || 0), 0);
                  const bukti = b.items[0]?.bukti_urls || [];
                  const metode = b.items[0]?.metode || '-';
                  return (
                    <tr key={b.batchId} className="hover:bg-slate-800/40">
                      <td className="p-3">
                        <div className="font-semibold text-white">{w?.nama_lengkap || '-'}</div>
                        <div className="text-[10px] text-slate-500">{w?.no_rumah}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {b.items.map((i) => (
                            <span key={i.id} className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">{i.bulan_tahun.replace('2026-', '')}</span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 font-mono">{formatRupiah(total)}</td>
                      <td className="p-3">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">{metode}</span>
                      </td>
                      <td className="p-3">
                        {bukti.length > 0 ? (
                          <div className="flex gap-1">
                            {bukti.map((u, i) => (
                              <a key={i} href={u} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-[10px]">📎{i + 1}</a>
                            ))}
                          </div>
                        ) : <span className="text-slate-600">-</span>}
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${
                          b.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                        }`}>{b.status}</span>
                      </td>
                      <td className="p-3">
                        {b.status === 'pending' && (
                          <button onClick={() => handleApprove(b)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg">✓ Approve</button>
                        )}
                        {b.status === 'approved' && b.tanggal && (
                          <span className="text-[10px] text-slate-500">{formatTanggal(b.tanggal)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TabTunai({ warga, tunaiWargaId, setTunaiWargaId, tunaiBulan, setTunaiBulan, tunaiTanggal, setTunaiTanggal, tunaiCatatan, setTunaiCatatan, bulanBelumLunas, totalTunai, tunaiSubmitting, handleSubmitTunai }) {
  const w = warga.find((x) => x.id === tunaiWargaId);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <form onSubmit={handleSubmitTunai} className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 h-fit">
        <h3 className="text-sm font-bold text-white">💵 Input Iuran Tunai</h3>
        <p className="text-[10px] text-slate-500">Untuk warga yang bayar langsung ke bendahara.</p>

        <div>
          <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Warga</label>
          <select value={tunaiWargaId} onChange={(e) => { setTunaiWargaId(e.target.value); setTunaiBulan([]); }} required
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
            <option value="">-- Pilih Warga --</option>
            {warga.map((x) => <option key={x.id} value={x.id}>{x.no_rumah} - {x.nama_lengkap}</option>)}
          </select>
        </div>

        {w && (
          <>
            <div className="text-[10px] text-slate-400">Tarif: <strong className="text-blue-400">{formatRupiah(tarifWarga(w))}/bln</strong></div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-2">Bulan</label>
              <div className="grid grid-cols-2 gap-1.5">
                {bulanBelumLunas.length === 0 ? (
                  <div className="col-span-2 text-[10px] text-emerald-400 text-center py-3">Semua bulan sudah lunas ✓</div>
                ) : (
                  bulanBelumLunas.map((b) => (
                    <label key={b.kode} className="flex items-center gap-1.5 text-[11px] cursor-pointer bg-slate-950/60 rounded-lg p-2">
                      <input type="checkbox" checked={tunaiBulan.includes(b.kode)}
                        onChange={() => setTunaiBulan((prev) => prev.includes(b.kode) ? prev.filter((x) => x !== b.kode) : [...prev, b.kode])}
                        className="accent-blue-500" />
                      <span>{b.nama}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        <div>
          <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Tanggal</label>
          <input type="date" value={tunaiTanggal} onChange={(e) => setTunaiTanggal(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Catatan</label>
          <textarea value={tunaiCatatan} onChange={(e) => setTunaiCatatan(e.target.value)} rows={2} placeholder="Opsional"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none" />
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-slate-800">
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Total</div>
            <div className="text-lg font-black text-white">{formatRupiah(totalTunai)}</div>
          </div>
          <button type="submit" disabled={tunaiSubmitting || !tunaiWargaId || tunaiBulan.length === 0}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl">
            {tunaiSubmitting ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>

      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-center text-xs text-slate-500">
        💡 Isi form di kiri untuk mencatat iuran tunai. Riwayat iuran lihat di tab <strong className="text-slate-300 ml-1">Riwayat</strong>.
      </div>
    </div>
  );
}

function TabPemasukan({ pemasukanLain, masukTgl, setMasukTgl, masukJenis, setMasukJenis, masukJenisCustom, setMasukJenisCustom, masukKet, setMasukKet, masukNominal, setMasukNominal, masukSubmitting, handleSubmitPemasukan }) {
  const total = pemasukanLain.reduce((s, p) => s + Number(p.nominal || 0), 0);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <form onSubmit={handleSubmitPemasukan} className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 h-fit">
        <h3 className="text-sm font-bold text-white">➕ Catat Pemasukan</h3>
        <p className="text-[10px] text-slate-500">Pemasukan non-iuran: donasi, mutasi saldo, bunga, dll.</p>

        <div>
          <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Tanggal</label>
          <input type="date" value={masukTgl} onChange={(e) => setMasukTgl(e.target.value)} required
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Jenis</label>
          <select value={masukJenis} onChange={(e) => setMasukJenis(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
            {JENIS_PEMASUKAN.map((j) => <option key={j}>{j}</option>)}
          </select>
        </div>
        {masukJenis === 'Lainnya' && (
          <input type="text" value={masukJenisCustom} onChange={(e) => setMasukJenisCustom(e.target.value)} placeholder="Jenis baru"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
        )}
        <div>
          <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Keterangan</label>
          <textarea value={masukKet} onChange={(e) => setMasukKet(e.target.value)} rows={2} placeholder="Deskripsi pemasukan"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Nominal (Rp)</label>
          <input type="number" value={masukNominal} onChange={(e) => setMasukNominal(e.target.value)} required placeholder="0"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
        </div>
        <button type="submit" disabled={masukSubmitting}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 rounded-xl">
          {masukSubmitting ? 'Menyimpan...' : 'Simpan Pemasukan'}
        </button>
      </form>

      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-sm font-bold text-white">📋 Daftar Pemasukan ({pemasukanLain.length})</h3>
          <span className="text-xs text-emerald-400 font-bold">Total: {formatRupiah(total)}</span>
        </div>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
              <tr>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Jenis</th>
                <th className="p-3">Keterangan</th>
                <th className="p-3 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {pemasukanLain.length === 0 ? (
                <tr><td colSpan="4" className="p-6 text-center text-slate-500">Belum ada pemasukan.</td></tr>
              ) : (
                pemasukanLain.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="p-3 text-slate-400 whitespace-nowrap">{formatTanggal(p.tanggal)}</td>
                    <td className="p-3"><span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded">{p.jenis}</span></td>
                    <td className="p-3 text-slate-300">{p.keterangan || '-'}</td>
                    <td className="p-3 text-right font-mono text-emerald-400">{formatRupiah(p.nominal)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TabPengeluaran({ pengeluaran, pengTgl, setPengTgl, pengJenis, setPengJenis, pengJenisCustom, setPengJenisCustom, pengKet, setPengKet, pengNominal, setPengNominal, pengSubmitting, handleSubmitPengeluaran }) {
  const total = pengeluaran.reduce((s, p) => s + Number(p.nominal || 0), 0);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <form onSubmit={handleSubmitPengeluaran} className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 h-fit">
        <h3 className="text-sm font-bold text-white">➖ Catat Pengeluaran</h3>
        <div>
          <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Tanggal</label>
          <input type="date" value={pengTgl} onChange={(e) => setPengTgl(e.target.value)} required
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Jenis</label>
          <select value={pengJenis} onChange={(e) => setPengJenis(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
            {JENIS_PENGELUARAN.map((j) => <option key={j}>{j}</option>)}
          </select>
        </div>
        {pengJenis === 'Lainnya' && (
          <input type="text" value={pengJenisCustom} onChange={(e) => setPengJenisCustom(e.target.value)} placeholder="Jenis baru"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
        )}
        <div>
          <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Keterangan</label>
          <textarea value={pengKet} onChange={(e) => setPengKet(e.target.value)} rows={2} placeholder="Deskripsi pengeluaran"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Nominal (Rp)</label>
          <input type="number" value={pengNominal} onChange={(e) => setPengNominal(e.target.value)} required placeholder="0"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
        </div>
        <button type="submit" disabled={pengSubmitting}
          className="w-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold py-2.5 rounded-xl">
          {pengSubmitting ? 'Menyimpan...' : 'Simpan Pengeluaran'}
        </button>
      </form>

      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-sm font-bold text-white">📋 Daftar Pengeluaran ({pengeluaran.length})</h3>
          <span className="text-xs text-rose-400 font-bold">Total: {formatRupiah(total)}</span>
        </div>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
              <tr>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Jenis</th>
                <th className="p-3">Keterangan</th>
                <th className="p-3 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {pengeluaran.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40">
                  <td className="p-3 text-slate-400 whitespace-nowrap">{formatTanggal(p.tanggal)}</td>
                  <td className="p-3"><span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded">{p.jenis}</span></td>
                  <td className="p-3 text-slate-300">{p.keterangan || '-'}</td>
                  <td className="p-3 text-right font-mono text-rose-400">{formatRupiah(p.nominal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TabDeposit({ warga, depositList, getSaldoDepositWarga, depWargaId, setDepWargaId, depTgl, setDepTgl, depJumlah, setDepJumlah, depKet, setDepKet, depSubmitting, handleSubmitDeposit, setModalPakaiDeposit }) {
  const wargaDenganSaldo = warga
    .map((w) => ({ ...w, saldo: getSaldoDepositWarga(w.id) }))
    .filter((w) => w.saldo !== 0)
    .sort((a, b) => b.saldo - a.saldo);

  const totalSaldo = wargaDenganSaldo.reduce((s, w) => s + w.saldo, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <form onSubmit={handleSubmitDeposit} className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 h-fit">
          <h3 className="text-sm font-bold text-white">💎 Input Deposit Masuk</h3>
          <p className="text-[10px] text-slate-500">Catat setoran deposit warga untuk iuran tahun depan.</p>

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Warga</label>
            <select value={depWargaId} onChange={(e) => setDepWargaId(e.target.value)} required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
              <option value="">-- Pilih Warga --</option>
              {warga.map((x) => <option key={x.id} value={x.id}>{x.no_rumah} - {x.nama_lengkap}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Tanggal</label>
            <input type="date" value={depTgl} onChange={(e) => setDepTgl(e.target.value)} required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Jumlah (Rp)</label>
            <input type="number" value={depJumlah} onChange={(e) => setDepJumlah(e.target.value)} required placeholder="0"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Keterangan</label>
            <textarea value={depKet} onChange={(e) => setDepKet(e.target.value)} rows={2} placeholder="Opsional"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none" />
          </div>
          <button type="submit" disabled={depSubmitting}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold py-2.5 rounded-xl">
            {depSubmitting ? 'Menyimpan...' : 'Simpan Deposit'}
          </button>
        </form>

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-sm font-bold text-white">💎 Saldo Deposit Warga</h3>
            <span className="text-xs text-purple-400 font-bold">Total: {formatRupiah(totalSaldo)}</span>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="p-3">No. Rumah</th>
                  <th className="p-3">Nama</th>
                  <th className="p-3 text-right">Saldo Deposit</th>
                  <th className="p-3">Estimasi</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {wargaDenganSaldo.length === 0 ? (
                  <tr><td colSpan="5" className="p-6 text-center text-slate-500">Belum ada deposit.</td></tr>
                ) : (
                  wargaDenganSaldo.map((w) => {
                    const tarif = tarifWarga(w);
                    const estimasiBulan = Math.floor(w.saldo / tarif);
                    return (
                      <tr key={w.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono text-white">{w.no_rumah}</td>
                        <td className="p-3 text-slate-300">{w.nama_lengkap}</td>
                        <td className="p-3 text-right font-mono text-purple-400 font-bold">{formatRupiah(w.saldo)}</td>
                        <td className="p-3 text-[10px] text-slate-500">±{estimasiBulan} bulan @ {formatRupiah(tarif)}</td>
                        <td className="p-3 text-right">
                          {w.saldo >= tarif ? (
                            <button onClick={() => setModalPakaiDeposit({ wargaId: w.id })}
                              className="bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg">
                              Pakai untuk Iuran
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-600">Saldo kurang</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white">📜 Riwayat Mutasi Deposit</h3>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
              <tr>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Warga</th>
                <th className="p-3">Tipe</th>
                <th className="p-3">Keterangan</th>
                <th className="p-3 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {depositList.length === 0 ? (
                <tr><td colSpan="5" className="p-6 text-center text-slate-500">Belum ada mutasi.</td></tr>
              ) : (
                depositList.map((d) => {
                  const w = warga.find((x) => x.id === d.warga_id);
                  return (
                    <tr key={d.id} className="hover:bg-slate-800/40">
                      <td className="p-3 text-slate-400 whitespace-nowrap">{formatTanggal(d.tanggal)}</td>
                      <td className="p-3 text-slate-300">{w?.no_rumah} - {w?.nama_lengkap}</td>
                      <td className="p-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${
                          d.tipe === 'masuk' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>{d.tipe === 'masuk' ? '↓ Masuk' : '↑ Pakai'}</span>
                      </td>
                      <td className="p-3 text-slate-400 text-[10px]">{d.keterangan || '-'}</td>
                      <td className={`p-3 text-right font-mono font-semibold ${d.tipe === 'masuk' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {d.tipe === 'masuk' ? '+' : '-'} {formatRupiah(d.jumlah)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TabTunggakan({ warga, iuran, tunggakanBulan, setTunggakanBulan }) {
  const list = warga.map((w) => {
    const totalApproved = iuran
      .filter((i) => i.warga_id === w.id && i.bulan_tahun === tunggakanBulan && i.status === 'approved')
      .reduce((s, i) => s + Number(i.jumlah || 0), 0);
    const adaPending = iuran.some((i) => i.warga_id === w.id && i.bulan_tahun === tunggakanBulan && i.status === 'pending');
    const tarif = tarifWarga(w);
    return { ...w, totalApproved, adaPending, kurang: Math.max(0, tarif - totalApproved), lunas: totalApproved >= tarif, tarif };
  }).filter((w) => !w.lunas);

  const totalTunggakan = list.reduce((s, w) => s + w.kurang, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <select value={tunggakanBulan} onChange={(e) => setTunggakanBulan(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
          {PERIODE_BULAN.map((b) => <option key={b.kode} value={b.kode}>{b.nama} 2026</option>)}
        </select>
        <div className="text-xs text-slate-400">
          Total Tunggakan: <strong className="text-amber-400">{formatRupiah(totalTunggakan)}</strong>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-3">No</th>
                <th className="p-3">Warga</th>
                <th className="p-3">Kategori</th>
                <th className="p-3 text-right">Terbayar</th>
                <th className="p-3 text-right">Kurang</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {list.length === 0 ? (
                <tr><td colSpan="6" className="p-6 text-center text-emerald-400">🎉 Semua warga sudah lunas bulan ini!</td></tr>
              ) : (
                list.map((w, i) => (
                  <tr key={w.id} className="hover:bg-slate-800/40">
                    <td className="p-3 text-slate-500">{i + 1}</td>
                    <td className="p-3">
                      <div className="font-semibold text-white">{w.nama_lengkap}</div>
                      <div className="text-[10px] text-slate-500">{w.no_rumah}</div>
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${
                        w.kategori === 'Usaha' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>{w.kategori === 'Usaha' ? '🏪 Usaha' : '🏠 Hunian'}</span>
                    </td>
                    <td className="p-3 text-right text-slate-300">{formatRupiah(w.totalApproved)}</td>
                    <td className="p-3 text-right font-bold text-amber-400">{formatRupiah(w.kurang)}</td>
                    <td className="p-3">
                      {w.adaPending ? (
                        <span className="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded border border-orange-500/20">⏳ Pending</span>
                      ) : (
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">Belum</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TabRiwayat({ iuran, pengeluaran, pemasukanLain, depositList, warga }) {
  const [filter, setFilter] = useState('semua');

  const iuranItems = iuran.map((i) => ({
    id: 'i-' + i.id,
    tanggal: i.tanggal_transaksi || i.created_at?.split('T')[0],
    tipe: i.metode === 'deposit' ? 'Iuran (Deposit)' : (i.status === 'approved' ? 'Iuran' : 'Iuran Pending'),
    keterangan: `${warga.find((w) => w.id === i.warga_id)?.nama_lengkap || '-'} — ${i.bulan_tahun}`,
    nominal: Number(i.jumlah),
    arah: i.status === 'approved' ? 'in' : 'pending',
  }));

  const pengItems = pengeluaran.map((p) => ({
    id: 'p-' + p.id,
    tanggal: p.tanggal,
    tipe: 'Pengeluaran',
    keterangan: `${p.jenis} — ${p.keterangan || ''}`,
    nominal: Number(p.nominal),
    arah: 'out',
  }));

  const pemasukanItems = pemasukanLain.map((m) => ({
    id: 'm-' + m.id,
    tanggal: m.tanggal,
    tipe: 'Pemasukan Lain',
    keterangan: `${m.jenis} — ${m.keterangan || ''}`,
    nominal: Number(m.nominal),
    arah: 'in',
  }));

  const depositItems = depositList.map((d) => {
    const w = warga.find((x) => x.id === d.warga_id);
    return {
      id: 'd-' + d.id,
      tanggal: d.tanggal,
      tipe: d.tipe === 'masuk' ? 'Deposit Masuk' : 'Deposit Dipakai',
      keterangan: `${w?.no_rumah} — ${w?.nama_lengkap} — ${d.keterangan || ''}`,
      nominal: Number(d.jumlah),
      arah: d.tipe === 'masuk' ? 'in' : 'out',
    };
  });

  const all = [...iuranItems, ...pengItems, ...pemasukanItems, ...depositItems]
    .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  const filtered = filter === 'semua' ? all
    : filter === 'in' ? all.filter((x) => x.arah === 'in')
    : filter === 'out' ? all.filter((x) => x.arah === 'out')
    : all.filter((x) => x.arah === 'pending');

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[
          { k: 'semua', l: '📋 Semua' },
          { k: 'in', l: '↑ Pemasukan' },
          { k: 'out', l: '↓ Pengeluaran' },
          { k: 'pending', l: '⏳ Pending' },
        ].map((f) => (
          <button key={f.k} onClick={() => setFilter(f.k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              filter === f.k ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}>{f.l}</button>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
              <tr>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Tipe</th>
                <th className="p-3">Keterangan</th>
                <th className="p-3 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((x) => (
                <tr key={x.id} className="hover:bg-slate-800/40">
                  <td className="p-3 text-slate-400 whitespace-nowrap">{formatTanggal(x.tanggal)}</td>
                  <td className="p-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${
                      x.arah === 'in' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : x.arah === 'out' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                    }`}>{x.tipe}</span>
                  </td>
                  <td className="p-3 text-slate-300">{x.keterangan}</td>
                  <td className={`p-3 text-right font-mono font-semibold ${
                    x.arah === 'in' ? 'text-emerald-400' : x.arah === 'out' ? 'text-rose-400' : 'text-orange-400'
                  }`}>
                    {x.arah === 'in' ? '+' : x.arah === 'out' ? '-' : ''} {formatRupiah(x.nominal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ModalPakaiDeposit({ modalPakaiDeposit, setModalPakaiDeposit, pakaiTahun, setPakaiTahun, pakaiBulan, setPakaiBulan, bulanPakaiDeposit, tarifPakaiDeposit, totalPakaiDeposit, saldoDepositWargaIni, sisaDepositSetelah, handleSubmitPakaiDeposit }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl my-8">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="font-bold text-white text-base">💎 Pakai Deposit untuk Iuran</h3>
          <button onClick={() => setModalPakaiDeposit(null)} className="w-8 h-8 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center text-sm">✕</button>
        </div>

        <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Saldo Deposit:</span>
            <strong className="text-purple-300">{formatRupiah(saldoDepositWargaIni)}</strong>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Tarif Berlaku:</span>
            <strong className="text-blue-400">{formatRupiah(tarifPakaiDeposit)}/bln</strong>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">Tahun</label>
          <select value={pakaiTahun} onChange={(e) => { setPakaiTahun(Number(e.target.value)); setPakaiBulan([]); }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
            <option value={2028}>2028</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">Pilih Bulan</label>
          <div className="grid grid-cols-3 gap-1.5">
            {bulanPakaiDeposit.map((b) => {
              const checked = pakaiBulan.includes(b.kode);
              return (
                <label key={b.kode} className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 cursor-pointer transition ${
                  checked ? 'bg-purple-600/20 border-purple-500/50 text-white' : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}>
                  <input type="checkbox" checked={checked}
                    onChange={() => setPakaiBulan((prev) => prev.includes(b.kode) ? prev.filter((x) => x !== b.kode) : [...prev, b.kode])}
                    className="accent-purple-500" />
                  <span className="truncate">{b.nama.substring(0, 3)}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Total Pakai:</span>
            <strong className="text-white">{formatRupiah(totalPakaiDeposit)} ({pakaiBulan.length} bulan)</strong>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Sisa Setelah:</span>
            <strong className={sisaDepositSetelah < 0 ? 'text-rose-400' : 'text-emerald-400'}>{formatRupiah(sisaDepositSetelah)}</strong>
          </div>
        </div>

        {sisaDepositSetelah < 0 && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-400">
            ⚠️ Saldo deposit tidak cukup! Kurangi pilihan bulan.
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => setModalPakaiDeposit(null)}
            className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs">Batal</button>
          <button onClick={handleSubmitPakaiDeposit} disabled={pakaiBulan.length === 0 || sisaDepositSetelah < 0}
            className="w-1/2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-xs">
            Konfirmasi Pakai
          </button>
        </div>
      </div>
    </div>
  );
}

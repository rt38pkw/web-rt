import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export default function DashboardWarga() {
  const [warga, setWarga] = useState(null);
  const [iuranList, setIuranList] = useState([]);
  const [allWargaList, setAllWargaList] = useState([]);
  const [allIuranList, setAllIuranList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRekap, setLoadingRekap] = useState(false);
  const [activeTab, setActiveTab] = useState('iuran');
  const [showRekapModal, setShowRekapModal] = useState(false);
  const [selectedBulanDetail, setSelectedBulanDetail] = useState(null);

  // Modal bayar
  const [showModalBayar, setShowModalBayar] = useState(false);
  const [bulanDipilih, setBulanDipilih] = useState([]);
  const [fileBukti, setFileBukti] = useState([null, null, null]);
  const [previewBukti, setPreviewBukti] = useState([null, null, null]);
  const [catatanBayar, setCatatanBayar] = useState('');
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
    fetchDataIuran(userData.id);
    refreshSession(userData.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshSession = async (wargaId) => {
    try {
      const { data, error } = await supabase
        .from('warga').select('*').eq('id', wargaId).single();
      if (!error && data) {
        setWarga(data);
        localStorage.setItem('warga_session', JSON.stringify(data));
      }
    } catch (err) {
      console.error('Gagal refresh session:', err);
    }
  };

  const fetchDataIuran = async (wargaId) => {
    try {
      const { data, error } = await supabase
        .from('iuran').select('*').eq('warga_id', wargaId);
      if (!error && data) setIuranList(data);
    } catch (err) {
      console.error('Gagal mengambil data iuran:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllWargaAndIuran = async () => {
    if (allWargaList.length > 0) {
      setShowRekapModal(true);
      return;
    }
    setLoadingRekap(true);
    try {
      const [resWarga, resIuran] = await Promise.all([
        supabase.from('warga').select('*').order('no_rumah', { ascending: true }),
        supabase.from('iuran').select('*'),
      ]);
      if (!resWarga.error && resWarga.data) setAllWargaList(resWarga.data);
      if (!resIuran.error && resIuran.data) setAllIuranList(resIuran.data);
      setShowRekapModal(true);
    } catch (err) {
      console.error('Gagal memuat rekap seluruh warga:', err);
    } finally {
      setLoadingRekap(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('warga_session');
    router.push('/');
  };

  const formatTanggal = (dateString) => {
    if (!dateString) return 'Tanggal tidak tercatat';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(date);
  };

  if (!warga) return null;

  const isUsaha = warga.kategori === 'Usaha' || warga.no_rumah?.trim() === 'A2 - 19';
  const tarifBulanan = isUsaha ? 30000 : 15000;

  const totalDisetor = iuranList
    .filter(i => i.status === 'approved')
    .reduce((acc, curr) => acc + Number(curr.jumlah || 0), 0);

  const adaPending = iuranList.some(i => i.status === 'pending');
  const bulanAbu = PERIODE_BULAN.filter(bln =>
    !iuranList.find(i => i.bulan_tahun === bln.kode)
  );

  // ============ MODAL BAYAR ============
  const handleOpenModalBayar = () => {
    setBulanDipilih(bulanAbu.map(b => b.kode));
    setFileBukti([null, null, null]);
    setPreviewBukti([null, null, null]);
    setCatatanBayar('');
    setShowModalBayar(true);
  };

  const handleFileChange = (slotIndex, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('Format file harus JPG, PNG, atau WebP');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert('Ukuran file maksimal 3 MB');
      return;
    }
    const newFiles = [...fileBukti];
    newFiles[slotIndex] = file;
    setFileBukti(newFiles);

    const newPreviews = [...previewBukti];
    if (newPreviews[slotIndex]) URL.revokeObjectURL(newPreviews[slotIndex]);
    newPreviews[slotIndex] = URL.createObjectURL(file);
    setPreviewBukti(newPreviews);
  };

  const handleRemoveFile = (slotIndex) => {
    const newFiles = [...fileBukti];
    newFiles[slotIndex] = null;
    setFileBukti(newFiles);

    const newPreviews = [...previewBukti];
    if (newPreviews[slotIndex]) URL.revokeObjectURL(newPreviews[slotIndex]);
    newPreviews[slotIndex] = null;
    setPreviewBukti(newPreviews);
  };

  const handleSubmitBayar = async () => {
    if (bulanDipilih.length === 0) {
      alert('Pilih minimal 1 bulan');
      return;
    }
    if (!fileBukti[0]) {
      alert('Upload minimal 1 bukti pembayaran (slot 1)');
      return;
    }

    setSubmitting(true);
    try {
      const batchId = crypto.randomUUID();
      const uploadedUrls = [];

      for (let i = 0; i < 3; i++) {
        const file = fileBukti[i];
        if (!file) continue;
        const ext = file.name.split('.').pop().toLowerCase();
        const path = `${warga.id}/${batchId}/${i + 1}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('bukti-transfer')
          .upload(path, file, { upsert: false });
        if (upErr) throw upErr;

        const { data: urlData } = supabase.storage
          .from('bukti-transfer')
          .getPublicUrl(path);
        uploadedUrls.push(urlData.publicUrl);
      }

      const records = bulanDipilih.map(bln => ({
        warga_id: warga.id,
        bulan_tahun: bln,
        jumlah: tarifBulanan,
        status: 'pending',
        batch_id: batchId,
        bukti_urls: uploadedUrls,
        catatan: catatanBayar || null,
        tanggal_transaksi: null,
      }));

      const { error: insErr } = await supabase.from('iuran').insert(records);
      if (insErr) throw insErr;

      alert('✅ Pengajuan berhasil dikirim! Menunggu approve bendahara.');
      setShowModalBayar(false);
      fetchDataIuran(warga.id);
    } catch (err) {
      console.error(err);
      alert('Gagal mengirim: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const totalBayar = bulanDipilih.length * tarifBulanan;

  // ============ RENDER ============
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white antialiased">
      <Head>
        <title>Dashboard Warga - RT 38 Puri Kencana Wagir</title>
      </Head>

      <header className="px-5 py-3.5 border-b border-slate-800/60 flex justify-between items-center bg-slate-900/40 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center overflow-hidden shrink-0">
            <img src="/logo-rt38.png" alt="Logo RT 38" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-bold text-xs sm:text-sm text-white tracking-wide">PORTAL WARGA</h1>
            <p className="text-[10px] text-slate-400">RT 38 Puri Kencana Wagir</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-xl border border-rose-500/20 transition font-medium"
        >
          Keluar 🚪
        </button>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6 my-1">

        <section className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Warga RT 38</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{warga.nama_lengkap}</h2>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <span className="text-slate-400">Rumah:</span>
                <strong className="text-white font-semibold">{warga.no_rumah}</strong>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <span className="text-slate-400">Tarif:</span>
                <strong className="text-blue-400 font-semibold">Rp {tarifBulanan.toLocaleString('id-ID')}/bln</strong>
              </div>
              {isUsaha && (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded-xl font-medium">
                  Tempat Usaha
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="pt-2">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Menu Navigasi</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { key: 'iuran', label: 'Status Iuran', icon: '💰' },
              { key: 'pengumuman', label: 'Pengumuman', icon: '📢' },
              { key: 'surat', label: 'Surat Mandiri', icon: '📄' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 flex items-center gap-2 shrink-0 ${
                  activeTab === t.key
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-800/60 my-4"></div>

        {activeTab === 'iuran' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/30 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">📊 Transparansi Kas RT 38</h4>
                <p className="text-xs text-slate-400 mt-0.5">Lihat rekapitulasi pembayaran iuran seluruh warga secara lengkap.</p>
              </div>
              <button
                onClick={fetchAllWargaAndIuran}
                disabled={loadingRekap}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 shrink-0"
              >
                {loadingRekap ? 'Memuat Data...' : '📋 Lihat Rekap Seluruh Warga'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Total Setor Warga</span>
                <span className="text-lg sm:text-2xl font-black text-white mt-1">
                  Rp {totalDisetor.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="bg-slate-900/60 border border-emerald-500/20 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                <span className="text-[11px] text-emerald-400 uppercase tracking-wider font-medium">Total Donasi 💚</span>
                <span className="text-lg sm:text-2xl font-black text-emerald-400 mt-1">Rp 0</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-xl">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Grid Iuran Bulanan 2026</h3>
                  <p className="text-xs text-slate-400">Klik grid untuk detail tanggal</p>
                </div>
                <span className="text-xs bg-slate-800/80 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700/60 font-medium">9 Bulan</span>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-slate-500">Memuat data iuran...</div>
              ) : (
                <>
                  {adaPending && (
                    <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl text-xs text-orange-300">
                      ⏳ Ada pengajuan yang menunggu approve bendahara. Tunggu sampai disetujui sebelum mengajukan lagi.
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {PERIODE_BULAN.map((bln, idx) => {
                      const recordBulan = iuranList.find(i => i.bulan_tahun === bln.kode);
                      const nominalLangsung = recordBulan ? Number(recordBulan.jumlah || 0) : 0;
                      const status = recordBulan?.status || null;

                      const isPending = status === 'pending';
                      const isApproved = status === 'approved';
                      const isLunas = isApproved && nominalLangsung >= tarifBulanan;
                      const isSebagian = isApproved && nominalLangsung > 0 && nominalLangsung < tarifBulanan;
                      const isKosong = !recordBulan;

                      const isTombolBayar =
                        isKosong &&
                        !adaPending &&
                        bulanAbu[0]?.kode === bln.kode;

                      const sisaKekurangan = isSebagian ? tarifBulanan - nominalLangsung : 0;

                      let cardClass = 'bg-slate-950/60 border-slate-800/60 text-slate-400';
                      if (isLunas) cardClass = 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300';
                      else if (isSebagian) cardClass = 'bg-amber-950/20 border-amber-500/30 text-amber-300';
                      else if (isPending) cardClass = 'bg-orange-950/20 border-orange-500/30 text-orange-300';

                      const canClick = isApproved && nominalLangsung > 0;

                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (canClick) {
                              setSelectedBulanDetail({
                                namaBulan: bln.nama,
                                jumlah: nominalLangsung,
                                tanggal: recordBulan?.tanggal_transaksi,
                                buktiUrls: recordBulan?.bukti_urls || [],
                              });
                            }
                          }}
                          className={`p-3.5 rounded-2xl border transition-all duration-200 ${cardClass} ${
                            canClick ? 'cursor-pointer hover:scale-[1.01]' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white tracking-wide">{bln.nama}</span>
                              <span className="text-[10px] text-slate-400">2026</span>
                            </div>
                            <span className={`inline-block text-[10px] px-2.5 py-1 rounded-xl font-semibold border ${
                              isLunas ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : isSebagian ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : isPending ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                              : 'bg-slate-800/80 text-slate-400 border-slate-700/60'
                            }`}>
                              {isLunas ? '✓ Lunas'
                                : isSebagian ? `- Rp ${sisaKekurangan.toLocaleString('id-ID')}`
                                : isPending ? '⏳ Menunggu'
                                : 'Belum'}
                            </span>
                          </div>

                          <div className="text-[11px] mt-1 text-slate-400">
                            {isLunas ? `Rp ${nominalLangsung.toLocaleString('id-ID')}`
                              : isSebagian ? `Terbayar Rp ${nominalLangsung.toLocaleString('id-ID')}`
                              : isPending ? `Rp ${nominalLangsung.toLocaleString('id-ID')}`
                              : `Rp 0 / ${tarifBulanan.toLocaleString('id-ID')}`}
                          </div>

                          {isTombolBayar && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenModalBayar();
                              }}
                              className="mt-2.5 w-full bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold py-2 rounded-xl transition shadow-lg shadow-blue-600/20"
                            >
                              📱 Bayar via QRIS
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'pengumuman' && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-4 animate-in fade-in duration-200">
            <h3 className="text-base font-bold text-white">📢 Pengumuman Lingkungan RT 38</h3>
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">Penting</span>
              <h4 className="text-sm font-bold text-white">Peluncuran Portal Mandiri Warga RT 38</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Selamat datang di Portal Digital RT 38 Puri Kencana Wagir! Warga dapat memantau riwayat pembayaran iuran bulanan dan informasi lingkungan secara real-time.
              </p>
              <span className="text-[10px] text-slate-500 block pt-1">Diunggah: Oktober 2026</span>
            </div>
          </div>
        )}

        {activeTab === 'surat' && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 text-center space-y-3 animate-in fade-in duration-200">
            <div className="text-4xl">📄</div>
            <h3 className="text-base font-bold text-white">Pengajuan Surat Pengantar</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Fitur pencetakan dan pengajuan Surat Pengantar RT online sedang dalam tahap pengembangan dan akan segera diaktifkan.
            </p>
            <button disabled className="px-4 py-2 bg-slate-800/60 text-slate-500 rounded-xl text-xs font-semibold cursor-not-allowed border border-slate-800">
              Segera Hadir 🚧
            </button>
          </div>
        )}

      </main>

      {/* ============ MODAL DETAIL BULAN (approved) ============ */}
      {selectedBulanDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Detail Pembayaran</h3>
              <button
                onClick={() => setSelectedBulanDetail(null)}
                className="w-7 h-7 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center text-xs transition"
              >✕</button>
            </div>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Bulan:</span>
                <strong className="text-white">{selectedBulanDetail.namaBulan} 2026</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Nominal:</span>
                <strong className="text-emerald-400">Rp {selectedBulanDetail.jumlah.toLocaleString('id-ID')}</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Tanggal:</span>
                <strong className="text-amber-400">{formatTanggal(selectedBulanDetail.tanggal)}</strong>
              </div>
            </div>
            <button
              onClick={() => setSelectedBulanDetail(null)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition"
            >Tutup</button>
          </div>
        </div>
      )}

      {/* ============ MODAL BAYAR ============ */}
      {showModalBayar && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl my-8">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">📱 Bayar via QRIS</h3>
                <p className="text-[11px] text-slate-400">Scan QR, transfer, lalu upload bukti</p>
              </div>
              <button
                onClick={() => !submitting && setShowModalBayar(false)}
                disabled={submitting}
                className="w-8 h-8 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center text-sm transition disabled:opacity-40"
              >✕</button>
            </div>

            {/* QRIS */}
            <div className="bg-white rounded-2xl p-3 flex flex-col items-center">
              <img src="/qris.png" alt="QRIS RT 38" className="w-48 h-48 object-contain" />
              <p className="text-[10px] text-slate-600 mt-2 font-medium">Scan dengan aplikasi bank / e-wallet</p>
            </div>

            {/* Checklist bulan */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">Pilih Bulan</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PERIODE_BULAN.map((bln) => {
                  const rec = iuranList.find(i => i.bulan_tahun === bln.kode);
                  const disabled = !!rec;
                  const checked = bulanDipilih.includes(bln.kode);
                  return (
                    <label
                      key={bln.kode}
                      className={`p-2 rounded-xl border text-xs flex items-center gap-2 cursor-pointer transition ${
                        disabled
                          ? 'bg-slate-950/40 border-slate-800/50 text-slate-600 cursor-not-allowed'
                          : checked
                          ? 'bg-blue-600/20 border-blue-500/50 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => {
                          if (disabled) return;
                          setBulanDipilih(prev =>
                            prev.includes(bln.kode)
                              ? prev.filter(k => k !== bln.kode)
                              : [...prev, bln.kode]
                          );
                        }}
                        className="accent-blue-500"
                      />
                      <span className="truncate">{bln.nama}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Upload 3 slot */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Upload Bukti Transfer <span className="text-slate-500">(slot 1 wajib)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((slot) => (
                  <div key={slot} className="relative">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={(e) => handleFileChange(slot, e)}
                      className="hidden"
                      id={`file-slot-${slot}`}
                    />
                    <label
                      htmlFor={`file-slot-${slot}`}
                      className={`block aspect-square rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden transition ${
                        previewBukti[slot]
                          ? 'border-blue-500/60 bg-slate-950'
                          : slot === 0
                          ? 'border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10'
                          : 'border-slate-700 bg-slate-950/60 hover:bg-slate-800/40'
                      }`}
                    >
                      {previewBukti[slot] ? (
                        <img src={previewBukti[slot]} alt={`Bukti ${slot + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <div className="text-2xl">{slot === 0 ? '📸' : '➕'}</div>
                          <div className="text-[9px] text-slate-400 mt-1">Slot {slot + 1}{slot === 0 ? ' *' : ''}</div>
                        </div>
                      )}
                    </label>
                    {previewBukti[slot] && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleRemoveFile(slot);
                        }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 hover:bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center shadow-lg"
                      >✕</button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">JPG / PNG / WebP • maks 3 MB per file</p>
            </div>

            {/* Catatan */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">Catatan (opsional)</label>
              <textarea
                value={catatanBayar}
                onChange={(e) => setCatatanBayar(e.target.value)}
                placeholder="Contoh: transfer dari rekening istri"
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 resize-none"
              />
            </div>

            {/* Total & Submit */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-3">
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Total Bayar</div>
                <div className="text-lg font-black text-white">Rp {totalBayar.toLocaleString('id-ID')}</div>
                <div className="text-[10px] text-slate-500">{bulanDipilih.length} bulan × Rp {tarifBulanan.toLocaleString('id-ID')}</div>
              </div>
              <button
                onClick={handleSubmitBayar}
                disabled={submitting || bulanDipilih.length === 0 || !fileBukti[0]}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-semibold px-5 py-3 rounded-xl transition shadow-lg shadow-blue-600/20"
              >
                {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL REKAP WARGA ============ */}
      {showRekapModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-6xl h-[90vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden">
            <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
              <div className="min-w-0">
                <h3 className="font-bold text-white text-xs sm:text-base truncate">📋 Rekap Iuran RT 38 (2026)</h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400">Transparansi kas dan status setoran warga</p>
              </div>
              <button
                onClick={() => setShowRekapModal(false)}
                className="w-8 h-8 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center text-sm transition shrink-0"
              >✕</button>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse" style={{ minWidth: '440px' }}>
                <thead className="sticky top-0 z-30 bg-slate-950">
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="p-1.5 sm:p-3 text-[10px] sm:text-xs text-left sticky left-0 bg-slate-950 z-30 w-[80px] sm:w-[200px] border-r border-slate-800/80">Warga</th>
                    {PERIODE_BULAN.map((b, i) => (
                      <th key={i} className="p-1 sm:p-3 text-[10px] sm:text-xs text-center w-[42px] sm:w-auto">
                        <span className="hidden md:inline">{b.nama}</span>
                        <span className="md:hidden">{b.nama.substring(0, 3)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {allWargaList.map((w, idx) => {
                    const isWargaUsaha = w.kategori === 'Usaha' || w.no_rumah?.trim() === 'A2 - 19';
                    const tarifWarga = isWargaUsaha ? 30000 : 15000;
                    const iuranWarga = allIuranList.filter(i => i.warga_id === w.id);
                    const totalWargaSetor = iuranWarga
                      .filter(i => i.status === 'approved')
                      .reduce((acc, curr) => acc + Number(curr.jumlah || 0), 0);

                    return (
                      <tr key={idx} className="hover:bg-slate-800/30 transition">
                        <td className="p-1.5 sm:p-3 sticky left-0 bg-slate-900 z-20 w-[80px] sm:w-[200px] border-r border-slate-800/80">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-[10px] sm:text-xs font-bold text-white whitespace-nowrap">
                                {w.no_rumah?.replace(/\s/g, '')}
                              </span>
                              <span className={`text-[8px] sm:text-[9px] px-1 py-0.5 rounded border font-medium whitespace-nowrap ${
                                isWargaUsaha ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                             : 'bg-slate-800/60 text-slate-400 border-slate-700/60'
                              }`}>
                                {isWargaUsaha ? '🏪' : '🏠'}
                                <span className="hidden lg:inline">{isWargaUsaha ? ' Usaha' : ' Hunian'}</span>
                              </span>
                            </div>
                            <div className="text-[9px] sm:text-[11px] text-slate-300 truncate max-w-[70px] sm:max-w-[180px]">{w.nama_lengkap}</div>
                            <div className="text-[9px] sm:text-[10px] font-bold text-blue-400 whitespace-nowrap">
                              Rp {totalWargaSetor.toLocaleString('id-ID')}
                            </div>
                          </div>
                        </td>
                        {PERIODE_BULAN.map((bln, bIdx) => {
                          const rec = iuranWarga.find(i => i.bulan_tahun === bln.kode);
                          const nomLangsung = rec ? Number(rec.jumlah || 0) : 0;
                          const status = rec?.status;
                          const kosong = !rec;
                          const pending = status === 'pending';
                          const lunas = status === 'approved' && nomLangsung >= tarifWarga;
                          const sebagian = status === 'approved' && nomLangsung > 0 && nomLangsung < tarifWarga;
                          const kurang = tarifWarga - nomLangsung;

                          return (
                            <td key={bIdx} className="p-0.5 sm:p-2 text-center align-middle">
                              {kosong ? (
                                <span className="text-slate-600 text-[10px]">-</span>
                              ) : (
                                <div className="inline-flex flex-col items-center justify-center">
                                  <span className={`text-[9px] sm:text-[10px] font-semibold px-1 py-0.5 rounded whitespace-nowrap ${
                                    pending ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                    : lunas ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  }`}>
                                    {pending ? '⏳' : nomLangsung.toLocaleString('id-ID')}
                                  </span>
                                  {sebagian && (
                                    <span className="text-[7px] sm:text-[8px] text-amber-500/80 whitespace-nowrap mt-0.5">
                                      -{kurang.toLocaleString('id-ID')}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-3 sm:px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-between items-center text-[10px] sm:text-xs text-slate-400 gap-3">
              <span>💡 Geser ke kanan untuk lihat semua bulan</span>
              <button
                onClick={() => setShowRekapModal(false)}
                className="px-3 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition shrink-0"
              >Tutup</button>
            </div>
          </div>
        </div>
      )}

      <footer className="p-4 text-center text-xs text-slate-500 border-t border-slate-900 bg-slate-950">
        RT 38 Puri Kencana Wagir &copy; 2026 • Portal Mandiri Warga
      </footer>
    </div>
  );
}

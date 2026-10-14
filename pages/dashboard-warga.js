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

export default function DashboardWarga() {
  const [warga, setWarga] = useState(null);
  const [iuranList, setIuranList] = useState([]);
  const [allWargaList, setAllWargaList] = useState([]);
  const [allIuranList, setAllIuranList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRekap, setLoadingRekap] = useState(false);
  const [activeTab, setActiveTab] = useState('iuran');
  const [showRekapModal, setShowRekapModal] = useState(false);

  // State untuk Modal Detail Transaksi per Bulan
  const [selectedBulanDetail, setSelectedBulanDetail] = useState(null);

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
  }, []);

  const fetchDataIuran = async (wargaId) => {
    try {
      const { data, error } = await supabase
        .from('iuran')
        .select('*')
        .eq('warga_id', wargaId);

      if (!error && data) {
        setIuranList(data);
      }
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
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  if (!warga) return null;

  const isUsaha = warga.kategori === 'Usaha' || warga.no_rumah?.trim() === 'A2 - 19';
  const tarifBulanan = isUsaha ? 30000 : 15000;

  const totalDisetor = iuranList.reduce((acc, curr) => acc + Number(curr.jumlah || 0), 0);

  // Total donasi warga yang login (kelebihan dari tarif tiap bulan)
  const totalDonasi = iuranList.reduce((acc, curr) => {
    const nominal = Number(curr.jumlah || 0);
    return acc + Math.max(0, nominal - tarifBulanan);
  }, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white antialiased">
      <Head>
        <title>Dashboard Warga - RT 38 Puri Kencana Wagir</title>
      </Head>

      <header className="px-5 py-3.5 border-b border-slate-800/60 flex justify-between items-center bg-slate-900/40 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center overflow-hidden shrink-0">
            <img
              src="/logo-rt38.png"
              alt="Logo RT 38"
              className="w-full h-full object-cover"
            />
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
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Warga RT 38
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {warga.nama_lengkap}
              </h2>
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
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Menu Navigasi
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveTab('iuran')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 flex items-center gap-2 shrink-0 ${
                activeTab === 'iuran'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span>💰</span> Status Iuran
            </button>

            <button
              onClick={() => setActiveTab('pengumuman')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 flex items-center gap-2 shrink-0 ${
                activeTab === 'pengumuman'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span>📢</span> Pengumuman
            </button>

            <button
              onClick={() => setActiveTab('surat')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 flex items-center gap-2 shrink-0 ${
                activeTab === 'surat'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span>📄</span> Surat Mandiri
            </button>
          </div>
        </div>

        <div className="border-t border-slate-800/60 my-4"></div>

        {activeTab === 'iuran' && (
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
                onClick={fetchAllWargaAndIuran}
                disabled={loadingRekap}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 shrink-0"
              >
                {loadingRekap ? 'Memuat Data...' : '📋 Lihat Rekap Seluruh Warga'}
              </button>
            </div>

            {/* Ringkasan: Total Setor & Donasi */}
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
                <span className="text-lg sm:text-2xl font-black text-emerald-400 mt-1">
                  Rp {totalDonasi.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-xl">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Grid Iuran Bulanan 2026
                  </h3>
                  <p className="text-xs text-slate-400">Rincian status pembayaran periode April – Desember (Klik grid untuk detail tanggal)</p>
                </div>
                <span className="text-xs bg-slate-800/80 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700/60 font-medium">
                  9 Bulan
                </span>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-slate-500">Memuat data iuran...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {PERIODE_BULAN.map((bln, idx) => {
                    const recordBulan = iuranList.find(i => i.bulan_tahun === bln.kode);
                    const nominalLangsung = recordBulan ? Number(recordBulan.jumlah || 0) : 0;

                    const isLunas = nominalLangsung >= tarifBulanan;
                    const isSebagian = nominalLangsung > 0 && nominalLangsung < tarifBulanan;

                    const nominalTercover = isLunas
                      ? tarifBulanan
                      : isSebagian
                      ? nominalLangsung
                      : 0;

                    const nominalDonasi = isLunas ? nominalLangsung - tarifBulanan : 0;
                    const sisaKekurangan = tarifBulanan - nominalTercover;
                    const canClick = nominalLangsung > 0;

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (canClick) {
                            setSelectedBulanDetail({
                              namaBulan: bln.nama,
                              jumlah: nominalLangsung,
                              donasi: nominalDonasi,
                              tanggal: recordBulan?.tanggal_transaksi,
                              isLunas,
                            });
                          }
                        }}
                        className={`p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between ${
                          canClick ? 'cursor-pointer hover:scale-[1.01]' : 'cursor-default'
                        } ${
                          isLunas
                            ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300'
                            : isSebagian
                            ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                            : 'bg-slate-950/60 border-slate-800/60 text-slate-400'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white tracking-wide">
                              {bln.nama}
                            </span>
                            <span className="text-[10px] text-slate-400">2026</span>
                          </div>
                          <div className="text-[11px] mt-0.5 text-slate-400">
                            {isLunas
                              ? `Rp ${tarifBulanan.toLocaleString('id-ID')}`
                              : isSebagian
                              ? `Terbayar Rp ${nominalTercover.toLocaleString('id-ID')}`
                              : `Rp 0 / ${tarifBulanan.toLocaleString('id-ID')}`}
                          </div>
                          {nominalDonasi > 0 && (
                            <div className="text-[10px] text-emerald-400 mt-0.5">
                              + Donasi Rp {nominalDonasi.toLocaleString('id-ID')}
                            </div>
                          )}
                        </div>

                        <div className="text-right">
                          <span
                            className={`inline-block text-[10px] px-2.5 py-1 rounded-xl font-semibold border ${
                              isLunas
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : isSebagian
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : 'bg-slate-800/80 text-slate-400 border-slate-700/60'
                            }`}
                          >
                            {isLunas
                              ? '✓ Lunas'
                              : isSebagian
                              ? `- Rp ${sisaKekurangan.toLocaleString('id-ID')}`
                              : 'Belum'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'pengumuman' && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-4 animate-in fade-in duration-200">
            <h3 className="text-base font-bold text-white">📢 Pengumuman Lingkungan RT 38</h3>
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                Penting
              </span>
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

      {/* MODAL DETAIL TANGGAL TRANSAKSI PER BULAN */}
      {selectedBulanDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Detail Pembayaran</h3>
              <button
                onClick={() => setSelectedBulanDetail(null)}
                className="w-7 h-7 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center text-xs transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Bulan:</span>
                <strong className="text-white">{selectedBulanDetail.namaBulan} 2026</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Nominal Terbayar:</span>
                <strong className="text-emerald-400">
                  Rp {selectedBulanDetail.jumlah.toLocaleString('id-ID')}
                </strong>
              </div>
              {selectedBulanDetail.donasi > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Donasi (kelebihan):</span>
                  <strong className="text-emerald-400">
                    + Rp {selectedBulanDetail.donasi.toLocaleString('id-ID')}
                  </strong>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Tanggal Transaksi:</span>
                <strong className="text-amber-400">{formatTanggal(selectedBulanDetail.tanggal)}</strong>
              </div>
            </div>

            <button
              onClick={() => setSelectedBulanDetail(null)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-blue-600/20"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {showRekapModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl h-[90vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
              <div>
                <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                  📋 Rekapitulasi Iuran Seluruh Warga RT 38 (2026)
                </h3>
                <p className="text-[11px] text-slate-400">Transparansi kas dan status setoran warga</p>
              </div>
              <button
                onClick={() => setShowRekapModal(false)}
                className="w-8 h-8 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center text-sm transition"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="min-w-[900px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                      <th className="p-3 sticky left-0 bg-slate-950 z-10">No. Rumah</th>
                      <th className="p-3 sticky left-20 bg-slate-950 z-10">Nama Warga</th>
                      <th className="p-3 text-center">Total Setor</th>
                      <th className="p-3 text-center text-emerald-400">Donasi</th>
                      {PERIODE_BULAN.map((b, i) => (
                        <th key={i} className="p-3 text-center">{b.nama}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {allWargaList.map((w, idx) => {
                      const isWargaUsaha = w.kategori === 'Usaha' || w.no_rumah?.trim() === 'A2 - 19';
                      const tarifWarga = isWargaUsaha ? 30000 : 15000;

                      const iuranWarga = allIuranList.filter(i => i.warga_id === w.id);
                      const totalWargaSetor = iuranWarga.reduce(
                        (acc, curr) => acc + Number(curr.jumlah || 0),
                        0
                      );

                      const totalDonasiWarga = iuranWarga.reduce((acc, curr) => {
                        const nominal = Number(curr.jumlah || 0);
                        return acc + Math.max(0, nominal - tarifWarga);
                      }, 0);

                      return (
                        <tr key={idx} className="hover:bg-slate-800/30 transition">
                          <td className="p-3 font-bold text-white sticky left-0 bg-slate-900 z-10">
                            {w.no_rumah}
                          </td>
                          <td className="p-3 text-slate-300 sticky left-20 bg-slate-900 z-10">
                            {w.nama_lengkap}
                          </td>
                          <td className="p-3 text-center font-extrabold text-blue-400">
                            Rp {totalWargaSetor.toLocaleString('id-ID')}
                          </td>
                          <td className="p-3 text-center font-semibold text-emerald-400">
                            {totalDonasiWarga > 0
                              ? `Rp ${totalDonasiWarga.toLocaleString('id-ID')}`
                              : '-'}
                          </td>

                          {PERIODE_BULAN.map((bln, bIdx) => {
                            const rec = iuranWarga.find(i => i.bulan_tahun === bln.kode);
                            const nomLangsung = rec ? Number(rec.jumlah || 0) : 0;

                            const lunas = nomLangsung >= tarifWarga;
                            const sebagian = nomLangsung > 0 && nomLangsung < tarifWarga;

                            return (
                              <td key={bIdx} className="p-2 text-center">
                                <span
                                  className={`inline-block px-2 py-1 rounded-lg text-[10px] font-semibold ${
                                    lunas
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : sebagian
                                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                      : 'bg-slate-800/40 text-slate-500'
                                  }`}
                                >
                                  {lunas ? 'Lunas' : sebagian ? 'Kurang' : '-'}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-between items-center text-xs text-slate-400">
              <span>Menampilkan seluruh data warga dan status bulanan real-time.</span>
              <button
                onClick={() => setShowRekapModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition"
              >
                Tutup
              </button>
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

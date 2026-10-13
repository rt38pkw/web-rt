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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('iuran'); // Default aktif di 'iuran'
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

  const handleLogout = () => {
    localStorage.removeItem('warga_session');
    router.push('/');
  };

  if (!warga) return null;

  // Cek Kategori Usaha
  const isUsaha = warga.kategori === 'Usaha' || warga.no_rumah?.trim() === 'A2 - 19';
  const tarifBulanan = isUsaha ? 30000 : 15000;

  // Total akumulasi setoran
  const totalDisetor = iuranList.reduce((acc, curr) => acc + Number(curr.jumlah || 0), 0);

  // Total kewajiban penuh selama 9 bulan (April - Desember)
  const totalKewajibanSemuaBulan = PERIODE_BULAN.length * tarifBulanan;

  // Sisa deposit
  const sisaDeposit = totalDisetor > totalKewajibanSemuaBulan 
    ? totalDisetor - totalKewajibanSemuaBulan 
    : 0;

  // Saldo berjalan untuk status per bulan
  let poolSaldo = totalDisetor;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white antialiased">
      <Head>
        <title>Dashboard Warga - RT 38 Puri Kencana Wagir</title>
      </Head>

      {/* Navigasi Atas */}
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

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6 my-1">

        {/* Profil Warga Modern */}
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

        {/* PEMISAH ELEGAN & NAVIGASI MENU MINI / MINIMALIS */}
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

        {/* GARIS PEMISAH TIPIS ANTARA MENU DAN KONTEN */}
        <div className="border-t border-slate-800/60 my-4"></div>

        {/* KONTEN DYNAMIC */}

        {/* TAB 1: STATUS IURAN BULANAN */}
        {activeTab === 'iuran' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                  Total Setor
                </span>
                <span className="text-lg sm:text-2xl font-black text-white mt-1">
                  Rp {totalDisetor.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                  Sisa Deposit
                </span>
                <span className="text-lg sm:text-2xl font-black text-emerald-400 mt-1">
                  Rp {sisaDeposit.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-xl">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Grid Iuran Bulanan 2026
                  </h3>
                  <p className="text-xs text-slate-400">Rincian status pembayaran periode April – Desember</p>
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

                    let isLunas = false;
                    let isSebagian = false;
                    let nominalTercoverBulanIni = 0;

                    if (nominalLangsung >= tarifBulanan) {
                      isLunas = true;
                      nominalTercoverBulanIni = tarifBulanan;
                      poolSaldo -= tarifBulanan;
                    } else if (nominalLangsung > 0 && nominalLangsung < tarifBulanan) {
                      isSebagian = true;
                      nominalTercoverBulanIni = nominalLangsung;
                      poolSaldo -= nominalLangsung;
                    } else if (poolSaldo >= tarifBulanan) {
                      isLunas = true;
                      nominalTercoverBulanIni = tarifBulanan;
                      poolSaldo -= tarifBulanan;
                    } else if (poolSaldo > 0 && poolSaldo < tarifBulanan) {
                      isSebagian = true;
                      nominalTercoverBulanIni = poolSaldo;
                      poolSaldo = 0;
                    }

                    const sisaKekurangan = tarifBulanan - nominalTercoverBulanIni;

                    return (
                      <div 
                        key={idx} 
                        className={`p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between ${
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
                            <span className="text-[10px] text-slate-400">
                              2026
                            </span>
                          </div>
                          <div className="text-[11px] mt-0.5 text-slate-400">
                            {isLunas 
                              ? `Rp ${tarifBulanan.toLocaleString('id-ID')}` 
                              : isSebagian 
                              ? `Terbayar Rp ${nominalTercoverBulanIni.toLocaleString('id-ID')}` 
                              : `Rp 0 / ${tarifBulanan.toLocaleString('id-ID')}`}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`inline-block text-[10px] px-2.5 py-1 rounded-xl font-semibold border ${
                            isLunas 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                              : isSebagian
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-slate-800/80 text-slate-400 border-slate-700/60'
                          }`}>
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

        {/* TAB 2: PENGUMUMAN */}
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

        {/* TAB 3: SURAT MANDIRI */}
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

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-slate-500 border-t border-slate-900 bg-slate-950">
        RT 38 Puri Kencana Wagir &copy; 2026 • Portal Mandiri Warga
      </footer>
    </div>
  );
}

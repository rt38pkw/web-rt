import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function DashboardWarga() {
  const [warga, setWarga] = useState(null);
  const [iuranList, setIuranList] = useState([]);
  const [loading, setLoading] = useState(true);
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
        .eq('warga_id', wargaId)
        .order('bulan_tahun', { ascending: true });

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

  // Tarif bulanan: Rp 30.000 jika kategori usaha, selain itu Rp 15.000
  const tarifBulanan = warga.kategori === 'Usaha' ? 30000 : 15000;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      <Head>
        <title>Dashboard Warga - RT 38 Puri Kencana Wagir</title>
      </Head>

      {/* Navigasi Atas */}
      <header className="px-4 py-3 border-b border-slate-800/80 flex justify-between items-center bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
            <img 
              src="/logo-rt38.png" 
              alt="Logo RT 38" 
              className="w-full h-full object-cover" 
            />
          </div>
          <div>
            <h1 className="font-bold text-xs sm:text-sm text-white leading-tight">PORTAL WARGA</h1>
            <p className="text-[10px] text-slate-400">RT 38 Puri Kencana Wagir</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-xl border border-rose-500/30 transition font-medium"
        >
          Keluar 🚪
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 space-y-6 my-2">

        {/* Card Header Profil Warga */}
        <section className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-8xl">
            🏠
          </div>
          <div className="relative z-10">
            <span className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold rounded-full mb-2">
              Warga RT 38 Puri Kencana
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
              {warga.nama_lengkap}
            </h2>
            <div className="flex flex-wrap gap-2 text-xs text-slate-300 mt-3">
              <span className="bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl">
                📍 No. Rumah: <strong className="text-white">{warga.no_rumah}</strong>
              </span>
              <span className="bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl">
                💳 Tarif Iuran: <strong className="text-blue-400">Rp {tarifBulanan.toLocaleString('id-ID')} / bln</strong>
              </span>
              {warga.kategori === 'Usaha' && (
                <span className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded-xl">
                  ⚠️ Kategori Tempat Usaha
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Card Status Iuran Bulanan Fleksibel */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                💳 Riwayat & Status Pembayaran Iuran
              </h3>
              <p className="text-xs text-slate-400">Transparansi setoran kas, rapel, dan sisa saldo deposit</p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Memuat data iuran...</div>
          ) : iuranList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {iuranList.map((item, idx) => {
                const jumlahBayar = Number(item.jumlah || 0);
                
                // Tentukan status berdasarkan perbandingan jumlah bayar vs tarif bulanan
                let labelStatus = 'Lunas';
                let badgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
                let cardClass = 'bg-emerald-500/5 border-emerald-500/30';
                let infoDetail = `Pas: Rp ${jumlahBayar.toLocaleString('id-ID')}`;

                if (jumlahBayar < tarifBulanan) {
                  labelStatus = 'Kurang / Sebagian';
                  badgeClass = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
                  cardClass = 'bg-amber-500/5 border-amber-500/30';
                  infoDetail = `Kurang Rp ${(tarifBulanan - jumlahBayar).toLocaleString('id-ID')}`;
                } else if (jumlahBayar > tarifBulanan) {
                  labelStatus = 'Lunas + Deposit';
                  badgeClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
                  cardClass = 'bg-blue-500/5 border-blue-500/30';
                  infoDetail = `Sisa Saldo: Rp ${(jumlahBayar - tarifBulanan).toLocaleString('id-ID')}`;
                }

                return (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-2xl border flex flex-col justify-between transition ${cardClass}`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-white">
                        🗓️ {item.bulan_tahun}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${badgeClass}`}>
                        {labelStatus}
                      </span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-800/60 flex justify-between items-end">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Nominal Tercatat:</span>
                        <span className="text-sm font-extrabold text-white">
                          Rp {jumlahBayar.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-300 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                        {infoDetail}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-8 text-center">
              <p className="text-xs text-slate-400 mb-1">Belum ada riwayat setoran iuran yang tercatat untuk rumah ini.</p>
              <span className="text-[11px] text-slate-500">Silakan hubungi Bendahara RT jika Anda sudah melakukan pembayaran.</span>
            </div>
          )}
        </section>

        {/* Menu Layanan Mandiri (Pengajuan Surat Dinonaktifkan Sementara) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card Pengajuan Surat (Disabled) */}
          <div className="bg-slate-900/50 border border-slate-800/60 rounded-3xl p-6 shadow-xl flex flex-col justify-between opacity-60">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center text-xl mb-3">
                📄
              </div>
              <h4 className="font-bold text-slate-300 text-base">Pengajuan Surat Pengantar</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Fitur pengajuan surat online sedang dalam tahap pengembangan dan akan segera diaktifkan.
              </p>
            </div>
            <button 
              disabled
              className="mt-4 w-full bg-slate-800/40 text-slate-500 text-xs font-semibold py-2.5 rounded-xl border border-slate-800 cursor-not-allowed"
            >
              Segera Hadir 🚧
            </button>
          </div>

          {/* Card Pengumuman & Informasi */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl mb-3">
                📢
              </div>
              <h4 className="font-bold text-white text-base">Pengumuman RT 38</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Pantau jadwal kegiatan warga, kerja bakti, rapat rutin, dan informasi penting lingkungan Puri Kencana.
              </p>
            </div>
            <button 
              onClick={() => alert('Belum ada pengumuman baru.')}
              className="mt-4 w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2.5 rounded-xl border border-slate-700 transition"
            >
              Lihat Pengumuman 🔍
            </button>
          </div>

        </section>

      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-slate-500 border-t border-slate-900 bg-slate-950">
        RT 38 Puri Kencana Wagir &copy; 2026 • Layanan Mandiri Warga
      </footer>
    </div>
  );
}
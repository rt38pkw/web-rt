// pages/sekretaris/index.js
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/sekretaris/Layout';

export default function DashboardSekretaris() {
  const [loading, setLoading] = useState(true);
  
  const [totalWarga, setTotalWarga] = useState(0);
  const [sisaHariRonda, setSisaHariRonda] = useState('-');
  const [namaPeriodeRonda, setNamaPeriodeRonda] = useState('');
  const [pendingVerif, setPendingVerif] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Hitung Total Warga Aktif di tabel penghuni
      const { count: countWarga } = await supabase
        .from('penghuni')
        .select('*', { count: 'exact', head: true })
        .eq('is_aktif', true);
      setTotalWarga(countWarga || 0);

      // 2. Hitung Pending Verifikasi Warga
      const { data: pPending } = await supabase
        .from('penghuni')
        .select('warga_id')
        .eq('status_verifikasi', 'pending')
        .eq('is_aktif', true);
      const uniquePending = new Set((pPending || []).map(p => p.warga_id));
      setPendingVerif(uniquePending.size);

      // 3. Cek Jadwal Ronda Aktif
      // Cari periode yang published
      const { data: periode } = await supabase
        .from('periode_ronda')
        .select('id, nama_periode')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (periode) {
        setNamaPeriodeRonda(periode.nama_periode);
        
        // Cari tanggal paling akhir di jadwal_ronda untuk periode ini
        const { data: maxJadwal } = await supabase
          .from('jadwal_ronda')
          .select('tanggal')
          .eq('periode_id', periode.id)
          .eq('status', 'aktif')
          .order('tanggal', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (maxJadwal && maxJadwal.tanggal) {
          // Hitung selisih hari
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const maxDate = new Date(maxJadwal.tanggal);
          maxDate.setHours(0, 0, 0, 0);

          const diffTime = maxDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 0) {
            setSisaHariRonda('Hari Terakhir');
          } else if (diffDays < 0) {
            setSisaHariRonda('Selesai');
          } else {
            setSisaHariRonda(`${diffDays} Hari Lagi`);
          }
        } else {
          setSisaHariRonda('Belum ada jadwal');
        }
      } else {
        setNamaPeriodeRonda('Tidak ada periode aktif');
        setSisaHariRonda('-');
      }

    } catch (err) {
      console.error('Gagal memuat dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTanggal = () => {
    return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* HEADER SELAMAT DATANG */}
        <div className="bg-gradient-to-r from-teal-900/40 to-slate-900 border border-teal-500/20 rounded-3xl p-6 shadow-lg">
          <h1 className="text-xl font-bold text-white mb-1">Selamat Datang, Pak Sekretaris! 👋</h1>
          <p className="text-xs text-teal-300">Hari ini: {formatTanggal()}</p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 animate-pulse text-xs">Memuat ringkasan data...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* KARTU 1: TOTAL WARGA */}
            <Link href="/sekretaris/data-warga" className="group block">
              <div className="bg-slate-900 border border-slate-800 group-hover:border-indigo-500/50 rounded-3xl p-6 shadow-lg transition h-full relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 text-8xl opacity-5 group-hover:opacity-10 transition">👥</div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-2xl border border-indigo-500/20">👥</div>
                  <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-bold px-2 py-1 rounded-lg border border-indigo-500/20">Data Penghuni →</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-400 mb-1">Total Warga Aktif</h3>
                <div className="text-4xl font-black text-white">{totalWarga} <span className="text-sm font-medium text-slate-500">Jiwa</span></div>
                <p className="text-[10px] text-slate-500 mt-2">Berdasarkan data KK & Anggota Keluarga yang aktif.</p>
              </div>
            </Link>

            {/* KARTU 2: JADWAL RONDA */}
            <Link href="/sekretaris/ronda" className="group block">
              <div className="bg-slate-900 border border-slate-800 group-hover:border-amber-500/50 rounded-3xl p-6 shadow-lg transition h-full relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 text-8xl opacity-5 group-hover:opacity-10 transition">🛡️</div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-2xl border border-amber-500/20">🛡️</div>
                  <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-1 rounded-lg border border-amber-500/20">Jadwal Ronda →</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-400 mb-1">Sisa Hari Ronda</h3>
                <div className="text-3xl font-black text-white">{sisaHariRonda}</div>
                <p className="text-[10px] text-amber-400/70 mt-2 truncate">Periode: {namaPeriodeRonda}</p>
              </div>
            </Link>

            {/* KARTU 3: VERIFIKASI PENDING (BONUS) */}
            <Link href="/sekretaris/verifikasi" className="group block sm:col-span-2">
              <div className={`border rounded-3xl p-6 shadow-lg transition h-full relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${pendingVerif > 0 ? 'bg-gradient-to-r from-rose-950/40 to-slate-900 border-rose-500/30' : 'bg-slate-900 border-slate-800'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border ${pendingVerif > 0 ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                    ✅
                  </div>
                  <div>
                    <h3 className={`text-sm font-semibold ${pendingVerif > 0 ? 'text-rose-300' : 'text-slate-400'}`}>Antrean Verifikasi Warga</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Warga yang mengajukan pembaruan Data Diri / KK.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`text-3xl font-black ${pendingVerif > 0 ? 'text-rose-400' : 'text-slate-600'}`}>{pendingVerif}</div>
                  {pendingVerif > 0 && <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg">Perlu Dicek</span>}
                </div>
              </div>
            </Link>

          </div>
        )}
      </div>
    </Layout>
  );
}

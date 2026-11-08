// pages/admin.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';
import InstallButton from '../components/InstallButton';
import { setupPushNotifications } from '../lib/push-notifications';
import PopoverPengaturan from '../components/pengurus/PopoverPengaturan';
import ModalUbahPassword from '../components/pengurus/ModalUbahPassword';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // State untuk Popover Pengaturan
  const [showSettings, setShowSettings] = useState(false);
  const [showUbahPass, setShowUbahPass] = useState(false);

  // State Data Ringkasan
  const [stats, setStats] = useState({
    warga: 0,
    saldoKasBebas: 0,
    pendingIuran: 0,
    pendingProyek: 0,
    pendingSekretariat: 0,
  });

  const [showLoginPassword, setShowLoginPassword] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('pengurusSession');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);

      setupPushNotifications('pengurus', parsedUser.id);

      if (parsedUser.role === 'bendahara') {
        window.location.replace('/keuangan/dashboard');
        return;
      }
      if (parsedUser.role === 'bendahara_2') {
        window.location.replace('/proyek/dashboard');
        return;
      }
      if (parsedUser.role === 'sekretaris') {
        window.location.replace('/sekretaris');
        return;
      }

      setUser(parsedUser);
      fetchStats();
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase
      .from('pengurus')
      .select('*')
      .eq('username', usernameInput.trim())
      .eq('password', passwordInput.trim())
      .maybeSingle();

    setLoading(false);

    if (error || !data) {
      alert(`Login gagal: ${error ? error.message : 'Username atau Password salah!'}`);
      return;
    }

    const { password: _, ...profilAman } = data;
    setUser(profilAman);
    localStorage.setItem('pengurusSession', JSON.stringify(profilAman));
    
    setupPushNotifications('pengurus', data.id); 

    if (data.role === 'bendahara') {
      window.location.replace('/keuangan/dashboard');
      return;
    }
    if (data.role === 'bendahara_2') {
      window.location.replace('/proyek/dashboard');
      return;
    }
    if (data.role === 'sekretaris') {
      window.location.replace('/sekretaris');
      return;
    }

    fetchStats();
  };

  async function fetchStats() {
    try {
      const [
        { count: wargaCount },
        { data: iuranData },
        { data: pemasukanLainData },
        { data: pengeluaranData },
        { count: pendingIuranCount },
        { count: pendingProyekCount },
        { data: pendingPenghuni },
        { data: pendingRondaData }
      ] = await Promise.all([
        supabase.from('penghuni').select('*', { count: 'exact', head: true }).eq('is_aktif', true),
        supabase.from('iuran').select('jumlah').eq('status', 'approved'),
        supabase.from('pemasukan_lain').select('nominal'),
        supabase.from('pengeluaran').select('nominal'),
        supabase.from('iuran').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('iuran_proyek').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('penghuni').select('warga_id').eq('status_verifikasi', 'pending').eq('is_aktif', true),
        supabase.from('petugas_ronda')
          .select('id, foto_bukti, jadwal:jadwal_id!inner(tanggal, periode:periode_id!inner(jam_selesai, status))')
          .eq('status_hadir', 'pending')
          .eq('jadwal.periode.status', 'published')
      ]);

      // Hitung Saldo Kas Bebas
      const totalIuran = (iuranData || []).reduce((acc, curr) => acc + Number(curr.jumlah || 0), 0);
      const totalPemasukanLain = (pemasukanLainData || []).reduce((acc, curr) => acc + Number(curr.nominal || 0), 0);
      const totalPengeluaran = (pengeluaranData || []).reduce((acc, curr) => acc + Number(curr.nominal || 0), 0);
      const saldoKasBebas = (totalIuran + totalPemasukanLain) - totalPengeluaran;

      // Hitung Pending Sekretariat
      const uniquePending = new Set((pendingPenghuni || []).map(p => p.warga_id));
      let totalRonda = 0;
      if (pendingRondaData) {
        pendingRondaData.forEach(item => {
          const tgl = item.jadwal?.tanggal;
          const jamSelesai = item.jadwal?.periode?.jam_selesai;
          if (!tgl || !jamSelesai) return;
          const dateStr = tgl.split('T')[0];
          const [selesaiH, selesaiM] = jamSelesai.split(':');
          let endDateTime = new Date(`${dateStr}T${selesaiH}:${selesaiM}:00`);
          const startDateTime = new Date(`${dateStr}T00:00:00`);
          if (endDateTime < startDateTime || parseInt(selesaiH) < 12) endDateTime.setDate(endDateTime.getDate() + 1);
          const isPassed = new Date() > endDateTime;
          if (item.foto_bukti || isPassed) totalRonda++;
        });
      }
      const totalSekretariat = uniquePending.size + totalRonda;

      setStats({
        warga: wargaCount || 0,
        saldoKasBebas: saldoKasBebas,
        pendingIuran: pendingIuranCount || 0,
        pendingProyek: pendingProyekCount || 0,
        pendingSekretariat: totalSekretariat,
      });
    } catch (err) {
      console.error('Gagal memuat stats:', err);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden font-sans">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/30 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none"></div>

        <div className="absolute top-4 right-4 z-50">
          <InstallButton />
        </div>

        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/60 p-8 rounded-2xl shadow-2xl w-full max-w-md z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full overflow-hidden border border-blue-500/30 shadow-lg shadow-blue-500/30 mb-3 bg-slate-950">
              <img src="/logo-rt38.png" alt="Logo RT 38" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">RT 38 Puri Kencana Wagir</h2>
            <p className="text-xs text-slate-400 mt-1">Portal Masuk Pengurus Lingkungan</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">Username</label>
              <input
                type="text"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
                placeholder="Masukkan username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition text-base px-2 py-1"
                >
                  {showLoginPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-600/30 active:scale-[0.98] transition duration-200 text-sm"
            >
              {loading ? 'Memeriksa Akses...' : 'Masuk Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const canAccessKeuangan = user.role === 'ketua' || user.role === 'bendahara';
  const canAccessSekretariat = user.role === 'ketua' || user.role === 'sekretaris';
  const canAccessProyek = user.role === 'ketua' || user.role === 'bendahara_2';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased font-sans">
      <header className="bg-slate-900/70 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/logo-rt38.png"
              alt="Logo RT 38 Puri Kencana Wagir"
              className="w-10 h-10 rounded-full object-cover border border-blue-500/30 shadow-md shadow-blue-500/20 shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-base font-bold text-white leading-tight truncate">RT 38 Puri Kencana Wagir</h1>
              <p className="text-[11px] text-slate-400">Rukun • Peduli • Bersama</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-full">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-medium text-slate-200">{user.nama}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md">
                {user.role}
              </span>
            </div>

            {/* TOMBOL PENGATURAN (MEMICU POPOVER) */}
            <button
              id="btn-pengaturan"
              onClick={() => setShowSettings(!showSettings)}
              className={`text-xs px-3 py-2 rounded-lg border transition font-medium flex items-center gap-1 ${
                showSettings 
                  ? 'bg-slate-700 text-white border-slate-600' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              ⚙️ <span className="hidden sm:inline">Pengaturan</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ... (Bagian Main, Kartu Ringkasan, dan Daftar Layanan Admin tetap sama persis) ... */}
        <div className="mb-8 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
              Selamat Datang Kembali, {user.nama}! 👋
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Anda masuk sebagai <strong className="text-blue-400 uppercase">{user.role}</strong>. Silakan pilih layanan di bawah ini untuk mengelola administrasi lingkungan.
            </p>
          </div>
        </div>

        {/* ═══ KARTU RINGKASAN (WARGA & KAS) ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          {/* Kartu 1: Total Warga */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 text-7xl opacity-5">👥</div>
            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Warga (Jiwa)</span>
              <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl text-lg border border-blue-500/20">👥</span>
            </div>
            <div className="text-3xl font-extrabold text-white relative z-10">{stats.warga}</div>
            <p className="text-[11px] text-slate-500 mt-1 relative z-10">Terdaftar aktif sebagai penghuni</p>
          </div>

          {/* Kartu 2: Saldo Kas Bebas */}
          <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 text-7xl opacity-5">💰</div>
            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Saldo Kas Bebas</span>
              <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-lg border border-emerald-500/20">💰</span>
            </div>
            <div className="text-3xl font-extrabold text-white relative z-10">
              Rp {stats.saldoKasBebas.toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 relative z-10">Total pemasukan bersih RT</p>
          </div>
        </div>

        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Akses Layanan Admin</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {canAccessKeuangan ? (
            <Link href="/keuangan/dashboard" className="relative group bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 transition duration-300 shadow-lg flex flex-col justify-between">
              {stats.pendingIuran > 0 && (
                <span className="absolute top-3 right-3 inline-flex items-center justify-center bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                  {stats.pendingIuran}
                </span>
              )}
              <div>
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition mb-4 text-blue-400">💰</div>
                <h4 className="text-lg font-bold text-white group-hover:text-blue-400 transition">Keuangan</h4>
                <p className="text-xs text-slate-400 mt-1">Verifikasi iuran, riwayat transaksi, tunggakan, dan laporan kas RT.</p>
              </div>
              <div className="mt-6 flex items-center text-xs font-semibold text-blue-400 group-hover:translate-x-1 transition">Buka Layanan &rarr;</div>
            </Link>
          ) : (
            <div className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-6 opacity-40 cursor-not-allowed">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-xl mb-4 text-slate-500">🔒</div>
              <h4 className="text-lg font-bold text-slate-500">Keuangan</h4>
              <p className="text-xs text-slate-600 mt-1">Khusus akses Ketua & Bendahara.</p>
            </div>
          )}

          {canAccessSekretariat ? (
            <Link href="/sekretaris" className="relative group bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-teal-500/50 rounded-2xl p-6 transition duration-300 shadow-lg flex flex-col justify-between">
              {/* ═══ BADGE SEKREATARIAT ═══ */}
              {stats.pendingSekretariat > 0 && (
                <span className="absolute top-3 right-3 inline-flex items-center justify-center bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                  {stats.pendingSekretariat}
                </span>
              )}
              <div>
                <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition mb-4 text-teal-400">📝</div>
                <h4 className="text-lg font-bold text-white group-hover:text-teal-400 transition">Sekretariat</h4>
                <p className="text-xs text-slate-400 mt-1">Kelola direktori warga, pengajuan surat, dan jadwal ronda.</p>
              </div>
              <div className="mt-6 flex items-center text-xs font-semibold text-teal-400 group-hover:translate-x-1 transition">Buka Layanan &rarr;</div>
            </Link>
          ) : (
            <div className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-6 opacity-40 cursor-not-allowed">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-xl mb-4 text-slate-500">🔒</div>
              <h4 className="text-lg font-bold text-slate-500">Sekretariat</h4>
              <p className="text-xs text-slate-600 mt-1">Khusus akses Ketua & Sekretaris.</p>
            </div>
          )}

          {canAccessProyek ? (
            <Link href="/proyek/dashboard" className="relative group bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 transition duration-300 shadow-lg flex flex-col justify-between">
              {stats.pendingProyek > 0 && (
                <span className="absolute top-3 right-3 inline-flex items-center justify-center bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                  {stats.pendingProyek}
                </span>
              )}
              <div>
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition mb-4 text-amber-400">🏗️</div>
                <h4 className="text-lg font-bold text-white group-hover:text-amber-400 transition">Proyek</h4>
                <p className="text-xs text-slate-400 mt-1">Kelola proyek RT: iuran khusus, cicilan, dan verifikasi.</p>
              </div>
              <div className="mt-6 flex items-center text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition">Buka Layanan &rarr;</div>
            </Link>
          ) : (
            <div className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-6 opacity-40 cursor-not-allowed">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-xl mb-4 text-slate-500">🔒</div>
              <h4 className="text-lg font-bold text-slate-500">Proyek</h4>
              <p className="text-xs text-slate-600 mt-1">Khusus akses Ketua & Operator Proyek.</p>
            </div>
          )}
        </div>
      </main>

      {/* ═══ POPOVER PENGATURAN ═══ */}
      <PopoverPengaturan 
        show={showSettings} 
        onClose={() => setShowSettings(false)} 
        user={user}
        onOpenUbahPassword={() => setShowUbahPass(true)}
      />

      <ModalUbahPassword 
        show={showUbahPass} 
        onClose={() => setShowUbahPass(false)} 
        user={user}
      />
    </div>
  );
}

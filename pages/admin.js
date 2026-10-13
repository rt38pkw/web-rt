import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ warga: 0, pendingIuran: 0, pengumuman: 0 });

  useEffect(() => {
    const savedUser = sessionStorage.getItem('pengurusSession');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
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
    } else {
      setUser(data);
      sessionStorage.setItem('pengurusSession', JSON.stringify(data));
      fetchStats();
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('pengurusSession');
    setUser(null);
  };

  async function fetchStats() {
    try {
      const { count: wargaCount } = await supabase.from('warga').select('*', { count: 'exact', head: true });
      const { count: pendingCount } = await supabase.from('iuran').select('*', { count: 'exact', head: true }).eq('status', 'Pending');
      const { count: pengumumanCount } = await supabase.from('pengumuman').select('*', { count: 'exact', head: true });

      setStats({
        warga: wargaCount || 0,
        pendingIuran: pendingCount || 0,
        pengumuman: pengumumanCount || 0,
      });
    } catch (err) {
      console.error(err);
    }
  }

  // Tampilan Form Login Modern
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
        {/* Glowing Background Decorative Circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/30 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none"></div>

        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/60 p-8 rounded-2xl shadow-2xl w-full max-w-md z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl text-white text-2xl shadow-lg shadow-blue-500/30 mb-3">
              🏛️
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Portal Pengurus RT</h2>
            <p className="text-xs text-slate-400 mt-1">Masuk untuk mengelola administrasi lingkungan</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">Username</label>
              <input
                type="text"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                placeholder="Masukkan username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">Password</label>
              <input
                type="password"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-500/50 active:scale-[0.98] transition duration-200 text-sm"
            >
              {loading ? 'Memeriksa Akses...' : 'Masuk Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Pengecekan Privilege
  const canAccessIuran = user.role === 'ketua' || user.role === 'bendahara';
  const canAccessSurat = user.role === 'ketua' || user.role === 'sekretaris';
  const canAccessWarga = user.role === 'ketua' || user.role === 'sekretaris';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Header Admin Modern */}
      <header className="bg-slate-900/70 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-lg shadow-md shadow-blue-500/20">
              RT
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">Sistem Administrasi RT</h1>
              <p className="text-xs text-slate-400">Dashboard Pengurus Terpadu</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-full">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-medium text-slate-200">{user.nama}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md">
                {user.role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition active:scale-95"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
              Selamat Datang Kembali, {user.nama}! 👋
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Anda masuk sebagai <strong className="text-blue-400 uppercase">{user.role}</strong>. Silakan pilih menu di bawah ini untuk mengelola aktivitas RT.
            </p>
          </div>
        </div>

        {/* Metric / Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Warga</span>
              <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl text-lg">👥</span>
            </div>
            <div className="text-3xl font-extrabold text-white">{stats.warga}</div>
            <p className="text-[11px] text-slate-500 mt-1">Terdaftar dalam sistem</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Verifikasi Iuran</span>
              <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl text-lg">💳</span>
            </div>
            <div className="text-3xl font-extrabold text-amber-400">{stats.pendingIuran}</div>
            <p className="text-[11px] text-slate-500 mt-1">Menunggu persetujuan</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Pengumuman</span>
              <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-lg">📢</span>
            </div>
            <div className="text-3xl font-extrabold text-white">{stats.pengumuman}</div>
            <p className="text-[11px] text-slate-500 mt-1">Informasi dipublikasi</p>
          </div>
        </div>

        {/* Menu Navigation Cards */}
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Akses Layanan Admin</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card Iuran */}
          {canAccessIuran ? (
            <Link href="/admin-iuran" className="group bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 transition duration-300 shadow-lg flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition duration-300 mb-4 text-blue-400">
                  💳
                </div>
                <h4 className="text-lg font-bold text-white group-hover:text-blue-400 transition">Verifikasi Iuran</h4>
                <p className="text-xs text-slate-400 mt-1">Cek bukti transfer QRIS dan setujui iuran bulanan warga.</p>
              </div>
              <div className="mt-6 flex items-center text-xs font-semibold text-blue-400 group-hover:translate-x-1 transition">
                Buka Layanan &rarr;
              </div>
            </Link>
          ) : (
            <div className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-6 opacity-40 cursor-not-allowed">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-xl mb-4 text-slate-500">
                🔒
              </div>
              <h4 className="text-lg font-bold text-slate-500">Verifikasi Iuran</h4>
              <p className="text-xs text-slate-600 mt-1">Khusus akses Ketua & Bendahara.</p>
            </div>
          )}

          {/* Card Data Warga */}
          {canAccessWarga ? (
            <Link href="/warga" className="group bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 transition duration-300 shadow-lg flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition duration-300 mb-4 text-indigo-400">
                  👥
                </div>
                <h4 className="text-lg font-bold text-white group-hover:text-indigo-400 transition">Data Warga</h4>
                <p className="text-xs text-slate-400 mt-1">Kelola direktori data kependudukan dan Kepala Keluarga.</p>
              </div>
              <div className="mt-6 flex items-center text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition">
                Buka Layanan &rarr;
              </div>
            </Link>
          ) : (
            <div className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-6 opacity-40 cursor-not-allowed">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-xl mb-4 text-slate-500">
                🔒
              </div>
              <h4 className="text-lg font-bold text-slate-500">Data Warga</h4>
              <p className="text-xs text-slate-600 mt-1">Khusus akses Ketua & Sekretaris.</p>
            </div>
          )}

          {/* Card Surat Pengantar */}
          {canAccessSurat ? (
            <Link href="/surat" className="group bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 transition duration-300 shadow-lg flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition duration-300 mb-4 text-emerald-400">
                  📄
                </div>
                <h4 className="text-lg font-bold text-white group-hover:text-emerald-400 transition">Pengajuan Surat</h4>
                <p className="text-xs text-slate-400 mt-1">Proses dan cetak surat pengantar permohonan warga.</p>
              </div>
              <div className="mt-6 flex items-center text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition">
                Buka Layanan &rarr;
              </div>
            </Link>
          ) : (
            <div className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-6 opacity-40 cursor-not-allowed">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-xl mb-4 text-slate-500">
                🔒
              </div>
              <h4 className="text-lg font-bold text-slate-500">Pengajuan Surat</h4>
              <p className="text-xs text-slate-600 mt-1">Khusus akses Ketua & Sekretaris.</p>
            </div>
          )}

          {/* Card Web Publik */}
          <Link href="/" className="group bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-600 rounded-2xl p-6 transition duration-300 shadow-lg flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition duration-300 mb-4 text-slate-300">
                🌐
              </div>
              <h4 className="text-lg font-bold text-white group-hover:text-slate-300 transition">Web Utama</h4>
              <p className="text-xs text-slate-400 mt-1">Lihat tampilan beranda depan publik untuk warga.</p>
            </div>
            <div className="mt-6 flex items-center text-xs font-semibold text-slate-400 group-hover:translate-x-1 transition">
              Lihat Beranda &rarr;
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}

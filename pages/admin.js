import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';
import InstallButton from '../components/InstallButton';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    warga: 0,
    pengumuman: 0,
    pendingIuran: 0,
    pendingProyek: 0,
  });

  const [showPassModal, setShowPassModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const savedUser = sessionStorage.getItem('pengurusSession');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);

      if (parsedUser.role === 'bendahara') {
        window.location.replace('/keuangan/dashboard');
        return;
      }
      if (parsedUser.role === 'bendahara_2') {
        window.location.replace('/proyek/dashboard');
        return;
      }
      if (parsedUser.role === 'sekretaris') {
        window.location.replace('/sekretaris/data-warga');
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

    setUser(data);
    sessionStorage.setItem('pengurusSession', JSON.stringify(data));

    if (data.role === 'bendahara') {
      window.location.replace('/keuangan/dashboard');
      return;
    }
    if (data.role === 'bendahara_2') {
      window.location.replace('/proyek/dashboard');
      return;
    }
    if (data.role === 'sekretaris') {
      window.location.replace('/sekretaris/data-warga');
      return;
    }

    fetchStats();
  };

  const handleLogout = () => {
    if (!confirm('Keluar dari akun pengurus?')) return;
    sessionStorage.removeItem('pengurusSession');
    window.location.replace('/admin');
  };

  async function fetchStats() {
    try {
      const [
        { count: wargaCount },
        { count: pengumumanCount },
        { count: pendingIuranCount },
        { count: pendingProyekCount },
      ] = await Promise.all([
        supabase.from('warga').select('*', { count: 'exact', head: true }),
        supabase.from('pengumuman').select('*', { count: 'exact', head: true }),
        supabase.from('iuran').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('iuran_proyek').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      setStats({
        warga: wargaCount || 0,
        pengumuman: pengumumanCount || 0,
        pendingIuran: pendingIuranCount || 0,
        pendingProyek: pendingProyekCount || 0,
      });
    } catch (err) {
      console.error(err);
    }
  }

  const handleUpdateProfil = async (e) => {
    e.preventDefault();

    if (newPassword && newPassword !== confirmPassword) {
      alert('Password baru dan Konfirmasi Password tidak cocok!');
      return;
    }

    setIsUpdating(true);

    const updateData = {};
    if (newUsername.trim() && newUsername.trim() !== user.username) {
      updateData.username = newUsername.trim();
    }
    if (newPassword.trim()) {
      updateData.password = newPassword.trim();
    }

    if (Object.keys(updateData).length === 0) {
      alert('Tidak ada perubahan data.');
      setIsUpdating(false);
      return;
    }

    const { error } = await supabase
      .from('pengurus')
      .update(updateData)
      .eq('id', user.id);

    setIsUpdating(false);

    if (error) {
      alert(`Gagal memperbarui profil: ${error.message}`);
    } else {
      alert('Profil/Password berhasil diperbarui! Gunakan kredensial baru saat login berikutnya.');
      const updatedUser = { ...user, ...updateData };
      setUser(updatedUser);
      sessionStorage.setItem('pengurusSession', JSON.stringify(updatedUser));
      setShowPassModal(false);
      setNewPassword('');
      setConfirmPassword('');
    }
  };

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
          
          {/* LINK KEMBALI KE HALAMAN WARGA SUDAH DIHAPUS */}
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

            <button
              onClick={() => {
                setNewUsername(user.username);
                setNewPassword('');
                setConfirmPassword('');
                setShowPassModal(true);
              }}
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition active:scale-95 flex items-center gap-1"
            >
              🔑 <span className="hidden sm:inline">Edit Akun</span>
            </button>

            <button
              onClick={handleLogout}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition active:scale-95"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Warga</span>
              <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl text-lg">👥</span>
            </div>
            <div className="text-3xl font-extrabold text-white">{stats.warga}</div>
            <p className="text-[11px] text-slate-500 mt-1">Terdaftar dalam sistem</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Pengumuman</span>
              <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-lg">📢</span>
            </div>
            <div className="text-3xl font-extrabold text-white">{stats.pengumuman}</div>
            <p className="text-[11px] text-slate-500 mt-1">Informasi dipublikasi</p>
          </div>
        </div>

        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Akses Layanan Admin</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {canAccessKeuangan ? (
            <Link href="/keuangan" className="relative group bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 transition duration-300 shadow-lg flex flex-col justify-between">
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
            <Link href="/sekretaris/data-warga" className="group bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-teal-500/50 rounded-2xl p-6 transition duration-300 shadow-lg flex flex-col justify-between">
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

          {/* KARTU PENGAJUAN SURAT DAN WEB UTAMA SUDAH DIHAPUS */}
          
        </div>
      </main>

      {showPassModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🔑</span> Ubah Username & Password
              </h3>
              <button onClick={() => setShowPassModal(false)} className="text-slate-400 hover:text-white text-sm font-bold p-1">✕</button>
            </div>

            <form onSubmit={handleUpdateProfil} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Username Login</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password Baru</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Kosongkan jika tidak ubah password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 pr-12 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-sm px-2 py-1"
                  >
                    {showNewPassword ? '👁️' : '🙈'}
                  </button>
                </div>
              </div>

              {newPassword.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Ulangi Password Baru</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Ketik ulang password baru di atas"
                      required
                      className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 pr-12 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 ${
                        confirmPassword.length > 0 && confirmPassword !== newPassword
                          ? 'border-rose-500 focus:ring-rose-500'
                          : 'border-slate-800 focus:ring-amber-500'
                      }`}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-sm px-2 py-1"
                    >
                      {showConfirmPassword ? '👁️' : '🙈'}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                    <p className="text-[10px] text-rose-400 mt-1">⚠️ Password tidak cocok!</p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPassModal(false)}
                  className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="w-1/2 bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2.5 rounded-xl text-xs transition shadow-lg shadow-amber-600/20"
                >
                  {isUpdating ? 'Simpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

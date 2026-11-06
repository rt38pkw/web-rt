// pages/proyek/pengaturan.jsx
// Halaman Pengaturan — SAMA PERSIS gaya /keuangan/pengaturan
// Hanya logout + info akun (readonly, teks biasa). Tanpa API.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function PengaturanProyek() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pengurusSession');
      if (!raw) return router.replace('/admin');
      const parsed = JSON.parse(raw);
      if (!['ketua', 'bendahara_2'].includes(parsed.role)) {
        return router.replace('/admin');
      }
      setUser(parsed);
    } catch {
      router.replace('/admin');
    } finally {
      setLoading(false);
    }
  }, [router]);

  // ===== LOGOUT (sama persis dengan Layout proyek & admin.js) =====
  const handleLogout = () => {
    if (!confirm('Keluar dari akun pengurus?')) return;
    localStorage.removeItem('pengurusSession');
    window.location.replace('/admin');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Memuat…
      </div>
    );
  }

  const roleEmoji =
    user?.role === 'ketua' ? '👑'
    : user?.role === 'bendahara_2' ? '🏗️'
    : '📝';

  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' ')
    : '-';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      {/* HEADER */}
      <div className="bg-slate-900/70 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center gap-2">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white truncate">⚙️ Pengaturan</h1>
            <p className="text-[11px] text-slate-400 truncate">
              {user?.username ? `@${user.username}` : 'Akun Pengurus'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/proyek/dashboard"
              className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg text-slate-300 border border-slate-700"
            >
              ← Kembali
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3 py-2 rounded-lg border border-rose-500/20 font-medium"
            >
              🚪 Keluar
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Kartu Akun */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-2xl">
              {roleEmoji}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white truncate">@{user?.username || '-'}</p>
              <p className="text-xs text-slate-400 truncate">
                Role: <span className="font-semibold text-slate-200">{roleLabel}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Info Akun — teks biasa */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white mb-1">Informasi Akun</h2>

          <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <span className="text-xs text-slate-400">Username</span>
            <span className="text-sm font-semibold text-slate-100 truncate">
              @{user?.username || '-'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-slate-400">Role</span>
            <span className="text-sm font-semibold text-slate-100">
              {roleLabel}
            </span>
          </div>

          <p className="text-[10px] text-slate-600 pt-1">
            Untuk mengubah username atau password, gunakan menu <strong>“Edit Akun”</strong> di halaman Admin.
          </p>
        </div>

        {/* Zona Keluar */}
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-rose-400 mb-1">Zona Keluar</h2>
          <p className="text-xs text-slate-400 mb-3">
            Anda akan keluar dari sesi pengurus dan diarahkan ke halaman login admin.
          </p>
          <button
            onClick={handleLogout}
            className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-sm font-semibold px-4 py-2.5 rounded-lg border border-rose-500/20 transition"
          >
            🚪 Keluar dari Akun Pengurus
          </button>
        </div>

        <p className="text-center text-[10px] text-slate-600 pb-6">
          RT 38 Puri Kencana Wagir · Manajemen Proyek
        </p>
      </div>
    </div>
  );
}

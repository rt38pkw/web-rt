// components/proyek/Layout.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import NotifToggle from '../NotifToggle';
import PopoverPengaturan from '../pengurus/PopoverPengaturan';
import ModalUbahPassword from '../pengurus/ModalUbahPassword';

const MENU = [
  { key: 'dashboard', i: '📊', l: 'Dashboard', path: '/proyek/dashboard' },
  { key: 'verifikasi', i: '⏳', l: 'Verifikasi', path: '/proyek/verifikasi' },
  { key: 'tunai', i: '💵', l: 'Tunai', path: '/proyek/tunai' },
  { key: 'kas', i: '💰', l: 'Kas Proyek', path: '/proyek/kas' },
  { key: 'tunggakan', i: '⚠️', l: 'Tunggakan', path: '/proyek/tunggakan' },
  { key: 'kelola', i: '➕', l: 'Kelola', path: '/proyek/kelola' },
];

export default function Layout({ user, pendingCount = 0, children }) {
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const [showUbahPass, setShowUbahPass] = useState(false);

  const activeKey = MENU.find((m) => router.pathname.startsWith(m.path))?.key;
  const isKetua = user?.role === 'ketua';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      
      {/* STICKY WRAPPER (Header + Tab Menu) */}
      <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 shadow-sm">
        
        {/* HEADER */}
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center gap-2">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white truncate">
              🏗️ Manajemen Proyek
            </h1>
            <p className="text-[11px] text-slate-400">
              {user?.nama ? `${user.nama} — ${user.role}` : 'RT 38 Puri Kencana Wagir'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {user && <NotifToggle userId={user.id} userType="pengurus" />}

            {isKetua && (
              <Link
                href="/admin"
                className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg text-slate-300 border border-slate-700"
              >
                ← Admin
              </Link>
            )}

            <button
              id="btn-pengaturan"
              onClick={() => setShowSettings(!showSettings)}
              className={`text-xs px-3 py-2 rounded-lg border transition ${
                showSettings 
                  ? 'bg-slate-700 text-white border-slate-600' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* MENU TAB (Scrollable Horizontal) */}
        <div className="max-w-7xl mx-auto px-2 pb-2">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none items-center">
            {MENU.map((t) => (
              <Link
                key={t.key}
                href={t.path}
                className={`relative flex flex-row items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] sm:text-xs font-semibold border transition shrink-0 ${
                  activeKey === t.key
                    ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/20'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <span className="text-sm leading-none">{t.i}</span>
                <span className="leading-tight">{t.l}</span>
                {t.key === 'verifikasi' && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center shadow-lg animate-pulse">
                    {pendingCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* KONTEN UTAMA */}
      <div className="max-w-7xl mx-auto p-4">
        {children}
      </div>

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

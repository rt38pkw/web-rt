// components/keuangan/Layout.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import NotifToggle from '../NotifToggle';
import PopoverPengaturan from '../pengurus/PopoverPengaturan';
import ModalUbahPassword from '../pengurus/ModalUbahPassword';

const MENU_MAIN = [
  { key: 'dashboard', i: '📊', l: 'Dashboard', path: '/keuangan/dashboard' },
  { key: 'tarif', i: '💰', l: 'Tarif', path: '/keuangan/tarif' },
  { key: 'verifikasi', i: '⏳', l: 'Verifikasi', path: '/keuangan/verifikasi' },
  { key: 'tunai', i: '💵', l: 'Tunai', path: '/keuangan/tunai' },
  { key: 'pemasukan', i: '➕', l: 'Pemasukan', path: '/keuangan/pemasukan' },
  { key: 'pengeluaran', i: '➖', l: 'Pengeluaran', path: '/keuangan/pengeluaran' },
  { key: 'deposit', i: '💎', l: 'Deposit', path: '/keuangan/deposit' },
  { key: 'tunggakan', i: '⚠️', l: 'Tunggakan', path: '/keuangan/tunggakan' },
  { key: 'riwayat', i: '📋', l: 'Riwayat', path: '/keuangan/riwayat' },
];

const MENU_PROYEK = [
  { key: 'projek', i: '🏗️', l: 'Projek', path: '/keuangan/projek' },
];

export default function Layout({ user, pendingCount = 0, children }) {
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const [showUbahPass, setShowUbahPass] = useState(false);

  const isOperatorProyek = user?.role === 'bendahara_2';
  const isKetua = user?.role === 'ketua';

  const MENU = isOperatorProyek ? MENU_PROYEK : MENU_MAIN;
  const activeKey = MENU.find((m) => router.pathname.startsWith(m.path))?.key;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      
      {/* STICKY WRAPPER (Header + Tab Menu) */}
      <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
        
        {/* HEADER */}
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center gap-2">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white truncate">
              {isOperatorProyek ? '🏗️ Operator Proyek' : '💰 Dashboard Keuangan'}
            </h1>
            <p className="text-[11px] text-slate-400">
              {user?.nama ? `${user.nama} — ${user.role}` : 'RT 38 Puri Kencana Wagir'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {user && <NotifToggle userId={user.id} userType="pengurus" />}
            {isKetua && (
              <Link href="/admin" className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg text-slate-300 border border-slate-700">
                ← Admin
              </Link>
            )}
            <button
              id="btn-pengaturan"
              onClick={() => setShowSettings(!showSettings)}
              className={`text-xs px-3 py-2 rounded-lg border transition ${
                showSettings ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* MENU TAB (Grid 4 Kolom, Tanpa Scroll) */}
        <div className="max-w-7xl mx-auto px-2 pb-2">
          <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-1.5">
            {MENU.map((t) => (
              <Link
                key={t.key}
                href={t.path}
                className={`relative flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-1 py-2 sm:px-3 sm:py-2 rounded-lg text-[10px] sm:text-xs font-semibold border transition ${
                  activeKey === t.key 
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20' 
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <span className="text-sm sm:text-xs leading-none">{t.i}</span>
                <span className="leading-tight text-center">{t.l}</span>
                {t.key === 'verifikasi' && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center shadow-lg animate-pulse">
                    {pendingCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* KONTEN */}
      <div className="max-w-7xl mx-auto p-4">
        {children}
      </div>

      <PopoverPengaturan show={showSettings} onClose={() => setShowSettings(false)} user={user} onOpenUbahPassword={() => setShowUbahPass(true)} />
      <ModalUbahPassword show={showUbahPass} onClose={() => setShowUbahPass(false)} user={user} />
    </div>
  );
}

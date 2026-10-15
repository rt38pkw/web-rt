import Link from 'next/link';
import { useRouter } from 'next/router';
import NotifToggle from '../NotifToggle';
import InstallButton from '../InstallButton';

const MENU = [
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

export default function Layout({ user, pendingCount = 0, children }) {
  const router = useRouter();
  const activeKey = MENU.find((m) => router.pathname === m.path)?.key || 'dashboard';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      <div className="bg-slate-900/70 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center gap-2">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white truncate">💰 Dashboard Keuangan</h1>
            <p className="text-[11px] text-slate-400">RT 38 Puri Kencana Wagir</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <InstallButton />
            {user && <NotifToggle userId={user.id} userType="pengurus" />}
            <Link
              href="/admin"
              className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg text-slate-300 border border-slate-700"
            >
              ← Kembali
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="grid grid-cols-4 gap-1.5 sm:flex sm:gap-2 sm:overflow-x-auto sm:pb-1 sm:scrollbar-none">
          {MENU.map((t) => (
            <Link
              key={t.key}
              href={t.path}
              className={`relative flex flex-col items-center justify-center gap-0.5 sm:flex-row sm:gap-1.5 px-2 py-2 sm:px-3 rounded-xl text-[9px] sm:text-xs font-semibold border transition shrink-0 ${
                activeKey === t.key
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <span className="text-base sm:text-xs leading-none">{t.i}</span>
              <span className="leading-tight">{t.l}</span>
              {t.key === 'verifikasi' && pendingCount > 0 && (
                <span className="absolute top-0.5 right-0.5 inline-block bg-orange-500 text-white text-[8px] px-1 rounded-full leading-tight">
                  {pendingCount}
                </span>
              )}
            </Link>
          ))}
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}

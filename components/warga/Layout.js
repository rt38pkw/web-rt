import Link from 'next/link';
import { useRouter } from 'next/router';
import InstallButton from '../InstallButton';

const MENU = [
  { key: 'iuran', label: 'Status Iuran', icon: '💰', path: '/dashboard-warga/iuran' },
  { key: 'projek', label: 'Projek', icon: '🏗️', path: '/dashboard-warga/projek' },
  { key: 'pengumuman', label: 'Pengumuman', icon: '📢', path: '/dashboard-warga/pengumuman' },
  { key: 'surat', label: 'Surat Mandiri', icon: '📄', path: '/dashboard-warga/surat' },
];

export default function Layout({ children, warga, onLogout }) {
  const router = useRouter();
  const activeKey = MENU.find((m) => router.pathname.startsWith(m.path))?.key || 'iuran';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white antialiased">
      <header className="px-5 py-3.5 border-b border-slate-800/60 flex justify-between items-center bg-slate-900/40 backdrop-blur-md sticky top-0 z-50">
        <Link href="/dashboard-warga/iuran" className="flex items-center space-x-3">
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
        </Link>

        <div className="flex items-center gap-2">
          <InstallButton />
          <button
            onClick={onLogout}
            className="text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-xl border border-rose-500/20 transition font-medium"
          >
            Keluar 🚪
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-4 my-1">
        {/* Menu Navigasi di Atas */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {MENU.map((t) => (
            <Link
              key={t.key}
              href={t.path}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 flex items-center gap-2 shrink-0 ${
                activeKey === t.key
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span>{t.icon}</span> {t.label}
            </Link>
          ))}
        </div>

        <div className="space-y-6">{children}</div>
      </main>

      <footer className="p-4 text-center text-xs text-slate-500 border-t border-slate-900 bg-slate-950">
        RT 38 Puri Kencana Wagir &copy; 2026 • Portal Mandiri Warga
      </footer>
    </div>
  );
}

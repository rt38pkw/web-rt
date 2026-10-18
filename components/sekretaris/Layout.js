import Link from 'next/link';
import { useRouter } from 'next/router';
import NotifToggle from '../NotifToggle';

const MENU = [
  { key: 'data-warga', i: '👥', l: 'Data Warga', path: '/sekretaris/data-warga' },
  { key: 'surat', i: '📄', l: 'Surat', path: '/sekretaris/surat' },
  { key: 'ronda', i: '🛡️', l: 'Ronda', path: '/sekretaris/ronda' },
];

export default function Layout({ user, children }) {
  const router = useRouter();
  const activeKey = MENU.find((m) => router.pathname.startsWith(m.path))?.key;

  const handleLogout = () => {
    if (!confirm('Keluar dari akun pengurus?')) return;
    sessionStorage.removeItem('pengurusSession');
    window.location.replace('/admin');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      <div className="bg-slate-900/70 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center gap-2">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white truncate">
              📝 Dashboard Sekretaris
            </h1>
            <p className="text-[11px] text-slate-400">
              {user?.nama ? `${user.nama} — ${user.role}` : 'RT 38 Puri Kencana Wagir'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {user && <NotifToggle userId={user.id} userType="pengurus" />}

            <Link
              href="/admin"
              className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg text-slate-300 border border-slate-700 hidden sm:block"
            >
              ← Admin
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

      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="grid grid-cols-3 gap-1.5 sm:flex sm:gap-2 sm:overflow-x-auto sm:pb-1 sm:scrollbar-none">
          {MENU.map((t) => (
            <Link
              key={t.key}
              href={t.path}
              className={`relative flex flex-col items-center justify-center gap-0.5 sm:flex-row sm:gap-1.5 px-4 py-2.5 sm:px-5 rounded-xl text-xs font-semibold border transition shrink-0 ${
                activeKey === t.key
                  ? 'bg-teal-600 text-white border-teal-500' 
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <span className="text-base sm:text-sm leading-none">{t.i}</span>
              <span className="leading-tight">{t.l}</span>
            </Link>
          ))}
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}

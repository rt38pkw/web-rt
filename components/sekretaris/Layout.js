import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import NotifToggle from '../NotifToggle';
import { supabase } from '../../lib/supabase';

const MENU = [
  { key: 'data-warga', i: '👥', l: 'Data Warga', path: '/sekretaris/data-warga' },
  { key: 'verifikasi', i: '✅', l: 'Verifikasi', path: '/sekretaris/verifikasi' },
  { key: 'surat', i: '📄', l: 'Surat', path: '/sekretaris/surat' },
  { key: 'ronda', i: '🛡️', l: 'Ronda', path: '/sekretaris/ronda' },
];

export default function Layout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  
  const activeKey = MENU.find((m) => router.pathname.startsWith(m.path))?.key;

  // ═══ LOGIKA AUTH ═══
  useEffect(() => {
    const savedUser = localStorage.getItem('pengurusSession');
    if (!savedUser) {
      router.replace('/admin');
      return;
    }
    const parsedUser = JSON.parse(savedUser);
    if (parsedUser.role !== 'sekretaris' && parsedUser.role !== 'ketua') {
      router.replace('/admin');
      return;
    }
    setUser(parsedUser);
    setLoading(false);
  }, [router]);

  // ═══ LOGIKA BADGE & PWA BADGE ═══
  useEffect(() => {
    if (!user) return;
    
    const fetchPendingCount = async () => {
      try {
        // Ambil ID Warga yang Pemiliknya pending
        const { data: wPending } = await supabase
          .from('warga')
          .select('id')
          .eq('status_verifikasi_profil', 'pending');
        
        // Ambil warga_id yang Penyewanya pending
        const { data: pPending } = await supabase
          .from('penghuni')
          .select('warga_id')
          .eq('status_verifikasi', 'pending')
          .eq('is_aktif', true);
        
        // Gabungkan ID unik (menghitung jumlah RUMAH, bukan jumlah orang)
        const uniqueRumahIds = new Set([
          ...(wPending || []).map(w => w.id),
          ...(pPending || []).map(p => p.warga_id)
        ]);
        
        const total = uniqueRumahIds.size;
        setPendingCount(total);

        // Set Badge di Icon PWA (jika didukung)
        if ('setAppBadge' in navigator) {
          if (total > 0) {
            await navigator.setAppBadge(total);
          } else if ('clearAppBadge' in navigator) {
            await navigator.clearAppBadge();
          }
        }
      } catch (err) {
        console.error('Badge error:', err);
      }
    };
    
    fetchPendingCount();
    
    // Realtime: update badge saat ada perubahan data
    const channel = supabase
      .channel('realtime-badge-sekretaris')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'warga' }, () => fetchPendingCount())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'penghuni' }, () => fetchPendingCount())
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
      // Clear badge saat unmount/logout
      if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge().catch(() => {});
      }
    };
  }, [user]);

  const handleLogout = () => {
    if (!confirm('Keluar dari akun pengurus?')) return;
    // Hapus badge dari icon PWA sebelum logout
    if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge().catch(() => {});
    }
    localStorage.removeItem('pengurusSession');
    window.location.replace('/admin');
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 text-sm">Memeriksa Akses...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      <div className="bg-slate-900/70 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center gap-2">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white truncate">📝 Dashboard Sekretariat</h1>
            <p className="text-[11px] text-slate-400">{user?.nama ? `${user.nama} — ${user.role}` : 'RT 38 Puri Kencana Wagir'}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {user && <NotifToggle userId={user.id} userType="pengurus" />}
            <Link href="/admin" className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg text-slate-300 border border-slate-700 hidden sm:block">← Admin</Link>
            <button onClick={handleLogout} className="text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3 py-2 rounded-lg border border-rose-500/20 font-medium">🚪 Keluar</button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="grid grid-cols-2 sm:flex sm:gap-2 sm:overflow-x-auto sm:pb-1 sm:scrollbar-none">
          {MENU.map((t) => (
            <Link 
              key={t.key} 
              href={t.path} 
              className={`relative flex flex-col items-center justify-center gap-0.5 sm:flex-row sm:gap-1.5 px-4 py-2.5 sm:px-5 rounded-xl text-xs font-semibold border transition shrink-0 ${activeKey === t.key ? 'bg-teal-600 text-white border-teal-500' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'}`}
            >
              <span className="text-base sm:text-sm leading-none">{t.i}</span>
              <span className="leading-tight">{t.l}</span>
              
              {/* ═══ BADGE NOTIFIKASI DI MENU VERIFIKASI ═══ */}
              {t.key === 'verifikasi' && pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-lg animate-pulse">
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

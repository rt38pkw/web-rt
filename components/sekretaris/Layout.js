// components/sekretaris/Layout.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import NotifToggle from '../NotifToggle';
import { supabase } from '../../lib/supabase';
import { useState, useEffect } from 'react';

const MENU = [
  { key: 'dashboard', i: '🏠', l: 'Dashboard', path: '/sekretaris' }, // TAMBAHAN MENU DASHBOARD
  { key: 'data-warga', i: '👥', l: 'Data Warga', path: '/sekretaris/data-warga' },
  { key: 'verifikasi', i: '✅', l: 'Verifikasi', path: '/sekretaris/verifikasi' },
  { key: 'surat', i: '📄', l: 'Surat', path: '/sekretaris/surat' },
  { key: 'ronda', i: '🛡️', l: 'Ronda', path: '/sekretaris/ronda' },
];

export default function Layout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [pendingVerifCount, setPendingVerifCount] = useState(0);
  const [pendingRondaCount, setPendingRondaCount] = useState(0);
  
  // Cari activeKey (kecuali kalau di halaman utama /sekretaris, anggap 'dashboard')
  const activeKey = MENU.find((m) => router.pathname === m.path || (m.key !== 'dashboard' && router.pathname.startsWith(m.path)))?.key;

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

  useEffect(() => {
    if (!user) return;
    
    const fetchAllCounts = async () => {
      try {
        // 1. Hitung Pending Verifikasi (Profil Warga)
        const { data: wPending } = await supabase.from('warga').select('id').eq('status_verifikasi_profil', 'pending');
        const { data: pPending } = await supabase.from('penghuni').select('warga_id').eq('status_verifikasi', 'pending').eq('is_aktif', true);
        const uniqueRumahIds = new Set([ ...(wPending || []).map(w => w.id), ...(pPending || []).map(p => p.warga_id) ]);
        const totalVerif = uniqueRumahIds.size;
        setPendingVerifCount(totalVerif);

        // 2. Hitung Pending Ronda
        const { data: rondaData } = await supabase
          .from('petugas_ronda')
          .select('id, foto_bukti, jadwal:jadwal_id!inner(tanggal, periode:periode_id!inner(jam_selesai, status))')
          .eq('status_hadir', 'pending')
          .eq('jadwal.periode.status', 'published');
          
        let totalRonda = 0;
        if (rondaData) {
          rondaData.forEach(item => {
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
        setPendingRondaCount(totalRonda);

        // 3. Update PWA Badge (Gabungan)
        const grandTotal = totalVerif + totalRonda;
        if ('setAppBadge' in navigator) {
          if (grandTotal > 0) await navigator.setAppBadge(grandTotal);
          else if ('clearAppBadge' in navigator) await navigator.clearAppBadge();
        }
      } catch (err) {
        console.error('Badge error:', err);
      }
    };
    
    fetchAllCounts();
    
    const channel = supabase
      .channel('realtime-badge-sekretaris')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'warga' }, () => fetchAllCounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'penghuni' }, () => fetchAllCounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'petugas_ronda' }, () => fetchAllCounts())
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
      if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});
    };
  }, [user]);

  const handleLogout = () => {
    if (!confirm('Keluar dari akun pengurus?')) return;
    if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});
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
            <button onClick={handleLogout} className="text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3 py-2 rounded-lg border border-rose-500/20 font-medium">🚪 Keluar</button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="grid grid-cols-2 sm:flex sm:gap-2 sm:overflow-x-auto sm:pb-1 sm:scrollbar-none">
          {MENU.map((t) => {
            let showBadge = false;
            let badgeValue = 0;
            
            if (t.key === 'verifikasi' && pendingVerifCount > 0) { showBadge = true; badgeValue = pendingVerifCount; }
            if (t.key === 'ronda' && pendingRondaCount > 0) { showBadge = true; badgeValue = pendingRondaCount; }

            return (
              <Link 
                key={t.key} 
                href={t.path} 
                className={`relative flex flex-col items-center justify-center gap-0.5 sm:flex-row sm:gap-1.5 px-4 py-2.5 sm:px-5 rounded-xl text-xs font-semibold border transition shrink-0 ${activeKey === t.key ? 'bg-teal-600 text-white border-teal-500' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'}`}
              >
                <span className="text-base sm:text-sm leading-none">{t.i}</span>
                <span className="leading-tight">{t.l}</span>
                
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-lg animate-pulse">
                    {badgeValue}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

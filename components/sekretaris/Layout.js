// components/sekretaris/Layout.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import NotifToggle from '../NotifToggle';
import { supabase } from '../../lib/supabase';
import PopoverPengaturan from '../pengurus/PopoverPengaturan';
import ModalUbahPassword from '../pengurus/ModalUbahPassword';

const MENU = [
  { key: 'dashboard', i: '🏠', l: 'Dashboard', path: '/sekretaris' },
  { key: 'data-warga', i: '👥', l: 'Data Warga', path: '/sekretaris/data-warga' },
  { key: 'verifikasi', i: '✅', l: 'Verifikasi', path: '/sekretaris/verifikasi' },
  { key: 'surat', i: '📄', l: 'Surat', path: '/sekretaris/surat' },
  { key: 'ronda', i: '🛡️', l: 'Ronda', path: '/sekretaris/ronda' },
];

export default function Layout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showUbahPass, setShowUbahPass] = useState(false);

  const [pendingVerifCount, setPendingVerifCount] = useState(0);
  const [pendingRondaCount, setPendingRondaCount] = useState(0);
  
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
        const { data: pPending } = await supabase.from('penghuni').select('warga_id').eq('status_verifikasi', 'pending').eq('is_aktif', true);
        const uniqueRumahIds = new Set((pPending || []).map(p => p.warga_id));
        setPendingVerifCount(uniqueRumahIds.size);

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

        const grandTotal = uniqueRumahIds.size + totalRonda;
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'penghuni' }, () => fetchAllCounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'petugas_ronda' }, () => fetchAllCounts())
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
      if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});
    };
  }, [user]);

  if (loading || !user) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 text-sm">Memeriksa Akses...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      
      {/* STICKY WRAPPER (Header + Tab Menu) */}
      <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 shadow-sm">
        
        {/* HEADER */}
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center gap-2">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white truncate">📝 Dashboard Sekretariat</h1>
            <p className="text-[11px] text-slate-400 truncate">{user?.nama ? `${user.nama} — ${user.role}` : 'RT 38 Puri Kencana Wagir'}</p>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {user && <NotifToggle userId={user.id} userType="pengurus" />}
            
            {user.role === 'ketua' && (
              <Link href="/admin" className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-2 rounded-lg font-medium transition active:scale-95 flex items-center gap-1">
                ← Admin
              </Link>
            )}

            <button
              id="btn-pengaturan"
              onClick={() => setShowSettings(!showSettings)}
              className={`text-xs px-3 py-2 rounded-lg border transition font-medium active:scale-95 ${
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
            {MENU.map((t) => {
              let showBadge = false;
              let badgeValue = 0;
              
              if (t.key === 'verifikasi' && pendingVerifCount > 0) { showBadge = true; badgeValue = pendingVerifCount; }
              if (t.key === 'ronda' && pendingRondaCount > 0) { showBadge = true; badgeValue = pendingRondaCount; }

              return (
                <Link 
                  key={t.key} 
                  href={t.path} 
                  className={`relative flex flex-row items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] sm:text-xs font-semibold border transition shrink-0 ${
                    activeKey === t.key 
                      ? 'bg-teal-600 text-white border-teal-500 shadow-md shadow-teal-600/20' 
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-sm leading-none">{t.i}</span>
                  <span className="leading-tight">{t.l}</span>
                  
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center shadow-lg animate-pulse">
                      {badgeValue}
                    </span>
                  )}
                </Link>
              );
            })}
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

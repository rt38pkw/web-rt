// components/warga/Layout.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react'; 
import NotifToggle from '../NotifToggle';
import { supabase } from '../../lib/supabase'; // Import supabase

import PopoverPengaturan from './PopoverPengaturan';
import ModalUbahPin from './ModalUbahPin';

const MENU = [
  { key: 'iuran', label: 'Status Iuran', icon: '💰', path: '/dashboard-warga/iuran' },
  { key: 'projek', label: 'Projek', icon: '🏗️', path: '/dashboard-warga/projek' },
  { key: 'ronda', label: 'Ronda', icon: '🛡️', path: '/dashboard-warga/ronda' }, 
];

export default function Layout({ children, warga }) {
  const router = useRouter();
  const activeKey = MENU.find((m) => router.pathname.startsWith(m.path))?.key || 'iuran';
  
  const [showSettings, setShowSettings] = useState(false);
  const [showUbahPin, setShowUbahPin] = useState(false);
  
  const [pendingRondaCount, setPendingRondaCount] = useState(0); // State Badge Ronda

  // ═══ LOGIKA BADGE RONDA ═══
  useEffect(() => {
    if (!warga?.id) return;

    const checkRondaPending = async () => {
      try {
        // 1. Cari ID Penghuni dari Warga ini
        const { data: penghuniData } = await supabase
          .from('penghuni')
          .select('id')
          .eq('warga_id', warga.id)
          .eq('is_aktif', true);

        const penghuniIds = (penghuniData || []).map(p => p.id);
        if (penghuniIds.length === 0) {
          setPendingRondaCount(0);
          return;
        }

        // 2. Cek jadwal ronda hari ini atau yang belum diabsen
        const today = new Date().toISOString().split('T')[0];
        
        const { data: jadwal } = await supabase
          .from('petugas_ronda')
          .select('id, jadwal:jadwal_id!inner(tanggal, status, periode:periode_id!inner(status))')
          .in('penghuni_id', penghuniIds)
          .eq('status_hadir', 'pending')
          .eq('jadwal.status', 'aktif')
          .eq('jadwal.periode.status', 'published')
          .gte('jadwal.tanggal', today); // Hanya hitung hari ini atau ke depan

        // 3. Hitung berapa yang belum diabsen
        setPendingRondaCount(jadwal?.length || 0);
      } catch (err) {
        console.error('Gagal load badge ronda:', err);
      }
    };

    checkRondaPending();

    // Dengarkan perubahan secara realtime
    const channel = supabase
      .channel('realtime-badge-warga-ronda')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'petugas_ronda' }, () => checkRondaPending())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [warga?.id]);
  // ═══════════════════════════

  const handleLogout = () => {
    if (!confirm('Yakin ingin keluar dari akun ini? Anda harus login kembali besok.')) return;
    localStorage.removeItem('warga_session');
    router.replace('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white antialiased">
      
      <div className="sticky top-0 z-50">
        <header className="px-5 py-3.5 border-b border-slate-800/60 flex justify-between items-center bg-slate-900/95 backdrop-blur-md">
          <Link href="/dashboard-warga/iuran" className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center overflow-hidden shrink-0">
              <img src="/logo-rt38.png" alt="Logo RT 38" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-bold text-xs sm:text-sm text-white tracking-wide">PORTAL WARGA</h1>
              <p className="text-[10px] text-slate-400">RT 38 Puri Kencana Wagir</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {warga && <NotifToggle userId={warga.id} userType="warga" />}
            
            <button
              id="btn-pengaturan"
              onClick={() => setShowSettings(!showSettings)}
              className={`text-xs px-3 py-1.5 rounded-xl border transition font-medium flex items-center gap-1 ${
                showSettings 
                  ? 'bg-slate-700 text-white border-slate-600' 
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700/60'
              }`}
            >
              ⚙️ <span className="hidden sm:inline">Pengaturan</span>
            </button>
          </div>
        </header>

        <div className="bg-slate-950/95 backdrop-blur-md border-b border-slate-800/60 px-4 sm:px-6 py-2">
          <div className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {MENU.map((t) => (
              <Link
                key={t.key}
                href={t.path}
                className={`relative px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 flex items-center gap-2 shrink-0 ${
                  activeKey === t.key
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span>{t.icon}</span> {t.label}
                
                {/* BADGE NOTIFIKASI RONDA */}
                {t.key === 'ronda' && pendingRondaCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center shadow-lg animate-pulse">
                    {pendingRondaCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 my-1">
        <div className="space-y-6">{children}</div>
      </main>

      <footer className="p-4 text-center text-xs text-slate-500 border-t border-slate-900 bg-slate-950">
        RT 38 Puri Kencana Wagir &copy; 2026 • Portal Mandiri Warga
      </footer>

      <PopoverPengaturan 
        show={showSettings} 
        onClose={() => setShowSettings(false)} 
        warga={warga}
        onOpenUbahPin={() => setShowUbahPin(true)}
        onLogout={handleLogout}
      />

      <ModalUbahPin 
        show={showUbahPin} 
        onClose={() => setShowUbahPin(false)} 
        wargaId={warga?.id} 
      />

    </div>
  );
}

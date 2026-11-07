// components/pengurus/PopoverPengaturan.js
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useEffect, useRef } from 'react';

export default function PopoverPengaturan({ 
  show, onClose, user, onOpenUbahPassword 
}) {
  const popoverRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        const isGearButton = event.target.closest('#btn-pengaturan');
        if (!isGearButton) onClose();
      }
    }
    if (show) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [show, onClose]);

  if (!show || !user) return null;

  const handleLogout = () => {
    if (!confirm('Keluar dari akun pengurus?')) return;
    localStorage.removeItem('pengurusSession');
    window.location.replace('/admin');
  };

  const handleTutupAplikasi = () => {
    if (Capacitor.isNativePlatform()) {
      App.exitApp();
    } else {
      alert('Silakan tutup tab ini secara manual.');
    }
  };

  return (
    <div 
      ref={popoverRef}
      className="fixed right-4 top-[65px] z-[100] w-64 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-3 space-y-2 animate-in zoom-in-95 fade-in duration-200 origin-top-right"
    >
      {/* Info Pengurus */}
      <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 flex flex-col gap-0.5">
        <p className="text-[11px] font-bold text-white truncate">{user.nama}</p>
        <p className="text-[9px] text-slate-400 capitalize">Role: {user.role.replace('_', ' ')}</p>
      </div>

      <div className="w-full h-px bg-slate-700/50 my-1"></div>

      {/* List Aksi */}
      <div className="space-y-1">
        <button
          onClick={() => {
            onClose();
            onOpenUbahPassword();
          }}
          className="w-full text-left p-2.5 rounded-lg hover:bg-slate-700 transition flex items-center justify-between"
        >
          <div className="text-xs font-bold text-indigo-400">🔐 Ubah Password</div>
          <span className="text-slate-500">→</span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full text-left p-2.5 rounded-lg hover:bg-slate-700 transition flex items-center justify-between"
        >
          <div className="text-xs font-bold text-rose-400">🚪 Keluar Akun</div>
          <span className="text-slate-500">→</span>
        </button>

        <button
          onClick={handleTutupAplikasi}
          className="w-full text-left p-2.5 rounded-lg hover:bg-slate-700 transition flex items-center justify-between"
        >
          <div className="text-xs font-bold text-slate-300">✕ Tutup Aplikasi</div>
          <span className="text-slate-500">→</span>
        </button>
      </div>
    </div>
  );
}

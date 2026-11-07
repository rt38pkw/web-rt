// components/warga/PopoverPengaturan.js
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useEffect, useRef } from 'react';

export default function PopoverPengaturan({ 
  show, onClose, warga, 
  onOpenUbahPin, 
  onLogout 
}) {
  const popoverRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      // Jika yang diklik bukan bagian dari popover DAN bukan tombol gigi
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        // Kita cek apakah yang diklik adalah tombol gigi (pemicu)
        const isGearButton = event.target.closest('#btn-pengaturan');
        if (!isGearButton) onClose();
      }
    }
    if (show) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [show, onClose]);

  if (!show || !warga) return null;

  const isPenyewa = warga.role_login === 'penyewa';
  const penghuniData = warga.penghuni_data;
  const statusPenghuni = penghuniData?.status_verifikasi;
  const punyaNik = !!penghuniData?.nik && penghuniData.nik !== '0';
  const punyaKK = !!penghuniData?.url_kk;
  const isProfileComplete = statusPenghuni === 'approved' && punyaNik && punyaKK;

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
      // KUNCI PERBAIKAN: Ubah 'absolute' menjadi 'fixed' dan beri z-index tinggi
      className="fixed right-4 top-[65px] z-[100] w-64 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-3 space-y-2 animate-in zoom-in-95 fade-in duration-200 origin-top-right"
    >
      {/* Info Warga Singkat */}
      <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 flex justify-between items-center">
        <div>
          <p className="text-[9px] text-slate-400">Nama</p>
          <p className="text-[11px] font-bold text-white truncate max-w-[100px]">{warga.nama_lengkap}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-slate-400">Rumah</p>
          <p className="text-[11px] font-bold text-white">{warga.no_rumah}</p>
        </div>
      </div>

      <div className="w-full h-px bg-slate-700/50 my-1"></div>

      {/* List Aksi */}
      <div className="space-y-1">
        {!isPenyewa && (
          <button
            onClick={() => {
              if (isProfileComplete) {
                onClose(); 
                onOpenUbahPin(); 
              }
            }}
            disabled={!isProfileComplete}
            className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between transition ${
              isProfileComplete ? 'hover:bg-slate-700' : 'opacity-60 cursor-not-allowed'
            }`}
          >
            <div>
              <div className={`text-xs font-bold ${isProfileComplete ? 'text-indigo-400' : 'text-slate-500'}`}>
                🔐 Ubah PIN
              </div>
              {!isProfileComplete && (
                <div className="text-[9px] text-slate-500 mt-0.5 leading-tight">Aktif setelah profil lengkap.</div>
              )}
            </div>
            <span className="text-slate-500">{isProfileComplete ? '→' : '🔒'}</span>
          </button>
        )}

        <button
          onClick={onLogout}
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

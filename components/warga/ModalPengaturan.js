// components/warga/ModalPengaturan.js
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export default function ModalPengaturan({ 
  show, onClose, warga, 
  onOpenUbahPin, 
  onLogout 
}) {
  if (!show || !warga) return null;

  const isPenyewa = warga.role_login === 'penyewa';
  const penghuniData = warga.penghuni_data;
  
  // Cek kelengkapan profil
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
    <div className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-slate-900 border-t border-slate-700 sm:border sm:border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom-10 sm:zoom-in-95">
        
        {/* Header Modal */}
        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white">⚙️ Pengaturan Akun</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">✕</button>
        </div>

        {/* Info Warga */}
        <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 flex justify-between items-center">
          <div>
            <p className="text-[10px] text-slate-400">Nama Akun</p>
            <p className="text-xs font-bold text-white">{warga.nama_lengkap}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400">No. Rumah</p>
            <p className="text-xs font-bold text-white">{warga.no_rumah}</p>
          </div>
        </div>

        {/* List Aksi */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          
          {/* Ubah PIN (Khusus Pemilik) */}
          {!isPenyewa && (
            <button
              onClick={() => {
                if (isProfileComplete) {
                  onClose(); // Tutup modal pengaturan
                  onOpenUbahPin(); // Buka modal PIN
                }
              }}
              disabled={!isProfileComplete}
              className={`w-full text-left p-3.5 flex items-center justify-between border-b border-slate-800 transition ${
                isProfileComplete ? 'hover:bg-slate-800/60' : 'opacity-60 cursor-not-allowed'
              }`}
            >
              <div>
                <div className={`text-xs font-bold ${isProfileComplete ? 'text-indigo-400' : 'text-slate-500'}`}>
                  🔐 Ubah PIN
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">
                  {isProfileComplete ? 'Ganti PIN keamanan Anda.' : 'Aktif setelah verifikasi profil.'}
                </div>
              </div>
              <span className="text-slate-500">{isProfileComplete ? '→' : '🔒'}</span>
            </button>
          )}

          {/* Logout */}
          <button
            onClick={onLogout}
            className="w-full text-left p-3.5 hover:bg-slate-800/60 transition flex items-center justify-between border-b border-slate-800"
          >
            <div>
              <div className="text-xs font-bold text-rose-400">🚪 Keluar Akun</div>
              <div className="text-[9px] text-slate-500 mt-0.5">Hapus sesi login di HP ini.</div>
            </div>
            <span className="text-slate-500">→</span>
          </button>

          {/* Tutup Aplikasi */}
          <button
            onClick={handleTutupAplikasi}
            className="w-full text-left p-3.5 hover:bg-slate-800/60 transition flex items-center justify-between"
          >
            <div>
              <div className="text-xs font-bold text-slate-300">✕ Tutup Aplikasi</div>
              <div className="text-[9px] text-slate-500 mt-0.5">Keluar dari aplikasi (sesi tetap ada).</div>
            </div>
            <span className="text-slate-500">→</span>
          </button>
        </div>

      </div>
    </div>
  );
}

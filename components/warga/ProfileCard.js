import { useState, useEffect } from 'react';

export default function ProfileCard({ warga, tarifBulanan, isUsaha, penyewaAktif }) {
  const [loginRole, setLoginRole] = useState('pemilik');

  useEffect(() => {
    const savedSession = localStorage.getItem('warga_session');
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      setLoginRole(parsed.role_login || 'pemilik');
    }
  }, []);

  if (!warga) return null;

  const isPenyewa = loginRole === 'penyewa';
  const isSewa = warga.status_huni === 'sewa';
  const isPemilikTidakDiketahui = warga.nama_lengkap === 'Belum Ada' || !warga.nama_lengkap;
  
  let namaTampil = warga.nama_lengkap || 'Belum Ada';
  let subNama = null;

  if (isPenyewa) {
    const namaPenyewa = penyewaAktif || 'Penyewa';
    if (isPemilikTidakDiketahui) {
      namaTampil = namaPenyewa;
      subNama = '(Penyewa)';
    } else {
      namaTampil = warga.nama_lengkap;
      subNama = ` / ${namaPenyewa} (Penyewa)`;
    }
  }

  let badgeText = '👑 Pemilik';
  let badgeClass = 'bg-blue-500/10 text-blue-400 border-blue-500/30';

  if (isPenyewa) {
    badgeText = '🔑 Penyewa';
    badgeClass = 'bg-orange-500/10 text-orange-400 border-orange-500/30';
  } else if (isSewa) {
    badgeText = '👑 Pemilik (Mode Pantau)';
  }

  return (
    <section className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`w-2 h-2 rounded-full animate-pulse ${isPenyewa ? 'bg-orange-500' : 'bg-blue-500'}`}></span>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              {isPenyewa ? 'Akun Penyewa' : 'Akun Pemilik'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {namaTampil}
            {subNama && <span className="text-sm font-normal text-orange-400">{subNama}</span>}
          </h2>
          {isPemilikTidakDiketahui && !isPenyewa && (
             <p className="text-xs text-slate-500 italic mt-1">*Nama pemilik belum didata</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <span className="text-slate-400">Rumah:</span>
            <strong className="text-white font-semibold">{warga.no_rumah}</strong>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <span className="text-slate-400">Tarif:</span>
            <strong className="text-blue-400 font-semibold">Rp {tarifBulanan?.toLocaleString('id-ID') || 0}/bln</strong>
          </div>
          {isUsaha && <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded-xl font-medium">Tempat Usaha</div>}
          <div className={`px-3 py-1.5 rounded-xl font-bold border ${badgeClass}`}>{badgeText}</div>
        </div>
      </div>
    </section>
  );
}

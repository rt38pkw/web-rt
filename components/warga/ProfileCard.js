// components/warga/ProfileCard.js
export default function ProfileCard({ warga, penghuniData, roleLogin, modeAkses, tarifBulanan, isUsaha }) {
  if (!warga) return null;

  const isPenyewa = roleLogin === 'penyewa';
  const isModePantau = modeAkses === 'pantau';

  let namaTampil = warga.nama_lengkap;
  let subNama = null;

  if (penghuniData) {
    if (isPenyewa) {
      namaTampil = warga.nama_lengkap;
      subNama = ` / ${penghuniData.nama_lengkap} (Penyewa)`;
    } else {
      namaTampil = penghuniData.nama_lengkap;
    }
  } else if (isPenyewa) {
    namaTampil = warga.nama_lengkap;
    subNama = ` / Penyewa`;
  }

  let badgeText = '👑 Pemilik';
  let badgeClass = 'bg-blue-500/10 text-blue-400 border-blue-500/30';

  if (isPenyewa) {
    badgeText = '🔑 Penyewa';
    badgeClass = 'bg-orange-500/10 text-orange-400 border-orange-500/30';
  } else if (isModePantau) {
    badgeText = '👑 Pemilik (Mode Pantau)';
  }

  return (
    <section className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3.5 shadow-xl relative overflow-hidden backdrop-blur-sm">
      <div className="flex justify-between items-start mb-2.5">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isPenyewa ? 'bg-orange-500' : 'bg-blue-500'}`}></span>
            <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">
              {isPenyewa ? 'Akun Penyewa' : 'Akun Pemilik'}
            </span>
          </div>
          
          <h2 className="text-base font-bold tracking-tight text-white line-clamp-1 leading-tight">
            {namaTampil}
            {subNama && <span className="text-[10px] font-normal text-orange-400">{subNama}</span>}
          </h2>
          {warga.nama_lengkap === 'Belum Ada' && !isPenyewa && (
             <p className="text-[9px] text-slate-500 italic mt-0.5">*Nama pemilik belum didata</p>
          )}
        </div>
      </div>

      <div className="flex gap-1.5 text-[9px] overflow-x-auto pb-0.5 scrollbar-none items-center">
        <div className="bg-slate-950/80 border border-slate-800 px-2 py-1 rounded-md flex items-center gap-1 shrink-0">
          <span className="text-slate-400">Rumah:</span>
          <strong className="text-white font-semibold">{warga.no_rumah}</strong>
        </div>
        
        <div className="bg-slate-950/80 border border-slate-800 px-2 py-1 rounded-md flex items-center gap-1 shrink-0">
          <span className="text-slate-400">Tarif:</span>
          <strong className="text-blue-400 font-semibold">
            Rp {tarifBulanan?.toLocaleString('id-ID') || 0}
          </strong>
        </div>

        {isUsaha && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2 py-1 rounded-md font-medium shrink-0">
            Usaha
          </div>
        )}
        
        <div className={`px-2 py-1 rounded-md font-bold border shrink-0 ${badgeClass}`}>
          {badgeText}
        </div>
      </div>
    </section>
  );
}

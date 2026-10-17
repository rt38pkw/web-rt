export default function ProfileCard({ warga, tarifBulanan, isUsaha }) {
  if (!warga) return null;

  return (
    <section className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Warga RT 38
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {warga.nama_lengkap}
          </h2>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <span className="text-slate-400">Rumah:</span>
            <strong className="text-white font-semibold">{warga.no_rumah}</strong>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <span className="text-slate-400">Tarif:</span>
            <strong className="text-blue-400 font-semibold">
              Rp {tarifBulanan.toLocaleString('id-ID')}/bln
            </strong>
          </div>
          {isUsaha && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded-xl font-medium">
              Tempat Usaha
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

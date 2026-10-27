// components/ronda/TabelJadwal.js
export default function TabelJadwal({ draftData, selectedPeriode, isPublished, onToggleLibur }) {
  const formatTanggal = (dateStr) => dateStr ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr)) : '-';

  if (draftData.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-10 text-center">
        <div className="text-5xl mb-3">📝</div>
        <h3 className="text-base font-bold text-white mb-1">Jadwal Belum Ada</h3>
        <p className="text-xs text-slate-400">Klik "Generate Draft" untuk membuat jadwal otomatis.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-3 border-r border-slate-800 text-center w-12">No</th>
              <th className="p-3 border-r border-slate-800 text-center">Hari</th>
              <th className="p-3 border-r border-slate-800 text-center">Tanggal</th>
              {Array.from({ length: selectedPeriode.jumlah_per_grup || 3 }).map((_, i) => (
                <th key={i} className="p-3 border-r border-slate-800">Petugas {i + 1}</th>
              ))}
              <th className="p-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {draftData.map((item, idx) => {
              const uniquePetugas = Array.from(new Map(item.petugas.map(p => [p.id, p])).values());
              return (
                <tr key={idx} className={`hover:bg-slate-800/40 ${item.is_libur ? 'opacity-50 grayscale bg-slate-900' : ''}`}>
                  <td className="p-3 border-r border-slate-800 text-center text-slate-500">{idx + 1}</td>
                  <td className="p-3 border-r border-slate-800 text-center font-semibold text-white">{item.hari}</td>
                  <td className="p-3 border-r border-slate-800 text-center text-slate-300">{formatTanggal(item.tanggal)}</td>
                  
                  {item.is_libur ? (
                    <td colSpan={selectedPeriode.jumlah_per_grup || 3} className="p-3 border-r border-slate-800 text-center text-rose-400 font-bold italic">LIBUR</td>
                  ) : (
                    <>
                      {uniquePetugas.map((p, pIdx) => (
                        <td key={pIdx} className="p-3 border-r border-slate-800">
                          <div className={`font-semibold ${item.has_conflict && p.hari_ronda_khusus ? 'text-rose-400' : 'text-slate-200'}`}>{p.nama_lengkap.split(' ')[0]}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{p.warga?.no_rumah || '-'}</div>
                        </td>
                      ))}
                      {Array.from({ length: (selectedPeriode.jumlah_per_grup || 3) - uniquePetugas.length }).map((_, emptyIdx) => (
                        <td key={`empty-${emptyIdx}`} className="p-3 border-r border-slate-800 text-slate-600">-</td>
                      ))}
                    </>
                  )}
                  <td className="p-3 text-center">
                    <button onClick={() => onToggleLibur(idx)} disabled={isPublished} className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold transition ${item.is_libur ? 'bg-emerald-600/20 text-emerald-400' : 'bg-rose-600/20 text-rose-400'}`}>
                      {item.is_libur ? 'Aktifkan' : 'Libur'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// components/sekretaris/data-warga/TabelPenghuni.js
export default function TabelPenghuni({ loading, listRumahPenghuni, openLihatKK, openTambahKK }) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-xs min-w-[800px]">
          <thead className="bg-slate-950 text-slate-400">
            <tr><th className="p-4">Nama / Rumah</th><th className="p-4">Peran</th><th className="p-4">Tipe</th><th className="p-4 text-right">Aksi</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? <tr><td colSpan="4" className="text-center py-8 text-slate-500">Memuat...</td></tr> : 
             listRumahPenghuni.length === 0 ? <tr><td colSpan="4" className="text-center py-8 text-slate-500">Data tidak ditemukan.</td></tr> :
             listRumahPenghuni.map((item, idx) => {
               const { warga, kepalaKeluarga, anggota } = item;
               const bisaTambahKK = warga.status_huni === 'sewa' && !kepalaKeluarga;

               return (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="p-4 align-top">
                    {kepalaKeluarga ? (
                      <>
                        <div className="font-bold text-white text-sm">{kepalaKeluarga.nama_lengkap}</div>
                        <div className="text-[11px] text-teal-400 font-mono mt-0.5">{warga.no_rumah}</div>
                        
                        {anggota.length > 0 && (
                          <div className="mt-3 pl-3 border-l-2 border-slate-700 space-y-1">
                            {anggota.map((a, i) => (
                              <div key={i} className="text-[11px] text-slate-300">
                                <span className="text-slate-500 mr-1">↳</span> 
                                {a.nama_lengkap} <span className="text-[9px] text-slate-500">({a.hubungan})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div>
                        <div className="text-slate-500 italic text-sm">
                          {warga.status_huni === 'sewa' ? 'Belum ada Penyewa' : 'Tidak ada data penghuni'}
                        </div>
                        <div className="text-[11px] text-teal-400 font-mono mt-0.5">{warga.no_rumah}</div>
                      </div>
                    )}
                  </td>
                  <td className="p-4 align-top">
                    {kepalaKeluarga ? <span className="text-slate-300">Kepala Keluarga</span> : <span className="text-slate-500">-</span>}
                  </td>
                  <td className="p-4 align-top">
                    {kepalaKeluarga ? (
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${kepalaKeluarga.tipe_penghuni === 'penyewa' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                        {kepalaKeluarga.tipe_penghuni === 'penyewa' ? '🔑 Penyewa' : '👑 Pemilik'}
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${warga.status_huni === 'sewa' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                        {warga.status_huni === 'sewa' ? 'Sewa (Kosong)' : warga.status_huni}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right align-top whitespace-nowrap">
                    {kepalaKeluarga ? (
                      <button onClick={() => openLihatKK(warga, kepalaKeluarga, anggota)} className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] transition flex items-center gap-1 ml-auto">
                        📄 Lihat Kartu Keluarga
                      </button>
                    ) : bisaTambahKK ? (
                      <button onClick={() => openTambahKK(warga)} className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] transition flex items-center gap-1 ml-auto">
                        + Tambah Kartu Keluarga
                      </button>
                    ) : null}
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

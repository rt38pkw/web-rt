// components/sekretaris/data-warga/TabelDataRumah.js
export default function TabelDataRumah({ 
  isSubmitting, handleTambahWarga, namaLengkap, setNamaLengkap, noRumah, setNoRumah, 
  statusHuni, setStatusHuni, kategori, setKategori, nik, setNik, noKk, setNoKk, 
  noWa, setNoWa, handleAngkaChange, search, setSearch, filteredWarga, openDetailRumah 
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 h-fit">
        <h2 className="text-base font-bold text-white">➕ Tambah Data Rumah</h2>
        <form onSubmit={handleTambahWarga} className="space-y-3">
          <input type="text" required placeholder="Nama Lengkap Pemilik *" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={namaLengkap} onChange={(e) => setNamaLengkap(e.target.value)} />
          <input type="text" required placeholder="No. Rumah (Cth: A1 - 06) *" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={noRumah} onChange={(e) => setNoRumah(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={statusHuni} onChange={(e) => setStatusHuni(e.target.value)}>
              <option value="pemilik">Dihuni Pemilik</option>
              <option value="sewa">Disewakan</option>
              <option value="kosong">Kosong</option>
            </select>
            <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={kategori} onChange={(e) => setKategori(e.target.value)}>
              <option value="Warga">Warga</option>
              <option value="Usaha">Usaha</option>
            </select>
          </div>
          <input type="text" inputMode="numeric" placeholder="NIK (16 digit)" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={nik} onChange={(e) => handleAngkaChange(e, setNik)} />
          <input type="text" inputMode="numeric" placeholder="No. KK (16 digit)" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={noKk} onChange={(e) => handleAngkaChange(e, setNoKk)} />
          <input type="text" placeholder="No. WhatsApp" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={noWa} onChange={(e) => setNoWa(e.target.value)} />
          <button type="submit" disabled={isSubmitting} className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2.5 rounded-xl text-xs transition">{isSubmitting ? 'Menyimpan...' : 'Simpan Data Rumah'}</button>
        </form>
      </div>

      <div className="lg:col-span-2 space-y-3">
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
          <input type="text" placeholder="Cari nama pemilik atau no. rumah..." className="w-full bg-transparent text-xs text-white focus:outline-none" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="bg-slate-950 text-slate-400"><tr><th className="p-4">Pemilik / Rumah</th><th className="p-4">Status</th><th className="p-4 text-right">Aksi</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {filteredWarga.map(w => (
                  <tr key={w.id} className="hover:bg-slate-800/40">
                    <td className="p-4"><div className="font-semibold text-white">{w.nama_lengkap}</div><div className="text-[10px] text-teal-400 font-mono">{w.no_rumah}</div></td>
                    <td className="p-4"><span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${w.status_huni === 'sewa' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>{w.status_huni}</span></td>
                    <td className="p-4 text-right">
                      <button onClick={() => openDetailRumah(w)} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-[10px] whitespace-nowrap transition flex items-center gap-1 ml-auto">
                        👁️ Lihat Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

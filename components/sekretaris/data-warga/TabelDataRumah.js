// components/sekretaris/data-warga/TabelDataRumah.js
import { useState, useEffect } from 'react';

export default function TabelDataRumah({ 
  isSubmitting, handleTambahWarga, namaLengkap, setNamaLengkap, noRumah, setNoRumah, 
  statusHuni, setStatusHuni, kategori, setKategori, nik, setNik, noKk, setNoKk, 
  noWa, setNoWa, handleAngkaChange, search, setSearch, filteredWarga, openDetailRumah 
}) {
  const [showForm, setShowForm] = useState(false);
  const [blokRumah, setBlokRumah] = useState('');
  const [nomorRumah, setNomorRumah] = useState('');

  // Sinkronisasi ke parent state saat blok atau nomor berubah
  useEffect(() => {
    if (blokRumah || nomorRumah) {
      let finalNomor = nomorRumah;
      if (finalNomor.length === 1) finalNomor = '0' + finalNomor;
      setNoRumah(`${blokRumah.trim().toUpperCase()} - ${finalNomor}`);
    } else {
      setNoRumah('');
    }
  }, [blokRumah, nomorRumah, setNoRumah]);

  // Hanya izinkan angka maksimal 2 digit
  const handleNomorChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(0, 2);
    setNomorRumah(val);
  };

  // Auto-padding saat user pindah dari kotak nomor
  const handleNomorBlur = () => {
    if (nomorRumah.length === 1) {
      setNomorRumah('0' + nomorRumah);
    }
  };

  // Auto-padding saat submit
  const onSubmit = (e) => {
    e.preventDefault();
    let finalNomor = nomorRumah;
    if (finalNomor.length === 1) finalNomor = '0' + finalNomor;
    
    if (!blokRumah.trim()) return alert('Blok rumah wajib diisi! (Cth: A1)');
    if (!finalNomor) return alert('Nomor rumah wajib diisi!');
    
    const combinedNoRumah = `${blokRumah.trim().toUpperCase()} - ${finalNomor}`;
    handleTambahWarga(e, combinedNoRumah);
    
    // Reset form
    setBlokRumah('');
    setNomorRumah('');
    setShowForm(false);
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      
      {/* HEADER & PENCARIAN */}
      <div className="flex gap-2">
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex-1">
          <input type="text" placeholder="Cari nama atau no. rumah..." className="w-full bg-transparent text-xs text-white focus:outline-none" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button 
          onClick={() => setShowForm(!showForm)} 
          className={`px-4 py-2 rounded-2xl text-xs font-semibold transition border ${
            showForm ? 'bg-rose-600/20 border-rose-500/30 text-rose-400' : 'bg-teal-600 hover:bg-teal-500 border-teal-500 text-white'
          }`}
        >
          {showForm ? '✕ Tutup Form' : '+ Tambah Data'}
        </button>
      </div>

      {/* FORM TAMBAH */}
      {showForm && (
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-3 animate-in slide-in-from-top-2">
          <h2 className="text-sm font-bold text-white mb-2">Tambah Data Rumah Baru</h2>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" required placeholder="Nama Lengkap Pemilik *" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={namaLengkap} onChange={(e) => setNamaLengkap(e.target.value)} />
              
              {/* INPUT TERPISAH */}
              <div className="flex gap-2 items-center">
                <input 
                  type="text" 
                  required 
                  placeholder="Blok (Cth: A1) *" 
                  className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white uppercase" 
                  value={blokRumah} 
                  onChange={(e) => setBlokRumah(e.target.value.toUpperCase())} 
                />
                <span className="text-slate-500 font-bold">-</span>
                <input 
                  type="text" 
                  required 
                  placeholder="No. (Cth: 06) *" 
                  className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" 
                  value={nomorRumah} 
                  onChange={handleNomorChange} 
                  onBlur={handleNomorBlur}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" inputMode="numeric" placeholder="NIK (16 digit)" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={nik} onChange={(e) => handleAngkaChange(e, setNik)} />
              <input type="text" inputMode="numeric" placeholder="No. KK (16 digit)" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={noKk} onChange={(e) => handleAngkaChange(e, setNoKk)} />
            </div>
            <input type="text" placeholder="No. WhatsApp" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={noWa} onChange={(e) => setNoWa(e.target.value)} />
            
            <button type="submit" disabled={isSubmitting} className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2.5 rounded-xl text-xs transition mt-2">
              {isSubmitting ? 'Menyimpan...' : 'Simpan Data Rumah'}
            </button>
          </form>
        </div>
      )}

      {/* TABEL DATA RUMAH */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[500px]">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="p-4">Pemilik / Rumah</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredWarga.length === 0 ? (
                <tr><td colSpan="3" className="p-8 text-center text-slate-500">Data rumah tidak ditemukan.</td></tr>
              ) : (
                filteredWarga.map(w => (
                  <tr key={w.id} className="hover:bg-slate-800/40">
                    <td className="p-4 align-top">
                      <div className="font-semibold text-white">{w.nama_lengkap}</div>
                      <div className="text-[10px] text-teal-400 font-mono">{w.no_rumah}</div>
                    </td>
                    <td className="p-4 align-top">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                        w.status_huni === 'sewa' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                        w.status_huni === 'kosong' ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>{w.status_huni}</span>
                    </td>
                    <td className="p-4 text-right align-top">
                      <button onClick={() => openDetailRumah(w)} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-[10px] whitespace-nowrap transition inline-flex items-center gap-1">
                        👁️ Lihat Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

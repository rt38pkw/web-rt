// components/ronda/TabelAturanKhusus.js
import { useState } from 'react';

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export default function TabelAturanKhusus({ wargaList, loading, search, setSearch, onUpdateAturan }) {
  const filteredWarga = wargaList.filter(w => 
    w.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) || 
    w.no_rumah?.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleHari = (penghuniId, currentHariStr, hariYangDiklik) => {
    let selectedHari = currentHariStr ? currentHariStr.split(',').map(s => s.trim()) : [];
    
    if (selectedHari.includes(hariYangDiklik)) {
      selectedHari = selectedHari.filter(h => h !== hariYangDiklik); 
    } else {
      selectedHari.push(hariYangDiklik); 
    }
    
    const newHariStr = selectedHari.length > 0 ? selectedHari.join(', ') : null;
    onUpdateAturan(penghuniId, 'hari_ronda_khusus', newHariStr);
  };

  return (
    <div className="space-y-3 animate-in fade-in">
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div>
          <h2 className="text-lg font-bold text-white">Aturan Khusus Ronda</h2>
          <p className="text-xs text-slate-400">Centang hari yang tersedia untuk warga tertentu. Jika kosong, warga bebas dijadwalkan hari apa saja (dengan aturan interval normal).</p>
        </div>
        <input 
          type="text" 
          placeholder="Cari nama atau no. rumah..." 
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
        />
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="p-4 border-b border-slate-800">Nama Kepala Keluarga</th>
                <th className="p-4 border-b border-slate-800 text-center">Ikut Ronda?</th>
                <th className="p-4 border-b border-slate-800 text-center">Hari Khusus (Pilih yang bisa)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr><td colSpan="3" className="text-center py-8 text-slate-500">Memuat...</td></tr>
              ) : filteredWarga.length === 0 ? (
                <tr><td colSpan="3" className="text-center py-8 text-slate-500">Data tidak ditemukan.</td></tr>
              ) : filteredWarga.map((w) => {
                const kk = w.kk_data;
                const activeHari = kk.hari_ronda_khusus 
                  ? kk.hari_ronda_khusus.split(',').map(s => s.trim()) 
                  : [];

                return (
                  <tr key={w.id} className="hover:bg-slate-800/40">
                    <td className="p-4">
                      <div className="font-bold text-white">{kk.nama_lengkap}</div>
                      <div className="text-[10px] text-teal-400 font-mono">{w.no_rumah}</div>
                    </td>
                    <td className="p-4 text-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={kk.ikut_ronda !== false} 
                          onChange={(e) => onUpdateAturan(kk.id, 'ikut_ronda', e.target.checked)} 
                        />
                        <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {HARI.map(hari => (
                          <button
                            key={hari}
                            onClick={() => handleToggleHari(kk.id, kk.hari_ronda_khusus, hari)}
                            disabled={kk.ikut_ronda === false}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition ${
                              activeHari.includes(hari) 
                                ? 'bg-indigo-600 text-white border-indigo-500' 
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                            } ${kk.ikut_ronda === false ? 'opacity-30 cursor-not-allowed' : ''}`}
                          >
                            {hari}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// components/keuangan/TabDeposit.js
import { useState, useRef, useEffect } from 'react';
import { formatRupiah, formatTanggal, tarifWarga } from '../../lib/keuangan/helpers';

export default function TabDeposit({
  warga = [],
  tarifList = [],
  depositList = [],
  getSaldoDepositWarga = () => 0,
  depWargaId,
  setDepWargaId,
  depTgl,
  setDepTgl,
  depJumlah,
  setDepJumlah,
  depKet,
  setDepKet,
  depSubmitting,
  handleSubmitDeposit,
  setModalPakaiDeposit,
  setModalAutoDistribute,
  setModalEditDeposit,
  handleHapusDeposit,
  handleUndoDistribusi,
}) {
  const wargaList = Array.isArray(warga) ? warga : [];
  const tarifListSafe = Array.isArray(tarifList) ? tarifList : [];
  const depositListSafe = Array.isArray(depositList) ? depositList : [];

  // ═══ STATE UNTUK SEARCHABLE DROPDOWN ═══
  const [searchWarga, setSearchWarga] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sinkronisasi teks input saat warga dipilih
  const wargaTerpilih = wargaList.find((w) => w.id === depWargaId);
  useEffect(() => {
    if (wargaTerpilih) {
      setSearchWarga(`${wargaTerpilih.no_rumah} - ${wargaTerpilih.nama_lengkap}`);
    } else {
      setSearchWarga('');
    }
  }, [depWargaId, wargaTerpilih]);

  const filteredWarga = wargaList.filter((w) => 
    `${w.no_rumah} ${w.nama_lengkap}`.toLowerCase().includes(searchWarga.toLowerCase())
  );

  // ═══ LOGIKA DATA ═══
  const wargaDenganSaldo = wargaList
    .map((w) => ({ ...w, saldo: getSaldoDepositWarga(w.id) || 0 }))
    .filter((w) => w.saldo !== 0)
    .sort((a, b) => b.saldo - a.saldo);

  const totalSaldo = wargaDenganSaldo.reduce((s, w) => s + w.saldo, 0);

  const cekSudahDipakai = (depositMasuk) => {
    const totalMasuk = depositListSafe
      .filter((x) => x.warga_id === depositMasuk.warga_id && x.tipe === 'masuk')
      .reduce((s, x) => s + Number(x.jumlah || 0), 0);
    const totalPakai = depositListSafe
      .filter((x) => x.warga_id === depositMasuk.warga_id && x.tipe === 'pakai')
      .reduce((s, x) => s + Number(x.jumlah || 0), 0);
    const sisaSaldo = totalMasuk - totalPakai;
    return Number(depositMasuk.jumlah) > sisaSaldo;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* ═══ FORM INPUT DEPOSIT ═══ */}
        <form onSubmit={handleSubmitDeposit} className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 h-fit">
          <h3 className="text-sm font-bold text-white">💎 Input Deposit Masuk</h3>
          <p className="text-[10px] text-slate-500">Catat setoran deposit warga untuk iuran tahun depan.</p>

          {/* SEARCHABLE DROPDOWN WARGA */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Cari Warga (No. Rumah / Nama)</label>
            <input
              type="text"
              placeholder="Ketik no rumah atau nama..."
              value={searchWarga}
              onChange={(e) => {
                setSearchWarga(e.target.value);
                setIsDropdownOpen(true);
                if (e.target.value === '') setDepWargaId('');
              }}
              onFocus={() => setIsDropdownOpen(true)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition"
            />
            {isDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                {filteredWarga.length === 0 ? (
                  <div className="p-3 text-xs text-slate-400 text-center">Warga tidak ditemukan</div>
                ) : (
                  filteredWarga.map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      onClick={() => {
                        setDepWargaId(x.id);
                        setSearchWarga(`${x.no_rumah} - ${x.nama_lengkap}`);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 text-xs border-b border-slate-700/50 last:border-0 hover:bg-slate-700 transition ${
                        depWargaId === x.id ? 'bg-purple-600/20 text-purple-300 font-semibold' : 'text-slate-200'
                      }`}
                    >
                      <div className="font-semibold">{x.no_rumah} - {x.nama_lengkap}</div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Tanggal</label>
            <input type="date" value={depTgl} onChange={(e) => setDepTgl(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Jumlah (Rp)</label>
            <input type="number" value={depJumlah} onChange={(e) => setDepJumlah(e.target.value)} required placeholder="0" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Keterangan</label>
            <textarea value={depKet} onChange={(e) => setDepKet(e.target.value)} rows={2} placeholder="Opsional" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none" />
          </div>

          <button type="submit" disabled={depSubmitting} className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold py-2.5 rounded-xl">
            {depSubmitting ? 'Menyimpan...' : 'Simpan Deposit'}
          </button>
        </form>

        {/* ═══ TABEL SALDO DEPOSIT (Tetap Tabel, Font Dikecilkan) ═══ */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-sm font-bold text-white">💎 Saldo Deposit Warga</h3>
            <span className="text-xs text-purple-400 font-bold">Total: {formatRupiah(totalSaldo)}</span>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="p-3">Rumah</th>
                  <th className="p-3">Nama</th>
                  <th className="p-3 text-right">Saldo</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {wargaDenganSaldo.length === 0 ? (
                  <tr><td colSpan="4" className="p-6 text-center text-slate-500">Belum ada deposit.</td></tr>
                ) : (
                  wargaDenganSaldo.map((w) => {
                    const tarif = tarifWarga(w, tarifListSafe, 2026);
                    return (
                      <tr key={w.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono text-white">{w.no_rumah}</td>
                        <td className="p-3 text-slate-300 text-[10px] truncate max-w-[100px]">{w.nama_lengkap}</td>
                        <td className="p-3 text-right font-mono text-purple-400 font-bold">{formatRupiah(w.saldo)}</td>
                        <td className="p-3 text-right">
                          {w.saldo >= tarif && tarif > 0 ? (
                            <div className="flex flex-col sm:flex-row gap-1 justify-end">
                              <button onClick={() => setModalAutoDistribute({ wargaId: w.id })} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-semibold px-2 py-1 rounded whitespace-nowrap">⚡ Auto</button>
                              <button onClick={() => setModalPakaiDeposit({ wargaId: w.id })} className="bg-purple-600 hover:bg-purple-500 text-white text-[9px] font-semibold px-2 py-1 rounded whitespace-nowrap">Manual</button>
                            </div>
                          ) : (
                            <span className="text-[9px] text-slate-600">Kurang</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ═══ RIWAYAT MUTASI (Desain Kartu Compact) ═══ */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white">📜 Riwayat Mutasi Deposit</h3>
        </div>
        
        <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto">
          {depositListSafe.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">Belum ada mutasi.</div>
          ) : (
            depositListSafe.map((d) => {
              const w = wargaList.find((x) => x.id === d.warga_id);
              const sudahDipakai = d.tipe === 'masuk' ? cekSudahDipakai(d) : false;
              const isMasuk = d.tipe === 'masuk';

              return (
                <div key={d.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                  
                  {/* Baris 1: Tanggal & Tipe */}
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400">{formatTanggal(d.tanggal)}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded border font-bold ${
                      isMasuk ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {isMasuk ? '↓ Masuk' : '↑ Pakai'}
                    </span>
                  </div>

                  {/* Baris 2: Nama & Nominal */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{w?.nama_lengkap || '-'}</div>
                      <div className="text-[10px] text-slate-500">{w?.no_rumah}</div>
                      {d.keterangan && <div className="text-[9px] text-slate-500 mt-0.5 truncate">{d.keterangan}</div>}
                    </div>
                    <div className={`text-sm font-bold font-mono whitespace-nowrap ${isMasuk ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isMasuk ? '+' : '-'} {formatRupiah(d.jumlah)}
                    </div>
                  </div>

                  {/* Baris 3: Tombol Aksi (Hanya jika perlu) */}
                  {(isMasuk && (!sudahDipakai || d.tipe === 'pakai')) && (
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/50 mt-1">
                      {isMasuk && !sudahDipakai && (
                        <>
                          <button onClick={() => setModalEditDeposit(d)} className="text-[10px] text-blue-400 font-semibold hover:text-blue-300">✏️ Edit</button>
                          <button onClick={() => handleHapusDeposit(d)} className="text-[10px] text-rose-400 font-semibold hover:text-rose-300">🗑️ Hapus</button>
                        </>
                      )}
                      {isMasuk && sudahDipakai && (
                        <span className="text-[10px] text-slate-500">🔒 Terkunci (Sudah dipakai)</span>
                      )}
                      {!isMasuk && (
                        <button onClick={() => handleUndoDistribusi(d)} className="text-[10px] text-amber-400 font-semibold hover:text-amber-300">↩️ Undo Pemakaian</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

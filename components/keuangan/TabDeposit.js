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
        <form onSubmit={handleSubmitDeposit} className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 h-fit">
          <h3 className="text-sm font-bold text-white">💎 Input Deposit Masuk</h3>
          <p className="text-[10px] text-slate-500">Catat setoran deposit warga untuk iuran tahun depan.</p>

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Warga</label>
            <select value={depWargaId} onChange={(e) => setDepWargaId(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
              <option value="">-- Pilih Warga --</option>
              {wargaList.map((x) => (
                <option key={x.id} value={x.id}>{x.no_rumah} - {x.nama_lengkap}</option>
              ))}
            </select>
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

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-sm font-bold text-white">💎 Saldo Deposit Warga</h3>
            <span className="text-xs text-purple-400 font-bold">Total: {formatRupiah(totalSaldo)}</span>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="p-3">No. Rumah</th>
                  <th className="p-3">Nama</th>
                  <th className="p-3 text-right">Saldo</th>
                  <th className="p-3">Estimasi</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {wargaDenganSaldo.length === 0 ? (
                  <tr><td colSpan="5" className="p-6 text-center text-slate-500">Belum ada deposit.</td></tr>
                ) : (
                  wargaDenganSaldo.map((w) => {
                    const tarif = tarifWarga(w, tarifListSafe, 2026);
                    const estimasiBulan = tarif > 0 ? Math.floor(w.saldo / tarif) : 0;
                    return (
                      <tr key={w.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono text-white">{w.no_rumah}</td>
                        <td className="p-3 text-slate-300">{w.nama_lengkap}</td>
                        <td className="p-3 text-right font-mono text-purple-400 font-bold">{formatRupiah(w.saldo)}</td>
                        <td className="p-3 text-[10px] text-slate-500">±{estimasiBulan} bulan @ {formatRupiah(tarif)}</td>
                        <td className="p-3 text-right">
                          {w.saldo >= tarif && tarif > 0 ? (
                            <div className="flex flex-col sm:flex-row gap-1 justify-end">
                              <button onClick={() => setModalAutoDistribute({ wargaId: w.id })} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap">⚡ Auto</button>
                              <button onClick={() => setModalPakaiDeposit({ wargaId: w.id })} className="bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap">Manual</button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-600">Saldo kurang</span>
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

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white">📜 Riwayat Mutasi Deposit</h3>
          <p className="text-[10px] text-slate-500 mt-1">✏️ Edit · 🗑️ Hapus · ↩️ Undo · 🔒 Terkunci</p>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
              <tr>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Warga</th>
                <th className="p-3">Tipe</th>
                <th className="p-3">Keterangan</th>
                <th className="p-3 text-right">Jumlah</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {depositListSafe.length === 0 ? (
                <tr><td colSpan="6" className="p-6 text-center text-slate-500">Belum ada mutasi.</td></tr>
              ) : (
                depositListSafe.map((d) => {
                  const w = wargaList.find((x) => x.id === d.warga_id);
                  const sudahDipakai = d.tipe === 'masuk' ? cekSudahDipakai(d) : false;

                  return (
                    <tr key={d.id} className="hover:bg-slate-800/40">
                      <td className="p-3 text-slate-400 whitespace-nowrap">{formatTanggal(d.tanggal)}</td>
                      <td className="p-3 text-slate-300">{w?.no_rumah} - {w?.nama_lengkap}</td>
                      <td className="p-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${d.tipe === 'masuk' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                          {d.tipe === 'masuk' ? '↓ Masuk' : '↑ Pakai'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 text-[10px]">{d.keterangan || '-'}</td>
                      <td className={`p-3 text-right font-mono font-semibold ${d.tipe === 'masuk' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {d.tipe === 'masuk' ? '+' : '-'} {formatRupiah(d.jumlah)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex gap-1 justify-end items-center">
                          {d.tipe === 'masuk' && !sudahDipakai && (
                            <>
                              <button onClick={() => setModalEditDeposit(d)} title="Edit" className="text-blue-400 hover:text-blue-300 text-[10px] font-semibold px-1">✏️</button>
                              <button onClick={() => handleHapusDeposit(d)} title="Hapus" className="text-rose-400 hover:text-rose-300 text-[10px] font-semibold px-1">🗑️</button>
                            </>
                          )}
                          {d.tipe === 'masuk' && sudahDipakai && (
                            <span title="Sudah dipakai" className="text-slate-500 text-[10px] px-1">🔒</span>
                          )}
                          {d.tipe === 'pakai' && (
                            <button onClick={() => handleUndoDistribusi(d)} title="Undo" className="text-amber-400 hover:text-amber-300 text-[10px] font-semibold px-1">↩️ Undo</button>
                          )}
                        </div>
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
  );
}

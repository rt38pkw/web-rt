import { formatRupiah, formatTanggal, tarifWarga } from '../../lib/keuangan/helpers';

export default function TabTunai({
  warga = [],
  tarifList = [],
  tunaiWargaId,
  setTunaiWargaId,
  tunaiBulan,
  setTunaiBulan,
  tunaiTanggal,
  setTunaiTanggal,
  tunaiCatatan,
  setTunaiCatatan,
  bulanBelumLunas,
  totalTunai,
  tunaiSubmitting,
  handleSubmitTunai,
  // Riwayat tunai (grup per batch)
  riwayatTunai = [],
  handleEditTunai,
  handleHapusTunai,
}) {
  const wargaList = Array.isArray(warga) ? warga : [];
  const w = wargaList.find((x) => x.id === tunaiWargaId);
  const tarifTerpilih = w ? tarifWarga(w, tarifList, 2026) : 0;
  const tarifBelumDiset = w && tarifTerpilih === 0;

  const bisaSimpan =
    !tunaiSubmitting && tunaiWargaId && tunaiBulan.length > 0 && !tarifBelumDiset;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Form Input */}
        <form
          onSubmit={handleSubmitTunai}
          className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 h-fit"
        >
          <h3 className="text-sm font-bold text-white">💵 Input Iuran Tunai</h3>
          <p className="text-[10px] text-slate-500">Catat pembayaran tunai warga untuk iuran 2026.</p>

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Warga</label>
            <select
              value={tunaiWargaId}
              onChange={(e) => {
                setTunaiWargaId(e.target.value);
                setTunaiBulan([]);
              }}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="">-- Pilih Warga --</option>
              {wargaList.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.no_rumah} - {x.nama_lengkap}
                </option>
              ))}
            </select>
          </div>

          {w && (
            <>
              {tarifBelumDiset ? (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 space-y-1">
                  <p className="text-[11px] text-rose-400 font-semibold">
                    ⚠️ Tarif 2026 belum ditetapkan
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Set dulu di tab <strong className="text-rose-300">💰 Tarif</strong>.
                  </p>
                </div>
              ) : (
                <div className="text-[10px] text-slate-400">
                  Tarif: <strong className="text-blue-400">{formatRupiah(tarifTerpilih)}/bln</strong>
                </div>
              )}
            </>
          )}

          {w && !tarifBelumDiset && (
            <div>
              <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-2">
                Bulan <span className="text-slate-500">(hanya belum lunas)</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {bulanBelumLunas.length === 0 ? (
                  <div className="col-span-2 text-[10px] text-emerald-400 text-center py-3">
                    Semua bulan sudah lunas ✓
                  </div>
                ) : (
                  bulanBelumLunas.map((b) => (
                    <label
                      key={b.kode}
                      className="flex items-center gap-1.5 text-[11px] cursor-pointer bg-slate-950/60 rounded-lg p-2 hover:bg-slate-800/40"
                    >
                      <input
                        type="checkbox"
                        checked={tunaiBulan.includes(b.kode)}
                        onChange={() =>
                          setTunaiBulan((prev) =>
                            prev.includes(b.kode)
                              ? prev.filter((x) => x !== b.kode)
                              : [...prev, b.kode]
                          )
                        }
                        className="accent-blue-500"
                      />
                      <span>{b.nama}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
              Tanggal Bayar
            </label>
            <input
              type="date"
              value={tunaiTanggal}
              onChange={(e) => setTunaiTanggal(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
              Catatan <span className="text-slate-500">(opsional)</span>
            </label>
            <textarea
              value={tunaiCatatan}
              onChange={(e) => setTunaiCatatan(e.target.value)}
              rows={2}
              placeholder="Contoh: diterima langsung dari istri"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none"
            />
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-800">
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Total</div>
              <div className="text-lg font-black text-white">{formatRupiah(totalTunai)}</div>
            </div>
            <button
              type="submit"
              disabled={!bisaSimpan}
              className={`text-xs font-semibold px-4 py-2.5 rounded-xl transition ${
                bisaSimpan
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {tunaiSubmitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>

        {/* Riwayat Tunai */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-sm font-bold text-white">📋 Riwayat Iuran Tunai ({riwayatTunai.length})</h3>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Warga</th>
                  <th className="p-3">Bulan</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {riwayatTunai.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-6 text-center text-slate-500">
                      Belum ada iuran tunai.
                    </td>
                  </tr>
                ) : (
                  riwayatTunai.map((batch) => {
                    const w = wargaList.find((x) => x.id === batch.items[0]?.warga_id);
                    const total = batch.items.reduce((s, i) => s + Number(i.jumlah || 0), 0);
                    const bulanList = batch.items
                      .map((i) => i.bulan_tahun.replace('2026-', ''))
                      .sort()
                      .join(', ');
                    return (
                      <tr key={batch.batchId} className="hover:bg-slate-800/40">
                        <td className="p-3 text-slate-400 whitespace-nowrap">
                          {formatTanggal(batch.items[0]?.tanggal_transaksi)}
                        </td>
                        <td className="p-3 text-slate-300">
                          {w?.no_rumah} - {w?.nama_lengkap}
                        </td>
                        <td className="p-3 text-[10px] text-slate-400 max-w-[200px]">
                          {bulanList}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-400 font-semibold">
                          {formatRupiah(total)}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => handleEditTunai(batch)}
                              title="Edit"
                              className="text-blue-400 hover:text-blue-300 text-[10px] font-semibold px-1"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleHapusTunai(batch)}
                              title="Hapus"
                              className="text-rose-400 hover:text-rose-300 text-[10px] font-semibold px-1"
                            >
                              🗑️
                            </button>
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
    </div>
  );
}

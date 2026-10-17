import { formatRupiah, formatTanggal } from '../../lib/keuangan/helpers';
import { getInfoTagihan, distribusikanTunai } from '../../lib/keuangan/tunai';

export default function TabTunai({
  warga = [],
  iuran = [],
  bulanList = [],
  tunaiWargaId,
  setTunaiWargaId,
  tunaiNominal,
  setTunaiNominal,
  tunaiTanggal,
  setTunaiTanggal,
  tunaiCatatan,
  setTunaiCatatan,
  tunaiSubmitting,
  handleSubmitTunai,
  riwayatTunai = [],
  handleEditTunai,
  handleHapusTunai
}) {
  const wargaList = Array.isArray(warga) ? warga : [];
  const w = wargaList.find((x) => x.id === tunaiWargaId);
  const tarif = w ? (w.kategori === 'Usaha' ? 30000 : 15000) : 0;
  const iuranWarga = iuran.filter((i) => i.warga_id === tunaiWargaId);

  // LOGIKA INFO TAGIHAN & PREVIEW
  const { list: infoTagihan, totalTagihan: totalTagihanFull } = w
    ? getInfoTagihan(bulanList, iuranWarga, tarif)
    : { list: [], totalTagihan: 0 };

  const nominalNum = Number(tunaiNominal) || 0;
  
  const { hasil: previewDistribusi, totalPakai, sisaUang } = w && nominalNum > 0
    ? distribusikanTunai(nominalNum, bulanList, iuranWarga, tarif)
    : { hasil: [], totalPakai: 0, sisaUang: 0 };

  const bisaSimpan = !tunaiSubmitting && tunaiWargaId && nominalNum > 0;

  // ═══ FILTER TOTAL TAGIHAN SAMPAI BULAN INI ═══
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12

  const totalTagihanSampaiSekarang = infoTagihan
    .filter((b) => {
      const [tahun, bulan] = b.kode.split('-').map(Number);
      if (tahun < currentYear) return true; // Tahun lalu pasti tunggakan
      if (tahun > currentYear) return false; // Tahun depan belum jadi tunggakan
      return bulan <= currentMonth; // Tahun ini, potong sampai bulan berjalan
    })
    .reduce((sum, b) => sum + (b.kekurangan || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* FORM INPUT KIRI */}
        <form
          onSubmit={handleSubmitTunai}
          className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 h-fit"
        >
          <h3 className="text-sm font-bold text-white">💵 Input Iuran Tunai</h3>
          <p className="text-[10px] text-slate-500">
            Input nominal yang diterima. Sistem otomatis distribusi ke bulan-bulan.
          </p>
          
          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Warga</label>
            <select
              value={tunaiWargaId}
              onChange={(e) => setTunaiWargaId(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="">-- Pilih Warga --</option>
              {wargaList.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.no_rumah} - {x.nama_lengkap} ({x.kategori || 'Rumah'})
                </option>
              ))}
            </select>
          </div>

          {w && (
            <div className="text-[10px] text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800">
              Tarif: <strong className="text-blue-400">{formatRupiah(tarif)}/bln</strong>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
              Nominal Diterima (Rp)
            </label>
            <input
              type="number"
              value={tunaiNominal}
              onChange={(e) => setTunaiNominal(e.target.value)}
              required
              placeholder="Contoh: 20000"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
            />
            <p className="text-[9px] text-slate-500 mt-1">
              Nominal bebas — bisa kurang/lebih dari total tagihan
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
              Tanggal Bayar
            </label>
            <input
              type="date"
              value={tunaiTanggal}
              onChange={(e) => setTunaiTanggal(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
              Catatan (opsional)
            </label>
            <textarea
              value={tunaiCatatan}
              onChange={(e) => setTunaiCatatan(e.target.value)}
              rows={2}
              placeholder="Contoh: diterima langsung dari istri"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none"
            />
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-800 mt-2">
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Total Tagihan<br/><span className="text-[8px]">(Sampai bulan ini)</span></div>
              {/* MENAMPILKAN TAGIHAN SAMPAI BULAN INI SAJA */}
              <div className="text-sm font-bold text-amber-400">{formatRupiah(totalTagihanSampaiSekarang)}</div>
            </div>
            <button
              type="submit"
              disabled={!bisaSimpan}
              className={`text-xs font-semibold px-6 py-2.5 rounded-xl transition ${
                bisaSimpan
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {tunaiSubmitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>

        {/* PANEL KANAN: INFO TAGIHAN & PREVIEW DISTRIBUSI */}
        <div className="lg:col-span-2 space-y-4">
          {w ? (
            <>
              {/* Info Tagihan */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-3 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-white">📊 Info Tagihan</h3>
                  <span className="text-[10px] text-amber-400 font-bold">
                    Total Tunggakan: {formatRupiah(totalTagihanSampaiSekarang)}
                  </span>
                </div>
                <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <tbody className="divide-y divide-slate-800/60">
                      {infoTagihan.map((b) => (
                        <tr key={b.kode}>
                          <td className="p-2 text-slate-300">{b.nama}</td>
                          <td className="p-2 text-right">
                            {b.status === 'lunas' && (
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                                ✓ Lunas
                              </span>
                            )}
                            {b.status === 'kurang' && (
                              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
                                🟡 Kurang {formatRupiah(b.kekurangan)}
                              </span>
                            )}
                            {b.status === 'belum' && (
                              <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded">
                                ⚫ Belum
                              </span>
                            )}
                            {b.status === 'pending' && (
                              <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded">
                                ⏳ Pending
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-right font-mono text-slate-400 text-[10px]">
                            {b.kekurangan > 0 ? formatRupiah(b.kekurangan) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Preview Distribusi */}
              {nominalNum > 0 && (
                <div className="bg-slate-900 border border-blue-500/30 rounded-2xl overflow-hidden">
                  <div className="p-3 border-b border-slate-800">
                    <h3 className="text-xs font-bold text-white">🔄 Preview Distribusi</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Sistem otomatis alokasikan uang ke bulan paling awal
                    </p>
                  </div>
                  <div className="overflow-x-auto max-h-[240px] overflow-y-auto">
                    {previewDistribusi.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        Semua bulan sudah lunas. Kelebihan: {formatRupiah(nominalNum)}
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <tbody className="divide-y divide-slate-800/60">
                          {previewDistribusi.map((h, i) => (
                            <tr key={i}>
                              <td className="p-2 text-slate-300">{h.namaBulan}</td>
                              <td className="p-2 text-right">
                                {h.tipe === 'lunas' ? (
                                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                                    ✓ Lunas
                                  </span>
                                ) : (
                                  <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
                                    🟡 Kurang {formatRupiah(h.sisaKurang)}
                                  </span>
                                )}
                              </td>
                              <td className="p-2 text-right font-mono text-white text-[10px]">
                                {formatRupiah(h.nominal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  <div className="p-3 border-t border-slate-800 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Total Dialokasikan:</span>
                      <strong className="text-white">{formatRupiah(totalPakai)}</strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Sisa Uang:</span>
                      <strong className={sisaUang > 0 ? 'text-amber-400' : 'text-slate-400'}>
                        {formatRupiah(sisaUang)}
                      </strong>
                    </div>
                    {sisaUang > 0 && (
                      <div className="text-[10px] text-amber-400 pt-1 border-t border-slate-800">
                        💡 Sisa {formatRupiah(sisaUang)} akan disimpan sebagai deposit warga
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center h-full flex flex-col justify-center items-center">
              <div className="text-3xl mb-2">💡</div>
              <p className="text-xs text-slate-400">Pilih warga dulu untuk melihat info tagihan</p>
            </div>
          )}
        </div>
      </div>

      {/* TABEL RIWAYAT TUNAI */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white">📋 Riwayat Iuran Tunai ({riwayatTunai.length})</h3>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
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
                    Belum ada riwayat iuran tunai.
                  </td>
                </tr>
              ) : (
                riwayatTunai.map((batch) => {
                  const wBatch = wargaList.find((x) => x.id === batch.items[0]?.warga_id);
                  const totalIuran = batch.items.reduce((s, i) => s + Number(i.jumlah || 0), 0);
                  const bulanStr = batch.items
                    .map((i) => i.bulan_tahun.replace('2026-', ''))
                    .sort()
                    .join(', ');

                  return (
                    <tr key={batch.batchId} className="hover:bg-slate-800/40">
                      <td className="p-3 text-slate-400 whitespace-nowrap">
                        {formatTanggal(batch.items[0]?.tanggal_transaksi)}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-white">{wBatch?.nama_lengkap || '-'}</div>
                        <div className="text-[10px] text-slate-500">{wBatch?.no_rumah}</div>
                      </td>
                      <td className="p-3 text-[10px] text-slate-400 max-w-[200px]">
                        {bulanStr}
                      </td>
                      <td className="p-3 text-right">
                        <div className="font-mono text-emerald-400 font-semibold">
                          {formatRupiah(totalIuran)}
                        </div>
                        {batch.totalDeposit > 0 && (
                          <div className="text-[10px] text-purple-400 mt-0.5 font-semibold">
                            + Deposit: {formatRupiah(batch.totalDeposit)}
                          </div>
                        )}
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
  );
}

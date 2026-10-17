import { formatRupiah } from '../../lib/keuangan/helpers';

export default function TabTunai({
  warga = [], tarifList = [], iuran = [],
  tunaiWargaId, setTunaiWargaId,
  tunaiNominal, setTunaiNominal,
  tunaiTanggal, setTunaiTanggal,
  tunaiCatatan, setTunaiCatatan,
  tunaiSubmitting, handleSubmitTunai,
  riwayatTunai = [], handleEditTunai, handleHapusTunai,
  bulanList = []
}) {
  const selectedWarga = warga.find(w => w.id === tunaiWargaId);

  const iuranWargaTerpilih = iuran.filter(i => i.warga_id === tunaiWargaId && i.status === 'approved');
  const tarifBulanan = selectedWarga?.kategori === 'Usaha' ? 30000 : 15000;

  // Kelompokkan bulan berdasarkan tahun (2026, 2027, 2028)
  const groupedByYear = bulanList.reduce((acc, curr) => {
    const tahun = curr.kode.split('-')[0];
    if (!acc[tahun]) acc[tahun] = [];
    acc[tahun].push(curr);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* FORM INPUT KIRI */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 h-fit">
          <h3 className="text-sm font-bold text-white">💵 Input Iuran Tunai</h3>
          <p className="text-[10px] text-slate-500">Input nominal yang diterima. Sistem otomatis distribusi ke bulan-bulan.</p>

          <form onSubmit={handleSubmitTunai} className="space-y-3 mt-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Warga</label>
              <select value={tunaiWargaId} onChange={(e) => setTunaiWargaId(e.target.value)} required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                <option value="">-- Pilih Warga --</option>
                {warga.map(w => (
                  <option key={w.id} value={w.id}>{w.no_rumah} - {w.nama_lengkap} ({w.kategori || 'Rumah'})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Nominal Diterima (Rp)</label>
              <input type="number" value={tunaiNominal} onChange={(e) => setTunaiNominal(e.target.value)} required placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono" />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Tanggal</label>
              <input type="date" value={tunaiTanggal} onChange={(e) => setTunaiTanggal(e.target.value)} required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Catatan</label>
              <textarea value={tunaiCatatan} onChange={(e) => setTunaiCatatan(e.target.value)} rows={2} placeholder="Opsional"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none" />
            </div>

            <button type="submit" disabled={tunaiSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-semibold py-2.5 rounded-xl mt-2">
              {tunaiSubmitting ? 'Menyimpan...' : 'Simpan Iuran Tunai'}
            </button>
          </form>
        </div>

        {/* PANEL KANAN: RINCIAN BULAN */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 min-h-[300px] flex flex-col">
          {!selectedWarga ? (
            <div className="m-auto text-center space-y-2">
              <div className="text-3xl">💡</div>
              <div className="text-xs text-slate-400">Pilih warga dulu untuk melihat info tagihan</div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="text-center border-b border-slate-800 pb-3 mb-3 shrink-0">
                <div className="text-sm font-bold text-white">{selectedWarga.nama_lengkap}</div>
                <div className="text-xs text-slate-400">Kategori: {selectedWarga.kategori || 'Biasa'} (Tarif: {formatRupiah(tarifBulanan)}/bulan)</div>
              </div>
              
              {/* Grid Bulan per Tahun */}
              <div className="overflow-y-auto max-h-[400px] pr-2 space-y-4">
                {Object.entries(groupedByYear).map(([tahun, bulanTahunIni]) => (
                  <div key={tahun}>
                    <h4 className="text-xs font-bold text-slate-300 mb-2 sticky top-0 bg-slate-900 py-1">Tahun {tahun}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {bulanTahunIni.map((bulan) => {
                        const bayar = iuranWargaTerpilih.find(i => i.bulan_tahun === bulan.kode);
                        const isLunas = !!bayar;

                        return (
                          <div key={bulan.kode} 
                            className={`p-2 rounded-xl border text-center flex flex-col items-center justify-center gap-1 ${
                              isLunas ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                      : 'bg-slate-950 border-slate-800 text-slate-500'
                            }`}>
                            <span className="text-[11px] font-bold">{bulan.nama}</span>
                            <span className="text-[9px]">{isLunas ? '✓ Lunas' : 'Belum'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TABEL RIWAYAT */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white">📋 Riwayat Iuran Tunai ({riwayatTunai.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
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
                <tr><td colSpan="5" className="p-6 text-center text-slate-500">Belum ada riwayat iuran tunai.</td></tr>
              ) : (
                riwayatTunai.map((batch) => {
                  const w = warga.find(x => x.id === batch.items[0]?.warga_id);
                  const totalIuran = batch.items.reduce((s, i) => s + Number(i.jumlah || 0), 0);
                  
                  const bulanStr = batch.items.map(i => {
                    const bln = bulanList.find(b => b.kode === i.bulan_tahun);
                    return bln ? bln.nama : i.bulan_tahun;
                  }).join(', ');

                  return (
                    <tr key={batch.batchId} className="hover:bg-slate-800/40">
                      <td className="p-3 text-slate-400 whitespace-nowrap text-[10px]">
                        {new Date(batch.items[0]?.tanggal_transaksi).toLocaleDateString('id-ID')}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-white">{w?.nama_lengkap || '-'}</div>
                        <div className="text-[10px] text-slate-500">{w?.no_rumah}</div>
                      </td>
                      <td className="p-3 text-slate-300 text-[11px]">{bulanStr}</td>
                      <td className="p-3 text-right">
                        <div className="font-mono font-bold text-emerald-400">{formatRupiah(totalIuran)}</div>
                        {batch.totalDeposit > 0 && (
                          <div className="text-[10px] text-purple-400 mt-0.5 font-semibold">+ Deposit: {formatRupiah(batch.totalDeposit)}</div>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => handleEditTunai(batch)} className="text-blue-400 hover:text-blue-300 text-[10px] font-semibold px-1">✏️</button>
                          <button onClick={() => handleHapusTunai(batch)} className="text-rose-400 hover:text-rose-300 text-[10px] font-semibold px-1">🗑️</button>
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

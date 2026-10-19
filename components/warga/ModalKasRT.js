import { formatRupiah, formatTanggal } from '../../lib/keuangan/helpers';

export default function ModalKasRT({
  show,
  onClose,
  iuranList = [], // Ini nanti akan diisi dengan SEMUA iuran warga
  pemasukanLainList = [],
  pengeluaranList = [],
}) {
  if (!show) return null;

  // 1. Hitung Total Iuran GLOBAL (hanya yang approved & bukan metode deposit)
  const totalIuran = iuranList
    .filter((i) => i.status === 'approved' && i.metode !== 'deposit')
    .reduce((s, i) => s + Number(i.jumlah || 0), 0);

  // 2. Hitung Total Pemasukan Lain
  const totalPemasukanLain = pemasukanLainList.reduce((s, p) => s + Number(p.nominal || 0), 0);

  // 3. Hitung Total Pengeluaran
  const totalPengeluaran = pengeluaranList.reduce((s, p) => s + Number(p.nominal || 0), 0);

  // 4. Hitung Saldo Kas
  const saldoKas = (totalIuran + totalPemasukanLain) - totalPengeluaran;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-3xl p-6 space-y-4 shadow-2xl my-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-white text-base">💰 Transparansi Saldo Kas RT 38</h3>
            <p className="text-[11px] text-slate-400 mt-1">Rincian arus kas masuk dan keluar</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center text-sm">
            ✕
          </button>
        </div>

        {/* RINGKASAN KAS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Pemasukan</div>
            <div className="text-lg font-bold text-emerald-400 mt-1">{formatRupiah(totalIuran + totalPemasukanLain)}</div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Pengeluaran</div>
            <div className="text-lg font-bold text-rose-400 mt-1">{formatRupiah(totalPengeluaran)}</div>
          </div>
          <div className="bg-slate-950 border border-blue-500/30 rounded-xl p-4">
            <div className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold">Sisa Saldo Kas</div>
            <div className="text-lg font-bold text-white mt-1">{formatRupiah(saldoKas)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* KOLOM PEMASUKAN */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">📥 Pemasukan</h4>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex justify-between items-center">
              <span className="text-xs text-slate-300">💰 Iuran Warga (Total)</span>
              <strong className="text-emerald-400 text-xs">{formatRupiah(totalIuran)}</strong>
            </div>
            
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-3 bg-slate-900 border-b border-slate-800 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                ➕ Pemasukan Lainnya
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <tbody className="divide-y divide-slate-800/60">
                    {pemasukanLainList.length === 0 ? (
                      <tr><td className="p-3 text-center text-slate-500">Belum ada pemasukan lain.</td></tr>
                    ) : (
                      pemasukanLainList.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-800/40">
                          <td className="p-3">
                            <div className="text-slate-300 font-semibold">{p.jenis}</div>
                            {/* TAMBAHAN KETERANGAN */}
                            <div className="text-[10px] text-slate-400 italic truncate max-w-[180px]">
                              {p.keterangan || '-'}
                            </div>
                            <div className="text-[10px] text-slate-500">{formatTanggal(p.tanggal)}</div>
                          </td>
                          <td className="p-3 text-right font-mono text-emerald-400 font-semibold">
                            {formatRupiah(p.nominal)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* KOLOM PENGELUARAN */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">📤 Pengeluaran</h4>
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-3 bg-slate-900 border-b border-slate-800 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Rincian Pengeluaran
              </div>
              <div className="max-h-[315px] overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <tbody className="divide-y divide-slate-800/60">
                    {pengeluaranList.length === 0 ? (
                      <tr><td className="p-3 text-center text-slate-500">Belum ada pengeluaran.</td></tr>
                    ) : (
                      pengeluaranList.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-800/40">
                          <td className="p-3">
                            <div className="text-slate-300 font-semibold truncate max-w-[150px]">{p.keterangan || p.jenis}</div>
                            <div className="text-[10px] text-slate-500">{formatTanggal(p.tanggal)}</div>
                          </td>
                          <td className="p-3 text-right font-mono text-rose-400 font-semibold">
                            {formatRupiah(p.nominal)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

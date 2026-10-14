import { formatRupiah, formatTanggal } from '../../lib/keuangan/helpers';

export default function TabDashboard({
  saldoKasBebas,
  saldoDepositTotal,
  totalPemasukan,
  totalPengeluaran,
  totalIuranApproved,
  totalPemasukanLain,
  pendingBatches,
  pengeluaran,
  setTab,
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="col-span-2 bg-gradient-to-br from-blue-950/60 to-slate-900 border border-blue-500/30 rounded-2xl p-5">
          <span className="text-[10px] text-blue-300 uppercase tracking-wider font-semibold">
            Saldo Kas Bebas
          </span>
          <div className="text-2xl font-black text-white mt-1">{formatRupiah(saldoKasBebas)}</div>
          <p className="text-[10px] text-slate-500 mt-1">Saldo setelah dikurangi deposit warga</p>
        </div>
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5">
          <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">
            Total Pemasukan
          </span>
          <div className="text-xl font-black text-emerald-400 mt-1">{formatRupiah(totalPemasukan)}</div>
          <div className="text-[10px] text-slate-500 mt-1">
            Iuran: {formatRupiah(totalIuranApproved)} • Lain: {formatRupiah(totalPemasukanLain)}
          </div>
        </div>
        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-5">
          <span className="text-[10px] text-rose-400 uppercase tracking-wider font-semibold">
            Total Pengeluaran
          </span>
          <div className="text-xl font-black text-rose-400 mt-1">{formatRupiah(totalPengeluaran)}</div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-950/40 to-slate-900 border border-purple-500/30 rounded-2xl p-5 flex justify-between items-center flex-wrap gap-3">
        <div>
          <span className="text-[10px] text-purple-300 uppercase tracking-wider font-semibold">
            💎 Saldo Deposit Warga
          </span>
          <div className="text-2xl font-black text-purple-300 mt-1">{formatRupiah(saldoDepositTotal)}</div>
          <p className="text-[10px] text-slate-500 mt-1">Titipan warga untuk iuran tahun berikutnya</p>
        </div>
        <button
          onClick={() => setTab('deposit')}
          className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl"
        >
          Kelola Deposit →
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-white">⏳ Menunggu Verifikasi</h3>
            {pendingBatches.length > 0 && (
              <button
                onClick={() => setTab('verifikasi')}
                className="text-[10px] text-blue-400 hover:underline"
              >
                Lihat semua →
              </button>
            )}
          </div>
          {pendingBatches.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">Tidak ada pending.</p>
          ) : (
            <div className="space-y-2">
              {pendingBatches.slice(0, 3).map((b) => (
                <div
                  key={b.batchId}
                  className="flex justify-between items-center bg-slate-950/60 rounded-xl p-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {b.items[0]?.warga?.nama_lengkap}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {b.items.length} bulan •{' '}
                      {formatRupiah(b.items.reduce((s, i) => s + Number(i.jumlah || 0), 0))}
                    </div>
                  </div>
                  <button
                    onClick={() => setTab('verifikasi')}
                    className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded-lg"
                  >
                    Lihat
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-white">➖ Pengeluaran Terbaru</h3>
            <button
              onClick={() => setTab('pengeluaran')}
              className="text-[10px] text-blue-400 hover:underline"
            >
              Lihat semua →
            </button>
          </div>
          <div className="space-y-2">
            {pengeluaran.slice(0, 4).map((p) => (
              <div
                key={p.id}
                className="flex justify-between items-start gap-2 bg-slate-950/60 rounded-xl p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-slate-500">
                    {formatTanggal(p.tanggal)} • {p.jenis}
                  </div>
                  <div className="text-xs text-slate-300 truncate">{p.keterangan || '-'}</div>
                </div>
                <div className="text-xs font-bold text-rose-400 whitespace-nowrap">
                  {formatRupiah(p.nominal)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
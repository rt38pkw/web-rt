import { formatRupiah } from '../../lib/keuangan/helpers';

export default function ModalPakaiDeposit({
  modalPakaiDeposit,
  setModalPakaiDeposit,
  pakaiTahun,
  setPakaiTahun,
  pakaiBulan = [],
  setPakaiBulan,
  bulanPakaiDeposit = [],
  tarifPakaiDeposit = 0,
  totalPakaiDeposit = 0,
  saldoDepositWargaIni = 0,
  sisaDepositSetelah = 0,
  handleSubmitPakaiDeposit,
}) {
  // ── Guard: pastikan bulanPakaiDeposit adalah array ──
  const bulanList = Array.isArray(bulanPakaiDeposit) ? bulanPakaiDeposit : [];
  const pakaiBulanSafe = Array.isArray(pakaiBulan) ? pakaiBulan : [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl my-8">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="font-bold text-white text-base">💎 Pakai Deposit untuk Iuran</h3>
          <button
            onClick={() => setModalPakaiDeposit(null)}
            className="w-8 h-8 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Saldo Deposit:</span>
            <strong className="text-purple-300">{formatRupiah(saldoDepositWargaIni)}</strong>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Tarif Berlaku:</span>
            <strong className="text-blue-400">{formatRupiah(tarifPakaiDeposit)}/bln</strong>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">Tahun</label>
          <select
            value={pakaiTahun}
            onChange={(e) => {
              setPakaiTahun(Number(e.target.value));
              setPakaiBulan([]);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
            <option value={2028}>2028</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">Pilih Bulan</label>
          <div className="grid grid-cols-3 gap-1.5">
            {bulanList.length === 0 ? (
              <div className="col-span-3 text-center text-xs text-slate-500 py-4">
                Tarif tahun ini belum di-set.
              </div>
            ) : (
              bulanList.map((b) => {
                const checked = pakaiBulanSafe.includes(b.kode);
                return (
                  <label
                    key={b.kode}
                    className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 cursor-pointer transition ${
                      checked
                        ? 'bg-purple-600/20 border-purple-500/50 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setPakaiBulan((prev) =>
                          prev.includes(b.kode)
                            ? prev.filter((x) => x !== b.kode)
                            : [...prev, b.kode]
                        )
                      }
                      className="accent-purple-500"
                    />
                    <span className="truncate">{b.nama.substring(0, 3)}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Total Pakai:</span>
            <strong className="text-white">
              {formatRupiah(totalPakaiDeposit)} ({pakaiBulanSafe.length} bulan)
            </strong>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Sisa Setelah:</span>
            <strong className={sisaDepositSetelah < 0 ? 'text-rose-400' : 'text-emerald-400'}>
              {formatRupiah(sisaDepositSetelah)}
            </strong>
          </div>
        </div>

        {sisaDepositSetelah < 0 && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-400">
            ⚠️ Saldo deposit tidak cukup! Kurangi pilihan bulan.
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => setModalPakaiDeposit(null)}
            className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs"
          >
            Batal
          </button>
          <button
            onClick={handleSubmitPakaiDeposit}
            disabled={pakaiBulanSafe.length === 0 || sisaDepositSetelah < 0}
            className="w-1/2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-xs"
          >
            Konfirmasi Pakai
          </button>
        </div>
      </div>
    </div>
  );
}

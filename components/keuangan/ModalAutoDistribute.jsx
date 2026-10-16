import { useEffect, useState } from 'react';
import { formatRupiah } from '../../lib/keuangan/helpers';
import { getBulanTahun } from '../../lib/keuangan/constants';
import { hitungDistribusiAuto } from '../../lib/keuangan/hooks';
import { tarifWarga } from '../../lib/keuangan/helpers';

export default function ModalAutoDistribute({
  warga,
  tarifList,
  saldoDeposit,
  iuranWarga,
  onClose,
  onConfirm,
}) {
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  const bulanList = getBulanTahun(tahun);
  const tarif = tarifWarga(warga, tarifList, tahun);
  const tarifBelumDiset = tarif === 0;

  // Hitung distribusi otomatis
  const { hasil, totalPakai, sisaSaldo } = tarifBelumDiset
    ? { hasil: [], totalPakai: 0, sisaSaldo: saldoDeposit }
    : hitungDistribusiAuto(saldoDeposit, tarif, bulanList, iuranWarga);

  const handleConfirm = async () => {
    if (tarifBelumDiset) {
      alert(`Tarif ${tahun} belum ditetapkan. Set dulu di tab 💰 Tarif.`);
      return;
    }
    if (hasil.length === 0) {
      alert('Tidak ada bulan yang bisa diisi — semua sudah lunas atau saldo kosong.');
      return;
    }
    setLoading(true);
    try {
      await onConfirm({ tahun, hasil, totalPakai, tarif });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl my-8">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-white text-base">⚡ Auto Distribusi Deposit</h3>
            <p className="text-[11px] text-slate-400">Otomatis isi iuran dari bulan paling awal</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {/* Info Warga */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Warga:</span>
            <strong className="text-white">
              {warga.no_rumah} — {warga.nama_lengkap}
            </strong>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Saldo Deposit:</span>
            <strong className="text-purple-400">{formatRupiah(saldoDeposit)}</strong>
          </div>
        </div>

        {/* Pilih Tahun */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">Tahun</label>
          <select
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
          >
            {[2026, 2027, 2028, 2029].map((thn) => (
              <option key={thn} value={thn}>
                {thn}
              </option>
            ))}
          </select>
        </div>

        {/* Info Tarif */}
        {tarifBelumDiset ? (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-400">
            ⚠️ Tarif {tahun} belum ditetapkan. Set dulu di tab 💰 Tarif.
          </div>
        ) : (
          <>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Tarif {tahun}:</span>
                <strong className="text-blue-400">{formatRupiah(tarif)}/bln</strong>
              </div>
            </div>

            {/* Preview Distribusi */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Preview Distribusi
              </label>

              {hasil.length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-4 bg-slate-950 rounded-xl">
                  Semua bulan {tahun} sudah lunas, atau saldo tidak cukup.
                </div>
              ) : (
                <div className="bg-slate-950 border border-slate-800 rounded-xl max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-slate-800/60">
                      {hasil.map((h, i) => (
                        <tr key={i}>
                          <td className="p-2 text-slate-300">{h.namaBulan}</td>
                          <td className="p-2 text-right">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded border ${
                                h.tipe === 'lunas'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}
                            >
                              {h.tipe === 'lunas' ? '✓ Lunas' : '⚠️ Kurang'}
                            </span>
                          </td>
                          <td className="p-2 text-right font-mono text-white">
                            {formatRupiah(h.nominal)}
                          </td>
                          {h.tipe === 'kurang' && (
                            <td className="p-2 text-right text-[10px] text-amber-400">
                              sisa {formatRupiah(h.sisaKurang)}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Ringkasan */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Total Pakai:</span>
                <strong className="text-white">
                  {formatRupiah(totalPakai)} ({hasil.length} bulan)
                </strong>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Sisa Deposit:</span>
                <strong className="text-purple-400">{formatRupiah(sisaSaldo)}</strong>
              </div>
            </div>
          </>
        )}

        {/* Tombol */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || tarifBelumDiset || hasil.length === 0}
            className="w-1/2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-xs"
          >
            {loading ? 'Memproses...' : `⚡ Konfirmasi (${hasil.length} bulan)`}
          </button>
        </div>
      </div>
    </div>
  );
}
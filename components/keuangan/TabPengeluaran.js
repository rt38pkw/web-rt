import { formatRupiah, formatTanggal } from '../../lib/keuangan/helpers';
import { JENIS_PENGELUARAN } from '../../lib/keuangan/constants';

export default function TabPengeluaran({
  pengeluaran,
  pengTgl,
  setPengTgl,
  pengJenis,
  setPengJenis,
  pengJenisCustom,
  setPengJenisCustom,
  pengKet,
  setPengKet,
  pengNominal,
  setPengNominal,
  pengSubmitting,
  handleSubmitPengeluaran,
}) {
  const total = pengeluaran.reduce((s, p) => s + Number(p.nominal || 0), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <form
        onSubmit={handleSubmitPengeluaran}
        className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 h-fit"
      >
        <h3 className="text-sm font-bold text-white">➖ Catat Pengeluaran</h3>

        <div>
          <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
            Tanggal
          </label>
          <input
            type="date"
            value={pengTgl}
            onChange={(e) => setPengTgl(e.target.value)}
            required
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
            Jenis
          </label>
          <select
            value={pengJenis}
            onChange={(e) => setPengJenis(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
          >
            {JENIS_PENGELUARAN.map((j) => (
              <option key={j}>{j}</option>
            ))}
          </select>
        </div>

        {pengJenis === 'Lainnya' && (
          <input
            type="text"
            value={pengJenisCustom}
            onChange={(e) => setPengJenisCustom(e.target.value)}
            placeholder="Jenis baru"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
          />
        )}

        <div>
          <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
            Keterangan
          </label>
          <textarea
            value={pengKet}
            onChange={(e) => setPengKet(e.target.value)}
            rows={2}
            placeholder="Deskripsi pengeluaran"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
            Nominal (Rp)
          </label>
          <input
            type="number"
            value={pengNominal}
            onChange={(e) => setPengNominal(e.target.value)}
            required
            placeholder="0"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
          />
        </div>

        <button
          type="submit"
          disabled={pengSubmitting}
          className="w-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold py-2.5 rounded-xl"
        >
          {pengSubmitting ? 'Menyimpan...' : 'Simpan Pengeluaran'}
        </button>
      </form>

      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-sm font-bold text-white">
            📋 Daftar Pengeluaran ({pengeluaran.length})
          </h3>
          <span className="text-xs text-rose-400 font-bold">Total: {formatRupiah(total)}</span>
        </div>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
              <tr>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Jenis</th>
                <th className="p-3">Keterangan</th>
                <th className="p-3 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {pengeluaran.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40">
                  <td className="p-3 text-slate-400 whitespace-nowrap">
                    {formatTanggal(p.tanggal)}
                  </td>
                  <td className="p-3">
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded">{p.jenis}</span>
                  </td>
                  <td className="p-3 text-slate-300">{p.keterangan || '-'}</td>
                  <td className="p-3 text-right font-mono text-rose-400">
                    {formatRupiah(p.nominal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
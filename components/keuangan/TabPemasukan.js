import { formatRupiah, formatTanggal } from '../../lib/keuangan/helpers';
import { JENIS_PEMASUKAN } from '../../lib/keuangan/constants';

export default function TabPemasukan({
  pemasukanLain,
  masukTgl,
  setMasukTgl,
  masukJenis,
  setMasukJenis,
  masukJenisCustom,
  setMasukJenisCustom,
  masukKet,
  setMasukKet,
  masukNominal,
  setMasukNominal,
  masukSubmitting,
  handleSubmitPemasukan,
}) {
  const total = pemasukanLain.reduce((s, p) => s + Number(p.nominal || 0), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <form
        onSubmit={handleSubmitPemasukan}
        className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 h-fit"
      >
        <h3 className="text-sm font-bold text-white">➕ Catat Pemasukan</h3>
        <p className="text-[10px] text-slate-500">
          Pemasukan non-iuran: donasi, mutasi saldo, bunga, dll.
        </p>

        <div>
          <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
            Tanggal
          </label>
          <input
            type="date"
            value={masukTgl}
            onChange={(e) => setMasukTgl(e.target.value)}
            required
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
            Jenis
          </label>
          <select
            value={masukJenis}
            onChange={(e) => setMasukJenis(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
          >
            {JENIS_PEMASUKAN.map((j) => (
              <option key={j}>{j}</option>
            ))}
          </select>
        </div>

        {masukJenis === 'Lainnya' && (
          <input
            type="text"
            value={masukJenisCustom}
            onChange={(e) => setMasukJenisCustom(e.target.value)}
            placeholder="Jenis baru"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
          />
        )}

        <div>
          <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
            Keterangan
          </label>
          <textarea
            value={masukKet}
            onChange={(e) => setMasukKet(e.target.value)}
            rows={2}
            placeholder="Deskripsi pemasukan"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
            Nominal (Rp)
          </label>
          <input
            type="number"
            value={masukNominal}
            onChange={(e) => setMasukNominal(e.target.value)}
            required
            placeholder="0"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
          />
        </div>

        <button
          type="submit"
          disabled={masukSubmitting}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 rounded-xl"
        >
          {masukSubmitting ? 'Menyimpan...' : 'Simpan Pemasukan'}
        </button>
      </form>

      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-sm font-bold text-white">
            📋 Daftar Pemasukan ({pemasukanLain.length})
          </h3>
          <span className="text-xs text-emerald-400 font-bold">Total: {formatRupiah(total)}</span>
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
              {pemasukanLain.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-6 text-center text-slate-500">
                    Belum ada pemasukan.
                  </td>
                </tr>
              ) : (
                pemasukanLain.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="p-3 text-slate-400 whitespace-nowrap">
                      {formatTanggal(p.tanggal)}
                    </td>
                    <td className="p-3">
                      <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded">{p.jenis}</span>
                    </td>
                    <td className="p-3 text-slate-300">{p.keterangan || '-'}</td>
                    <td className="p-3 text-right font-mono text-emerald-400">
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
  );
}
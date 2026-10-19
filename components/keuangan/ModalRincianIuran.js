import { formatRupiah, formatTanggal } from '../../lib/keuangan/helpers';

export default function ModalRincianIuran({ show, onClose, iuranList }) {
  if (!show) return null;

  // Filter hanya yang approved & bukan dari deposit, lalu urutkan dari terbaru
  const listIuran = iuranList
    .filter((i) => i.status === 'approved' && i.metode !== 'deposit')
    .sort((a, b) => new Date(b.tanggal_transaksi) - new Date(a.tanggal_transaksi));

  const total = listIuran.reduce((s, i) => s + Number(i.jumlah || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-3xl p-6 space-y-4 shadow-2xl my-8">
        
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-white text-base">💰 Rincian Iuran Masuk</h3>
            <p className="text-[11px] text-slate-400 mt-1">Daftar setoran iuran warga via QRIS & Tunai</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center text-sm">
            ✕
          </button>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex justify-between items-center">
          <span className="text-xs text-slate-400">Total Iuran Terkumpul:</span>
          <strong className="text-emerald-400 text-base font-bold">{formatRupiah(total)}</strong>
        </div>

        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
              <tr>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Warga</th>
                <th className="p-3">Bulan</th>
                <th className="p-3">Metode</th>
                <th className="p-3 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {listIuran.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-500">Belum ada iuran masuk.</td>
                </tr>
              ) : (
                listIuran.map((i) => {
                  const w = i.warga;
                  return (
                    <tr key={i.id} className="hover:bg-slate-800/40">
                      <td className="p-3 text-slate-400 whitespace-nowrap text-[10px]">
                        {formatTanggal(i.tanggal_transaksi)}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-white">{w?.nama_lengkap || '-'}</div>
                        <div className="text-[10px] text-slate-500">{w?.no_rumah}</div>
                      </td>
                      <td className="p-3 text-slate-300">
                        {i.bulan_tahun?.replace('2026-', 'Bulan ')}
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded border uppercase ${
                          i.metode === 'qris' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {i.metode === 'qris' ? '📱 QRIS' : '💵 Tunai'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-400 font-semibold">
                        {formatRupiah(i.jumlah)}
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

import { formatTanggal } from '../../lib/iuran/calculations';

export default function ModalDetailBulan({ detail, onClose }) {
  if (!detail) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="font-bold text-white text-base">Detail Pembayaran</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center text-xs transition"
          >
            ✕
          </button>
        </div>
        <div className="space-y-3 text-xs text-slate-300">
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Bulan:</span>
            <strong className="text-white">{detail.namaBulan} 2026</strong>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Total Terbayar:</span>
            <strong className="text-emerald-400">
              Rp {detail.jumlah.toLocaleString('id-ID')}
            </strong>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Tanggal:</span>
            <strong className="text-amber-400">{formatTanggal(detail.tanggal)}</strong>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}
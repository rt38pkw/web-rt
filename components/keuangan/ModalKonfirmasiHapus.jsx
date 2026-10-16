export default function ModalKonfirmasiHapus({
  open,
  onClose,
  onConfirm,
  title = 'Hapus Transaksi',
  data = {},
  warning = null,
  submitting = false,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl my-8">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="font-bold text-white text-base">🗑️ {title}</h3>
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
          {Object.entries(data).map(([key, val]) => (
            <div key={key} className="flex justify-between text-xs">
              <span className="text-slate-400">{key}:</span>
              <strong className="text-white text-right max-w-[60%] truncate">{val}</strong>
            </div>
          ))}
        </div>

        {warning && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-400 space-y-1">
            {warning}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="w-1/2 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-xs"
          >
            {submitting ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { ALLOWED_TYPES, MAX_FILE_SIZE } from '../../lib/iuran/constants';
import { formatRupiahProyek } from '../../lib/proyek/constants';

export default function ModalBayarProjek({
  show,
  onClose,
  proyek,
  sisaWarga,
  sudahBayar,
  onSubmit,
  submitting,
}) {
  const [nominal, setNominal] = useState('');
  const [fileBukti, setFileBukti] = useState([null, null, null]);
  const [previewBukti, setPreviewBukti] = useState([null, null, null]);
  const [catatan, setCatatan] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (show && proyek) {
      setNominal(String(sisaWarga || ''));
      setFileBukti([null, null, null]);
      setPreviewBukti([null, null, null]);
      setCatatan('');
      setError('');
    }
  }, [show, proyek, sisaWarga]);

  if (!show || !proyek) return null;

  const nominalNum = Number(nominal) || 0;
  const kelebihan = nominalNum - sisaWarga;
  const terlaluBesar = kelebihan > 0;
  const terlaluKecil = nominalNum <= 0;

  const handleFileChange = (slotIndex, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('Format file harus JPG, PNG, atau WebP');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert('Ukuran file maksimal 3 MB');
      return;
    }
    const newFiles = [...fileBukti];
    newFiles[slotIndex] = file;
    setFileBukti(newFiles);

    const newPreviews = [...previewBukti];
    if (newPreviews[slotIndex]) URL.revokeObjectURL(newPreviews[slotIndex]);
    newPreviews[slotIndex] = URL.createObjectURL(file);
    setPreviewBukti(newPreviews);
  };

  const handleRemoveFile = (slotIndex) => {
    const newFiles = [...fileBukti];
    newFiles[slotIndex] = null;
    setFileBukti(newFiles);

    const newPreviews = [...previewBukti];
    if (newPreviews[slotIndex]) URL.revokeObjectURL(newPreviews[slotIndex]);
    newPreviews[slotIndex] = null;
    setPreviewBukti(newPreviews);
  };

  const handleSubmit = async () => {
    setError('');

    if (terlaluKecil) {
      setError('Nominal harus lebih dari 0');
      return;
    }
    if (terlaluBesar) {
      setError(`Kelebihan ${formatRupiahProyek(kelebihan)}. Maksimal: ${formatRupiahProyek(sisaWarga)}`);
      return;
    }
    if (!fileBukti[0]) {
      setError('Upload minimal 1 bukti pembayaran (slot 1)');
      return;
    }

    await onSubmit({ nominal: nominalNum, fileBukti, catatan });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl my-8">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-white text-base">🏗️ Bayar Cicilan Proyek</h3>
            <p className="text-[11px] text-slate-400">{proyek.nama}</p>
          </div>
          <button
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            className="w-8 h-8 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center text-sm transition disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        {/* Info Proyek */}
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Target per warga:</span>
            <strong className="text-amber-300">{formatRupiahProyek(proyek.nominal_per_warga)}</strong>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Sudah Anda bayar:</span>
            <strong className="text-emerald-400">{formatRupiahProyek(sudahBayar)}</strong>
          </div>
          <div className="flex justify-between text-xs border-t border-amber-500/20 pt-1">
            <span className="text-slate-400">Sisa:</span>
            <strong className="text-white">{formatRupiahProyek(sisaWarga)}</strong>
          </div>
        </div>

        {/* QRIS */}
        <div className="bg-white rounded-2xl p-3 flex flex-col items-center">
          <img src="/qris.png" alt="QRIS RT 38" className="w-40 h-40 object-contain" />
          <p className="text-[10px] text-slate-600 mt-1 font-medium">Scan untuk bayar cicilan</p>
          <a
            href="/qris.png"
            download="QRIS-RT38.png"
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
          >
            ⬇️ Download QRIS
          </a>
        </div>

        {/* Nominal */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-2">
            Nominal Cicilan <span className="text-slate-500">(bebas, maks sisa)</span>
          </label>
          <input
            type="number"
            value={nominal}
            onChange={(e) => setNominal(e.target.value)}
            placeholder="0"
            className={`w-full bg-slate-950 border rounded-xl px-3 py-2.5 text-sm text-white font-mono ${
              terlaluBesar ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-blue-500/50'
            } focus:outline-none`}
          />
          {terlaluBesar && (
            <p className="text-[10px] text-rose-400 mt-1">
              ⚠️ Kelebihan {formatRupiahProyek(kelebihan)}. Maksimal {formatRupiahProyek(sisaWarga)}.
            </p>
          )}
          <div className="flex gap-1.5 mt-2 flex-wrap">
            <button
              type="button"
              onClick={() => setNominal(String(sisaWarga))}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded"
            >
              Lunas sisa ({formatRupiahProyek(sisaWarga)})
            </button>
            <button
              type="button"
              onClick={() => setNominal(String(Math.ceil(sisaWarga / 2 / 1000) * 1000))}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded"
            >
              Setengah
            </button>
          </div>
        </div>

        {/* Upload 3 slot */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-2">
            Bukti Transfer <span className="text-slate-500">(slot 1 wajib)</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((slot) => (
              <div key={slot} className="relative">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => handleFileChange(slot, e)}
                  className="hidden"
                  id={`projek-slot-${slot}`}
                />
                <label
                  htmlFor={`projek-slot-${slot}`}
                  className={`block aspect-square rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden transition ${
                    previewBukti[slot]
                      ? 'border-amber-500/60 bg-slate-950'
                      : slot === 0
                      ? 'border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10'
                      : 'border-slate-700 bg-slate-950/60 hover:bg-slate-800/40'
                  }`}
                >
                  {previewBukti[slot] ? (
                    <img
                      src={previewBukti[slot]}
                      alt={`Bukti ${slot + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <div className="text-2xl">{slot === 0 ? '📸' : '➕'}</div>
                      <div className="text-[9px] text-slate-400 mt-1">
                        Slot {slot + 1}
                        {slot === 0 ? ' *' : ''}
                      </div>
                    </div>
                  )}
                </label>
                {previewBukti[slot] && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleRemoveFile(slot);
                    }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 hover:bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center shadow-lg"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">JPG / PNG / WebP • maks 3 MB per file</p>
        </div>

        {/* Catatan */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-2">
            Catatan (opsional)
          </label>
          <textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Contoh: transfer dari rekening istri"
            rows={2}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-400">
            ⚠️ {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || terlaluBesar || terlaluKecil || !fileBukti[0]}
            className="w-2/3 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-xs"
          >
            {submitting ? 'Mengirim...' : `Kirim Pengajuan ${formatRupiahProyek(nominalNum)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

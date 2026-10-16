import { useState, useEffect } from 'react';
import { getInfoBulan, hitungTotalBayar } from '../../lib/iuran/calculations';
import { ALLOWED_TYPES, MAX_FILE_SIZE } from '../../lib/iuran/constants';

export default function ModalBayar({
  show,
  onClose,
  iuranList,
  tarifBulanan,
  belumLunasList,
  bulanDipilih,
  setBulanDipilih,
  onSubmit,
  submitting,
  tahun,
}) {
  const [fileBukti, setFileBukti] = useState([null, null, null]);
  const [previewBukti, setPreviewBukti] = useState([null, null, null]);
  const [catatan, setCatatan] = useState('');

  useEffect(() => {
    if (show) {
      setFileBukti([null, null, null]);
      setPreviewBukti([null, null, null]);
      setCatatan('');
    }
  }, [show]);

  if (!show) return null;

  const tahunAktif = tahun || new Date().getFullYear();
  const totalBayar = hitungTotalBayar(bulanDipilih, iuranList, tarifBulanan);

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
    if (bulanDipilih.length === 0) {
      alert('Pilih minimal 1 bulan');
      return;
    }
    if (!fileBukti[0]) {
      alert('Upload minimal 1 bukti pembayaran (slot 1)');
      return;
    }
    await onSubmit({ fileBukti, catatan, bulanDipilih });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl my-8">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-white text-base">
              📱 Bayar Iuran {tahunAktif}
            </h3>
            <p className="text-[11px] text-slate-400">
              Scan QR, transfer, lalu upload bukti
            </p>
          </div>
          <button
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            className="w-8 h-8 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center text-sm transition disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        {/* QRIS */}
        <div className="bg-white rounded-2xl p-3 flex flex-col items-center">
          <img src="/qris.png" alt="QRIS RT 38" className="w-48 h-48 object-contain" />
          <p className="text-[10px] text-slate-600 mt-2 font-medium">
            Scan dengan aplikasi bank / e-wallet
          </p>
          <a
            href="/qris.png"
            download="QRIS-RT38.png"
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
          >
            ⬇️ Download QRIS
          </a>
          <button
            onClick={() => {
              navigator.clipboard.writeText(String(totalBayar));
              alert('Total Rp ' + totalBayar.toLocaleString('id-ID') + ' disalin');
            }}
            className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition"
          >
            📋 Salin Total: Rp {totalBayar.toLocaleString('id-ID')}
          </button>
        </div>

        {/* Checklist bulan */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-2">
            Pilih Bulan <span className="text-slate-500">(bisa pilih beberapa)</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {belumLunasList.length === 0 ? (
              <div className="col-span-full text-center text-xs text-slate-500 py-4">
                Semua bulan sudah lunas 🎉
              </div>
            ) : (
              belumLunasList.map((bln) => {
                const info = getInfoBulan(iuranList, bln.kode, tarifBulanan);
                const checked = bulanDipilih.includes(bln.kode);
                const labelNominal =
                  info.totalApproved > 0
                    ? `kurang Rp ${info.kurang.toLocaleString('id-ID')}`
                    : `Rp ${tarifBulanan.toLocaleString('id-ID')}`;

                return (
                  <label
                    key={bln.kode}
                    className={`p-2 rounded-xl border text-xs flex flex-col gap-0.5 cursor-pointer transition ${
                      checked
                        ? 'bg-blue-600/20 border-blue-500/50 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setBulanDipilih((prev) =>
                            prev.includes(bln.kode)
                              ? prev.filter((k) => k !== bln.kode)
                              : [...prev, bln.kode]
                          );
                        }}
                        className="accent-blue-500"
                      />
                      <span className="truncate font-semibold">{bln.nama}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 pl-5">{labelNominal}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* Upload 3 slot */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-2">
            Upload Bukti Transfer <span className="text-slate-500">(slot 1 wajib)</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((slot) => (
              <div key={slot} className="relative">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => handleFileChange(slot, e)}
                  className="hidden"
                  id={`file-slot-${slot}`}
                />
                <label
                  htmlFor={`file-slot-${slot}`}
                  className={`block aspect-square rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden transition ${
                    previewBukti[slot]
                      ? 'border-blue-500/60 bg-slate-950'
                      : slot === 0
                      ? 'border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10'
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

        {/* Total & Submit */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-3">
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Total Bayar</div>
            <div className="text-lg font-black text-white">
              Rp {totalBayar.toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-slate-500">{bulanDipilih.length} bulan dipilih</div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || bulanDipilih.length === 0 || !fileBukti[0]}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-semibold px-5 py-3 rounded-xl transition shadow-lg shadow-blue-600/20"
          >
            {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
          </button>
        </div>
      </div>
    </div>
  );
}

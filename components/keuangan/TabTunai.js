import { formatRupiah, tarifWarga } from '../../lib/keuangan/helpers';

export default function TabTunai({
  warga,
  tarifList,
  tahunTersedia,
  tunaiTahun,
  setTunaiTahun,
  tunaiWargaId,
  setTunaiWargaId,
  tunaiBulan,
  setTunaiBulan,
  tunaiTanggal,
  setTunaiTanggal,
  tunaiCatatan,
  setTunaiCatatan,
  bulanBelumLunas,
  totalTunai,
  tunaiSubmitting,
  handleSubmitTunai,
}) {
  const w = warga.find((x) => x.id === tunaiWargaId);
  const tarifTerpilih = w ? tarifWarga(w, tarifList, tunaiTahun) : 0;
  const tarifBelumDiset = w && tarifTerpilih === 0;

  // Tombol simpan enabled hanya kalau semua kondisi terpenuhi
  const bisaSimpan =
    !tunaiSubmitting &&
    tunaiWargaId &&
    tunaiBulan.length > 0 &&
    !tarifBelumDiset;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <form
        onSubmit={handleSubmitTunai}
        className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 h-fit"
      >
        <h3 className="text-sm font-bold text-white">💵 Input Iuran Tunai</h3>
        <p className="text-[10px] text-slate-500">Untuk warga yang bayar langsung ke bendahara.</p>

        {/* ── Dropdown Tahun ── */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
            Tahun <span className="text-slate-500">(pastikan benar)</span>
          </label>
          <select
            value={tunaiTahun}
            onChange={(e) => {
              setTunaiTahun(Number(e.target.value));
              setTunaiBulan([]); // Reset checklist
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
          >
            {tahunTersedia.map((thn) => (
              <option key={thn} value={thn}>
                {thn}{thn === new Date().getFullYear() ? ' (tahun ini)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* ── Pilih Warga ── */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Warga</label>
          <select
            value={tunaiWargaId}
            onChange={(e) => {
              setTunaiWargaId(e.target.value);
              setTunaiBulan([]); // Reset checklist
            }}
            required
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value="">-- Pilih Warga --</option>
            {warga.map((x) => (
              <option key={x.id} value={x.id}>
                {x.no_rumah} - {x.nama_lengkap}
              </option>
            ))}
          </select>
        </div>

        {/* ── Info Tarif / Warning ── */}
        {w && (
          <>
            {tarifBelumDiset ? (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 space-y-1">
                <p className="text-[11px] text-rose-400 font-semibold">
                  ⚠️ Tarif {tunaiTahun} belum ditetapkan
                </p>
                <p className="text-[10px] text-slate-400">
                  Set dulu di tab <strong className="text-rose-300">💰 Tarif</strong> sebelum input iuran tahun ini.
                </p>
              </div>
            ) : (
              <div className="text-[10px] text-slate-400">
                Tarif {tunaiTahun}:{' '}
                <strong className="text-blue-400">{formatRupiah(tarifTerpilih)}/bln</strong>
              </div>
            )}
          </>
        )}

        {/* ── Checklist Bulan ── */}
        {w && !tarifBelumDiset && (
          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-2">
              Bulan <span className="text-slate-500">(hanya yang belum lunas)</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {bulanBelumLunas.length === 0 ? (
                <div className="col-span-2 text-[10px] text-emerald-400 text-center py-3">
                  Semua bulan {tunaiTahun} sudah lunas ✓
                </div>
              ) : (
                bulanBelumLunas.map((b) => (
                  <label
                    key={b.kode}
                    className="flex items-center gap-1.5 text-[11px] cursor-pointer bg-slate-950/60 rounded-lg p-2 hover:bg-slate-800/40"
                  >
                    <input
                      type="checkbox"
                      checked={tunaiBulan.includes(b.kode)}
                      onChange={() =>
                        setTunaiBulan((prev) =>
                          prev.includes(b.kode)
                            ? prev.filter((x) => x !== b.kode)
                            : [...prev, b.kode]
                        )
                      }
                      className="accent-blue-500"
                    />
                    <span>{b.nama}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Tanggal ── */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Tanggal Bayar</label>
          <input
            type="date"
            value={tunaiTanggal}
            onChange={(e) => setTunaiTanggal(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
          />
        </div>

        {/* ── Catatan ── */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Catatan</label>
          <textarea
            value={tunaiCatatan}
            onChange={(e) => setTunaiCatatan(e.target.value)}
            rows={2}
            placeholder="Opsional"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none"
          />
        </div>

        {/* ── Total & Submit ── */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-800">
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Total</div>
            <div className="text-lg font-black text-white">{formatRupiah(totalTunai)}</div>
          </div>
          <button
            type="submit"
            disabled={!bisaSimpan}
            className={`text-xs font-semibold px-4 py-2.5 rounded-xl transition ${
              bisaSimpan
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {tunaiSubmitting ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>

      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-center text-xs text-slate-500">
        <div className="text-center space-y-2">
          <div className="text-3xl">💡</div>
          <p>Isi form di kiri untuk mencatat iuran tunai.</p>
          <p className="text-[10px] text-slate-600">
            Bulan yang sudah lunas otomatis disembunyikan dari checklist.
          </p>
        </div>
      </div>
    </div>
  );
}

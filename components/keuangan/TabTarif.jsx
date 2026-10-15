import { useState, useEffect } from 'react';
import {
  fetchAllTarif,
  getTahunTersedia,
  upsertTarif,
  deleteTarif,
  invalidateTarifCache,
} from '../../lib/keuangan/tarif';
import { formatRupiah } from '../../lib/keuangan/helpers';

export default function TabTarif({ user }) {
  const [tarifList, setTarifList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [formTahun, setFormTahun] = useState(new Date().getFullYear() + 1);
  const [formKategori, setFormKategori] = useState('Warga');
  const [formTarif, setFormTarif] = useState('');
  const [formBerlakuDari, setFormBerlakuDari] = useState(
    `${new Date().getFullYear() + 1}-01-01`
  );
  const [formCatatan, setFormCatatan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTarif();
  }, []);

  async function loadTarif() {
    setLoading(true);
    try {
      const data = await fetchAllTarif(true);
      setTarifList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formTarif || Number(formTarif) <= 0) {
      alert('Tarif harus lebih dari 0');
      return;
    }
    setSubmitting(true);
    try {
      await upsertTarif({
        tahun: Number(formTahun),
        kategori: formKategori,
        tarif: Number(formTarif),
        berlaku_dari: formBerlakuDari,
        catatan: formCatatan,
        created_by: user?.id,
      });
      alert('✅ Tarif berhasil disimpan!');
      setShowForm(false);
      setFormTarif('');
      setFormCatatan('');
      invalidateTarifCache();
      loadTarif();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item) {
    if (!confirm(`Hapus tarif ${item.kategori} tahun ${item.tahun}?`)) return;
    try {
      await deleteTarif(item.id);
      alert('✅ Tarif dihapus.');
      invalidateTarifCache();
      loadTarif();
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  }

  // Group tarif per tahun
  const tahunList = [...new Set(tarifList.map((t) => t.tahun))].sort((a, b) => b - a);
  const tahunIni = new Date().getFullYear();

  if (loading) {
    return <div className="text-center py-10 text-slate-500 text-xs">Memuat tarif...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header + Tombol Tambah */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-bold text-white">💰 Penetapan Tarif Iuran</h2>
          <p className="text-[11px] text-slate-400">Tarif otomatis berlaku sesuai tahun saat distribusi iuran.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg"
        >
          {showForm ? '✕ Tutup Form' : '+ Set Tarif Baru'}
        </button>
      </div>

      {/* Form Set Tarif */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3"
        >
          <h3 className="text-sm font-bold text-white mb-2">📝 Set / Update Tarif</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Tahun</label>
              <input
                type="number"
                value={formTahun}
                onChange={(e) => setFormTahun(e.target.value)}
                required
                min="2025"
                max="2099"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Kategori</label>
              <select
                value={formKategori}
                onChange={(e) => setFormKategori(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option>Warga</option>
                <option>Usaha</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Tarif (Rp)</label>
              <input
                type="number"
                value={formTarif}
                onChange={(e) => setFormTarif(e.target.value)}
                required
                placeholder="15000"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Berlaku Dari</label>
              <input
                type="date"
                value={formBerlakuDari}
                onChange={(e) => setFormBerlakuDari(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Catatan (opsional)</label>
              <input
                type="text"
                value={formCatatan}
                onChange={(e) => setFormCatatan(e.target.value)}
                placeholder="Mis: Hasil rapat RT 15 Des"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 rounded-xl"
          >
            {submitting ? 'Menyimpan...' : '💾 Simpan Tarif'}
          </button>

          <p className="text-[10px] text-slate-500 text-center">
            Kalau tarif tahun+kategori sudah ada, akan otomatis di-update.
          </p>
        </form>
      )}

      {/* Riwayat Tarif per Tahun */}
      {tahunList.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
          Belum ada tarif ditetapkan.
        </div>
      ) : (
        tahunList.map((tahun) => {
          const tarifTahun = tarifList.filter((t) => t.tahun === tahun);
          const isTahunIni = tahun === tahunIni;
          return (
            <div
              key={tahun}
              className={`bg-slate-900 border rounded-2xl overflow-hidden ${
                isTahunIni ? 'border-blue-500/40' : 'border-slate-800'
              }`}
            >
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Tahun {tahun}</h3>
                  {isTahunIni && (
                    <span className="text-[9px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30 font-semibold">
                      AKTIF
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500">{tarifTahun.length} kategori</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Kategori</th>
                      <th className="p-3 text-right">Tarif</th>
                      <th className="p-3">Berlaku Dari</th>
                      <th className="p-3">Catatan</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {tarifTahun.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/40">
                        <td className="p-3">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded border ${
                              t.kategori === 'Usaha'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {t.kategori === 'Usaha' ? '🏪 Usaha' : '🏠 Warga'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-white font-bold">
                          {formatRupiah(t.tarif)}
                        </td>
                        <td className="p-3 text-slate-400">
                          {new Date(t.berlaku_dari).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="p-3 text-slate-400 text-[10px]">{t.catatan || '-'}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDelete(t)}
                            className="text-rose-400 hover:text-rose-300 text-[10px] font-semibold"
                          >
                            🗑️ Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/proyek/Layout';
import ModalEditTunai from '../../components/proyek/ModalEditTunai';
import ModalKonfirmasiHapus from '../../components/keuangan/ModalKonfirmasiHapus';
import { useProyekData, getPendingProyekCount, invalidateProyekCache } from '../../lib/proyek/hooks';
import { formatRupiahProyek, formatTanggalProyek } from '../../lib/proyek/constants';
import { getTotalTerbayar, getSisaWarga } from '../../lib/proyek/calculations';

export default function PageProyekTunai() {
  const { user, warga, proyekList, iuranProyekList, loading, refetch } = useProyekData();

  const [proyekId, setProyekId] = useState('');
  const [wargaId, setWargaId] = useState('');
  const [nominal, setNominal] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [catatan, setCatatan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit & Hapus
  const [modalEdit, setModalEdit] = useState(null);
  const [modalHapus, setModalHapus] = useState(null);
  const [hapusSubmitting, setHapusSubmitting] = useState(false);

  if (typeof window === 'undefined') return null;

  const proyekTerpilih = proyekList.find((p) => p.id === proyekId);
  const wargaTerpilih = warga.find((w) => w.id === wargaId);

  const sudahBayar = proyekTerpilih && wargaTerpilih
    ? getTotalTerbayar(iuranProyekList, wargaTerpilih.id, proyekTerpilih.id)
    : 0;
  const sisa = proyekTerpilih && wargaTerpilih
    ? getSisaWarga(iuranProyekList, wargaTerpilih.id, proyekTerpilih)
    : 0;

  const nominalNum = Number(nominal) || 0;
  const terlaluBesar = nominalNum > sisa;
  const terlaluKecil = nominalNum <= 0;

  // ═══ INPUT BARU ═══
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!proyekId || !wargaId) {
      alert('Pilih proyek dan warga');
      return;
    }
    if (terlaluKecil) {
      alert('Nominal harus lebih dari 0');
      return;
    }
    if (terlaluBesar) {
      alert(`Kelebihan. Maksimal: ${formatRupiahProyek(sisa)}`);
      return;
    }

    const konfirmasi = window.confirm(
      `Konfirmasi input tunai:\n\n` +
      `Proyek: ${proyekTerpilih.nama}\n` +
      `Warga: ${wargaTerpilih.no_rumah} - ${wargaTerpilih.nama_lengkap}\n` +
      `Nominal: ${formatRupiahProyek(nominalNum)}\n\n` +
      `Yakin?`
    );
    if (!konfirmasi) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('iuran_proyek').insert([
        {
          proyek_id: proyekId,
          warga_id: wargaId,
          tanggal,
          jumlah: nominalNum,
          status: 'approved',
          metode: 'tunai',
          batch_id: crypto.randomUUID(),
          bukti_urls: null,
          catatan: catatan || null,
          tanggal_transaksi: tanggal,
        },
      ]);
      if (error) throw error;

      alert('✅ Cicilan tunai berhasil dicatat!');
      setWargaId('');
      setNominal('');
      setCatatan('');
      invalidateProyekCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ═══ EDIT ═══
  const handleSaveEdit = async ({ id, jumlah, tanggal, catatan }) => {
    try {
      const { error } = await supabase
        .from('iuran_proyek')
        .update({ jumlah, tanggal, catatan, tanggal_transaksi: tanggal })
        .eq('id', id);
      if (error) throw error;

      alert('✅ Cicilan berhasil diupdate!');
      setModalEdit(null);
      invalidateProyekCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  };

  // ═══ HAPUS ═══
  const handleHapusClick = (item) => {
    setModalHapus(item);
  };

  const confirmHapus = async () => {
    if (!modalHapus) return;
    setHapusSubmitting(true);
    try {
      const { error } = await supabase
        .from('iuran_proyek')
        .delete()
        .eq('id', modalHapus.id);
      if (error) throw error;

      alert('✅ Cicilan dihapus.');
      setModalHapus(null);
      invalidateProyekCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setHapusSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout user={user}>
        <div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div>
      </Layout>
    );
  }

  const pendingCount = getPendingProyekCount(iuranProyekList);

  // Riwayat tunai
  const riwayatTunai = iuranProyekList
    .filter((i) => i.metode === 'tunai' && i.status === 'approved')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Data untuk modal hapus
  const wargaHapus = modalHapus ? warga.find((w) => w.id === modalHapus.warga_id) : null;
  const proyekHapus = modalHapus ? proyekList.find((p) => p.id === modalHapus.proyek_id) : null;

  return (
    <Layout user={user} pendingCount={pendingCount}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Form Input */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 h-fit"
        >
          <h3 className="text-sm font-bold text-white">💵 Input Cicilan Tunai</h3>
          <p className="text-[10px] text-slate-500">Untuk warga yang bayar tunai langsung ke operator.</p>

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Proyek</label>
            <select
              value={proyekId}
              onChange={(e) => { setProyekId(e.target.value); setNominal(''); }}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="">-- Pilih Proyek --</option>
              {proyekList.filter((p) => p.status === 'aktif').map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama} ({formatRupiahProyek(p.nominal_per_warga)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Warga</label>
            <select
              value={wargaId}
              onChange={(e) => { setWargaId(e.target.value); setNominal(''); }}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="">-- Pilih Warga --</option>
              {warga.map((w) => {
                const s = proyekTerpilih ? getSisaWarga(iuranProyekList, w.id, proyekTerpilih) : 0;
                return (
                  <option key={w.id} value={w.id}>
                    {w.no_rumah} - {w.nama_lengkap} {proyekTerpilih && s === 0 ? '✓ Lunas' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {proyekTerpilih && wargaTerpilih && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Terbayar:</span>
                <strong className="text-emerald-400">{formatRupiahProyek(sudahBayar)}</strong>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Sisa:</span>
                <strong className="text-amber-400">{formatRupiahProyek(sisa)}</strong>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
              Nominal (Rp) <span className="text-slate-500">— maks sisa</span>
            </label>
            <input
              type="number"
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
              required
              placeholder="0"
              className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-sm text-white font-mono ${
                terlaluBesar ? 'border-rose-500' : 'border-slate-800'
              }`}
            />
            {terlaluBesar && (
              <p className="text-[10px] text-rose-400 mt-1">
                ⚠️ Kelebihan. Maksimal {formatRupiahProyek(sisa)}
              </p>
            )}
            {sisa > 0 && (
              <button
                type="button"
                onClick={() => setNominal(String(sisa))}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded mt-1"
              >
                Isi Lunas Sisa ({formatRupiahProyek(sisa)})
              </button>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Tanggal</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Catatan</label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={2}
              placeholder="Opsional"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !proyekId || !wargaId || terlaluBesar || terlaluKecil}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-semibold py-2.5 rounded-xl"
          >
            {submitting ? 'Menyimpan...' : 'Simpan Cicilan Tunai'}
          </button>
        </form>

        {/* Riwayat Tunai + Aksi */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">📋 Riwayat Tunai ({riwayatTunai.length})</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Edit / hapus akan otomatis update progress proyek & tunggakan
            </p>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Warga</th>
                  <th className="p-3">Proyek</th>
                  <th className="p-3 text-right">Nominal</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {riwayatTunai.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-6 text-center text-slate-500">
                      Belum ada cicilan tunai.
                    </td>
                  </tr>
                ) : (
                  riwayatTunai.map((item) => {
                    const w = warga.find((x) => x.id === item.warga_id);
                    const p = proyekList.find((x) => x.id === item.proyek_id);
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/40">
                        <td className="p-3 text-slate-400 whitespace-nowrap text-[10px]">
                          {formatTanggalProyek(item.tanggal)}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-white">{w?.nama_lengkap || '-'}</div>
                          <div className="text-[10px] text-slate-500">{w?.no_rumah}</div>
                        </td>
                        <td className="p-3 text-slate-300 text-[11px]">{p?.nama || '-'}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">
                          {formatRupiahProyek(item.jumlah)}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => setModalEdit(item)}
                              title="Edit"
                              className="text-blue-400 hover:text-blue-300 text-[10px] font-semibold px-1"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleHapusClick(item)}
                              title="Hapus"
                              className="text-rose-400 hover:text-rose-300 text-[10px] font-semibold px-1"
                            >
                              🗑️
                            </button>
                          </div>
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

      {/* Modal Edit */}
      {modalEdit && (
        <ModalEditTunai
          data={modalEdit}
          warga={warga.find((w) => w.id === modalEdit.warga_id)}
          proyek={proyekList.find((p) => p.id === modalEdit.proyek_id)}
          onClose={() => setModalEdit(null)}
          onSave={handleSaveEdit}
        />
      )}

      {/* Modal Hapus */}
      <ModalKonfirmasiHapus
        open={!!modalHapus}
        onClose={() => setModalHapus(null)}
        onConfirm={confirmHapus}
        submitting={hapusSubmitting}
        title="Hapus Cicilan Tunai"
        data={
          modalHapus
            ? {
                Warga: `${wargaHapus?.no_rumah} - ${wargaHapus?.nama_lengkap}`,
                Proyek: proyekHapus?.nama,
                Nominal: formatRupiahProyek(modalHapus.jumlah),
              }
            : {}
        }
        warning={
          <>
            ⚠️ <strong>Dampak:</strong>
            <div className="mt-1 text-[10px]">
              • Progress proyek akan <strong>turun</strong><br />
              • Sisa tunggakan warga akan <strong>naik</strong><br />
              • Riwayat warga akan update otomatis
            </div>
          </>
        }
      />
    </Layout>
  );
}

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/proyek/Layout';
import ModalKasProyek from '../../components/proyek/ModalKasProyek';
import ModalKonfirmasiHapus from '../../components/keuangan/ModalKonfirmasiHapus';
import ModalRefundMassal from '../../components/proyek/ModalRefundMassal';
import { useProyekData, getPendingProyekCount, invalidateProyekCache } from '../../lib/proyek/hooks';
import { formatRupiahProyek, formatTanggalProyek } from '../../lib/proyek/constants';
import { getRingkasanKasProyek } from '../../lib/proyek/calculations';
import { insertKasProyek, updateKasProyek, deleteKasProyek } from '../../lib/proyek/kas';

export default function PageProyekKas() {
  const { user, warga, proyekList, iuranProyekList, kasProyekList, loading, refetch } = useProyekData();
  
  const [proyekTerpilihId, setProyekTerpilihId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('pengeluaran');
  const [editData, setEditData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [showRefundList, setShowRefundList] = useState(false);
  const [showHapus, setShowHapus] = useState(false);
  const [hapusData, setHapusData] = useState(null);

  if (typeof window === 'undefined') return null;

  const proyekAktif = proyekList.find(p => p.id === proyekTerpilihId) || proyekList[0];
  const isProyekBatal = proyekAktif?.status === 'batal';

  if (loading) {
    return (
      <Layout user={user}>
        <div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div>
      </Layout>
    );
  }

  const handleSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (modalMode === 'edit') {
        await updateKasProyek(data.id, {
          tanggal: data.tanggal,
          nominal: data.nominal,
          keterangan: data.keterangan,
        });
        alert('✅ Transaksi berhasil diupdate!');
      } else {
        await insertKasProyek({
          proyek_id: data.proyek_id,
          warga_id: data.warga_id,
          tipe: data.tipe, // 'pengeluaran'
          tanggal: data.tanggal,
          nominal: data.nominal,
          keterangan: data.keterangan,
        });
        alert(`✅ Pengeluaran dicatat!`);
      }
      setShowModal(false);
      invalidateProyekCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ═══ HANDLER REFUND (LIST) ═══
  const handleProcessRefundList = async (wargaTerpilih, tanggal) => {
    if (proyekAktif?.status !== 'batal') {
      alert('❌ Gagal: Refund hanya bisa diproses untuk proyek yang dibatalkan!');
      return;
    }

    setSubmitting(true);
    try {
      const insertData = wargaTerpilih.map(w => ({
        proyek_id: proyekAktif.id,
        warga_id: w.id,
        tipe: 'refund',
        tanggal: tanggal,
        nominal: w.refundable,
        keterangan: `Refund pembatalan proyek`,
      }));

      const { error } = await supabase.from('kas_proyek').insert(insertData);
      if (error) throw error;

      alert(`✅ Berhasil memproses refund untuk ${wargaTerpilih.length} warga!`);
      setShowRefundList(false);
      invalidateProyekCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleHapusClick = (item) => {
    setHapusData(item);
    setShowHapus(true);
  };

  const confirmHapus = async () => {
    if (!hapusData) return;
    setSubmitting(true);
    try {
      await deleteKasProyek(hapusData.id);
      alert('✅ Transaksi dihapus.');
      setShowHapus(false);
      invalidateProyekCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const kas = proyekAktif 
    ? getRingkasanKasProyek(iuranProyekList, kasProyekList, proyekAktif.id)
    : { totalIuran: 0, totalDonasi: 0, totalPengeluaran: 0, totalRefund: 0, saldo: 0 };

  // ═══ PENGGABUNGAN RIWAYAT (MUTASI REKENING) ═══
  const riwayatIuran = iuranProyekList
    .filter(i => i.proyek_id === proyekAktif?.id && i.status === 'approved')
    .map(i => ({
      id: i.id,
      tanggal: i.tanggal || i.tanggal_transaksi || i.created_at,
      tipe: 'iuran',
      warga_id: i.warga_id,
      keterangan: i.catatan ? i.catatan : `Setoran ${i.metode || 'iuran'} (Batch ${i.batch_id?.slice(0, 8) || '-'})`,
      nominal: i.jumlah,
      isIuran: true
    }));

  const riwayatKas = kasProyekList
    .filter(k => k.proyek_id === proyekAktif?.id)
    .map(k => ({
      id: k.id,
      tanggal: k.tanggal || k.created_at,
      tipe: k.tipe,
      warga_id: k.warga_id,
      keterangan: k.keterangan,
      nominal: k.nominal,
      isIuran: false
    }));

  const riwayatGabungan = [...riwayatIuran, ...riwayatKas]
    .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  return (
    <Layout user={user} pendingCount={getPendingProyekCount(iuranProyekList)}>
      <div className="space-y-4">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex-1 min-w-[200px] w-full">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Pilih Proyek Kas</label>
            <select
              value={proyekAktif?.id || ''}
              onChange={(e) => setProyekTerpilihId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
            >
              {proyekList.length === 0 ? (
                <option value="">Belum ada proyek</option>
              ) : (
                proyekList.map((p) => (
                  <option key={p.id} value={p.id}>{p.nama} ({p.status})</option>
                ))
              )}
            </select>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full xl:w-auto mt-2 xl:mt-0">
            <button
              onClick={() => { setModalMode('pengeluaran'); setShowModal(true); }}
              disabled={!proyekAktif}
              className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-[11px] font-semibold px-4 py-2 rounded-lg"
            >💸 Catat Pengeluaran</button>
            
            {isProyekBatal && (
              <button
                onClick={() => setShowRefundList(true)}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold px-4 py-2 rounded-lg"
              >↩️ Refund Warga</button>
            )}
          </div>
        </div>

        {proyekAktif && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-900 border border-slate-700 rounded-2xl p-5 shadow-lg">
            <h3 className="text-sm font-bold text-white mb-4">💰 Saldo Kas Proyek: {proyekAktif.nama}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider">Iuran Terkumpul</div>
                <div className="text-sm font-bold text-emerald-400 mt-1">{formatRupiahProyek(kas.totalIuran)}</div>
              </div>
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider">Donasi Terkumpul</div>
                <div className="text-sm font-bold text-purple-400 mt-1">{formatRupiahProyek(kas.totalDonasi)}</div>
              </div>
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider">Pengeluaran</div>
                <div className="text-sm font-bold text-rose-400 mt-1">{formatRupiahProyek(kas.totalPengeluaran)}</div>
              </div>
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider">Total Refund</div>
                <div className="text-sm font-bold text-amber-400 mt-1">{formatRupiahProyek(kas.totalRefund)}</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs text-slate-400">Saldo Akhir Proyek</span>
              <span className="text-xl font-black text-white">{formatRupiahProyek(kas.saldo)}</span>
            </div>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-sm font-bold text-white">📜 Riwayat Mutasi Kas Proyek</h3>
            <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">Termasuk Iuran Warga</span>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0 z-10">
                <tr>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Tipe</th>
                  <th className="p-3">Warga (jika ada)</th>
                  <th className="p-3">Keterangan</th>
                  <th className="p-3 text-right">Nominal</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {riwayatGabungan.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-slate-500">Belum ada transaksi sama sekali.</td>
                  </tr>
                ) : (
                  riwayatGabungan.map((k) => {
                    const w = warga.find(x => x.id === k.warga_id);
                    
                    const isIuran = k.tipe === 'iuran';
                    const isPengeluaran = k.tipe === 'pengeluaran';
                    const isDonasi = k.tipe === 'donasi';
                    const isRefund = k.tipe === 'refund';
                    
                    const isMasuk = isIuran || isDonasi;
                    
                    let badgeClass = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
                    let badgeText = '❓ Lainnya';
                    let textNominal = 'text-slate-400';

                    if (isIuran) {
                      badgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                      badgeText = '💵 Iuran';
                      textNominal = 'text-emerald-400';
                    } else if (isDonasi) {
                      badgeClass = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                      badgeText = '💚 Donasi';
                      textNominal = 'text-purple-400';
                    } else if (isPengeluaran) {
                      badgeClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                      badgeText = '💸 Pengeluaran';
                      textNominal = 'text-rose-400';
                    } else if (isRefund) {
                      badgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                      badgeText = '↩️ Refund';
                      textNominal = 'text-amber-400';
                    }

                    return (
                      <tr key={k.id} className="hover:bg-slate-800/40">
                        <td className="p-3 text-slate-400 whitespace-nowrap text-[10px]">{formatTanggalProyek(k.tanggal)}</td>
                        <td className="p-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded border ${badgeClass}`}>
                            {badgeText}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300">{w ? `${w.no_rumah} - ${w.nama_lengkap}` : '-'}</td>
                        <td className="p-3 text-slate-400 text-[11px]">{k.keterangan || '-'}</td>
                        <td className={`p-3 text-right font-mono font-bold ${textNominal}`}>
                          {isMasuk ? '+ ' : '- '}{formatRupiahProyek(k.nominal)}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex gap-1 justify-end">
                            {/* Iuran dikelola di halaman Tunai, jadi tombol aksi hanya muncul untuk data Kas */}
                            {!isIuran ? (
                              <>
                                <button
                                  onClick={() => { setEditData(k); setModalMode('edit'); setShowModal(true); }}
                                  className="text-blue-400 hover:text-blue-300 text-[10px] font-semibold px-1"
                                >✏️</button>
                                <button
                                  onClick={() => handleHapusClick(k)}
                                  className="text-rose-400 hover:text-rose-300 text-[10px] font-semibold px-1"
                                >🗑️</button>
                              </>
                            ) : (
                              <span className="text-[9px] text-slate-500 italic px-1">di menu Tunai</span>
                            )}
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

      <ModalKasProyek
        show={showModal}
        onClose={() => setShowModal(false)}
        mode={modalMode}
        proyekList={proyekList}
        wargaList={warga}
        iuranProyekList={iuranProyekList}
        kasProyekList={kasProyekList}
        dataEdit={editData}
        onSubmit={handleSubmit}
        submitting={submitting}
      />

      <ModalRefundMassal
        show={showRefundList}
        onClose={() => setShowRefundList(false)}
        proyek={proyekAktif}
        wargaList={warga}
        iuranList={iuranProyekList}
        kasList={kasProyekList}
        onProcess={handleProcessRefundList}
        submitting={submitting}
      />

      <ModalKonfirmasiHapus
        open={showHapus}
        onClose={() => setShowHapus(false)}
        onConfirm={confirmHapus}
        submitting={submitting}
        title="Hapus Transaksi Kas"
        data={hapusData ? {
          Tipe: hapusData.tipe === 'pengeluaran' ? 'Pengeluaran' : hapusData.tipe === 'donasi' ? 'Donasi' : 'Refund',
          Nominal: formatRupiahProyek(hapusData.nominal),
          Keterangan: hapusData.keterangan || '-'
        } : {}}
        warning={
          <>
            ⚠️ <strong>Dampak:</strong>
            <div className="mt-1 text-[10px]">
              Saldo Kas Proyek akan <strong>{hapusData?.tipe === 'donasi' ? 'turun' : 'naik kembali'}</strong> sebesar {formatRupiahProyek(hapusData?.nominal || 0)}.
            </div>
          </>
        }
      />
    </Layout>
  );
}

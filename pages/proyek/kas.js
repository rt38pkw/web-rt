import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/proyek/Layout';
import ModalKasProyek from '../../components/proyek/ModalKasProyek';
import ModalKonfirmasiHapus from '../../components/keuangan/ModalKonfirmasiHapus';
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
  
  const [showHapus, setShowHapus] = useState(false);
  const [hapusData, setHapusData] = useState(null);

  if (typeof window === 'undefined') return null;

  const proyekAktif = proyekList.find(p => p.id === proyekTerpilihId) || proyekList[0];

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
        // ═══ VALIDASI REFUND: Nominal tidak boleh melebihi saldo proyek ═══
        if (data.tipe === 'refund') {
          const kasSaatIni = getRingkasanKasProyek(iuranProyekList, kasProyekList, data.proyek_id);
          
          if (data.nominal > kasSaatIni.saldo) {
            alert(`❌ Gagal Refund!\n\nNominal refund (Rp ${data.nominal.toLocaleString('id-ID')}) ` +
                  `melebihi Saldo Kas Proyek yang tersedia (Rp ${kasSaatIni.saldo.toLocaleString('id-ID')}).`);
            setSubmitting(false);
            return;
          }
        }

        await insertKasProyek({
          proyek_id: data.proyek_id,
          warga_id: data.warga_id,
          tipe: data.tipe,
          tanggal: data.tanggal,
          nominal: data.nominal,
          keterangan: data.keterangan,
        });
        alert(`✅ ${modalMode === 'pengeluaran' ? 'Pengeluaran' : 'Refund'} dicatat!`);
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

  const riwayatKas = kasProyekList
    .filter(k => k.proyek_id === proyekAktif?.id)
    .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  return (
    <Layout user={user} pendingCount={getPendingProyekCount(iuranProyekList)}>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex-1 min-w-[200px]">
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
          <div className="flex gap-2 w-full sm:w-auto mt-3 sm:mt-0">
            <button
              onClick={() => { setModalMode('pengeluaran'); setShowModal(true); }}
              disabled={!proyekAktif}
              className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-[11px] font-semibold px-4 py-2 rounded-lg"
            >💸 Catat Pengeluaran</button>
            <button
              onClick={() => { setModalMode('refund'); setShowModal(true); }}
              disabled={!proyekAktif}
              className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-[11px] font-semibold px-4 py-2 rounded-lg"
            >↩️ Refund Warga</button>
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
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">📜 Riwayat Transaksi Kas Proyek</h3>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Tipe</th>
                  <th className="p-3">Warga (jika ada)</th>
                  <th className="p-3

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import KeuanganLayout from '../../components/keuangan/Layout';
import TabRiwayat from '../../components/keuangan/TabRiwayat';
import ModalEditPengeluaran from '../../components/keuangan/ModalEditPengeluaran';
import ModalEditPemasukan from '../../components/keuangan/ModalEditPemasukan';
import ModalEditDeposit from '../../components/keuangan/ModalEditDeposit';
import ModalKonfirmasiHapus from '../../components/keuangan/ModalKonfirmasiHapus';
import { formatRupiah } from '../../lib/keuangan/helpers';
import {
  useKeuanganData,
  getPendingBatches,
  invalidateKeuanganCache,
} from '../../lib/keuangan/hooks';

export default function PageRiwayat() {
  const {
    user,
    iuran = [],
    pengeluaran = [],
    pemasukanLain = [],
    depositList = [],
    warga = [],
    loading,
    refetch,
  } = useKeuanganData();

  const [modalEdit, setModalEdit] = useState(null); // { tipe, data }
  const [modalHapus, setModalHapus] = useState(null); // { tipe, data, info }
  const [hapusSubmitting, setHapusSubmitting] = useState(false);

  const iuranList = Array.isArray(iuran) ? iuran : [];
  const pengeluaranSafe = Array.isArray(pengeluaran) ? pengeluaran : [];
  const pemasukanSafe = Array.isArray(pemasukanLain) ? pemasukanLain : [];
  const depositSafe = Array.isArray(depositList) ? depositList : [];
  const wargaSafe = Array.isArray(warga) ? warga : [];

  if (typeof window === 'undefined') return null;

  if (loading) {
    return (
      <KeuanganLayout user={user}>
        <div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div>
      </KeuanganLayout>
    );
  }

  // ═══════════════════════════════════════════════════════
  // HANDLE EDIT
  // ═══════════════════════════════════════════════════════
  function handleEdit(item) {
    if (item.sumber === 'pengeluaran') {
      setModalEdit({ tipe: 'pengeluaran', data: item.dataAsli });
    } else if (item.sumber === 'pemasukan_lain') {
      setModalEdit({ tipe: 'pemasukan', data: item.dataAsli });
    } else if (item.sumber === 'deposit' && item.depositTipe === 'masuk') {
      setModalEdit({ tipe: 'deposit', data: item.dataAsli });
    }
  }

  async function handleSaveEdit(payload) {
    if (!modalEdit) return;
    const tipe = modalEdit.tipe;
    try {
      if (tipe === 'pengeluaran') {
        const { error } = await supabase
          .from('pengeluaran')
          .update({
            tanggal: payload.tanggal,
            jenis: payload.jenis,
            keterangan: payload.keterangan,
            nominal: payload.nominal,
          })
          .eq('id', payload.id);
        if (error) throw error;
      } else if (tipe === 'pemasukan') {
        const { error } = await supabase
          .from('pemasukan_lain')
          .update({
            tanggal: payload.tanggal,
            jenis: payload.jenis,
            keterangan: payload.keterangan,
            nominal: payload.nominal,
          })
          .eq('id', payload.id);
        if (error) throw error;
      } else if (tipe === 'deposit') {
        const { error } = await supabase
          .from('deposit_warga')
          .update({
            tanggal: payload.tanggal,
            jumlah: payload.jumlah,
            keterangan: payload.keterangan,
          })
          .eq('id', payload.id);
        if (error) throw error;
      }

      alert('✅ Berhasil diupdate!');
      setModalEdit(null);
      invalidateKeuanganCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  }

  // ═══════════════════════════════════════════════════════
  // HANDLE HAPUS
  // ═══════════════════════════════════════════════════════
  function handleHapus(item) {
    setModalHapus(item);
  }

  async function confirmHapus() {
    if (!modalHapus) return;
    setHapusSubmitting(true);
    try {
      const item = modalHapus;

      // ── IURAN (qris/tunai) ──
      if (item.sumber === 'iuran') {
        if (item.metode === 'tunai' && item.batchId) {
          // Hapus seluruh batch tunai
          const { error } = await supabase
            .from('iuran')
            .delete()
            .eq('batch_id', item.batchId);
          if (error) throw error;
        } else {
          // Hapus 1 record (qris)
          const { error } = await supabase
            .from('iuran')
            .delete()
            .eq('id', item.recordId);
          if (error) throw error;
        }
      }

      // ── PENGELUARAN ──
      else if (item.sumber === 'pengeluaran') {
        const { error } = await supabase
          .from('pengeluaran')
          .delete()
          .eq('id', item.recordId);
        if (error) throw error;
      }

      // ── PEMASUKAN LAIN ──
      else if (item.sumber === 'pemasukan_lain') {
        const { error } = await supabase
          .from('pemasukan_lain')
          .delete()
          .eq('id', item.recordId);
        if (error) throw error;
      }

      // ── DEPOSIT MASUK ──
      else if (item.sumber === 'deposit' && item.depositTipe === 'masuk') {
        // Cek dulu apakah sudah dipakai
        const depId = item.recordId;
        const data = depositSafe.find((d) => d.id === depId);
        if (!data) throw new Error('Data tidak ditemukan');

        const totalMasuk = depositSafe
          .filter((x) => x.warga_id === data.warga_id && x.tipe === 'masuk')
          .reduce((s, x) => s + Number(x.jumlah || 0), 0);
        const totalPakai = depositSafe
          .filter((x) => x.warga_id === data.warga_id && x.tipe === 'pakai')
          .reduce((s, x) => s + Number(x.jumlah || 0), 0);
        const sisaSaldo = totalMasuk - totalPakai;

        if (Number(data.jumlah) > sisaSaldo) {
          throw new Error('Deposit sudah dipakai. Undo distribusi dulu di tab Deposit.');
        }

        const { error } = await supabase
          .from('deposit_warga')
          .delete()
          .eq('id', depId);
        if (error) throw error;
      }

      // ── DEPOSIT PAKAI (Undo) ──
      else if (item.sumber === 'deposit' && item.depositTipe === 'pakai') {
        const dep = item.dataAsli;
        const tanggalStr = dep.tanggal;

        // Cari iuran terkait
        const { data: iuranTerkait, error: err1 } = await supabase
          .from('iuran')
          .select('id')
          .eq('warga_id', dep.warga_id)
          .eq('metode', 'deposit')
          .eq('tanggal_transaksi', tanggalStr);

        if (err1) throw err1;

        if (iuranTerkait && iuranTerkait.length > 0) {
          const ids = iuranTerkait.map((i) => i.id);
          const { error: err2 } = await supabase.from('iuran').delete().in('id', ids);
          if (err2) throw err2;
        }

        const { error: err3 } = await supabase
          .from('deposit_warga')
          .delete()
          .eq('id', item.recordId);
        if (err3) throw err3;
      }

      alert('✅ Berhasil dihapus.');
      setModalHapus(null);
      invalidateKeuanganCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setHapusSubmitting(false);
    }
  }

  // ═══════════════════════════════════════════════════════
  // INFO MODAL HAPUS
  // ═══════════════════════════════════════════════════════
  function getHapusInfo() {
    if (!modalHapus) return { data: {}, warning: null, title: '' };
    const item = modalHapus;

    // IURAN
    if (item.sumber === 'iuran') {
      const isTunai = item.metode === 'tunai';
      return {
        title: isTunai ? 'Hapus Batch Iuran Tunai' : 'Hapus Iuran',
        data: {
          Tanggal: item.tanggal,
          Tipe: item.tipe,
          Keterangan: item.keterangan,
          Nominal: formatRupiah(item.nominal),
        },
        warning: (
          <>
            ⚠️ <strong>Dampak:</strong>
            <div className="mt-1 text-[10px]">
              • Saldo kas <strong>turun</strong> {formatRupiah(item.nominal)}
              <br />
              • Grid bulan {item.keterangan.split(' — ')[1]} warga kembali kuning/belum
              <br />
              • Tunggakan warga akan muncul
              {isTunai && (
                <>
                  <br />
                  • <strong>Seluruh batch</strong> tunai akan terhapus
                </>
              )}
            </div>
          </>
        ),
      };
    }

    // PENGELUARAN
    if (item.sumber === 'pengeluaran') {
      return {
        title: 'Hapus Pengeluaran',
        data: {
          Tanggal: item.tanggal,
          Keterangan: item.keterangan,
          Nominal: formatRupiah(item.nominal),
        },
        warning: (
          <>
            ⚠️ <strong>Dampak:</strong>
            <div className="mt-1 text-[10px]">
              • Saldo kas <strong>naik</strong> {formatRupiah(item.nominal)}
            </div>
          </>
        ),
      };
    }

    // PEMASUKAN
    if (item.sumber === 'pemasukan_lain') {
      return {
        title: 'Hapus Pemasukan',
        data: {
          Tanggal: item.tanggal,
          Keterangan: item.keterangan,
          Nominal: formatRupiah(item.nominal),
        },
        warning: (
          <>
            ⚠️ <strong>Dampak:</strong>
            <div className="mt-1 text-[10px]">
              • Saldo kas <strong>turun</strong> {formatRupiah(item.nominal)}
            </div>
          </>
        ),
      };
    }

    // DEPOSIT MASUK
    if (item.sumber === 'deposit' && item.depositTipe === 'masuk') {
      return {
        title: 'Hapus Deposit Masuk',
        data: {
          Tanggal: item.tanggal,
          Keterangan: item.keterangan,
          Nominal: formatRupiah(item.nominal),
        },
        warning: (
          <>
            ⚠️ <strong>Dampak:</strong>
            <div className="mt-1 text-[10px]">
              • Saldo deposit warga <strong>turun</strong> {formatRupiah(item.nominal)}
            </div>
          </>
        ),
      };
    }

    // DEPOSIT PAKAI (UNDO)
    if (item.sumber === 'deposit' && item.depositTipe === 'pakai') {
      return {
        title: '↩️ Undo Distribusi Deposit',
        data: {
          Tanggal: item.tanggal,
          Keterangan: item.keterangan,
          Nominal: formatRupiah(item.nominal),
        },
        warning: (
          <>
            ⚠️ <strong>Dampak:</strong>
            <div className="mt-1 text-[10px]">
              • Iuran yang dihasilkan dari distribusi ini akan <strong>DIHAPUS</strong>
              <br />
              • Saldo deposit warga <strong>kembali</strong> {formatRupiah(item.nominal)}
              <br />
              • Grid bulan terkait kembali kuning/belum
            </div>
          </>
        ),
      };
    }

    return { data: {}, warning: null, title: '' };
  }

  const hapusInfo = getHapusInfo();

  return (
    <KeuanganLayout user={user} pendingCount={getPendingBatches(iuranList).length}>
      <TabRiwayat
        iuran={iuranList}
        pengeluaran={pengeluaranSafe}
        pemasukanLain={pemasukanSafe}
        depositList={depositSafe}
        warga={wargaSafe}
        onEdit={handleEdit}
        onHapus={handleHapus}
      />

      {/* Modal Edit — pilih berdasarkan tipe */}
      {modalEdit?.tipe === 'pengeluaran' && (
        <ModalEditPengeluaran
          data={modalEdit.data}
          onClose={() => setModalEdit(null)}
          onSave={handleSaveEdit}
        />
      )}
      {modalEdit?.tipe === 'pemasukan' && (
        <ModalEditPemasukan
          data={modalEdit.data}
          onClose={() => setModalEdit(null)}
          onSave={handleSaveEdit}
        />
      )}
      {modalEdit?.tipe === 'deposit' && (
        <ModalEditDeposit
          data={modalEdit.data}
          warga={wargaSafe}
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
        title={hapusInfo.title}
        data={hapusInfo.data}
        warning={hapusInfo.warning}
      />
    </KeuanganLayout>
  );
}

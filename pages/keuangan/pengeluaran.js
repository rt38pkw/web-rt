import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import KeuanganLayout from '../../components/keuangan/Layout';
import TabPengeluaran from '../../components/keuangan/TabPengeluaran';
import ModalEditPengeluaran from '../../components/keuangan/ModalEditPengeluaran';
import ModalKonfirmasiHapus from '../../components/keuangan/ModalKonfirmasiHapus';
import { formatRupiah } from '../../lib/keuangan/helpers';
import {
  useKeuanganData,
  getPendingBatches,
  invalidateKeuanganCache,
} from '../../lib/keuangan/hooks';

export default function PagePengeluaran() {
  const {
    user,
    iuran = [],
    pengeluaran = [],
    loading,
    refetch,
  } = useKeuanganData();

  const [pengTgl, setPengTgl] = useState(new Date().toISOString().split('T')[0]);
  const [pengJenis, setPengJenis] = useState('Kebutuhan RT');
  const [pengJenisCustom, setPengJenisCustom] = useState('');
  const [pengKet, setPengKet] = useState('');
  const [pengNominal, setPengNominal] = useState('');
  const [pengSubmitting, setPengSubmitting] = useState(false);

  const [modalEditPengeluaran, setModalEditPengeluaran] = useState(null);
  const [modalHapusPengeluaran, setModalHapusPengeluaran] = useState(null);
  const [hapusSubmitting, setHapusSubmitting] = useState(false);

  const iuranList = Array.isArray(iuran) ? iuran : [];
  const pengeluaranSafe = Array.isArray(pengeluaran) ? pengeluaran : [];

  // ═══ SSR GUARD ═══
  if (typeof window === 'undefined') return null;

  if (loading) {
    return (
      <KeuanganLayout user={user}>
        <div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div>
      </KeuanganLayout>
    );
  }

  // ═══ INPUT PENGELUARAN BARU ═══
  async function handleSubmitPengeluaran(e) {
    e.preventDefault();
    const jenisFinal = pengJenis === 'Lainnya' ? pengJenisCustom.trim() : pengJenis;
    if (!jenisFinal || !pengNominal) {
      alert('Lengkapi data');
      return;
    }
    setPengSubmitting(true);
    try {
      const { error } = await supabase.from('pengeluaran').insert([
        {
          tanggal: pengTgl,
          jenis: jenisFinal,
          keterangan: pengKet || null,
          nominal: Number(pengNominal),
          created_by: user?.id,
        },
      ]);
      if (error) throw error;
      alert('✅ Pengeluaran dicatat!');
      setPengKet('');
      setPengNominal('');
      setPengJenisCustom('');
      invalidateKeuanganCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setPengSubmitting(false);
    }
  }

  // ═══ EDIT PENGELUARAN ═══
  async function handleSaveEditPengeluaran({ id, tanggal, jenis, keterangan, nominal }) {
    try {
      const { error } = await supabase
        .from('pengeluaran')
        .update({ tanggal, jenis, keterangan, nominal })
        .eq('id', id);
      if (error) throw error;
      alert('✅ Pengeluaran berhasil diupdate!');
      setModalEditPengeluaran(null);
      invalidateKeuanganCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  }

  // ═══ HAPUS PENGELUARAN ═══
  async function handleHapusPengeluaran(p) {
    setModalHapusPengeluaran(p);
  }

  async function confirmHapusPengeluaran() {
    if (!modalHapusPengeluaran) return;
    setHapusSubmitting(true);
    try {
      const { error } = await supabase
        .from('pengeluaran')
        .delete()
        .eq('id', modalHapusPengeluaran.id);
      if (error) throw error;
      alert('✅ Pengeluaran dihapus.');
      setModalHapusPengeluaran(null);
      invalidateKeuanganCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setHapusSubmitting(false);
    }
  }

  return (
    <KeuanganLayout user={user} pendingCount={getPendingBatches(iuranList).length}>
      <TabPengeluaran
        pengeluaran={pengeluaranSafe}
        pengTgl={pengTgl}
        setPengTgl={setPengTgl}
        pengJenis={pengJenis}
        setPengJenis={setPengJenis}
        pengJenisCustom={pengJenisCustom}
        setPengJenisCustom={setPengJenisCustom}
        pengKet={pengKet}
        setPengKet={setPengKet}
        pengNominal={pengNominal}
        setPengNominal={setPengNominal}
        pengSubmitting={pengSubmitting}
        handleSubmitPengeluaran={handleSubmitPengeluaran}
        setModalEditPengeluaran={setModalEditPengeluaran}
        handleHapusPengeluaran={handleHapusPengeluaran}
      />

      {modalEditPengeluaran && (
        <ModalEditPengeluaran
          data={modalEditPengeluaran}
          onClose={() => setModalEditPengeluaran(null)}
          onSave={handleSaveEditPengeluaran}
        />
      )}

      <ModalKonfirmasiHapus
        open={!!modalHapusPengeluaran}
        onClose={() => setModalHapusPengeluaran(null)}
        onConfirm={confirmHapusPengeluaran}
        submitting={hapusSubmitting}
        title="Hapus Pengeluaran"
        data={
          modalHapusPengeluaran
            ? {
                Tanggal: modalHapusPengeluaran.tanggal,
                Jenis: modalHapusPengeluaran.jenis,
                Keterangan: modalHapusPengeluaran.keterangan || '-',
                Nominal: formatRupiah(modalHapusPengeluaran.nominal),
              }
            : {}
        }
        warning={
          <>
            ⚠️ <strong>Dampak:</strong>
            <div className="mt-1 text-[10px]">
              • Saldo kas <strong>naik</strong> Rp{Number(modalHapusPengeluaran?.nominal || 0).toLocaleString('id-ID')} (karena pengeluaran dikurangi)
            </div>
          </>
        }
      />
    </KeuanganLayout>
  );
}

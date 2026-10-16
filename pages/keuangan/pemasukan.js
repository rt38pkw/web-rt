import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import KeuanganLayout from '../../components/keuangan/Layout';
import TabPemasukan from '../../components/keuangan/TabPemasukan';
import ModalEditPemasukan from '../../components/keuangan/ModalEditPemasukan';
import ModalKonfirmasiHapus from '../../components/keuangan/ModalKonfirmasiHapus';
import { formatRupiah } from '../../lib/keuangan/helpers';
import {
  useKeuanganData,
  getPendingBatches,
  invalidateKeuanganCache,
} from '../../lib/keuangan/hooks';

export default function PagePemasukan() {
  const {
    user,
    iuran = [],
    pemasukanLain = [],
    loading,
    refetch,
  } = useKeuanganData();

  const [masukTgl, setMasukTgl] = useState(new Date().toISOString().split('T')[0]);
  const [masukJenis, setMasukJenis] = useState('Donasi');
  const [masukJenisCustom, setMasukJenisCustom] = useState('');
  const [masukKet, setMasukKet] = useState('');
  const [masukNominal, setMasukNominal] = useState('');
  const [masukSubmitting, setMasukSubmitting] = useState(false);

  const [modalEditPemasukan, setModalEditPemasukan] = useState(null);
  const [modalHapusPemasukan, setModalHapusPemasukan] = useState(null);
  const [hapusSubmitting, setHapusSubmitting] = useState(false);

  const iuranList = Array.isArray(iuran) ? iuran : [];
  const pemasukanSafe = Array.isArray(pemasukanLain) ? pemasukanLain : [];

  if (typeof window === 'undefined') return null;

  if (loading) {
    return (
      <KeuanganLayout user={user}>
        <div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div>
      </KeuanganLayout>
    );
  }

  // ═══ INPUT PEMASUKAN BARU ═══
  async function handleSubmitPemasukan(e) {
    e.preventDefault();
    const jenisFinal = masukJenis === 'Lainnya' ? masukJenisCustom.trim() : masukJenis;
    if (!jenisFinal || !masukNominal) {
      alert('Lengkapi data');
      return;
    }
    setMasukSubmitting(true);
    try {
      const { error } = await supabase.from('pemasukan_lain').insert([
        {
          tanggal: masukTgl,
          jenis: jenisFinal,
          keterangan: masukKet || null,
          nominal: Number(masukNominal),
          created_by: user?.id,
        },
      ]);
      if (error) throw error;
      alert('✅ Pemasukan dicatat!');
      setMasukKet('');
      setMasukNominal('');
      setMasukJenisCustom('');
      invalidateKeuanganCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setMasukSubmitting(false);
    }
  }

  // ═══ EDIT PEMASUKAN ═══
  async function handleSaveEditPemasukan({ id, tanggal, jenis, keterangan, nominal }) {
    try {
      const { error } = await supabase
        .from('pemasukan_lain')
        .update({ tanggal, jenis, keterangan, nominal })
        .eq('id', id);
      if (error) throw error;
      alert('✅ Pemasukan berhasil diupdate!');
      setModalEditPemasukan(null);
      invalidateKeuanganCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  }

  // ═══ HAPUS PEMASUKAN ═══
  async function handleHapusPemasukan(p) {
    setModalHapusPemasukan(p);
  }

  async function confirmHapusPemasukan() {
    if (!modalHapusPemasukan) return;
    setHapusSubmitting(true);
    try {
      const { error } = await supabase
        .from('pemasukan_lain')
        .delete()
        .eq('id', modalHapusPemasukan.id);
      if (error) throw error;
      alert('✅ Pemasukan dihapus.');
      setModalHapusPemasukan(null);
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
      <TabPemasukan
        pemasukanLain={pemasukanSafe}
        masukTgl={masukTgl}
        setMasukTgl={setMasukTgl}
        masukJenis={masukJenis}
        setMasukJenis={setMasukJenis}
        masukJenisCustom={masukJenisCustom}
        setMasukJenisCustom={setMasukJenisCustom}
        masukKet={masukKet}
        setMasukKet={setMasukKet}
        masukNominal={masukNominal}
        setMasukNominal={setMasukNominal}
        masukSubmitting={masukSubmitting}
        handleSubmitPemasukan={handleSubmitPemasukan}
        setModalEditPemasukan={setModalEditPemasukan}
        handleHapusPemasukan={handleHapusPemasukan}
      />

      {modalEditPemasukan && (
        <ModalEditPemasukan
          data={modalEditPemasukan}
          onClose={() => setModalEditPemasukan(null)}
          onSave={handleSaveEditPemasukan}
        />
      )}

      <ModalKonfirmasiHapus
        open={!!modalHapusPemasukan}
        onClose={() => setModalHapusPemasukan(null)}
        onConfirm={confirmHapusPemasukan}
        submitting={hapusSubmitting}
        title="Hapus Pemasukan"
        data={
          modalHapusPemasukan
            ? {
                Tanggal: modalHapusPemasukan.tanggal,
                Jenis: modalHapusPemasukan.jenis,
                Keterangan: modalHapusPemasukan.keterangan || '-',
                Nominal: formatRupiah(modalHapusPemasukan.nominal),
              }
            : {}
        }
        warning={
          <>
            ⚠️ <strong>Dampak:</strong>
            <div className="mt-1 text-[10px]">
              • Saldo kas <strong>turun</strong> Rp{Number(modalHapusPemasukan?.nominal || 0).toLocaleString('id-ID')}
            </div>
          </>
        }
      />
    </KeuanganLayout>
  );
}

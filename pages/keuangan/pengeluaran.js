import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import KeuanganLayout from '../../components/keuangan/Layout';
import TabPengeluaran from '../../components/keuangan/TabPengeluaran';
import { useKeuanganData, getPendingBatches, invalidateKeuanganCache } from '../../lib/keuangan/hooks';

export default function PagePengeluaran() {
  const { user, iuran, pengeluaran, loading, refetch } = useKeuanganData();
  const [pengTgl, setPengTgl] = useState(new Date().toISOString().split('T')[0]);
  const [pengJenis, setPengJenis] = useState('Kebutuhan RT');
  const [pengJenisCustom, setPengJenisCustom] = useState('');
  const [pengKet, setPengKet] = useState('');
  const [pengNominal, setPengNominal] = useState('');
  const [pengSubmitting, setPengSubmitting] = useState(false);

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
          created_by: user.id,
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

  if (loading) {
    return (
      <KeuanganLayout user={user}>
        <div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div>
      </KeuanganLayout>
    );
  }

  return (
    <KeuanganLayout user={user} pendingCount={getPendingBatches(iuran).length}>
      <TabPengeluaran
        pengeluaran={pengeluaran}
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
      />
    </KeuanganLayout>
  );
}
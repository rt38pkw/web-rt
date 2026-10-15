import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import KeuanganLayout from '../../components/keuangan/Layout';
import TabPemasukan from '../../components/keuangan/TabPemasukan';
import { useKeuanganData, getPendingBatches, invalidateKeuanganCache } from '../../lib/keuangan/hooks';

export default function PagePemasukan() {
  const { user, iuran, pemasukanLain, loading, refetch } = useKeuanganData();
  const [masukTgl, setMasukTgl] = useState(new Date().toISOString().split('T')[0]);
  const [masukJenis, setMasukJenis] = useState('Donasi');
  const [masukJenisCustom, setMasukJenisCustom] = useState('');
  const [masukKet, setMasukKet] = useState('');
  const [masukNominal, setMasukNominal] = useState('');
  const [masukSubmitting, setMasukSubmitting] = useState(false);

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
          created_by: user.id,
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

  if (loading) {
    return (
      <KeuanganLayout user={user}>
        <div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div>
      </KeuanganLayout>
    );
  }

  return (
    <KeuanganLayout user={user} pendingCount={getPendingBatches(iuran).length}>
      <TabPemasukan
        pemasukanLain={pemasukanLain}
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
      />
    </KeuanganLayout>
  );
}
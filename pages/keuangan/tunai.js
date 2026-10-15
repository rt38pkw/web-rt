import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import KeuanganLayout from '../../components/keuangan/Layout';
import TabTunai from '../../components/keuangan/TabTunai';
import { PERIODE_BULAN } from '../../lib/keuangan/constants';
import { tarifWarga } from '../../lib/keuangan/helpers';
import { useKeuanganData, getPendingBatches, invalidateKeuanganCache } from '../../lib/keuangan/hooks';

export default function PageTunai() {
  const { user, iuran, warga, tarifList, loading, refetch } = useKeuanganData();
  const [tunaiWargaId, setTunaiWargaId] = useState('');
  const [tunaiBulan, setTunaiBulan] = useState([]);
  const [tunaiTanggal, setTunaiTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [tunaiCatatan, setTunaiCatatan] = useState('');
  const [tunaiSubmitting, setTunaiSubmitting] = useState(false);

  const iuranWargaTerpilih = iuran.filter((i) => i.warga_id === tunaiWargaId);
  const wargaTerpilih = warga.find((w) => w.id === tunaiWargaId);
  const tarifTerpilih = wargaTerpilih ? tarifWarga(wargaTerpilih, tarifList, 2026) : 0;

  const bulanBelumLunas = PERIODE_BULAN.filter((bln) => {
    const totalApproved = iuranWargaTerpilih
      .filter((i) => i.bulan_tahun === bln.kode && i.status === 'approved')
      .reduce((s, i) => s + Number(i.jumlah || 0), 0);
    const adaPending = iuranWargaTerpilih.some(
      (i) => i.bulan_tahun === bln.kode && i.status === 'pending'
    );
    return !adaPending && totalApproved < tarifTerpilih;
  });

  const totalTunai = (() => {
    if (!wargaTerpilih) return 0;
    return tunaiBulan.reduce((sum, bln) => {
      const totalApproved = iuranWargaTerpilih
        .filter((i) => i.bulan_tahun === bln && i.status === 'approved')
        .reduce((s, i) => s + Number(i.jumlah || 0), 0);
      return sum + Math.max(0, tarifTerpilih - totalApproved);
    }, 0);
  })();

  async function handleSubmitTunai(e) {
    e.preventDefault();
    if (!tunaiWargaId || tunaiBulan.length === 0) {
      alert('Pilih warga dan minimal 1 bulan');
      return;
    }
    setTunaiSubmitting(true);
    try {
      const batchId = crypto.randomUUID();
      const records = tunaiBulan
        .map((bln) => {
          const totalApproved = iuranWargaTerpilih
            .filter((i) => i.bulan_tahun === bln && i.status === 'approved')
            .reduce((s, i) => s + Number(i.jumlah || 0), 0);
          return {
            warga_id: tunaiWargaId,
            bulan_tahun: bln,
            jumlah: Math.max(0, tarifTerpilih - totalApproved),
            status: 'approved',
            metode: 'tunai',
            batch_id: batchId,
            bukti_urls: null,
            catatan: tunaiCatatan || null,
            tanggal_transaksi: tunaiTanggal,
          };
        })
        .filter((r) => r.jumlah > 0);
      if (records.length === 0) throw new Error('Tidak ada nominal');
      const { error } = await supabase.from('iuran').insert(records);
      if (error) throw error;
      alert('✅ Iuran tunai berhasil dicatat!');
      setTunaiWargaId('');
      setTunaiBulan([]);
      setTunaiCatatan('');
      invalidateKeuanganCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setTunaiSubmitting(false);
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
      <TabTunai
        warga={warga}
        tarifList={tarifList}
        tunaiWargaId={tunaiWargaId}
        setTunaiWargaId={setTunaiWargaId}
        tunaiBulan={tunaiBulan}
        setTunaiBulan={setTunaiBulan}
        tunaiTanggal={tunaiTanggal}
        setTunaiTanggal={setTunaiTanggal}
        tunaiCatatan={tunaiCatatan}
        setTunaiCatatan={setTunaiCatatan}
        bulanBelumLunas={bulanBelumLunas}
        totalTunai={totalTunai}
        tunaiSubmitting={tunaiSubmitting}
        handleSubmitTunai={handleSubmitTunai}
      />
    </KeuanganLayout>
  );
}

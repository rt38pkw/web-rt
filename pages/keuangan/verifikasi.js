import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import KeuanganLayout from '../../components/keuangan/Layout';
import TabVerifikasi from '../../components/keuangan/TabVerifikasi';
import { useKeuanganData, getPendingBatches, invalidateKeuanganCache } from '../../lib/keuangan/hooks';

export default function PageVerifikasi() {
  const { user, iuran, loading, refetch } = useKeuanganData();
  const [filterVerif, setFilterVerif] = useState('pending');

  const getPathFromUrl = (url) => {
    if (!url) return null;
    const marker = '/bukti-transfer/';
    const idx = url.indexOf(marker);
    return idx === -1 ? null : url.substring(idx + marker.length);
  };

  async function handleApprove(batch) {
    if (!confirm('Approve pembayaran ini?')) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const batchId = batch.batchId;
      await supabase
        .from('iuran')
        .update({ status: 'approved', tanggal_transaksi: today, metode: 'qris' })
        .eq('batch_id', batchId);
      const urls = batch.items[0]?.bukti_urls || [];
      const paths = urls.map(getPathFromUrl).filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from('bukti-transfer').remove(paths);
        await supabase.from('iuran').update({ bukti_urls: null }).eq('batch_id', batchId);
      }
      alert('✅ Berhasil di-approve.');
      invalidateKeuanganCache();
      refetch();
    } catch (err) {
      alert('Gagal approve: ' + err.message);
    }
  }

  if (loading) {
    return (
      <KeuanganLayout user={user}>
        <div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div>
      </KeuanganLayout>
    );
  }

  const pendingBatches = getPendingBatches(iuran);

  return (
    <KeuanganLayout user={user} pendingCount={pendingBatches.length}>
      <TabVerifikasi
        pendingBatches={pendingBatches}
        iuran={iuran}
        filterVerif={filterVerif}
        setFilterVerif={setFilterVerif}
        handleApprove={handleApprove}
      />
    </KeuanganLayout>
  );
}

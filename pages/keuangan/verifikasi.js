// pages/keuangan/verifikasi.js
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

  const kirimNotifWarga = async (wargaId, judul, pesan, url) => {
    try {
      await supabase.functions.invoke('smart-handler', {
        body: {
          role_target: 'warga',
          target_id: wargaId,
          title: judul,
          body: pesan,
          url: url
        }
      });
    } catch (e) { console.log('Gagal kirim notif:', e); }
  };

  async function handleApprove(batch) {
    if (!confirm('Approve pembayaran ini? (Foto baru disimpan, foto lama warga ini akan dibersihkan)')) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const wargaId = batch.items[0]?.warga_id;
      const listBulan = batch.items.map(i => i.bulan_tahun).join(', ');

      await supabase.from('iuran').update({ status: 'approved', tanggal_transaksi: today, metode: 'qris' }).eq('batch_id', batch.batchId);
      
      const { data: previousBatches } = await supabase.from('iuran').select('id, batch_id, bukti_urls').eq('warga_id', wargaId).eq('status', 'approved').neq('batch_id', batch.batchId);
      
      if (previousBatches && previousBatches.length > 0) {
        const allPaths = [];
        const affectedBatchIds = new Set();
        previousBatches.forEach(prev => {
          const urls = prev.bukti_urls || [];
          if (urls.length === 0 || urls[0] === 'DIHAPUS') return;
          urls.forEach(url => { const path = getPathFromUrl(url); if (path) allPaths.push(path); });
          affectedBatchIds.add(prev.batch_id);
        });
        if (allPaths.length > 0) {
          await supabase.storage.from('bukti-transfer').remove(allPaths);
          for (const oldBatchId of affectedBatchIds) { await supabase.from('iuran').update({ bukti_urls: ['DIHAPUS'] }).eq('batch_id', oldBatchId); }
        }
      }

      await kirimNotifWarga(wargaId, '✅ Pembayaran Iuran Disetujui', `Pembayaran iuran bulan ${listBulan} Anda telah disetujui. Terima kasih!`, '/dashboard-warga/iuran');
      
      alert('✅ Berhasil di-approve! Bukti terbaru tersimpan, bukti lama dibersihkan.'); 
      invalidateKeuanganCache(); refetch();
    } catch (err) { alert('Gagal approve: ' + err.message); }
  }

  async function handleReject(batch) {
    const alasan = prompt('Masukkan alasan penolakan (wajib diisi):');
    if (alasan === null) return;
    if (!alasan.trim()) { alert('Alasan penolakan tidak boleh kosong!'); return; }
    try {
      const wargaId = batch.items[0]?.warga_id;
      const listBulan = batch.items.map(i => i.bulan_tahun).join(', ');

      await supabase.from('iuran').update({ status: 'rejected', catatan: `Ditolak: ${alasan.trim()}` }).eq('batch_id', batch.batchId);
      
      await kirimNotifWarga(wargaId, '❌ Pembayaran Iuran Ditolak', `Pembayaran iuran bulan ${listBulan} ditolak. Alasan: ${alasan.trim()}`, '/dashboard-warga/iuran');

      alert('✅ Pembayaran ditolak.'); invalidateKeuanganCache(); refetch();
    } catch (err) { alert('Gagal menolak: ' + err.message); }
  }

  if (loading) return <KeuanganLayout user={user}><div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div></KeuanganLayout>;
  const pendingBatches = getPendingBatches(iuran);

  return (
    <KeuanganLayout user={user} pendingCount={pendingBatches.length}>
      <TabVerifikasi pendingBatches={pendingBatches} iuran={iuran} filterVerif={filterVerif} setFilterVerif={setFilterVerif} handleApprove={handleApprove} handleReject={handleReject} />
    </KeuanganLayout>
  );
}

// pages/proyek/verifikasi.js
import { supabase } from '../../lib/supabase';
import Layout from '../../components/proyek/Layout';
import TabVerifikasi from '../../components/proyek/TabVerifikasi';
import { useProyekData, getPendingProyekCount, invalidateProyekCache } from '../../lib/proyek/hooks';
import { hapusBuktiProyek } from '../../lib/proyek/storage';

export default function PageProyekVerifikasi() {
  const { user, warga, proyekList, iuranProyekList, loading, refetch } = useProyekData();
  if (typeof window === 'undefined') return null;

  async function handleApprove(item) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 1. Update status
      const { error: errUpdate } = await supabase.from('iuran_proyek').update({ status: 'approved', tanggal_transaksi: today }).eq('id', item.id);
      if (errUpdate) throw errUpdate;
      
      // 2. Hapus file fisik
      const bukti = item.bukti_urls || [];
      if (bukti.length > 0) {
        try { 
          await hapusBuktiProyek(bukti); 
          // 3. Ubah URL di database menjadi ['DIHAPUS']
          await supabase.from('iuran_proyek').update({ bukti_urls: ['DIHAPUS'] }).eq('id', item.id); 
        } catch (errHapus) { 
          console.warn('Gagal hapus bukti:', errHapus); 
        }
      }

      // ═══ TAMBAHAN NOTIFIKASI KE WARGA ═══
      try {
        const namaProyek = proyekList.find(p => p.id === item.proyek_id)?.nama || 'Proyek';
        await supabase.functions.invoke('smart-handler', {
          body: {
            role_target: 'warga',
            target_id: item.warga_id,
            title: '✅ Pembayaran Proyek Disetujui',
            body: `Pembayaran proyek ${namaProyek} Anda telah disetujui.`,
            url: '/dashboard-warga/projek'
          }
        });
      } catch (notifErr) {
        console.log('Gagal kirim notif approve:', notifErr);
      }
      // ═════════════════════════════════════

      alert('✅ Cicilan berhasil di-approve & foto dibersihkan!'); 
      invalidateProyekCache(); 
      refetch();
    } catch (err) { alert('Gagal: ' + err.message); }
  }

  async function handleReject(item) {
    const alasan = prompt('Masukkan alasan penolakan (wajib diisi):');
    if (alasan === null) return;
    if (!alasan.trim()) { alert('Alasan penolakan tidak boleh kosong!'); return; }
    try {
      const { error } = await supabase.from('iuran_proyek').update({ status: 'rejected', catatan: `Ditolak: ${alasan.trim()}` }).eq('id', item.id);
      if (error) throw error;

      // ═══ TAMBAHAN NOTIFIKASI KE WARGA ═══
      try {
        const namaProyek = proyekList.find(p => p.id === item.proyek_id)?.nama || 'Proyek';
        await supabase.functions.invoke('smart-handler', {
          body: {
            role_target: 'warga',
            target_id: item.warga_id,
            title: '❌ Pembayaran Proyek Ditolak',
            body: `Pembayaran proyek ${namaProyek} ditolak. Alasan: ${alasan.trim()}`,
            url: '/dashboard-warga/projek'
          }
        });
      } catch (notifErr) {
        console.log('Gagal kirim notif reject:', notifErr);
      }
      // ═════════════════════════════════════

      alert('✅ Cicilan berhasil ditolak.'); invalidateProyekCache(); refetch();
    } catch (err) { alert('Gagal menolak: ' + err.message); }
  }

  if (loading) return <Layout user={user}><div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div></Layout>;
  const pendingCount = getPendingProyekCount(iuranProyekList);

  return (
    <Layout user={user} pendingCount={pendingCount}>
      <TabVerifikasi proyekList={proyekList} iuranProyekList={iuranProyekList} wargaList={warga} onApprove={handleApprove} onReject={handleReject} />
    </Layout>
  );
}

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import KeuanganLayout from '../../components/keuangan/Layout';
import SubTabNav from '../../components/keuangan/proyek/SubTabNav';
import TabRingkasan from '../../components/keuangan/proyek/TabRingkasan';
import TabVerifikasi from '../../components/keuangan/proyek/TabVerifikasi';
import { useKeuanganData, invalidateKeuanganCache } from '../../lib/keuangan/hooks';
import { hapusBuktiProyek } from '../../lib/proyek/storage';

export default function PageProjek() {
  const {
    user,
    warga = [],
    proyekList = [],
    iuranProyekList = [],
    loading,
    refetch,
  } = useKeuanganData();

  const [activeTab, setActiveTab] = useState('ringkasan');

  const wargaList = Array.isArray(warga) ? warga : [];
  const proyekSafe = Array.isArray(proyekList) ? proyekList : [];
  const iuranProyekSafe = Array.isArray(iuranProyekList) ? iuranProyekList : [];

  if (typeof window === 'undefined') return null;

  if (loading) {
    return (
      <KeuanganLayout user={user}>
        <div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div>
      </KeuanganLayout>
    );
  }

  const pendingCount = iuranProyekSafe.filter((i) => i.status === 'pending').length;

  // ══════════════════════════════════════════════
  // APPROVE CICILAN PROYEK
  // ══════════════════════════════════════════════
  async function handleApprove(item) {
    try {
      const today = new Date().toISOString().split('T')[0];

      // 1. Update status → approved
      const { error: errUpdate } = await supabase
        .from('iuran_proyek')
        .update({
          status: 'approved',
          tanggal_transaksi: today,
        })
        .eq('id', item.id);
      if (errUpdate) throw errUpdate;

      // 2. Hapus file bukti dari storage (hemat storage)
      const bukti = item.bukti_urls || [];
      if (bukti.length > 0) {
        try {
          await hapusBuktiProyek(bukti);
          // Set bukti_urls jadi null di DB
          await supabase
            .from('iuran_proyek')
            .update({ bukti_urls: null })
            .eq('id', item.id);
        } catch (errHapus) {
          console.warn('Gagal hapus bukti:', errHapus);
          // Tetap lanjut, tidak block approve
        }
      }

      alert('✅ Cicilan berhasil di-approve!');
      invalidateKeuanganCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  }

  // ══════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════
  return (
    <KeuanganLayout user={user} pendingCount={pendingCount}>
      <div className="space-y-4">
        <SubTabNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingCount={pendingCount}
        />

        {activeTab === 'ringkasan' && (
          <TabRingkasan
            proyekList={proyekSafe}
            iuranProyekList={iuranProyekSafe}
            wargaList={wargaList}
          />
        )}

        {activeTab === 'verifikasi' && (
          <TabVerifikasi
            proyekList={proyekSafe}
            iuranProyekList={iuranProyekSafe}
            wargaList={wargaList}
            onApprove={handleApprove}
          />
        )}

        {activeTab === 'tunai' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <div className="text-3xl mb-2">💵</div>
            <p className="text-xs text-slate-400">Sub-tab Input Tunai — Batch F</p>
          </div>
        )}

        {activeTab === 'tunggakan' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <div className="text-3xl mb-2">⚠️</div>
            <p className="text-xs text-slate-400">Sub-tab Tunggakan — Batch F</p>
          </div>
        )}

        {activeTab === 'kelola' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <div className="text-3xl mb-2">➕</div>
            <p className="text-xs text-slate-400">Sub-tab Kelola Proyek — Batch F</p>
          </div>
        )}
      </div>
    </KeuanganLayout>
  );
}

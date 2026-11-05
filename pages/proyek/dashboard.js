import { useEffect } from 'react';
import Layout from '../../components/proyek/Layout';
import TabRingkasan from '../../components/proyek/TabRingkasan';
import { useProyekData, getPendingProyekCount } from '../../lib/proyek/hooks';
import { setupPushNotifications } from '../../lib/push-notifications';

export default function PageProyekDashboard() {
  const { user, warga, proyekList, iuranProyekList, kasProyekList, loading } = useProyekData();

  // ═══ TAMBAHAN BARU: Minta Izin Notifikasi ═══
  useEffect(() => {
    const savedUser = localStorage.getItem('pengurusSession');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser.id) {
        setupPushNotifications('pengurus', parsedUser.id);
      }
    }
  }, []);
  // ════════════════════════════════════════════

  if (typeof window === 'undefined') return null;

  if (loading) {
    return (
      <Layout user={user}>
        <div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div>
      </Layout>
    );
  }

  const pendingCount = getPendingProyekCount(iuranProyekList);

  return (
    <Layout user={user} pendingCount={pendingCount}>
      <TabRingkasan
        proyekList={proyekList}
        iuranProyekList={iuranProyekList}
        kasProyekList={kasProyekList}
        wargaList={warga}
      />
    </Layout>
  );
}

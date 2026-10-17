import Layout from '../../components/proyek/Layout';
import TabRingkasan from '../../components/proyek/TabRingkasan';
import { useProyekData, getPendingProyekCount } from '../../lib/proyek/hooks';

export default function PageProyekDashboard() {
  const { user, warga, proyekList, iuranProyekList, kasProyekList, loading } = useProyekData();

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

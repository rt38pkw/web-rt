import Layout from '../../components/proyek/Layout';
import { useProyekData, getPendingProyekCount } from '../../lib/proyek/hooks';

export default function PageProyekKelola() {
  const { user, iuranProyekList, loading } = useProyekData();

  if (typeof window === 'undefined') return null;

  if (loading) {
    return (
      <Layout user={user}>
        <div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div>
      </Layout>
    );
  }

  return (
    <Layout user={user} pendingCount={getPendingProyekCount(iuranProyekList)}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
        <div className="text-3xl mb-2">➕</div>
        <p className="text-xs text-slate-400">Sub-tab Kelola Proyek — Batch F</p>
      </div>
    </Layout>
  );
}

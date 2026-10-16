import KeuanganLayout from '../../components/keuangan/Layout';
import { useKeuanganData, getPendingBatches } from '../../lib/keuangan/hooks';

export default function PageProjek() {
  const { user, iuran = [], loading } = useKeuanganData();
  const iuranList = Array.isArray(iuran) ? iuran : [];

  if (typeof window === 'undefined') return null;

  if (loading) {
    return (
      <KeuanganLayout user={user}>
        <div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div>
      </KeuanganLayout>
    );
  }

  return (
    <KeuanganLayout user={user} pendingCount={getPendingBatches(iuranList).length}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
        <div className="text-5xl">🏗️</div>
        <h3 className="text-lg font-bold text-white">Manajemen Proyek</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Fitur proyek sedang dalam pengembangan. Akan segera tersedia:
          ringkasan, verifikasi cicilan, input tunai, tunggakan, dan kelola proyek.
        </p>
      </div>
    </KeuanganLayout>
  );
}
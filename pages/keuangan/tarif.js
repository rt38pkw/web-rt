import KeuanganLayout from '../../components/keuangan/Layout';
import TabTarif from '../../components/keuangan/TabTarif';
import { useKeuanganData, getPendingBatches } from '../../lib/keuangan/hooks';

export default function PageTarif() {
  const { user, iuran, loading } = useKeuanganData();

  if (loading) {
    return (
      <KeuanganLayout user={user}>
        <div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div>
      </KeuanganLayout>
    );
  }

  return (
    <KeuanganLayout user={user} pendingCount={getPendingBatches(iuran).length}>
      <TabTarif user={user} />
    </KeuanganLayout>
  );
}
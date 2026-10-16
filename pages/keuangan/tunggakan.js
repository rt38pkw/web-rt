import KeuanganLayout from '../../components/keuangan/Layout';
import TabTunggakan from '../../components/keuangan/TabTunggakan';
import { useKeuanganData, getPendingBatches } from '../../lib/keuangan/hooks';

export default function PageTunggakan() {
  const { user, iuran = [], warga = [], tarifList = [], loading } = useKeuanganData();

  const iuranList = Array.isArray(iuran) ? iuran : [];
  const wargaList = Array.isArray(warga) ? warga : [];

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
      <TabTunggakan warga={wargaList} tarifList={tarifList} iuran={iuranList} />
    </KeuanganLayout>
  );
}

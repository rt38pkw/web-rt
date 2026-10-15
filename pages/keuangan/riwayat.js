import KeuanganLayout from '../../components/keuangan/Layout';
import TabRiwayat from '../../components/keuangan/TabRiwayat';
import { useKeuanganData, getPendingBatches } from '../../lib/keuangan/hooks';

export default function PageRiwayat() {
  const { user, iuran, pengeluaran, pemasukanLain, depositList, warga, loading } = useKeuanganData();

  if (loading) {
    return (
      <KeuanganLayout user={user}>
        <div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div>
      </KeuanganLayout>
    );
  }

  return (
    <KeuanganLayout user={user} pendingCount={getPendingBatches(iuran).length}>
      <TabRiwayat
        iuran={iuran}
        pengeluaran={pengeluaran}
        pemasukanLain={pemasukanLain}
        depositList={depositList}
        warga={warga}
      />
    </KeuanganLayout>
  );
}
import KeuanganLayout from '../../components/keuangan/Layout';
import TabDashboard from '../../components/keuangan/TabDashboard';
import { useKeuanganData, getPendingBatches } from '../../lib/keuangan/hooks';

export default function PageDashboard() {
  const { user, iuran, pengeluaran, pemasukanLain, depositList, loading, refetch } = useKeuanganData();

  if (loading) {
    return (
      <KeuanganLayout user={user}>
        <div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div>
      </KeuanganLayout>
    );
  }

  const totalIuranApproved = iuran
    .filter((i) => i.status === 'approved')
    .reduce((s, i) => s + Number(i.jumlah || 0), 0);
  const totalPemasukanLain = pemasukanLain.reduce((s, p) => s + Number(p.nominal || 0), 0);
  const totalPemasukan = totalIuranApproved + totalPemasukanLain;
  const totalPengeluaran = pengeluaran.reduce((s, p) => s + Number(p.nominal || 0), 0);
  const saldoDepositTotal = depositList.reduce(
    (s, d) => s + (d.tipe === 'masuk' ? Number(d.jumlah) : -Number(d.jumlah)),
    0
  );
  const saldoKasBebas = totalPemasukan - totalPengeluaran - saldoDepositTotal;
  const pendingBatches = getPendingBatches(iuran);

  return (
    <KeuanganLayout user={user} pendingCount={pendingBatches.length}>
      <TabDashboard
        saldoKasBebas={saldoKasBebas}
        saldoDepositTotal={saldoDepositTotal}
        totalPemasukan={totalPemasukan}
        totalPengeluaran={totalPengeluaran}
        totalIuranApproved={totalIuranApproved}
        totalPemasukanLain={totalPemasukanLain}
        pendingBatches={pendingBatches}
        pengeluaran={pengeluaran}
        setTab={(tab) => (window.location.href = `/keuangan/${tab}`)}
      />
    </KeuanganLayout>
  );
}
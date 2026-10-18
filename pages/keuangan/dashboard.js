import KeuanganLayout from '../../components/keuangan/Layout';
import TabDashboard from '../../components/keuangan/TabDashboard';
import { useKeuanganData, getPendingBatches } from '../../lib/keuangan/hooks';

export default function PageDashboard() {
  const {
    user,
    iuran = [],
    pengeluaran = [],
    pemasukanLain = [],
    depositList = [],
    proyekList = [],
    iuranProyekList = [],
    loading,
  } = useKeuanganData();

  if (typeof window === 'undefined') return null;

  if (loading) {
    return (
      <KeuanganLayout user={user}>
        <div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div>
      </KeuanganLayout>
    );
  }

  const iuranList = Array.isArray(iuran) ? iuran : [];
  const pengeluaranSafe = Array.isArray(pengeluaran) ? pengeluaran : [];
  const pemasukanSafe = Array.isArray(pemasukanLain) ? pemasukanLain : [];
  const depositSafe = Array.isArray(depositList) ? depositList : [];
  const proyekSafe = Array.isArray(proyekList) ? proyekList : [];
  const iuranProyekSafe = Array.isArray(iuranProyekList) ? iuranProyekList : [];

  const totalIuranBulanan = iuranList
    .filter((i) => i.status === 'approved' && i.metode !== 'deposit')
    .reduce((s, i) => s + Number(i.jumlah || 0), 0);

  const totalIuranApproved = iuranList
    .filter((i) => i.status === 'approved')
    .reduce((s, i) => s + Number(i.jumlah || 0), 0);

  const totalPemasukanLain = pemasukanSafe.reduce((s, p) => s + Number(p.nominal || 0), 0);

  const totalPengeluaranUmum = pengeluaranSafe
    .filter((p) => !p.proyek_id)
    .reduce((s, p) => s + Number(p.nominal || 0), 0);

  const totalPengeluaranProyek = pengeluaranSafe
    .filter((p) => p.proyek_id)
    .reduce((s, p) => s + Number(p.nominal || 0), 0);

  const totalPengeluaran = totalPengeluaranUmum + totalPengeluaranProyek;

  const saldoDepositTotal = depositSafe.reduce(
    (s, d) => s + (d.tipe === 'masuk' ? Number(d.jumlah) : -Number(d.jumlah)),
    0
  );

  const totalIuranProyekApproved = iuranProyekSafe
    .filter((i) => i.status === 'approved')
    .reduce((s, i) => s + Number(i.jumlah || 0), 0);

  const danaProyek = totalIuranProyekApproved - totalPengeluaranProyek;
  const saldoKasBebas = totalIuranBulanan + totalPemasukanLain - totalPengeluaranUmum;
  const totalUangRekening = saldoKasBebas + saldoDepositTotal + danaProyek;

  const pendingBatches = getPendingBatches(iuranList);
  const proyekAktif = proyekSafe.filter((p) => p.status === 'aktif').length;

  return (
    <KeuanganLayout user={user} pendingCount={pendingBatches.length}>
      <TabDashboard
        saldoKasBebas={saldoKasBebas}
        saldoDepositTotal={saldoDepositTotal}
        danaProyek={danaProyek}
        totalUangRekening={totalUangRekening}
        totalPemasukan={totalIuranBulanan + totalPemasukanLain}
        totalPengeluaran={totalPengeluaran}
        totalIuranApproved={totalIuranBulanan}
        totalPemasukanLain={totalPemasukanLain}
        proyekAktif={proyekAktif}
        pendingBatches={pendingBatches}
        pengeluaran={pengeluaranSafe}
      />
    </KeuanganLayout>
  );
}

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
    loading,
  } = useKeuanganData(); // ProyekList & IuranProyekList tidak perlu diambil lagi

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

  // Iuran bulanan REAL
  const totalIuranBulanan = iuranList
    .filter((i) => i.status === 'approved' && i.metode !== 'deposit')
    .reduce((s, i) => s + Number(i.jumlah || 0), 0);

  const totalPemasukanLain = pemasukanSafe.reduce((s, p) => s + Number(p.nominal || 0), 0);

  // Hanya hitung pengeluaran umum (bukan proyek)
  const totalPengeluaranUmum = pengeluaranSafe
    .filter((p) => !p.proyek_id)
    .reduce((s, p) => s + Number(p.nominal || 0), 0);

  // Saldo deposit warga
  const saldoDepositTotal = depositSafe.reduce(
    (s, d) => s + (d.tipe === 'masuk' ? Number(d.jumlah) : -Number(d.jumlah)),
    0
  );

  // Saldo Kas Bebas (milik RT)
  const saldoKasBebas = totalIuranBulanan + totalPemasukanLain - totalPengeluaranUmum;

  // Total uang di rekening (Kas Bebas + Deposit)
  const totalUangRekening = saldoKasBebas + saldoDepositTotal;

  const pendingBatches = getPendingBatches(iuranList);

  return (
    <KeuanganLayout user={user} pendingCount={pendingBatches.length}>
      <TabDashboard
        saldoKasBebas={saldoKasBebas}
        saldoDepositTotal={saldoDepositTotal}
        totalUangRekening={totalUangRekening}
        totalPemasukan={totalIuranBulanan + totalPemasukanLain}
        totalPengeluaran={totalPengeluaranUmum} // Pengeluaran umum aja
        totalIuranApproved={totalIuranBulanan}
        totalPemasukanLain={totalPemasukanLain}
        pendingBatches={pendingBatches}
        pengeluaran={pengeluaranSafe}
        iuranList={iuranList}
      />
    </KeuanganLayout>
  );
}

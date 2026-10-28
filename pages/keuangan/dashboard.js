// pages/keuangan/dashboard.js
import KeuanganLayout from '../../components/keuangan/Layout';
import TabDashboard from '../../components/keuangan/TabDashboard';
import { useKeuanganData, getPendingBatches } from '../../lib/keuangan/hooks';
import { exportLaporanKeuangan } from '../../lib/keuangan/exportExcel'; // Import fungsi export

export default function PageDashboard() {
  const {
    user,
    iuran = [],
    pengeluaran = [],
    pemasukanLain = [],
    depositList = [],
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

  // Handler Tombol Export
  const handleExport = () => {
    exportLaporanKeuangan({
      iuranList,
      pengeluaranList: pengeluaranSafe,
      pemasukanLainList: pemasukanSafe,
      saldoKasBebas,
      totalPemasukan: totalIuranBulanan + totalPemasukanLain,
      totalPengeluaran: totalPengeluaranUmum,
    });
  };

  return (
    <KeuanganLayout user={user} pendingCount={pendingBatches.length}>
      {/* TOMBOL EXPORT DI ATAS DASHBOARD */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-bold text-white">Ringkasan Keuangan</h2>
          <p className="text-xs text-slate-400">Pantau arus kas RT secara transparan</p>
        </div>
        <button 
          onClick={handleExport}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition shadow-lg shadow-emerald-600/20 flex items-center gap-2"
        >
          📥 Export Excel
        </button>
      </div>

      <TabDashboard
        saldoKasBebas={saldoKasBebas}
        saldoDepositTotal={saldoDepositTotal}
        totalUangRekening={totalUangRekening}
        totalPemasukan={totalIuranBulanan + totalPemasukanLain}
        totalPengeluaran={totalPengeluaranUmum}
        totalIuranApproved={totalIuranBulanan}
        totalPemasukanLain={totalPemasukanLain}
        pendingBatches={pendingBatches}
        pengeluaran={pengeluaranSafe}
        iuranList={iuranList}
      />
    </KeuanganLayout>
  );
}

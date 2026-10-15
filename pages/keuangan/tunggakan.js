import { useState } from 'react';
import KeuanganLayout from '../../components/keuangan/Layout';
import TabTunggakan from '../../components/keuangan/TabTunggakan';
import { useKeuanganData, getPendingBatches } from '../../lib/keuangan/hooks';

export default function PageTunggakan() {
  const { user, iuran, warga, loading } = useKeuanganData();
  const [tunggakanBulan, setTunggakanBulan] = useState('2026-10');

  if (loading) {
    return (
      <KeuanganLayout user={user}>
        <div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div>
      </KeuanganLayout>
    );
  }

  return (
    <KeuanganLayout user={user} pendingCount={getPendingBatches(iuran).length}>
      <TabTunggakan
        warga={warga}
        iuran={iuran}
        tunggakanBulan={tunggakanBulan}
        setTunggakanBulan={setTunggakanBulan}
      />
    </KeuanganLayout>
  );
}
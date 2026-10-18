import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function DashboardWargaIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard-warga/iuran');
  }, [router]);
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 text-sm">
      Memuat halaman...
    </div>
  );
}

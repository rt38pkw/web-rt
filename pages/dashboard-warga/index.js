import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function DashboardWargaIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard-warga/iuran');
  }, []);
  return null;
}
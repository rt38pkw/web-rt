import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function KeuanganIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/keuangan/dashboard');
  }, []);
  return null;
}
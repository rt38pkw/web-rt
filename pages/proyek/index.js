import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ProyekIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/proyek/dashboard');
  }, []);
  return null;
}

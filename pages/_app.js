import { useEffect } from 'react';
import { useRouter } from 'next/router';
import '../styles/globals.css';
import InstallPrompt from '../components/InstallPrompt';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const isPengurusPage = router.pathname.startsWith('/admin');

  // Register service worker (PWA)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => console.log('✅ Service Worker registered:', reg.scope))
          .catch((err) => console.log('❌ SW registration failed:', err));
      });
    }
  }, []);

  return (
    <>
      <Component {...pageProps} />
      {!isPengurusPage && <InstallPrompt />}
    </>
  );
}

export default MyApp;

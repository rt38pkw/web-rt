import { useRouter } from 'next/router';
import Head from 'next/head';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  
  // Cek apakah sedang di halaman admin atau warga
  const isAdmin = router.pathname.startsWith('/admin');
  const isWarga = router.pathname.startsWith('/dashboard-warga') || router.pathname.startsWith('/warga');

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        
        {/* Pilih manifest yang sesuai */}
        {isAdmin ? (
          <link rel="manifest" href="/manifest-admin.json" />
        ) : isWarga ? (
          <link rel="manifest" href="/manifest-warga.json" />
        ) : (
          <link rel="manifest" href="/manifest.json" />
        )}
      </Head>
      
      <Component {...pageProps} />
    </>
  );
}

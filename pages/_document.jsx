import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="id">
      <Head>
        {/* Manifest PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1e40af" />

        {/* iOS PWA */}
        <link rel="apple-touch-icon" href="/logo-rt38.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="RT 38 PKW" />

        {/* Android PWA */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="RT 38 PKW" />

        {/* Favicon */}
        <link rel="icon" type="image/png" href="/logo-rt38.png" />
        <link rel="shortcut icon" href="/logo-rt38.png" />

        {/* SEO basic */}
        <meta name="description" content="Portal mandiri warga RT 38 Puri Kencana Wagir" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
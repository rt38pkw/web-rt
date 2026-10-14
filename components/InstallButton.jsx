import { useEffect, useState } from 'react';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      setShow(false);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => {
      setIsInstalled(true);
      setShow(false);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setShow(false);
      setDeferredPrompt(null);
      return;
    }

    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);

    if (isIOS) {
      alert(
        '📱 Cara Install di iPhone:\n\n' +
        '1. Ketuk tombol Share (kotak dengan panah)\n' +
        '2. Pilih "Tambahkan ke Layar Utama"\n' +
        '3. Ketuk "Tambah"'
      );
    } else {
      alert(
        '📱 Cara Install di Android:\n\n' +
        '1. Ketuk menu titik-3 di kanan atas Chrome\n' +
        '2. Pilih "Install app" atau "Tambahkan ke layar utama"\n' +
        '3. Konfirmasi'
      );
    }
  };

  if (!show || isInstalled) return null;

  return (
    <button
      onClick={handleClick}
      className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg border border-blue-500 font-medium transition flex items-center gap-1.5"
      title="Install ke home screen"
    >
      📲
      <span className="hidden sm:inline">Install</span>
    </button>
  );
}
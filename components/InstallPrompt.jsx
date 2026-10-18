import { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('pwa_install_dismissed') === '1') return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
      localStorage.setItem('pwa_install_dismissed', '1');
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('pwa_install_dismissed', '1');
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50">
      <div className="bg-slate-900 border border-blue-500/40 rounded-2xl p-4 shadow-2xl flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
          <img src="/logo-rt38.png" alt="Logo" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          {/* TEKS DIUBAH JADI UMUM */}
          <div className="text-xs font-bold text-white mb-0.5">Install Aplikasi RT 38</div>
          <div className="text-[10px] text-slate-400 leading-relaxed">
            Tambahkan ke layar utama untuk akses cepat & notifikasi.
          </div>
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={handleInstall}
              className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg transition"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white text-[10px] px-2 py-1.5"
            >
              Nanti
            </button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-slate-500 hover:text-white text-xs shrink-0 -mt-1">✕</button>
      </div>
    </div>
  );
}

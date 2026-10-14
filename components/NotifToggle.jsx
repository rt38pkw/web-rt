import { useEffect, useState } from 'react';
import {
  isPushSupported,
  getPermissionStatus,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
} from '../lib/push';

export default function NotifToggle({ userId, userType = 'warga' }) {
  const [status, setStatus] = useState('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    checkStatus();
  }, [userId]);

  async function checkStatus() {
    if (!isPushSupported()) return setStatus('unsupported');
    if (getPermissionStatus() === 'denied') return setStatus('denied');
    const subbed = await isSubscribed();
    setStatus(subbed ? 'subscribed' : 'not-subscribed');
  }

  async function handleToggle() {
    setBusy(true);
    try {
      if (status === 'subscribed') {
        await unsubscribeFromPush(userId, userType);
        setStatus('not-subscribed');
      } else {
        await subscribeToPush(userId, userType);
        setStatus('subscribed');
        alert('✅ Notifikasi aktif!');
      }
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  if (status === 'loading' || status === 'unsupported') return null;
  if (status === 'denied') {
    return (
      <div className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1.5 rounded-lg">
        🔕 Notif diblokir. Aktifkan di pengaturan browser.
      </div>
    );
  }

  const isActive = status === 'subscribed';
  return (
    <button
      onClick={handleToggle}
      disabled={busy}
      className={`text-xs px-3 py-2 rounded-lg border font-medium transition flex items-center gap-1.5 ${
        isActive
          ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
      } disabled:opacity-50`}
    >
      {busy ? '⏳' : isActive ? '🔔' : '🔕'}
      <span className="hidden sm:inline">
        {busy ? 'Memproses...' : isActive ? 'Notif Aktif' : 'Aktifkan Notif'}
      </span>
    </button>
  );
}
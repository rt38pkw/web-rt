// components/NotifToggle.js
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase'; // IMPORT SUPABASE
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
    if (userId) {
      checkStatus();
    }
  }, [userId, userType]); // Pantau perubahan userId & userType

  async function checkStatus() {
    if (!isPushSupported()) return setStatus('unsupported');
    if (getPermissionStatus() === 'denied') return setStatus('denied');
    
    try {
      // 1. Cek apakah browser HP ini punya token push
      const subbed = await isSubscribed();
      if (!subbed) return setStatus('not-subscribed');

      // 2. Cek apakah userId ini terdaftar di database Supabase
      const col = userType === 'pengurus' ? 'pengurus_id' : 'warga_id';
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq(col, userId)
        .limit(1);

      if (error) throw error;

      // Jika ada di database, berarti benar-benar aktif
      if (data && data.length > 0) {
        setStatus('subscribed');
      } else {
        // Browser punya token, tapi bukan milik akun ini (sisa akun sebelumnya)
        setStatus('not-subscribed');
      }
    } catch (err) {
      setStatus('not-subscribed');
    }
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

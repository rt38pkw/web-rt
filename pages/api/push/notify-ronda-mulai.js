// pages/api/push/notify-ronda-mulai.js
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@rt38.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  const secret = req.headers['x-webhook-secret'] || req.query.secret;
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { tanggal } = req.body; 
    if (!tanggal) return res.status(400).json({ error: 'Tanggal wajib dikirim' });

    // 1. Cari jadwal yang aktif pada tanggal tersebut
    const { data: jadwalHariIni, error: errJ } = await supabase
      .from('jadwal_ronda')
      .select(`
        id, tanggal, 
        periode:periode_id!inner(status, nama_periode),
        petugas:petugas_ronda( penghuni:penghuni_id( warga_id ) )
      `)
      .eq('tanggal', tanggal)
      .eq('status', 'aktif')
      .eq('periode.status', 'published');

    if (errJ) throw errJ;
    if (!jadwalHariIni || jadwalHariIni.length === 0) {
      return res.status(200).json({ success: true, message: 'Tidak ada jadwal ronda hari ini' });
    }

    // 2. Kumpulkan warga_id yang bertugas
    let wargaIds = [];
    jadwalHariIni.forEach(jadwal => {
      jadwal.petugas.forEach(p => {
        if (p.penghuni && p.penghuni.warga_id) {
          wargaIds.push(p.penghuni.warga_id);
        }
      });
    });
    wargaIds = [...new Set(wargaIds)]; 

    if (wargaIds.length === 0) {
      return res.status(200).json({ success: true, message: 'Tidak ada petugas' });
    }

    // ═══ 3. KIRIM KE FCM (SMART-HANDLER) ═══
    try {
      for (const wargaId of wargaIds) {
        await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/smart-handler`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            role_target: 'warga',
            target_id: wargaId,
            title: '⏰ Waktunya Absen Ronda!',
            body: `Sudah waktunya ronda malam ini. Jangan lupa absen ya!`,
            url: '/dashboard-warga/ronda'
          })
        });
      }
    } catch (fcmErr) {
      console.error('Gagal kirim FCM mulai:', fcmErr);
    }
    // ═══════════════════════════════════════

    // 4. KIRIM KE WEB PUSH (PWA LAMA)
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('warga_id', wargaIds);

    let sentWeb = 0;
    if (subscriptions && subscriptions.length > 0) {
      const payload = JSON.stringify({
        title: '⏰ Waktunya Absen Ronda!',
        body: `Sudah waktunya ronda malam ini. Jangan lupa absen ya!`,
        icon: '/logo-rt38.png',
        url: '/dashboard-warga/ronda',
      });

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
          sentWeb++;
        } catch (err) { /* Abaikan */ }
      }
    }

    return res.status(200).json({ success: true, sentFCM: wargaIds.length, sentWeb });
  } catch (err) {
    console.error('Notify Mulai Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

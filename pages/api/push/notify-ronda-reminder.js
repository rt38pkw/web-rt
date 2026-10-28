// pages/api/push/notify-ronda-reminder.js
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
  // Keamanan sederhana: memastikan request datang dari webhook
  const secret = req.headers['x-webhook-secret'] || req.query.secret;
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { tanggal } = req.body; // Supabase akan mengirim tanggal hari ini (YYYY-MM-DD)

    if (!tanggal) return res.status(400).json({ error: 'Tanggal wajib dikirim' });

    // 1. Cari jadwal yang aktif pada tanggal tersebut, dan pastikan periodenya PUBLISHED
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

    wargaIds = [...new Set(wargaIds)]; // Hapus duplikat jika 1 orang ada di 2 jadwal

    if (wargaIds.length === 0) {
      return res.status(200).json({ success: true, message: 'Tidak ada petugas' });
    }

    // 3. Ambil subscription HP milik warga tersebut
    const { data: subscriptions, error: errS } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('warga_id', wargaIds);

    if (errS) throw errS;
    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ success: true, message: 'Warga belum subscribe notif' });
    }

    // 4. Susun Payload Notifikasi
    const payload = JSON.stringify({
      title: '⏰ Pengingat Jadwal Ronda',
      body: `Malam ini Anda memiliki tugas ronda. Jangan lupa persiapkan diri dan absen sesuai jadwal!`,
      icon: '/logo-rt38.png',
      badge: '/logo-rt38.png',
      url: '/dashboard-warga/ronda',
      tag: 'reminder-ronda',
    });

    // 5. Kirim Push
    let sent = 0;
    const invalidEndpoints = [];

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          invalidEndpoints.push(sub.endpoint);
        }
      }
    }

    // 6. Bersihkan endpoint yang mati
    if (invalidEndpoints.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', invalidEndpoints);
    }

    return res.status(200).json({ success: true, sent });
  } catch (err) {
    console.error('Notify Reminder Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

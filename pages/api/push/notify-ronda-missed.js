// pages/api/push/notify-ronda-missed.js
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

    // 1. Cari jadwal hari ini yang belum ada fotonya (Pending & Foto Null)
    const { data: missedTasks, error: errTask } = await supabase
      .from('petugas_ronda')
      .select(`
        id, jadwal:jadwal_id!inner(tanggal, periode:periode_id!inner(nama_periode, status)),
        penghuni:penghuni_id(nama_lengkap)
      `)
      .eq('jadwal.tanggal', tanggal)
      .eq('jadwal.periode.status', 'published')
      .eq('status_hadir', 'pending')
      .is('foto_bukti', null);

    if (errTask) throw errTask;
    
    // Jika tidak ada yang alpa, hentikan proses
    if (!missedTasks || missedTasks.length === 0) {
      return res.status(200).json({ success: true, message: 'Semua warga sudah absen' });
    }

    // 2. Ambil pengurus (ketua & sekretaris)
    const { data: pengurusList } = await supabase
      .from('pengurus')
      .select('id')
      .in('role', ['ketua', 'sekretaris']);

    const pengurusIds = (pengurusList || []).map((p) => p.id);
    if (pengurusIds.length === 0) return res.status(200).json({ success: false, message: 'Pengurus tidak ditemukan' });

    // 3. Ambil subscription mereka
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('pengurus_id', pengurusIds);

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ success: false, message: 'Belum ada pengurus yang subscribe notif' });
    }

    // 4. Payload Notifikasi
    const payload = JSON.stringify({
      title: '⚠️ Warga Tidak Absen Ronda',
      body: `Ada ${missedTasks.length} warga yang belum absen untuk jadwal tanggal ${tanggal}. Mohon konfirmasi via WA!`,
      icon: '/logo-rt38.png',
      badge: '/logo-rt38.png',
      url: '/sekretaris/ronda?tab=verifikasi',
      tag: 'ronda-missed',
    });

    // 5. Kirim Notifikasi
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

    // 6. Bersihkan endpoint mati
    if (invalidEndpoints.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', invalidEndpoints);
    }

    return res.status(200).json({ success: true, sent, missed: missedTasks.length });
  } catch (err) {
    console.error('Notify Missed Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

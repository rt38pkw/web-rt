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

    // 1. Cari jadwal hari ini yang belum absen
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
    if (!missedTasks || missedTasks.length === 0) {
      return res.status(200).json({ success: true, message: 'Semua warga sudah absen' });
    }

    // ═══ 2. KIRIM KE FCM (SEKRETARIS & KETUA) ═══
    try {
      const roles = ['sekretaris', 'ketua'];
      for (const role of roles) {
        await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/smart-handler`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            role_target: role,
            title: '⚠️ Warga Tidak Absen Ronda',
            body: `Ada ${missedTasks.length} warga yang belum absen untuk jadwal tanggal ${tanggal}.`,
            url: '/sekretaris/ronda'
          })
        });
      }
    } catch (fcmErr) {
      console.error('Gagal kirim FCM missed:', fcmErr);
    }
    // ═════════════════════════════════════════════

    // 3. KIRIM KE WEB PUSH (PWA LAMA)
    const { data: pengurusList } = await supabase.from('pengurus').select('id').in('role', ['ketua', 'sekretaris']);
    const pengurusIds = (pengurusList || []).map((p) => p.id);
    
    let sentWeb = 0;
    if (pengurusIds.length > 0) {
      const { data: subscriptions } = await supabase.from('push_subscriptions').select('*').in('pengurus_id', pengurusIds);
      
      if (subscriptions && subscriptions.length > 0) {
        const payload = JSON.stringify({
          title: '⚠️ Warga Tidak Absen Ronda',
          body: `Ada ${missedTasks.length} warga yang belum absen untuk jadwal tanggal ${tanggal}.`,
          icon: '/logo-rt38.png',
          url: '/sekretaris/ronda',
        });

        for (const sub of subscriptions) {
          try {
            await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
            sentWeb++;
          } catch (err) { /* Abaikan */ }
        }
      }
    }

    return res.status(200).json({ success: true, sentFCM: true, sentWeb, missed: missedTasks.length });
  } catch (err) {
    console.error('Notify Missed Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

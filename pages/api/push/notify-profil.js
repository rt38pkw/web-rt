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
    const { target, warga_id, nama, status, alasan, tipe } = req.body || {};

    let subscriptions = [];
    let payload = {};

    // ═══ SKENARIO 1: WARGA SUBMIT -> NOTIF KE PENGURUS (Sekretaris/Ketua) ═══
    if (target === 'pengurus' && status === 'pending') {
      const { data: pengurusList } = await supabase
        .from('pengurus')
        .select('id')
        .in('role', ['ketua', 'sekretaris']);
      
      if (pengurusList?.length > 0) {
        const ids = pengurusList.map(p => p.id);
        const { data: subs } = await supabase.from('push_subscriptions').select('*').in('pengurus_id', ids);
        if (subs) subscriptions = subs;
      }

      payload = JSON.stringify({
        title: '📝 Pengajuan Verifikasi Baru',
        body: `${nama} (${tipe}) mengajukan verifikasi data & KK.`,
        icon: '/logo-rt38.png',
        url: '/sekretaris/verifikasi',
        tag: 'verifikasi-baru',
      });
    } 
    // ═══ SKENARIO 2: PENGURUS APPROVE/REJECT -> NOTIF KE WARGA ═══
    else if (target === 'warga' && (status === 'approved' || status === 'rejected')) {
      const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('warga_id', warga_id);
      if (subs) subscriptions = subs;

      const isApproved = status === 'approved';
      payload = JSON.stringify({
        title: isApproved ? '✅ Verifikasi Disetujui' : '❌ Verifikasi Ditolak',
        body: isApproved 
          ? `Data ${tipe} Anda telah divalidasi oleh Sekretaris RT.` 
          : `Alasan: ${alasan || 'Data tidak sesuai'}. Silakan perbaiki.`,
        icon: '/logo-rt38.png',
        url: '/dashboard-warga/iuran',
        tag: 'verifikasi-status',
      });
    } else {
      return res.status(200).json({ success: true, reason: 'No action needed' });
    }

    if (subscriptions.length === 0) {
      return res.status(200).json({ success: true, sent: 0, reason: 'Tidak ada subscription' });
    }

    let sent = 0, failed = 0;
    const invalidEndpoints = [];

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err) {
        failed++;
        if (err.statusCode === 404 || err.statusCode === 410) invalidEndpoints.push(sub.endpoint);
      }
    }

    if (invalidEndpoints.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', invalidEndpoints);
    }

    return res.status(200).json({ success: true, sent, failed });
  } catch (err) {
    console.error('Notify Profil error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}

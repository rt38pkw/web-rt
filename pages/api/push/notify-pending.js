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

const COOLDOWN_MINUTES = 10;

export default async function handler(req, res) {
  const secret = req.headers['x-webhook-secret'] || req.query.secret;
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { warga_nama, jumlah_bulan, total } = req.body || {};

    // 1. Cooldown check
    const cutoff = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000).toISOString();
    const { data: recentLog } = await supabase
      .from('notifikasi_log')
      .select('id')
      .eq('tipe', 'approval_pending')
      .gte('created_at', cutoff)
      .limit(1);

    if (recentLog?.length > 0) {
      return res.status(200).json({ success: true, skipped: true, reason: 'Cooldown aktif' });
    }

    // 2. Ambil pengurus (ketua & bendahara)
    const { data: pengurusList, error: errP } = await supabase
      .from('pengurus')
      .select('id')
      .in('role', ['ketua', 'bendahara']);

    if (errP) throw errP;
    if (!pengurusList?.length) {
      return res.status(200).json({ success: true, sent: 0, reason: 'Tidak ada pengurus' });
    }

    const pengurusIds = pengurusList.map((p) => p.id);

    // 3. Ambil subscription mereka
    const { data: subscriptions, error: errS } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('pengurus_id', pengurusIds);

    if (errS) throw errS;
    if (!subscriptions?.length) {
      return res.status(200).json({ success: true, sent: 0, reason: 'Tidak ada subscription' });
    }

    // 4. Payload
    const namaWarga = warga_nama || 'Warga';
    const bulanInfo = jumlah_bulan ? `${jumlah_bulan} bulan` : '';
    const totalInfo = total ? `Rp ${Number(total).toLocaleString('id-ID')}` : '';

    const payload = JSON.stringify({
      title: '🔔 Pembayaran Baru',
      body: `${namaWarga} — ${bulanInfo}${totalInfo ? ' • ' + totalInfo : ''}`,
      icon: '/logo-rt38.png',
      badge: '/logo-rt38.png',
      url: '/keuangan/verifikasi',
      tag: 'pending-approval',
    });

    // 5. Kirim
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
        if (err.statusCode === 404 || err.statusCode === 410) {
          invalidEndpoints.push(sub.endpoint);
        }
      }
    }

    // 6. Bersihkan yang mati
    if (invalidEndpoints.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', invalidEndpoints);
    }

    // 7. Log
    await supabase.from('notifikasi_log').insert([{
      tipe: 'approval_pending',
      judul: 'Pembayaran Baru',
      pesan: `${namaWarga} — ${bulanInfo}`,
      target_role: 'ketua,bendahara',
      jumlah_terkirim: sent,
    }]);

    return res.status(200).json({ success: true, sent, failed });
  } catch (err) {
    console.error('Notify error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}

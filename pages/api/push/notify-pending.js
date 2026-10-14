import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Init VAPID
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@rt38.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const COOLDOWN_MINUTES = 10;

export default async function handler(req, res) {
  // Proteksi: pakai secret token biar tidak bisa dipanggil sembarang orang
  const secret = req.headers['x-webhook-secret'] || req.query.secret;
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { warga_nama, jumlah_bulan, total } = req.body || {};

    // ===== 1. Cek cooldown =====
    const cutoff = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000).toISOString();
    const { data: recentLog } = await supabase
      .from('notifikasi_log')
      .select('id, created_at')
      .eq('tipe', 'approval_pending')
      .gte('created_at', cutoff)
      .limit(1);

    if (recentLog && recentLog.length > 0) {
      // Masih dalam cooldown — skip kirim
      return res.status(200).json({
        success: true,
        skipped: true,
        reason: `Cooldown ${COOLDOWN_MINUTES} menit masih aktif`,
      });
    }

    // ===== 2. Ambil pengurus (ketua & bendahara) =====
    const { data: pengurusList, error: errP } = await supabase
      .from('pengurus')
      .select('id, nama, role')
      .in('role', ['ketua', 'bendahara']);

    if (errP) throw errP;
    if (!pengurusList || pengurusList.length === 0) {
      return res.status(200).json({ success: true, sent: 0, reason: 'Tidak ada pengurus' });
    }

    // ===== 3. Ambil subscription mereka =====
    // Catatan: tabel pengurus dan warga beda. Kalau pengurus juga terdaftar
    // sebagai warga (punya warga_id), sesuaikan query ini.
    // Untuk sementara, asumsi: subscription tersimpan by warga_id yang sama
    // dengan id pengurus di tabel warga — atau kita ambil semua subscription
    // dengan role terkait.

    // Opsi 1: pakai tabel warga, filter by role
    const { data: wargaPengurus, error: errW } = await supabase
      .from('warga')
      .select('id, nama_lengkap, role')
      .in('role', ['ketua', 'bendahara']);

    if (errW) throw errW;

    const pengurusIds = (wargaPengurus || []).map((p) => p.id);
    if (pengurusIds.length === 0) {
      return res.status(200).json({
        success: true,
        sent: 0,
        reason: 'Tidak ada pengurus dengan role di tabel warga',
      });
    }

    const { data: subscriptions, error: errS } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('warga_id', pengurusIds);

    if (errS) throw errS;
    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ success: true, sent: 0, reason: 'Tidak ada subscription' });
    }

    // ===== 4. Siapkan payload =====
    const namaWarga = warga_nama || 'Warga';
    const bulanInfo = jumlah_bulan ? `${jumlah_bulan} bulan` : 'beberapa bulan';
    const totalInfo = total ? `Rp ${Number(total).toLocaleString('id-ID')}` : '';

    const payload = JSON.stringify({
      title: '🔔 Pembayaran Baru',
      body: `${namaWarga} — ${bulanInfo}${totalInfo ? ' • ' + totalInfo : ''}`,
      icon: '/logo-rt38.png',
      badge: '/logo-rt38.png',
      url: '/admin-keuangan?tab=verifikasi',
      tag: 'pending-approval',
    });

    // ===== 5. Kirim ke semua subscription =====
    let sent = 0;
    let failed = 0;
    const invalidEndpoints = [];

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        sent++;
      } catch (err) {
        failed++;
        // Status 404 / 410 → subscription tidak valid lagi, hapus dari DB
        if (err.statusCode === 404 || err.statusCode === 410) {
          invalidEndpoints.push(sub.endpoint);
        }
        console.warn('Push failed for', sub.endpoint.slice(0, 50), err.statusCode);
      }
    }

    // Bersihkan subscription mati
    if (invalidEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', invalidEndpoints);
    }

    // ===== 6. Log notifikasi =====
    await supabase.from('notifikasi_log').insert([
      {
        tipe: 'approval_pending',
        judul: 'Pembayaran Baru',
        pesan: `${namaWarga} — ${bulanInfo}`,
        target_role: 'ketua,bendahara',
        jumlah_terkirim: sent,
      },
    ]);

    return res.status(200).json({ success: true, sent, failed });
  } catch (err) {
    console.error('Notify error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
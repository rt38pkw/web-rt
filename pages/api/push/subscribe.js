import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { warga_id, subscription, user_agent } = req.body;

    if (!warga_id || !subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }

    const { endpoint, keys } = subscription;
    if (!keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'Keys subscription tidak lengkap' });
    }

    // Upsert: kalau (warga_id, endpoint) sudah ada → update last_active
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          warga_id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          user_agent: user_agent || null,
          last_active: new Date().toISOString(),
        },
        { onConflict: 'warga_id,endpoint' }
      );

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Subscribe error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
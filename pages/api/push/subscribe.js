import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { user_id, user_type = 'warga', subscription, user_agent } = req.body;

    if (!user_id || !subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }

    const { endpoint, keys } = subscription;
    if (!keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Keys subscription tidak lengkap' });
    }

    const record = {
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: user_agent || null,
      last_active: new Date().toISOString(),
    };

    if (user_type === 'pengurus') {
      record.pengurus_id = user_id;
      record.warga_id = null;
    } else {
      record.warga_id = user_id;
      record.pengurus_id = null;
    }

    // Upsert manual: cek dulu
    const conflictCol = user_type === 'pengurus' ? 'pengurus_id' : 'warga_id';
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq(conflictCol, user_id)
      .eq('endpoint', endpoint)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from('push_subscriptions')
        .update(record)
        .eq('id', existing.id));
    } else {
      ({ error } = await supabase.from('push_subscriptions').insert([record]));
    }

    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Subscribe error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}

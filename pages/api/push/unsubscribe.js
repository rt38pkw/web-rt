import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { user_id, user_type = 'warga', endpoint } = req.body;
    if (!user_id || !endpoint) return res.status(400).json({ error: 'Data tidak lengkap' });

    const conflictCol = user_type === 'pengurus' ? 'pengurus_id' : 'warga_id';
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq(conflictCol, user_id)
      .eq('endpoint', endpoint);

    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}

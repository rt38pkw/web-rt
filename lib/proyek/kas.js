import { supabase } from '../supabase';

// ============================================================
// MUTASI KAS PROYEK (donasi, pengeluaran, refund)
// ============================================================

/**
 * Insert 1 record kas proyek
 */
export async function insertKasProyek(record) {
  const { data, error } = await supabase
    .from('kas_proyek')
    .insert([record])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Insert banyak record kas proyek sekaligus
 */
export async function insertKasProyekBulk(records) {
  const { data, error } = await supabase
    .from('kas_proyek')
    .insert(records)
    .select();
  if (error) throw error;
  return data || [];
}

/**
 * Update record kas proyek
 */
export async function updateKasProyek(id, payload) {
  const { data, error } = await supabase
    .from('kas_proyek')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Hapus record kas proyek
 */
export async function deleteKasProyek(id) {
  const { error } = await supabase.from('kas_proyek').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Fetch semua kas proyek (sudah termasuk di useProyekData)
 * Fungsi ini untuk refetch manual kalau perlu
 */
export async function fetchKasProyekByProyek(proyekId) {
  const { data, error } = await supabase
    .from('kas_proyek')
    .select('*')
    .eq('proyek_id', proyekId)
    .order('tanggal', { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * Cek apakah proyek masih bisa dihapus
 * (tidak ada iuran & kas)
 */
export async function canDeleteProyek(proyekId) {
  const [{ count: iuranCount }, { count: kasCount }] = await Promise.all([
    supabase
      .from('iuran_proyek')
      .select('*', { count: 'exact', head: true })
      .eq('proyek_id', proyekId),
    supabase
      .from('kas_proyek')
      .select('*', { count: 'exact', head: true })
      .eq('proyek_id', proyekId),
  ]);
  return (iuranCount || 0) === 0 && (kasCount || 0) === 0;
}

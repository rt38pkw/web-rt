import { supabase } from '../supabase';

/**
 * Upload bukti pembayaran proyek.
 * Path: bukti-transfer/proyek/{wargaId}/{batchId}/{slot}.{ext}
 */
export async function uploadBuktiProyek(file, wargaId, batchId, slotIndex) {
  const ext = file.name.split('.').pop().toLowerCase();
  const path = `proyek/${wargaId}/${batchId}/${slotIndex + 1}.${ext}`;

  const { error } = await supabase.storage
    .from('bukti-transfer')
    .upload(path, file, { upsert: false });
  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('bukti-transfer')
    .getPublicUrl(path);

  return urlData.publicUrl;
}
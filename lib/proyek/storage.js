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

/**
 * Konversi URL publik → path storage (untuk hapus file)
 */
export function getPathFromUrl(url) {
  if (!url) return null;
  const marker = '/bukti-transfer/';
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.substring(idx + marker.length);
}

/**
 * Hapus file bukti dari storage
 */
export async function hapusBuktiProyek(urls) {
  const list = Array.isArray(urls) ? urls : [];
  const paths = list.map(getPathFromUrl).filter(Boolean);
  if (paths.length === 0) return;

  const { error } = await supabase.storage
    .from('bukti-transfer')
    .remove(paths);
  if (error) throw error;
}

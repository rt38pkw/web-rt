import { supabase } from '../supabase';

export async function uploadBukti(file, wargaId, batchId, slotIndex) {
  const ext = file.name.split('.').pop().toLowerCase();
  const path = `${wargaId}/${batchId}/${slotIndex + 1}.${ext}`;

  const { error } = await supabase.storage
    .from('bukti-transfer')
    .upload(path, file, { upsert: false });
  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('bukti-transfer')
    .getPublicUrl(path);

  return urlData.publicUrl;
}

export function getPathFromUrl(url) {
  if (!url) return null;
  const marker = '/bukti-transfer/';
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.substring(idx + marker.length);
}
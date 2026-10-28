// lib/proyek/storage.js
import { supabase } from '../supabase';
import imageCompression from 'browser-image-compression';

// ═══ FUNGSI KOMPRESI GAMBAR ═══
const compressImage = async (file) => {
  const options = {
    maxSizeMB: 0.5, // Maksimal 500KB
    maxWidthOrHeight: 1200,
    useWebWorker: true,
  };
  return await imageCompression(file, options);
};

export async function uploadBuktiProyek(file, wargaId, batchId, slotIndex) {
  try {
    const compressedFile = await compressImage(file);
    const ext = file.name.split('.').pop().toLowerCase();
    const path = `proyek/${wargaId}/${batchId}/${slotIndex + 1}.${ext}`;

    const { error } = await supabase.storage
      .from('bukti-transfer')
      .upload(path, compressedFile, { upsert: false });
    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('bukti-transfer')
      .getPublicUrl(path);

    return urlData.publicUrl;
  } catch (err) {
    throw new Error('Gagal upload bukti proyek: ' + err.message);
  }
}

export function getPathFromUrl(url) {
  if (!url) return null;
  const marker = '/bukti-transfer/';
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.substring(idx + marker.length);
}

export async function hapusBuktiProyek(urls) {
  const list = Array.isArray(urls) ? urls : [];
  const paths = list.map(getPathFromUrl).filter(Boolean);
  if (paths.length === 0) return;

  const { error } = await supabase.storage
    .from('bukti-transfer')
    .remove(paths);
  if (error) throw error;
}

// lib/iuran/storage.js
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

export async function uploadBukti(file, wargaId, batchId, slotIndex) {
  try {
    const compressedFile = await compressImage(file);
    const ext = file.name.split('.').pop().toLowerCase();
    const path = `${wargaId}/${batchId}/${slotIndex + 1}.${ext}`;
    
    const { error } = await supabase.storage.from('bukti-transfer').upload(path, compressedFile, { upsert: false });
    if (error) throw error;
    
    const { data: urlData } = supabase.storage.from('bukti-transfer').getPublicUrl(path);
    return urlData.publicUrl;
  } catch (err) {
    throw new Error('Gagal upload bukti: ' + err.message);
  }
}

export async function uploadKK(file, wargaId) {
  try {
    const compressedFile = await compressImage(file);
    const ext = file.name.split('.').pop().toLowerCase();
    const path = `${wargaId}/kk-${Date.now()}.${ext}`;
    
    const { error } = await supabase.storage.from('berkas-warga').upload(path, compressedFile, { upsert: true }); 
    if (error) throw error;
    
    const { data: urlData } = supabase.storage.from('berkas-warga').getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    throw new Error('Gagal upload KK: ' + err.message);
  }
}

export function getPathFromUrl(url) {
  if (!url) return null;
  // Bisa untuk bukti-transfer atau berkas-warga
  const marker1 = '/bukti-transfer/';
  const marker2 = '/berkas-warga/';
  
  if (url.includes(marker1)) return url.substring(url.indexOf(marker1) + marker1.length);
  if (url.includes(marker2)) return url.substring(url.indexOf(marker2) + marker2.length);
  return null;
}

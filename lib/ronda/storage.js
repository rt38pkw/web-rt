// lib/ronda/storage.js
import { supabase } from '../supabase';
import imageCompression from 'browser-image-compression';

// ═══ FUNGSI UPLOAD (DENGAN KOMPRESI) ═══
export async function uploadBuktiRonda(file, petugasId) {
  try {
    // 1. Kompresi Gambar (Maksimal 500KB, lebar maksimal 1200px)
    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    };
    const compressedFile = await imageCompression(file, options);

    // 2. Buat nama file unik
    const fileExt = file.name.split('.').pop();
    const fileName = `${petugasId}-${Date.now()}.${fileExt}`;
    const filePath = `bukti/${fileName}`;

    // 3. Upload ke bucket 'bukti-ronda'
    const { error: uploadError } = await supabase.storage
      .from('bukti-ronda')
      .upload(filePath, compressedFile, { cacheControl: '3600', upsert: false });

    if (uploadError) throw uploadError;

    // 4. Ambil URL publiknya
    const { data } = supabase.storage.from('bukti-ronda').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (error) {
    throw new Error('Gagal upload foto: ' + error.message);
  }
}

// ═══ FUNGSI HAPUS FOTO ═══
export async function hapusBuktiRonda(fotoUrl) {
  if (!fotoUrl || fotoUrl === 'DIHAPUS') return;
  try {
    // Ambil nama file dari URL
    // URL format: https://xxx.supabase.co/storage/v1/object/public/bukti-ronda/bukti/123.jpg
    const urlParts = fotoUrl.split('/bukti-ronda/');
    if (urlParts.length < 2) return;
    const filePath = urlParts[1]; // "bukti/123.jpg"

    const { error } = await supabase.storage.from('bukti-ronda').remove([filePath]);
    if (error) console.error('Gagal hapus file:', error.message);
  } catch (err) {
    console.error('Error hapus:', err);
  }
}

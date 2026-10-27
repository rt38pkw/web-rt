// lib/ronda/storage.js
import { supabase } from '../supabase';

export async function uploadBuktiRonda(file, petugasId) {
  try {
    // 1. Buat nama file unik (pakai timestamp + ID petugas)
    const fileExt = file.name.split('.').pop();
    const fileName = `${petugasId}-${Date.now()}.${fileExt}`;
    const filePath = `bukti/${fileName}`;

    // 2. Upload ke bucket 'bukti-ronda'
    const { error: uploadError } = await supabase.storage
      .from('bukti-ronda')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) throw uploadError;

    // 3. Ambil URL publiknya
    const { data } = supabase.storage.from('bukti-ronda').getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    throw new Error('Gagal upload foto: ' + error.message);
  }
}

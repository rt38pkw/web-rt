// lib/ronda/rpc.js
import { supabase } from '../supabase';

export async function simpanJadwalRonda(periodeId, status, draftData) {
  // 1. Format ulang data agar sesuai dengan struktur JSONB yang diminta RPC
  const payload = draftData.map(item => {
    const uniquePetugas = Array.from(new Map(item.petugas.map(p => [p.id, p])).values());
    
    return {
      tanggal: item.tanggal,
      grup_id: item.grup_id,
      status: item.is_libur ? 'libur' : 'aktif',
      catatan_sistem: item.catatan || null,
      petugas: item.is_libur ? [] : uniquePetugas.map(p => p.id)
    };
  });

  // 2. Panggil fungsi RPC yang sudah dibuat di Supabase
  const { error } = await supabase.rpc('simpan_jadwal_ronda', {
    p_periode_id: periodeId,
    p_status: status,
    p_jadwal_list: payload
  });

  if (error) throw new Error(error.message);
  return true;
}

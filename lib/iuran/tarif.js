// lib/iuran/tarif.js
import { supabase } from '../supabase';

let _cache = { data: null, timestamp: 0 };
const CACHE_TTL = 60000;

export function invalidateTarifIuranCache() {
  _cache = { data: null, timestamp: 0 };
}

export async function fetchTarifList(force = false) {
  const now = Date.now();
  if (!force && _cache.data && now - _cache.timestamp < CACHE_TTL) {
    return _cache.data;
  }
  const { data, error } = await supabase
    .from('tarif_iuran')
    .select('*')
    .order('tahun', { ascending: false });
  if (error) throw error;
  _cache = { data: data || [], timestamp: Date.now() };
  return data || [];
}

// ═══ FUNGSI BARU: CARI KATEGORI BERDASARKAN BULAN & RIWAYAT ═══
export function getKategoriByPeriode(warga, riwayatList, periode) {
  // Fallback jika tidak ada riwayat, gunakan kategori saat ini
  if (!riwayatList || riwayatList.length === 0) {
    return warga?.kategori === 'Usaha' ? 'Usaha' : 'Warga';
  }

  // Tentukan tanggal acuan (misal periode '2026-04' jadi '2026-04-01')
  let targetDate = new Date();
  if (periode) {
    if (String(periode).length === 4) {
      targetDate = new Date(`${periode}-01-01`); 
    } else {
      targetDate = new Date(`${periode}-01`); 
    }
  }

  // Filter riwayat yang tanggal mulainya <= periode yang dicari
  const validRiwayat = riwayatList
    .filter(r => r.warga_id === warga.id && new Date(r.tanggal_mulai) <= targetDate)
    .sort((a, b) => new Date(b.tanggal_mulai) - new Date(a.tanggal_mulai));

  // Jika ada riwayatnya, ambil yang paling baru (paling dekat dengan periode)
  if (validRiwayat.length > 0) {
    return validRiwayat[0].kategori;
  }

  // Fallback jika di periode itu belum ada riwayat (misal data lama)
  return warga?.kategori === 'Usaha' ? 'Usaha' : 'Warga';
}

// ═══ FUNGSI UTAMA: HITUNG TARIF ═══
export function getTarifWarga(warga, tarifList, periode = null, riwayatList = []) {
  // Dapatkan kategori yang berlaku di periode tersebut
  const kategori = getKategoriByPeriode(warga, riwayatList, periode);
  
  if (!tarifList || tarifList.length === 0) {
    return kategori === 'Usaha' ? 30000 : 15000;
  }

  // Tentukan tanggal target untuk tarif
  let targetDate = new Date();
  if (periode) {
    if (String(periode).length === 4) {
      targetDate = new Date(`${periode}-01-01`);
    } else {
      targetDate = new Date(`${periode}-01`);
    }
  }

  // 1. Cari tarif kategori saat ini yang sudah berlaku
  const validTarifs = tarifList
    .filter(t => t.kategori === kategori && new Date(t.berlaku_dari) <= targetDate)
    .sort((a, b) => new Date(b.berlaku_dari) - new Date(a.berlaku_dari));

  if (validTarifs.length > 0) return Number(validTarifs[0].tarif);

  // 2. Jika tidak ada (misal Usaha baru berlaku bulan depan), fallback ke Warga
  const fallbackKategori = kategori === 'Usaha' ? 'Warga' : 'Usaha';
  const fallbackTarifs = tarifList
    .filter(t => t.kategori === fallbackKategori && new Date(t.berlaku_dari) <= targetDate)
    .sort((a, b) => new Date(b.berlaku_dari) - new Date(a.berlaku_dari));

  if (fallbackTarifs.length > 0) return Number(fallbackTarifs[0].tarif);

  return kategori === 'Usaha' ? 30000 : 15000;
}

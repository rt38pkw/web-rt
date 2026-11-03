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
  if (!riwayatList || riwayatList.length === 0) {
    return warga?.kategori === 'Usaha' ? 'Usaha' : 'Warga';
  }

  let targetDate = new Date();
  if (periode) {
    if (String(periode).length === 4) {
      targetDate = new Date(`${periode}-01-01`); 
    } else {
      targetDate = new Date(`${periode}-01`); 
    }
  }

  const validRiwayat = riwayatList
    .filter(r => r.warga_id === warga.id && new Date(r.tanggal_mulai) <= targetDate)
    .sort((a, b) => new Date(b.tanggal_mulai) - new Date(a.tanggal_mulai));

  if (validRiwayat.length > 0) {
    return validRiwayat[0].kategori;
  }

  return warga?.kategori === 'Usaha' ? 'Usaha' : 'Warga';
}

// ═══ FUNGSI UTAMA: HITUNG TARIF (SUDAH DIPERBAIKI) ═══
export function getTarifWarga(warga, tarifList, periode = null, riwayatList = []) {
  const kategori = getKategoriByPeriode(warga, riwayatList, periode);
  
  if (!tarifList || tarifList.length === 0) {
    return kategori === 'Usaha' ? 30000 : 15000;
  }

  let targetDate = new Date();
  if (periode) {
    if (String(periode).length === 4) {
      targetDate = new Date(`${periode}-01-01`);
    } else {
      targetDate = new Date(`${periode}-01`);
    }
  }

  // 1. Cari tarif yang pas (kategori cocok, tanggal berlaku cocok)
  const validTarifs = tarifList
    .filter(t => t.kategori === kategori && new Date(t.berlaku_dari) <= targetDate)
    .sort((a, b) => new Date(b.berlaku_dari) - new Date(a.berlaku_dari));

  if (validTarifs.length > 0) return Number(validTarifs[0].tarif);

  // 2. Cari tarif terbaru untuk kategori ini (abaikan tanggal berlaku)
  const anyTarifForKategori = tarifList
    .filter(t => t.kategori === kategori)
    .sort((a, b) => new Date(b.berlaku_dari) - new Date(a.berlaku_dari));

  if (anyTarifForKategori.length > 0) return Number(anyTarifForKategori[0].tarif);

  // 3. Khusus Usaha: Jika belum ada tarif Usaha, pakai tarif Warga (JANGAN sebaliknya)
  if (kategori === 'Usaha') {
    const wargaTarifs = tarifList
      .filter(t => t.kategori === 'Warga' && new Date(t.berlaku_dari) <= targetDate)
      .sort((a, b) => new Date(b.berlaku_dari) - new Date(a.berlaku_dari));
    if (wargaTarifs.length > 0) return Number(wargaTarifs[0].tarif);
  }

  // 4. Default Hardcode
  return kategori === 'Usaha' ? 30000 : 15000;
}

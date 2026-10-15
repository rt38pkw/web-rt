import { supabase } from '../supabase';

// Cache sederhana untuk hindari fetch berulang
let _cache = { data: null, timestamp: 0 };
const CACHE_TTL = 60000; // 60 detik

export function invalidateTarifCache() {
  _cache = { data: null, timestamp: 0 };
}

// Ambil semua tarif (untuk tabel & dropdown)
export async function fetchAllTarif(force = false) {
  const now = Date.now();
  if (!force && _cache.data && now - _cache.timestamp < CACHE_TTL) {
    return _cache.data;
  }
  const { data, error } = await supabase
    .from('tarif_iuran')
    .select('*')
    .order('tahun', { ascending: false })
    .order('kategori');
  if (error) throw error;
  _cache = { data: data || [], timestamp: Date.now() };
  return data || [];
}

// Ambil tarif untuk tahun & kategori tertentu
// Return: number | null (null kalau tarif belum diset)
export function getTarif(tarifList, tahun, kategori) {
  const t = tarifList.find(
    (x) => x.tahun === Number(tahun) && x.kategori === kategori
  );
  return t ? Number(t.tarif) : null;
}

// Ambil tarif tahun berjalan (current year)
// Kalau tahun ini belum ada, ambil tahun terakhir yang ada
export function getTarifTahunIni(tarifList, kategori) {
  const now = new Date();
  const tahunIni = now.getFullYear();
  let t = getTarif(tarifList, tahunIni, kategori);
  if (t) return { tarif: t, tahun: tahunIni, isFallback: false };

  // Fallback: tahun terakhir yang ada (paling baru)
  const tahunTersedia = [...new Set(tarifList.map((x) => x.tahun))].sort((a, b) => b - a);
  if (tahunTersedia.length === 0) return null;

  const tahunFallback = tahunTersedia[0];
  t = getTarif(tarifList, tahunFallback, kategori);
  return { tarif: t, tahun: tahunFallback, isFallback: true };
}

// List tahun yang tersedia (untuk dropdown)
export function getTahunTersedia(tarifList) {
  const set = new Set(tarifList.map((x) => x.tahun));
  return [...set].sort((a, b) => b - a);
}

// Kategori default per warga
export function getKategoriWarga(warga) {
  return warga?.kategori === 'Usaha' ? 'Usaha' : 'Warga';
}

// Simpan / update tarif
export async function upsertTarif({ tahun, kategori, tarif, berlaku_dari, catatan, created_by }) {
  const { data, error } = await supabase
    .from('tarif_iuran')
    .upsert(
      {
        tahun: Number(tahun),
        kategori,
        tarif: Number(tarif),
        berlaku_dari,
        catatan: catatan || null,
        created_by: created_by || null,
      },
      { onConflict: 'tahun,kategori' }
    )
    .select()
    .single();
  if (error) throw error;
  invalidateTarifCache();
  return data;
}

// Hapus tarif
export async function deleteTarif(id) {
  const { error } = await supabase.from('tarif_iuran').delete().eq('id', id);
  if (error) throw error;
  invalidateTarifCache();
}
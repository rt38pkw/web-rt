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

export function getTarifWarga(warga, tarifList, tahun = null) {
  const kategori = warga?.kategori === 'Usaha' ? 'Usaha' : 'Warga';

  if (!tarifList || tarifList.length === 0) {
    return kategori === 'Usaha' ? 30000 : 15000;
  }

  const tahunTarget = tahun || new Date().getFullYear();

  const t = tarifList.find(
    (x) => Number(x.tahun) === Number(tahunTarget) && x.kategori === kategori
  );
  if (t) return Number(t.tarif);

  const tahunTersedia = [...new Set(tarifList.map((x) => Number(x.tahun)))].sort(
    (a, b) => b - a
  );
  for (const thn of tahunTersedia) {
    const tt = tarifList.find(
      (x) => Number(x.tahun) === thn && x.kategori === kategori
    );
    if (tt) return Number(tt.tarif);
  }

  return kategori === 'Usaha' ? 30000 : 15000;
}
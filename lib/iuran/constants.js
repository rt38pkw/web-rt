// lib/iuran/constants.js

export const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB

// ═══ TAHUN BERDIRI RT (Patokan sejarah) ═══
export const TAHUN_BERDIRI_RT = 2026; 

// ═══ FUNGSI DINAMIS: HANYA TAMPILKAN TAHUN YANG SUDAH BERJALAN ═══
export function getTahunTersedia() {
  const tahunSekarang = new Date().getFullYear();
  const tahunList = [];
  
  // Looping dari Tahun Berdiri RT sampai Tahun Sekarang
  for (let i = TAHUN_BERDIRI_RT; i <= tahunSekarang; i++) {
    tahunList.push(i);
  }
  return tahunList.sort((a, b) => a - b);
}

export function getTahunSekarang() {
  return new Date().getFullYear();
}

export function getPeriodeBulan(tahun) {
  const namaBulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  // Khusus tahun 2026, mulai dari April (index 3). Tahun lain mulai Januari (index 0).
  const startIndex = Number(tahun) === TAHUN_BERDIRI_RT ? 3 : 0;
  
  const periode = [];
  for (let i = startIndex; i < 12; i++) {
    periode.push({
      kode: `${tahun}-${String(i + 1).padStart(2, '0')}`,
      nama: namaBulan[i]
    });
  }
  return periode;
}

export function isWargaUsaha(warga) {
  return warga?.kategori?.toLowerCase() === 'usaha';
}

export const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB

export const TAHUN_TERSEDIA = [2025, 2026, 2027]; 

// Fungsi untuk generate bulan secara otomatis
export function getPeriodeBulan(tahun) {
  const namaBulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  // Khusus tahun 2026, mulai dari April (index 3). Tahun lain mulai Januari (index 0).
  const startIndex = Number(tahun) === 2026 ? 3 : 0;
  
  const periode = [];
  for (let i = startIndex; i < 12; i++) {
    periode.push({
      kode: `${tahun}-${String(i + 1).padStart(2, '0')}`,
      nama: namaBulan[i]
    });
  }
  return periode;
}

export function getTahunSekarang() {
  return new Date().getFullYear();
}

export function isWargaUsaha(warga) {
  return warga?.kategori?.toLowerCase() === 'usaha';
}

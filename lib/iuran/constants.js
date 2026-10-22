// PASTIKAN DUA BARIS INI ADA DI PALING ATAS
export const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB

// --- SESUAIKAN DENGAN KODE ANDA JIKA BERBEDA ---
export const TAHUN_TERSEDIA = [2025, 2026]; 
export const PERIODE_BULAN = [
  { kode: '2026-01', nama: 'Januari' },
  { kode: '2026-02', nama: 'Februari' },
  { kode: '2026-03', nama: 'Maret' },
  { kode: '2026-04', nama: 'April' },
  { kode: '2026-05', nama: 'Mei' },
  { kode: '2026-06', nama: 'Juni' },
  { kode: '2026-07', nama: 'Juli' },
  { kode: '2026-08', nama: 'Agustus' },
  { kode: '2026-09', nama: 'September' },
  { kode: '2026-10', nama: 'Oktober' },
  { kode: '2026-11', nama: 'November' },
  { kode: '2026-12', nama: 'Desember' },
];

export function getPeriodeBulan(tahun) {
  return PERIODE_BULAN.filter(b => b.kode.startsWith(String(tahun)));
}

export function getTahunSekarang() {
  return new Date().getFullYear();
}

export function isWargaUsaha(warga) {
  return warga?.kategori?.toLowerCase() === 'usaha';
}

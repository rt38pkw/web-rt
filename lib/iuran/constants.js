export const PERIODE_BULAN = [
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

export const TARIF_NORMAL = 15000;
export const TARIF_USAHA = 30000;

export const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB
export const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const isWargaUsaha = (warga) =>
  warga?.kategori === 'Usaha' || warga?.no_rumah?.trim() === 'A2 - 19';

export const getTarif = (warga) => (isWargaUsaha(warga) ? TARIF_USAHA : TARIF_NORMAL);
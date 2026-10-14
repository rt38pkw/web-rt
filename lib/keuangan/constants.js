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

export const JENIS_PENGELUARAN = [
  'Kebutuhan RT',
  'Kegiatan',
  'Perkunjungan Sosial',
  'Peringatan Hari',
  'Pertemuan Rutin Warga',
  'Partisipasi',
  'Lainnya',
];

export const JENIS_PEMASUKAN = ['Mutasi Saldo', 'Donasi', 'Bunga Bank', 'Lainnya'];

export const VALID_TABS = [
  'dashboard',
  'verifikasi',
  'tunai',
  'pemasukan',
  'pengeluaran',
  'deposit',
  'tunggakan',
  'riwayat',
];

export function getBulanTahun(tahun) {
  const nama = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  return Array.from({ length: 12 }, (_, i) => ({
    kode: `${tahun}-${String(i + 1).padStart(2, '0')}`,
    nama: nama[i],
  }));
}
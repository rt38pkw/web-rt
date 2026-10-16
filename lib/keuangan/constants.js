// ============================================================
// Periode bulan (mirror dari lib/iuran/constants.js)
// ============================================================

export function getPeriodeBulan(tahun) {
  const tahunNum = Number(tahun);

  if (tahunNum === 2026) {
    return [
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
  }

  const nama = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  return Array.from({ length: 12 }, (_, i) => ({
    kode: `${tahunNum}-${String(i + 1).padStart(2, '0')}`,
    nama: nama[i],
  }));
}

export const TAHUN_TERSEDIA = [2026, 2027, 2028];

export function getTahunSekarang() {
  return new Date().getFullYear();
}

// Backward compatibility
export const PERIODE_BULAN = getPeriodeBulan(2026);

// Fungsi lama — tetap ada
export function getBulanTahun(tahun) {
  return getPeriodeBulan(tahun);
}

// ══════════════════════════════════════════════════════════════
// KONSTANTA LAIN
// ══════════════════════════════════════════════════════════════
export const VALID_TABS = [
  'dashboard',
  'tarif',
  'verifikasi',
  'tunai',
  'pemasukan',
  'pengeluaran',
  'deposit',
  'tunggakan',
  'riwayat',
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

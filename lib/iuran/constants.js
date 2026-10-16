// ============================================================
// Periode bulan per tahun
// ============================================================

/**
 * Return array bulan untuk tahun tertentu.
 *
 * 2026 → April–Desember (kas RT baru terbentuk April)
 * 2027+ → Januari–Desember (full setahun)
 *
 * @param {Number|String} tahun
 * @returns {Array} [{ kode: '2026-04', nama: 'April' }, ...]
 */
export function getPeriodeBulan(tahun) {
  const tahunNum = Number(tahun);

  // 2026 = pengecualian, mulai April
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

  // 2027+ = Jan–Des
  const nama = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  return Array.from({ length: 12 }, (_, i) => ({
    kode: `${tahunNum}-${String(i + 1).padStart(2, '0')}`,
    nama: nama[i],
  }));
}

/**
 * Daftar tahun yang tersedia untuk dipilih di UI.
 * Bisa di-hardcode atau dari tarif.
 */
export const TAHUN_TERSEDIA = [2026, 2027, 2028];

/**
 * Tahun berjalan saat ini.
 */
export function getTahunSekarang() {
  return new Date().getFullYear();
}

// ══════════════════════════════════════════════════════════════
// BACKWARD COMPATIBILITY
// PERIODE_BULAN tetap ada = periode 2026 (biar file lama tetap jalan)
// Nanti bisa di-deprecate pelan-pelan
// ══════════════════════════════════════════════════════════════
export const PERIODE_BULAN = getPeriodeBulan(2026);

// ══════════════════════════════════════════════════════════════
// TARIF (hardcode — sebagai fallback)
// ══════════════════════════════════════════════════════════════
export const TARIF_NORMAL = 15000;
export const TARIF_USAHA = 30000;

export const isWargaUsaha = (warga) =>
  warga?.kategori === 'Usaha' || warga?.no_rumah?.trim() === 'A2 - 19';

export const getTarif = (warga) => (isWargaUsaha(warga) ? TARIF_USAHA : TARIF_NORMAL);

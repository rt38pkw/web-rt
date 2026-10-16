// ============================================================
// Perhitungan untuk Iuran Proyek
// ============================================================

/**
 * Hitung total terbayar warga untuk proyek tertentu (hanya yang approved)
 */
export function getTotalTerbayar(iuranProyekList, wargaId, proyekId) {
  const list = Array.isArray(iuranProyekList) ? iuranProyekList : [];
  return list
    .filter(
      (i) =>
        i.warga_id === wargaId &&
        i.proyek_id === proyekId &&
        i.status === 'approved'
    )
    .reduce((s, i) => s + Number(i.jumlah || 0), 0);
}

/**
 * Hitung total pending warga untuk proyek
 */
export function getTotalPending(iuranProyekList, wargaId, proyekId) {
  const list = Array.isArray(iuranProyekList) ? iuranProyekList : [];
  return list
    .filter(
      (i) =>
        i.warga_id === wargaId &&
        i.proyek_id === proyekId &&
        i.status === 'pending'
    )
    .reduce((s, i) => s + Number(i.jumlah || 0), 0);
}

/**
 * Hitung status pembayaran warga untuk proyek
 * Return: 'lunas' | 'kurang' | 'belum' | 'pending'
 */
export function getStatusWargaProyek(iuranProyekList, warga, proyek) {
  const terbayar = getTotalTerbayar(iuranProyekList, warga.id, proyek.id);
  const pending = getTotalPending(iuranProyekList, warga.id, proyek.id);
  const target = Number(proyek.nominal_per_warga);

  if (terbayar >= target) return 'lunas';
  if (pending > 0) return 'pending';
  if (terbayar > 0) return 'kurang';
  return 'belum';
}

/**
 * Hitung sisa yang harus dibayar warga
 */
export function getSisaWarga(iuranProyekList, wargaId, proyek) {
  const terbayar = getTotalTerbayar(iuranProyekList, wargaId, proyek.id);
  return Math.max(0, Number(proyek.nominal_per_warga) - terbayar);
}

/**
 * Hitung progress proyek keseluruhan
 * Return: { totalTarget, totalTerbayar, totalSisa, persen, jumlahWarga, jumlahLunas }
 */
export function getProgressProyek(iuranProyekList, wargaList, proyek) {
  const wargaSafe = Array.isArray(wargaList) ? wargaList : [];
  const iuranSafe = Array.isArray(iuranProyekList) ? iuranProyekList : [];

  const targetPerWarga = Number(proyek.nominal_per_warga);
  const totalTarget = targetPerWarga * wargaSafe.length;

  let totalTerbayar = 0;
  let jumlahLunas = 0;

  wargaSafe.forEach((w) => {
    const terbayar = getTotalTerbayar(iuranSafe, w.id, proyek.id);
    totalTerbayar += Math.min(terbayar, targetPerWarga); // cap di target
    if (terbayar >= targetPerWarga) jumlahLunas++;
  });

  const totalSisa = Math.max(0, totalTarget - totalTerbayar);
  const persen = totalTarget > 0 ? Math.round((totalTerbayar / totalTarget) * 100) : 0;

  return {
    totalTarget,
    totalTerbayar,
    totalSisa,
    persen,
    jumlahWarga: wargaSafe.length,
    jumlahLunas,
  };
}

/**
 * Cek apakah warga masih boleh bayar (belum lunas)
 */
export function bisaBayar(iuranProyekList, wargaId, proyek) {
  const sisa = getSisaWarga(iuranProyekList, wargaId, proyek);
  return sisa > 0;
}

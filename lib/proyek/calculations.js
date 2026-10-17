// ============================================================
// IURAN PROYEK — Perhitungan
// ============================================================

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

export function getStatusWargaProyek(iuranProyekList, warga, proyek) {
  const terbayar = getTotalTerbayar(iuranProyekList, warga.id, proyek.id);
  const pending = getTotalPending(iuranProyekList, warga.id, proyek.id);
  const target = Number(proyek.nominal_per_warga);

  if (terbayar >= target) return 'lunas';
  if (pending > 0) return 'pending';
  if (terbayar > 0) return 'kurang';
  return 'belum';
}

export function getSisaWarga(iuranProyekList, wargaId, proyek) {
  const terbayar = getTotalTerbayar(iuranProyekList, wargaId, proyek.id);
  return Math.max(0, Number(proyek.nominal_per_warga) - terbayar);
}

export function getProgressProyek(iuranProyekList, wargaList, proyek) {
  const wargaSafe = Array.isArray(wargaList) ? wargaList : [];
  const iuranSafe = Array.isArray(iuranProyekList) ? iuranProyekList : [];

  const targetPerWarga = Number(proyek.nominal_per_warga);
  const totalTarget = targetPerWarga * wargaSafe.length;

  let totalTerbayar = 0;
  let jumlahLunas = 0;

  wargaSafe.forEach((w) => {
    const terbayar = getTotalTerbayar(iuranSafe, w.id, proyek.id);
    totalTerbayar += Math.min(terbayar, targetPerWarga);
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

export function bisaBayar(iuranProyekList, wargaId, proyek) {
  const sisa = getSisaWarga(iuranProyekList, wargaId, proyek);
  return sisa > 0;
}

// ============================================================
// SALDO KAS PER PROYEK
// Saldo Proyek = Iuran + Donasi − Pengeluaran − Refund
// ============================================================

export function getTotalIuranProyek(iuranProyekList, proyekId) {
  const list = Array.isArray(iuranProyekList) ? iuranProyekList : [];
  return list
    .filter((i) => i.proyek_id === proyekId && i.status === 'approved')
    .reduce((s, i) => s + Number(i.jumlah || 0), 0);
}

export function getTotalDonasiProyek(kasList, proyekId) {
  const list = Array.isArray(kasList) ? kasList : [];
  return list
    .filter((k) => k.proyek_id === proyekId && k.tipe === 'donasi')
    .reduce((s, k) => s + Number(k.nominal || 0), 0);
}

export function getTotalPengeluaranProyek(kasList, proyekId) {
  const list = Array.isArray(kasList) ? kasList : [];
  return list
    .filter((k) => k.proyek_id === proyekId && k.tipe === 'pengeluaran')
    .reduce((s, k) => s + Number(k.nominal || 0), 0);
}

export function getTotalRefundProyek(kasList, proyekId) {
  const list = Array.isArray(kasList) ? kasList : [];
  return list
    .filter((k) => k.proyek_id === proyekId && k.tipe === 'refund')
    .reduce((s, k) => s + Number(k.nominal || 0), 0);
}

/**
 * Saldo Kas Proyek = Iuran + Donasi − Pengeluaran − Refund
 */
export function getSaldoKasProyek(iuranProyekList, kasList, proyekId) {
  const iuran = getTotalIuranProyek(iuranProyekList, proyekId);
  const donasi = getTotalDonasiProyek(kasList, proyekId);
  const pengeluaran = getTotalPengeluaranProyek(kasList, proyekId);
  const refund = getTotalRefundProyek(kasList, proyekId);

  return iuran + donasi - pengeluaran - refund;
}

/**
 * Ringkasan lengkap per proyek
 * Return: {
 *   totalIuran, totalDonasi, totalPengeluaran, totalRefund, saldo
 * }
 */
export function getRingkasanKasProyek(iuranProyekList, kasList, proyekId) {
  const totalIuran = getTotalIuranProyek(iuranProyekList, proyekId);
  const totalDonasi = getTotalDonasiProyek(kasList, proyekId);
  const totalPengeluaran = getTotalPengeluaranProyek(kasList, proyekId);
  const totalRefund = getTotalRefundProyek(kasList, proyekId);
  const saldo = totalIuran + totalDonasi - totalPengeluaran - totalRefund;

  return {
    totalIuran,
    totalDonasi,
    totalPengeluaran,
    totalRefund,
    saldo,
  };
}

/**
 * Saldo total semua proyek
 */
export function getSaldoTotalSemuaProyek(iuranProyekList, kasList, proyekList) {
  const proyekSafe = Array.isArray(proyekList) ? proyekList : [];
  return proyekSafe.reduce(
    (sum, p) => sum + getSaldoKasProyek(iuranProyekList, kasList, p.id),
    0
  );
}

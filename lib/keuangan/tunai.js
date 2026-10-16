// ============================================================
// Distribusi otomatis uang tunai ke bulan-bulan yang belum lunas
// ============================================================

/**
 * @param {Number} nominal - uang yang diterima bendahara
 * @param {Array} bulanList - list bulan {kode, nama} yang perlu diisi (urut dari awal)
 * @param {Array} iuranWarga - record iuran warga (untuk cek kekurangan bulan yang sudah ada)
 * @param {Number} tarif - tarif per bulan
 * @returns {Object} { hasil: [{bulan, nominal, tipe, sisaKurang}], totalPakai, sisaUang }
 *
 * tipe: 'lunas' | 'kurang'
 */
export function distribusikanTunai(nominal, bulanList, iuranWarga, tarif) {
  const hasil = [];
  let sisaUang = Number(nominal);
  let totalPakai = 0;

  if (!Array.isArray(bulanList)) return { hasil, totalPakai, sisaUang };
  const iuranSafe = Array.isArray(iuranWarga) ? iuranWarga : [];

  for (const bln of bulanList) {
    if (sisaUang <= 0) break;

    const recsBulan = iuranSafe.filter((i) => i.bulan_tahun === bln.kode);
    const recsApproved = recsBulan.filter((r) => r.status === 'approved');
    const adaPending = recsBulan.some((r) => r.status === 'pending');

    // Skip kalau pending
    if (adaPending) continue;

    const totalApproved = recsApproved.reduce((s, r) => s + Number(r.jumlah || 0), 0);
    const kekurangan = Math.max(0, Number(tarif) - totalApproved);

    // Skip kalau sudah lunas
    if (kekurangan === 0) continue;

    if (sisaUang >= kekurangan) {
      // Cukup untuk bulan ini
      hasil.push({
        bulan: bln.kode,
        namaBulan: bln.nama,
        nominal: kekurangan,
        sisaKurang: 0,
        tipe: 'lunas',
      });
      sisaUang -= kekurangan;
      totalPakai += kekurangan;
    } else {
      // Sebagian
      hasil.push({
        bulan: bln.kode,
        namaBulan: bln.nama,
        nominal: sisaUang,
        sisaKurang: kekurangan - sisaUang,
        tipe: 'kurang',
      });
      totalPakai += sisaUang;
      sisaUang = 0;
      break;
    }
  }

  return { hasil, totalPakai, sisaUang };
}

// ============================================================
// Preview tagihan — info bulan yang belum lunas + total tagihan
// ============================================================
export function getInfoTagihan(bulanList, iuranWarga, tarif) {
  const list = [];
  let totalTagihan = 0;

  if (!Array.isArray(bulanList)) return { list, totalTagihan };
  const iuranSafe = Array.isArray(iuranWarga) ? iuranWarga : [];

  for (const bln of bulanList) {
    const recsBulan = iuranSafe.filter((i) => i.bulan_tahun === bln.kode);
    const recsApproved = recsBulan.filter((r) => r.status === 'approved');
    const adaPending = recsBulan.some((r) => r.status === 'pending');

    const totalApproved = recsApproved.reduce((s, r) => s + Number(r.jumlah || 0), 0);
    const kekurangan = Math.max(0, Number(tarif) - totalApproved);

    if (adaPending) {
      list.push({
        kode: bln.kode,
        nama: bln.nama,
        status: 'pending',
        nominal: 0,
        kekurangan: 0,
      });
      continue;
    }

    if (kekurangan === 0) {
      list.push({
        kode: bln.kode,
        nama: bln.nama,
        status: 'lunas',
        nominal: totalApproved,
        kekurangan: 0,
      });
    } else if (totalApproved > 0) {
      list.push({
        kode: bln.kode,
        nama: bln.nama,
        status: 'kurang',
        nominal: totalApproved,
        kekurangan,
      });
      totalTagihan += kekurangan;
    } else {
      list.push({
        kode: bln.kode,
        nama: bln.nama,
        status: 'belum',
        nominal: 0,
        kekurangan,
      });
      totalTagihan += kekurangan;
    }
  }

  return { list, totalTagihan };
}
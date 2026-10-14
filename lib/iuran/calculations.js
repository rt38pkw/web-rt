export function getInfoBulan(iuranList, kodeBulan, tarif) {
  const recs = iuranList.filter((i) => i.bulan_tahun === kodeBulan);
  const totalApproved = recs
    .filter((r) => r.status === 'approved')
    .reduce((s, r) => s + Number(r.jumlah || 0), 0);
  const adaPendingBulan = recs.some((r) => r.status === 'pending');
  const kurang = Math.max(0, tarif - totalApproved);
  const kosong = recs.length === 0;
  return { recs, totalApproved, adaPendingBulan, kurang, kosong };
}

export function hitungBelumLunas(iuranList, periodeBulan, tarif) {
  return periodeBulan.filter((bln) => {
    const info = getInfoBulan(iuranList, bln.kode, tarif);
    if (info.adaPendingBulan) return false;
    return info.totalApproved < tarif;
  });
}

export function hitungTotalBayar(bulanDipilih, iuranList, tarif) {
  return bulanDipilih.reduce((sum, bln) => {
    const info = getInfoBulan(iuranList, bln, tarif);
    return sum + info.kurang;
  }, 0);
}

export function formatTanggal(dateString) {
  if (!dateString) return 'Tanggal tidak tercatat';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
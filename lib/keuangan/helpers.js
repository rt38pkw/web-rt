export const formatRupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

export const formatTanggal = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const tarifWarga = (w) => (w?.kategori === 'Usaha' ? 30000 : 15000);
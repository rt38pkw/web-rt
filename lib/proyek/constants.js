export const STATUS_PROYEK = {
  AKTIF: 'aktif',
  SELESAI: 'selesai',
  BATAL: 'batal',
};

export const STATUS_PEMBAYARAN = {
  PENDING: 'pending',
  APPROVED: 'approved',
};

export const METODE = {
  QRIS: 'qris',
  TUNAI: 'tunai',
};

export function getLabelStatusProyek(status) {
  const map = {
    aktif: { label: 'Aktif', warna: 'emerald' },
    selesai: { label: 'Selesai', warna: 'blue' },
    batal: { label: 'Batal', warna: 'rose' },
  };
  return map[status] || { label: status, warna: 'slate' };
}

export function isProyekTelat(proyek) {
  if (!proyek?.deadline) return false;
  const today = new Date().toISOString().split('T')[0];
  return today > proyek.deadline;
}

export function formatTanggalProyek(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatRupiahProyek(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

export function hitungSisaHari(deadline) {
  if (!deadline) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dl = new Date(deadline);
  dl.setHours(0, 0, 0, 0);
  const diffMs = dl - today;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

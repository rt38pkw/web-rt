// ============================================================
// Format helpers
// ============================================================

export const formatRupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

export const formatTanggal = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

// ============================================================
// Tarif helpers (dinamis — baca dari tabel tarif_iuran)
// ============================================================

/**
 * Hitung tarif warga berdasarkan kategori & (opsional) tahun.
 *
 * @param {Object} w - objek warga (butuh field `kategori`)
 * @param {Array} tarifList - opsional, list tarif dari tabel tarif_iuran
 * @param {Number|String} tahun - opsional, tahun spesifik
 * @returns {Number} tarif dalam rupiah
 *
 * Cara pakai:
 *   - tarifWarga(w)                         → fallback hardcode (15.000 / 30.000)
 *   - tarifWarga(w, tarifList)              → pakai tarif tahun terbaru di tarifList
 *   - tarifWarga(w, tarifList, 2027)        → pakai tarif tahun 2027
 */
export const tarifWarga = (w, tarifList = null, tahun = null) => {
  const kategori = w?.kategori === 'Usaha' ? 'Usaha' : 'Warga';

  // Kalau tarifList dikasih & ada isinya, coba cari di sana
  if (tarifList && tarifList.length > 0) {
    if (tahun) {
      // Cari tarif untuk tahun spesifik
      const t = tarifList.find(
        (x) => Number(x.tahun) === Number(tahun) && x.kategori === kategori
      );
      if (t) return Number(t.tarif);
    } else {
      // Tidak ada tahun → pakai tarif tahun paling baru yang tersedia
      const tahunTersedia = [...new Set(tarifList.map((x) => Number(x.tahun)))].sort(
        (a, b) => b - a
      );
      for (const thn of tahunTersedia) {
        const t = tarifList.find(
          (x) => Number(x.tahun) === thn && x.kategori === kategori
        );
        if (t) return Number(t.tarif);
      }
    }
  }

  // Fallback hardcode (untuk backward compatibility)
  return kategori === 'Usaha' ? 30000 : 15000;
};

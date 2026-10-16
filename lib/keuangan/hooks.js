import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

const CACHE_TTL = 30000;
let _cache = { data: null, timestamp: 0 };

export function invalidateKeuanganCache() {
  _cache = { data: null, timestamp: 0 };
}

export function useKeuanganData() {
  const [user, setUser] = useState(null);
  const [iuran, setIuran] = useState([]);
  const [warga, setWarga] = useState([]);
  const [pengeluaran, setPengeluaran] = useState([]);
  const [pemasukanLain, setPemasukanLain] = useState([]);
  const [depositList, setDepositList] = useState([]);
  const [tarifList, setTarifList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = sessionStorage.getItem('pengurusSession');
    if (!savedUser) {
      window.location.href = '/admin';
      return;
    }
    setUser(JSON.parse(savedUser));
  }, []);

  const fetchAll = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && _cache.data && now - _cache.timestamp < CACHE_TTL) {
      const c = _cache.data;
      setIuran(c.iuran);
      setWarga(c.warga);
      setPengeluaran(c.pengeluaran);
      setPemasukanLain(c.pemasukanLain);
      setDepositList(c.depositList);
      setTarifList(c.tarifList);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [r1, r2, r3, r4, r5, r6] = await Promise.all([
        supabase.from('iuran').select('*, warga:warga_id (id, nama_lengkap, no_rumah, kategori)'),
        supabase.from('warga').select('*').order('no_rumah'),
        supabase.from('pengeluaran').select('*').order('tanggal', { ascending: false }),
        supabase.from('pemasukan_lain').select('*').order('tanggal', { ascending: false }),
        supabase.from('deposit_warga').select('*').order('tanggal', { ascending: false }),
        supabase.from('tarif_iuran').select('*').order('tahun', { ascending: false }),
      ]);
      const data = {
        iuran: r1.data || [],
        warga: r2.data || [],
        pengeluaran: r3.data || [],
        pemasukanLain: r4.data || [],
        depositList: r5.data || [],
        tarifList: r6.data || [],
      };
      _cache = { data, timestamp: Date.now() };
      setIuran(data.iuran);
      setWarga(data.warga);
      setPengeluaran(data.pengeluaran);
      setPemasukanLain(data.pemasukanLain);
      setDepositList(data.depositList);
      setTarifList(data.tarifList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchAll();
  }, [user, fetchAll]);

  return {
    user,
    iuran,
    warga,
    pengeluaran,
    pemasukanLain,
    depositList,
    tarifList,
    loading,
    refetch: () => fetchAll(true),
  };
}

export function getPendingBatches(iuran) {
  const grouped = {};
  iuran
    .filter((i) => i.status === 'pending')
    .forEach((i) => {
      const key = i.batch_id || i.id;
      if (!grouped[key]) grouped[key] = { batchId: key, items: [] };
      grouped[key].items.push(i);
    });
  return Object.values(grouped);
}

export function getSaldoDepositWarga(depositList, wargaId) {
  return depositList
    .filter((d) => d.warga_id === wargaId)
    .reduce((s, d) => s + (d.tipe === 'masuk' ? Number(d.jumlah) : -Number(d.jumlah)), 0);
}
// ============================================================
// Helper: hitung distribusi otomatis deposit ke bulan-bulan
// ============================================================
/**
 * @param {Number} saldo - saldo deposit warga
 * @param {Number} tarif - tarif per bulan (tahun yang dipilih)
 * @param {Array} bulanList - list bulan {kode, nama} yang belum lunas
 * @param {Array} iuranWarga - record iuran warga (untuk cek kekurangan bulan yang sudah ada nominal)
 * @returns {Object} { hasil: [{bulan, nominal, sisaKurang, tipe}], totalPakai, sisaSaldo }
 *
 * tipe: 'lunas' (terisi penuh) | 'kurang' (terisi sebagian, sisa masih kuning)
 */
export function hitungDistribusiAuto(saldo, tarif, bulanList, iuranWarga) {
  const hasil = [];
  let sisaSaldo = Number(saldo);
  let totalPakai = 0;

  for (const bln of bulanList) {
    if (sisaSaldo <= 0) break;

    // Cek apakah bulan ini sudah ada record approved (partial)
    const recsApproved = (iuranWarga || []).filter(
      (i) => i.bulan_tahun === bln.kode && i.status === 'approved'
    );
    const totalApproved = recsApproved.reduce((s, r) => s + Number(r.jumlah || 0), 0);
    const kekurangan = Math.max(0, Number(tarif) - totalApproved);

    if (kekurangan === 0) continue; // Sudah lunas, skip

    if (sisaSaldo >= kekurangan) {
      // Cukup untuk menutup penuh bulan ini
      hasil.push({
        bulan: bln.kode,
        namaBulan: bln.nama,
        nominal: kekurangan,
        sisaKurang: 0,
        tipe: 'lunas',
      });
      sisaSaldo -= kekurangan;
      totalPakai += kekurangan;
    } else {
      // Hanya cukup sebagian
      hasil.push({
        bulan: bln.kode,
        namaBulan: bln.nama,
        nominal: sisaSaldo,
        sisaKurang: kekurangan - sisaSaldo,
        tipe: 'kurang',
      });
      totalPakai += sisaSaldo;
      sisaSaldo = 0;
      break;
    }
  }

  return { hasil, totalPakai, sisaSaldo };
}

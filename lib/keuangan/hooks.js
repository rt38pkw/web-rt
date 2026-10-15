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
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [r1, r2, r3, r4, r5] = await Promise.all([
        supabase.from('iuran').select('*, warga:warga_id (id, nama_lengkap, no_rumah, kategori)'),
        supabase.from('warga').select('*').order('no_rumah'),
        supabase.from('pengeluaran').select('*').order('tanggal', { ascending: false }),
        supabase.from('pemasukan_lain').select('*').order('tanggal', { ascending: false }),
        supabase.from('deposit_warga').select('*').order('tanggal', { ascending: false }),
      ]);
      const data = {
        iuran: r1.data || [],
        warga: r2.data || [],
        pengeluaran: r3.data || [],
        pemasukanLain: r4.data || [],
        depositList: r5.data || [],
      };
      _cache = { data, timestamp: Date.now() };
      setIuran(data.iuran);
      setWarga(data.warga);
      setPengeluaran(data.pengeluaran);
      setPemasukanLain(data.pemasukanLain);
      setDepositList(data.depositList);
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

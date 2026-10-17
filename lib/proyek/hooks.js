import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

const CACHE_TTL = 30000;
let _cache = { data: null, timestamp: 0 };

export function invalidateProyekCache() {
  _cache = { data: null, timestamp: 0 };
}

export function useProyekData() {
  const [user, setUser] = useState(null);
  const [warga, setWarga] = useState([]);
  const [proyekList, setProyekList] = useState([]);
  const [iuranProyekList, setIuranProyekList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = sessionStorage.getItem('pengurusSession');
    if (!savedUser) {
      window.location.href = '/admin';
      return;
    }
    const parsed = JSON.parse(savedUser);
    // Guard: hanya ketua & bendahara_2 yang boleh akses
    if (parsed.role !== 'ketua' && parsed.role !== 'bendahara_2') {
      window.location.replace('/admin');
      return;
    }
    setUser(parsed);
  }, []);

  const fetchAll = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && _cache.data && now - _cache.timestamp < CACHE_TTL) {
      const c = _cache.data;
      setWarga(c.warga);
      setProyekList(c.proyekList);
      setIuranProyekList(c.iuranProyekList);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [r1, r2, r3] = await Promise.all([
        supabase.from('warga').select('*').order('no_rumah'),
        supabase.from('proyek').select('*').order('created_at', { ascending: false }),
        supabase.from('iuran_proyek').select('*').order('created_at', { ascending: false }),
      ]);
      const data = {
        warga: r1.data || [],
        proyekList: r2.data || [],
        iuranProyekList: r3.data || [],
      };
      _cache = { data, timestamp: Date.now() };
      setWarga(data.warga);
      setProyekList(data.proyekList);
      setIuranProyekList(data.iuranProyekList);
    } catch (err) {
      console.error('Gagal fetch proyek:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchAll();
  }, [user, fetchAll]);

  return {
    user,
    warga: Array.isArray(warga) ? warga : [],
    proyekList: Array.isArray(proyekList) ? proyekList : [],
    iuranProyekList: Array.isArray(iuranProyekList) ? iuranProyekList : [],
    loading,
    refetch: () => fetchAll(true),
  };
}

/**
 * Hitung jumlah pending cicilan proyek
 */
export function getPendingProyekCount(iuranProyekList) {
  if (!Array.isArray(iuranProyekList)) return 0;
  return iuranProyekList.filter((i) => i.status === 'pending').length;
}

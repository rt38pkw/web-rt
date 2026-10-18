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
  const [kasProyekList, setKasProyekList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('pengurusSession');
    if (!savedUser) {
      window.location.replace('/admin');
      return;
    }
    const parsed = JSON.parse(savedUser);
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
      setKasProyekList(c.kasProyekList);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [r1, r2, r3, r4] = await Promise.all([
        supabase.from('warga').select('*').order('no_rumah'),
        supabase.from('proyek').select('*').order('created_at', { ascending: false }),
        supabase.from('iuran_proyek').select('*').order('created_at', { ascending: false }),
        supabase.from('kas_proyek').select('*').order('tanggal', { ascending: false }),
      ]);
      const data = {
        warga: r1.data || [],
        proyekList: r2.data || [],
        iuranProyekList: r3.data || [],
        kasProyekList: r4.data || [],
      };
      _cache = { data, timestamp: Date.now() };
      setWarga(data.warga);
      setProyekList(data.proyekList);
      setIuranProyekList(data.iuranProyekList);
      setKasProyekList(data.kasProyekList);
    } catch (err) {
      console.error('Gagal fetch proyek:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ═══ FITUR REALTIME ═══
  useEffect(() => {
    if (user) {
      fetchAll();

      const channel = supabase
        .channel('proyek-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'iuran_proyek' }, () => fetchAll(true))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kas_proyek' }, () => fetchAll(true))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'proyek' }, () => fetchAll(true))
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchAll]);

  return {
    user,
    warga: Array.isArray(warga) ? warga : [],
    proyekList: Array.isArray(proyekList) ? proyekList : [],
    iuranProyekList: Array.isArray(iuranProyekList) ? iuranProyekList : [],
    kasProyekList: Array.isArray(kasProyekList) ? kasProyekList : [],
    loading,
    refetch: () => fetchAll(true),
  };
}

export function getPendingProyekCount(iuranProyekList) {
  if (!Array.isArray(iuranProyekList)) return 0;
  return iuranProyekList.filter((i) => i.status === 'pending').length;
}

import { supabase } from '../supabase';

export async function fetchWargaById(wargaId) {
  const { data, error } = await supabase
    .from('warga')
    .select('*')
    .eq('id', wargaId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchIuranByWarga(wargaId) {
  const { data, error } = await supabase
    .from('iuran')
    .select('*')
    .eq('warga_id', wargaId);
  if (error) throw error;
  return data || [];
}

export async function fetchAllWarga() {
  const { data, error } = await supabase
    .from('warga')
    .select('*')
    .order('no_rumah', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchAllIuran() {
  const { data, error } = await supabase.from('iuran').select('*');
  if (error) throw error;
  return data || [];
}

export async function insertPengajuanIuran(records) {
  const { error } = await supabase.from('iuran').insert(records);
  if (error) throw error;
}
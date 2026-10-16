import { supabase } from '../supabase';

// ============================================================
// PROYEK — Master
// ============================================================

export async function fetchAllProyek() {
  const { data, error } = await supabase
    .from('proyek')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchProyekAktif() {
  const { data, error } = await supabase
    .from('proyek')
    .select('*')
    .eq('status', 'aktif')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchProyekById(id) {
  const { data, error } = await supabase
    .from('proyek')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createProyek({ nama, deskripsi, nominal_per_warga, deadline, created_by }) {
  const { data, error } = await supabase
    .from('proyek')
    .insert([
      {
        nama,
        deskripsi: deskripsi || null,
        nominal_per_warga: Number(nominal_per_warga),
        deadline,
        status: 'aktif',
        created_by: created_by || null,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProyek(id, payload) {
  const { data, error } = await supabase
    .from('proyek')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProyek(id) {
  const { error } = await supabase.from('proyek').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// IURAN PROYEK — Transaksi
// ============================================================

export async function fetchIuranProyekByWarga(wargaId) {
  const { data, error } = await supabase
    .from('iuran_proyek')
    .select('*')
    .eq('warga_id', wargaId)
    .order('tanggal', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchIuranProyekByProyek(proyekId) {
  const { data, error } = await supabase
    .from('iuran_proyek')
    .select('*')
    .eq('proyek_id', proyekId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchAllIuranProyek() {
  const { data, error } = await supabase
    .from('iuran_proyek')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function insertPengajuanIuranProyek(record) {
  const { data, error } = await supabase
    .from('iuran_proyek')
    .insert([record])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function insertIuranProyekBulk(records) {
  const { data, error } = await supabase
    .from('iuran_proyek')
    .insert(records)
    .select();
  if (error) throw error;
  return data || [];
}

export async function approveIuranProyek(id, { tanggal_transaksi }) {
  const { data, error } = await supabase
    .from('iuran_proyek')
    .update({
      status: 'approved',
      tanggal_transaksi: tanggal_transaksi || new Date().toISOString().split('T')[0],
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteIuranProyek(id) {
  const { error } = await supabase.from('iuran_proyek').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteIuranProyekByBatch(batchId) {
  const { error } = await supabase.from('iuran_proyek').delete().eq('batch_id', batchId);
  if (error) throw error;
}

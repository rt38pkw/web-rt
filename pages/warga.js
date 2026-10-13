import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function DataWarga() {
  const [listWarga, setListWarga] = useState([]);
  const [form, setForm] = useState({ nama_lengkap: '', no_kk: '', nik: '', no_wa: '', status_warga: 'Tetap' });

  useEffect(() => {
    fetchWarga();
  }, []);

  async function fetchWarga() {
    const { data } = await supabase.from('warga').select('*').order('created_at', { ascending: false });
    if (data) setListWarga(data);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const { error } = await supabase.from('warga').insert([form]);
    if (error) alert('Gagal menambah data: ' + error.message);
    else {
      alert('Data warga berhasil ditambahkan!');
      setForm({ nama_lengkap: '', no_kk: '', nik: '', no_wa: '', status_warga: 'Tetap' });
      fetchWarga();
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-blue-700">👨‍👩‍👧‍👦 Pendataan Warga RT</h2>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 bg-gray-50 p-4 rounded-lg border">
          <input 
            type="text" placeholder="Nama Lengkap" required
            className="border p-2 rounded" value={form.nama_lengkap}
            onChange={(e) => setForm({...form, nama_lengkap: e.target.value})}
          />
          <input 
            type="text" placeholder="Nomor KK (16 Digit)" required
            className="border p-2 rounded" value={form.no_kk}
            onChange={(e) => setForm({...form, no_kk: e.target.value})}
          />
          <input 
            type="text" placeholder="NIK (16 Digit)" required
            className="border p-2 rounded" value={form.nik}
            onChange={(e) => setForm({...form, nik: e.target.value})}
          />
          <input 
            type="text" placeholder="No. WhatsApp" required
            className="border p-2 rounded" value={form.no_wa}
            onChange={(e) => setForm({...form, no_wa: e.target.value})}
          />
          <select 
            className="border p-2 rounded col-span-1 md:col-span-2"
            value={form.status_warga}
            onChange={(e) => setForm({...form, status_warga: e.target.value})}
          >
            <option value="Tetap">Warga Tetap</option>
            <option value="Kontrak">Warga Kontrak</option>
          </select>
          <button type="submit" className="bg-blue-600 text-white py-2 rounded col-span-1 md:col-span-2 font-semibold hover:bg-blue-700">
            Simpan Data Warga
          </button>
        </form>

        <h3 className="text-lg font-semibold mb-3">Daftar Warga Terdaftar</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">NIK</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">No. WA</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-sm">
              {listWarga.map((w) => (
                <tr key={w.id}>
                  <td className="px-4 py-2 font-medium">{w.nama_lengkap}</td>
                  <td className="px-4 py-2">{w.nik}</td>
                  <td className="px-4 py-2">{w.no_wa}</td>
                  <td className="px-4 py-2">{w.status_warga}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

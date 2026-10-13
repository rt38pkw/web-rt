import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function SuratWarga() {
  const [nik, setNik] = useState('');
  const [jenis, setJenis] = useState('Surat Pengantar Domisili');
  const [keterangan, setKeterangan] = useState('');
  const [pesan, setPesan] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const { data: wargaData } = await supabase.from('warga').select('id').eq('nik', nik).single();
    if (!wargaData) return alert('NIK tidak ditemukan!');

    const { error } = await supabase.from('surat').insert([
      { warga_id: wargaData.id, jenis_surat: jenis, keterangan: keterangan }
    ]);

    if (!error) setPesan('✅ Pengajuan surat berhasil dikirim!');
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-bold mb-4 text-center text-blue-700">📄 Pengajuan Surat Pengantar RT</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="text" placeholder="NIK Warga" required className="w-full border p-2 rounded"
            value={nik} onChange={(e) => setNik(e.target.value)}
          />
          <select className="w-full border p-2 rounded" value={jenis} onChange={(e) => setJenis(e.target.value)}>
            <option value="Surat Pengantar Domisili">Surat Pengantar Domisili</option>
            <option value="Surat Pengantar SKCK">Surat Pengantar SKCK</option>
            <option value="Surat Pengantar Nikah">Surat Pengantar Nikah</option>
            <option value="Surat Keterangan Tidak Mampu">Surat Keterangan Tidak Mampu (SKTM)</option>
          </select>
          <textarea 
            placeholder="Keterangan Tambahan / Keperluan" className="w-full border p-2 rounded" rows="3"
            value={keterangan} onChange={(e) => setKeterangan(e.target.value)}
          ></textarea>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700">
            Kirim Pengajuan Surat
          </button>
        </form>
        {pesan && <p className="mt-4 p-3 bg-green-50 text-green-700 rounded text-sm text-center">{pesan}</p>}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function IuranWarga() {
  const [nik, setNik] = useState('');
  const [bulan, setBulan] = useState('2026-10');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pesan, setPesan] = useState('');

  async function handleUpload(e) {
    e.preventDefault();
    if (!file || !nik) return alert('Lengkapi NIK dan unggah bukti transfer!');

    setLoading(true);
    setPesan('');

    try {
      const { data: wargaData, error: wargaErr } = await supabase
        .from('warga')
        .select('id')
        .eq('nik', nik)
        .single();

      if (wargaErr || !wargaData) {
        setLoading(false);
        return alert('NIK tidak ditemukan dalam data warga! Silakan mendaftar terlebih dahulu.');
      }

      const fileName = `${Date.now()}_${file.name}`;
      const { data: storageData, error: storageErr } = await supabase.storage
        .from('bukti-transfer')
        .upload(fileName, file);

      if (storageErr) throw storageErr;

      const { data: publicUrlData } = supabase.storage
        .from('bukti-transfer')
        .getPublicUrl(fileName);

      const buktiUrl = publicUrlData.publicUrl;

      const { error: insertErr } = await supabase.from('iuran').insert([
        {
          warga_id: wargaData.id,
          bulan_tahun: bulan,
          jumlah: 50000,
          bukti_transfer_url: buktiUrl,
          status: 'Pending'
        }
      ]);

      if (insertErr) throw insertErr;

      setPesan('✅ Bukti pembayaran berhasil dikirim! Menunggu konfirmasi bendahara.');
      setFile(null);
    } catch (err) {
      alert('Gagal mengirim bukti bayar: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-bold mb-4 text-center text-blue-700">💳 Pembayaran Iuran Kas RT</h2>

        <div className="bg-gray-50 border p-4 rounded-lg text-center mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-2">Scan QRIS RT Tempat Tinggal</p>
          <img 
            src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=QRIS_RT_KAS" 
            alt="QRIS RT" 
            className="mx-auto w-48 h-48 border rounded-md"
          />
          <p className="text-xs text-gray-500 mt-2">Nominal Iuran Rutin: <b>Rp 50.000 / Bulan</b></p>
        </div>

        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">NIK Kepala Keluarga/Warga</label>
            <input 
              type="text" 
              required
              className="w-full border p-2 rounded mt-1" 
              placeholder="Masukkan 16 Digit NIK"
              value={nik}
              onChange={(e) => setNik(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Bulan Iuran</label>
            <input 
              type="month" 
              required
              className="w-full border p-2 rounded mt-1"
              value={bulan}
              onChange={(e) => setBulan(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Upload Bukti Transfer / Resi QRIS</label>
            <input 
              type="file" 
              accept="image/*"
              required
              className="w-full border p-2 rounded mt-1 text-sm"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded font-semibold hover:bg-green-700 transition"
          >
            {loading ? 'Mengirim...' : 'Kirim Bukti Pembayaran'}
          </button>
        </form>

        {pesan && <p className="mt-4 p-3 bg-green-50 text-green-700 rounded text-sm text-center">{pesan}</p>}
      </div>
    </div>
  );
}

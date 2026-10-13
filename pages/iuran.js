import { useState } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function IuranWarga() {
  const [nama, setNama] = useState('');
  const [blok, setBlok] = useState('');
  const [bulan, setBulan] = useState('Januari');
  const [nominal, setNominal] = useState('50000');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let buktiUrl = '';
      if (file) {
        const fileName = `${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('bukti_iuran')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('bukti_iuran').getPublicUrl(fileName);
        buktiUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase.from('iuran').insert([
        {
          nama,
          blok_rumah: blok,
          bulan,
          nominal: parseInt(nominal),
          bukti_url: buktiUrl,
          status: 'Pending',
        },
      ]);

      if (error) throw error;

      alert('Bukti pembayaran berhasil dikirim! Menunggu konfirmasi Bendahara.');
      setNama('');
      setBlok('');
      setFile(null);
    } catch (err) {
      alert(`Gagal mengirim: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 antialiased">
      <div className="max-w-xl mx-auto space-y-6">
        <Link href="/" className="inline-flex items-center text-xs text-slate-400 hover:text-white transition">
          &larr; Kembali ke Beranda
        </Link>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">💳 Pembayaran Iuran RT</h2>
            <p className="text-xs text-slate-400 mt-1">Upload bukti transfer atau scan QRIS pembayaran warga</p>
          </div>

          {/* Stiker QRIS Card */}
          <div className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl text-center space-y-3">
            <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
              QRIS Resmi Kas RT
            </span>
            <div className="w-48 h-48 bg-white mx-auto rounded-lg flex items-center justify-center text-slate-900 font-bold text-xs p-2">
              [ Standard QRIS Code Image ]
            </div>
            <p className="text-[11px] text-slate-400">Transfer tepat sesuai nominal iuran bulanan (Rp50.000)</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Nama Lengkap</label>
              <input
                type="text"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Contoh: Budi Santoso"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Blok / No. Rumah</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Contoh: A3/12"
                  value={blok}
                  onChange={(e) => setBlok(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Iuran Bulan</label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={bulan}
                  onChange={(e) => setBulan(e.target.value)}
                >
                  {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Upload Struk / Bukti Transfer</label>
              <input
                type="file"
                accept="image/*"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                onChange={(e) => setFile(e.target.files[0])}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl text-sm transition shadow-lg shadow-blue-600/30"
            >
              {loading ? 'Mengunggah...' : 'Kirim Bukti Pembayaran'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

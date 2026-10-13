import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function Home() {
  const [pengumuman, setPengumuman] = useState([]);

  useEffect(() => {
    fetchPengumuman();
  }, []);

  async function fetchPengumuman() {
    const { data } = await supabase.from('pengumuman').select('*').order('created_at', { ascending: false });
    if (data) setPengumuman(data);
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-blue-700">🏡 Portal Digital RT</h1>
          <nav className="flex space-x-3 text-sm">
            <Link href="/warga" className="text-blue-600 hover:underline">Data Warga</Link>
            <Link href="/iuran" className="text-blue-600 hover:underline">Bayar Iuran</Link>
            <Link href="/admin-iuran" className="bg-blue-600 text-white px-3 py-1 rounded">Bendahara</Link>
          </nav>
        </div>

        <div className="mb-6 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
          <h2 className="text-lg font-semibold text-blue-900">Selamat Datang di Sistem Informasi RT</h2>
          <p className="text-sm text-blue-700 mt-1">Layanan iuran QRIS, pendataan warga, dan pengajuan surat online dalam satu tempat.</p>
        </div>

        <h3 className="text-xl font-semibold mb-4 text-gray-800">📌 Papan Pengumuman RT</h3>
        <div className="space-y-4">
          {pengumuman.length === 0 ? (
            <p className="text-gray-500 italic">Belum ada pengumuman terbaru.</p>
          ) : (
            pengumuman.map((item) => (
              <div key={item.id} className="border p-4 rounded-lg shadow-sm bg-gray-50">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span className="font-semibold text-blue-600">{item.tanggal}</span>
                </div>
                <h4 className="font-bold text-gray-800 text-lg">{item.judul}</h4>
                <p className="text-gray-600 mt-1 whitespace-pre-line">{item.isi}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

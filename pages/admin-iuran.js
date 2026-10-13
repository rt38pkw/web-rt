import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminIuran() {
  const [transaksi, setTransaksi] = useState([]);

  useEffect(() => {
    fetchTransaksi();
  }, []);

  async function fetchTransaksi() {
    const { data, error } = await supabase
      .from('iuran')
      .select(`
        id,
        bulan_tahun,
        jumlah,
        bukti_transfer_url,
        status,
        created_at,
        warga ( nama_lengkap, no_wa )
      `)
      .order('created_at', { ascending: false });

    if (data) setTransaksi(data);
  }

  async function updateStatus(id, newStatus) {
    const { error } = await supabase
      .from('iuran')
      .update({ status: newStatus })
      .eq('id', id);

    if (!error) {
      alert(`Status transaksi berhasil diubah menjadi ${newStatus}`);
      fetchTransaksi();
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">📊 Dashboard Bendahara RT - Verifikasi Iuran</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nama Warga</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bulan</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bukti Transfer</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-sm">
              {transaksi.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium">{item.warga?.nama_lengkap || 'Warga (Belum Terdata)'}</td>
                  <td className="px-4 py-3">{item.bulan_tahun}</td>
                  <td className="px-4 py-3 font-semibold">Rp {Number(item.jumlah).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3">
                    {item.bukti_transfer_url ? (
                      <a href={item.bukti_transfer_url} target="_blank" rel="noreferrer" className="text-blue-600 underline text-xs">
                        Lihat Foto Resi
                      </a>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded font-bold ${
                      item.status === 'Disetujui' ? 'bg-green-100 text-green-800' :
                      item.status === 'Ditolak' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center space-x-2">
                    {item.status === 'Pending' && (
                      <>
                        <button 
                          onClick={() => updateStatus(item.id, 'Disetujui')}
                          className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                        >
                          Setujui
                        </button>
                        <button 
                          onClick={() => updateStatus(item.id, 'Ditolak')}
                          className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
                        >
                          Tolak
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

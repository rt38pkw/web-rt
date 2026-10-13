import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';

export default function AdminIuran() {
  const [listIuran, setListIuran] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase.from('iuran').select('*').order('created_at', { ascending: false });
    if (data) setListIuran(data);
    setLoading(false);
  }

  async function handleApprove(id) {
    const { error } = await supabase.from('iuran').update({ status: 'Approved' }).eq('id', id);
    if (!error) {
      alert('Iuran berhasil disetujui!');
      fetchData();
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 antialiased">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div>
            <h1 className="text-xl font-bold text-white">💳 Dashboard Verifikasi Iuran</h1>
            <p className="text-xs text-slate-400">Persetujuan pembayaran iuran warga bulanan</p>
          </div>
          <Link href="/admin" className="text-xs bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-slate-300 border border-slate-700">
            &larr; Kembali ke Admin
          </Link>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <th className="p-4">Warga & Blok</th>
                  <th className="p-4">Bulan</th>
                  <th className="p-4">Nominal</th>
                  <th className="p-4">Bukti Transfer</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-6 text-slate-500">Memuat data...</td></tr>
                ) : listIuran.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-6 text-slate-500">Belum ada transaksi iuran.</td></tr>
                ) : (
                  listIuran.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4 font-semibold text-white">{item.nama} <span className="text-slate-500 font-normal">({item.blok_rumah})</span></td>
                      <td className="p-4">{item.bulan}</td>
                      <td className="p-4 font-mono">Rp {item.nominal?.toLocaleString()}</td>
                      <td className="p-4">
                        {item.bukti_url ? (
                          <a href={item.bukti_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                            Lihat Foto &rarr;
                          </a>
                        ) : '-'}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          item.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {item.status !== 'Approved' && (
                          <button
                            onClick={() => handleApprove(item.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

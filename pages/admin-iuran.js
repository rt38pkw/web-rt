import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function AdminIuran() {
  const [listBatch, setListBatch] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [filter, setFilter] = useState('pending'); // 'pending' | 'approved' | 'all'

  useEffect(() => {
    fetchData();
  }, []);

  function getPathFromUrl(url) {
    if (!url) return null;
    const marker = '/bukti-transfer/';
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.substring(idx + marker.length);
  }

  async function fetchData() {
    setLoading(true);
    const { data, error } = await supabase
      .from('iuran')
      .select('*, warga:warga_id (nama_lengkap, no_rumah, kategori)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const grouped = {};
      data.forEach(item => {
        const key = item.batch_id || item.id;
        if (!grouped[key]) {
          grouped[key] = {
            batchId: key,
            warga: item.warga,
            warga_id: item.warga_id,
            bulan: [],
            total: 0,
            status: item.status,
            bukti_urls: item.bukti_urls || [],
            catatan: item.catatan,
            created_at: item.created_at,
            tanggal_transaksi: item.tanggal_transaksi,
            items: [],
          };
        }
        grouped[key].bulan.push(item.bulan_tahun);
        grouped[key].total += Number(item.jumlah || 0);
        grouped[key].items.push(item);
      });

      // Urutkan bulan
      const bulanOrder = ['2026-04','2026-05','2026-06','2026-07','2026-08','2026-09','2026-10','2026-11','2026-12'];
      Object.values(grouped).forEach(b => {
        b.bulan.sort((a, c) => bulanOrder.indexOf(a) - bulanOrder.indexOf(c));
      });

      setListBatch(Object.values(grouped));
    }
    setLoading(false);
  }

  async function handleApproveBatch(batch) {
    if (!confirm(`Approve pembayaran ${batch.warga?.nama_lengkap} untuk ${batch.bulan.length} bulan?`)) return;

    setProcessing(batch.batchId);
    try {
      const today = new Date().toISOString().split('T')[0];

      // 1. Update status
      const { error: upErr } = await supabase
        .from('iuran')
        .update({
          status: 'approved',
          tanggal_transaksi: today,
        })
        .eq('batch_id', batch.batchId);

      if (upErr) throw upErr;

      // 2. Hapus file dari storage
      if (batch.bukti_urls && batch.bukti_urls.length > 0) {
        const paths = batch.bukti_urls.map(getPathFromUrl).filter(Boolean);
        if (paths.length > 0) {
          const { error: stErr } = await supabase.storage
            .from('bukti-transfer')
            .remove(paths);
          if (stErr) console.warn('Gagal hapus file:', stErr.message);
        }

        // 3. Set bukti_urls jadi null
        await supabase
          .from('iuran')
          .update({ bukti_urls: null })
          .eq('batch_id', batch.batchId);
      }

      alert('✅ Berhasil di-approve & file bukti dihapus.');
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Gagal approve: ' + (err.message || 'Unknown'));
    } finally {
      setProcessing(null);
    }
  }

  const filtered = listBatch.filter(b => {
    if (filter === 'all') return true;
    return b.status === filter;
  });

  const countPending = listBatch.filter(b => b.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 antialiased">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div>
            <h1 className="text-xl font-bold text-white">💳 Dashboard Verifikasi Iuran</h1>
            <p className="text-xs text-slate-400">
              Persetujuan pembayaran iuran warga bulanan
              {countPending > 0 && (
                <span className="ml-2 inline-block px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold">
                  {countPending} menunggu
                </span>
              )}
            </p>
          </div>
          <Link href="/admin" className="text-xs bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-slate-300 border border-slate-700">
            &larr; Kembali ke Admin
          </Link>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {[
            { key: 'pending', label: '⏳ Menunggu' },
            { key: 'approved', label: '✓ Disetujui' },
            { key: 'all', label: '📋 Semua' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                filter === f.key
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >{f.label}</button>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <th className="p-4">Warga</th>
                  <th className="p-4">Bulan</th>
                  <th className="p-4">Nominal</th>
                  <th className="p-4">Bukti</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-6 text-slate-500">Memuat data...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-6 text-slate-500">
                    {filter === 'pending' ? 'Tidak ada pembayaran yang menunggu.' : 'Tidak ada data.'}
                  </td></tr>
                ) : (
                  filtered.map((batch) => {
                    const isUsaha = batch.warga?.kategori === 'Usaha' || batch.warga?.no_rumah?.trim() === 'A2 - 19';
                    return (
                      <tr key={batch.batchId} className="hover:bg-slate-800/40 transition">
                        <td className="p-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-white">
                              {batch.warga?.nama_lengkap || '-'}
                            </span>
                            <span className="text-slate-500 text-[10px]">
                              ({batch.warga?.no_rumah || '-'}) {isUsaha && '🏪'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {batch.bulan.map((b, i) => (
                              <span key={i} className="text-[10px] bg-slate-800 px-2 py-0.5 rounded">
                                {b.replace('2026-', '')}
                              </span>
                            ))}
                          </div>
                          {batch.catatan && (
                            <div className="text-[10px] text-slate-500 mt-1 italic">"{batch.catatan}"</div>
                          )}
                        </td>
                        <td className="p-4 font-mono">Rp {batch.total.toLocaleString('id-ID')}</td>
                        <td className="p-4">
                          {batch.bukti_urls && batch.bukti_urls.length > 0 ? (
                            <div className="flex gap-1">
                              {batch.bukti_urls.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer"
                                   className="inline-block bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] px-2 py-1 rounded border border-blue-500/20">
                                  📎 {i + 1}
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            batch.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                          }`}>
                            {batch.status}
                          </span>
                        </td>
                        <td className="p-4">
                          {batch.status === 'pending' && (
                            <button
                              onClick={() => handleApproveBatch(batch)}
                              disabled={processing === batch.batchId}
                              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition"
                            >
                              {processing === batch.batchId ? 'Memproses...' : '✓ Approve'}
                            </button>
                          )}
                          {batch.status === 'approved' && batch.tanggal_transaksi && (
                            <span className="text-slate-500 text-[10px]">
                              {new Date(batch.tanggal_transaksi).toLocaleDateString('id-ID')}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

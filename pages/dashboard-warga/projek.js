import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/warga/Layout';
import ProjectsCard from '../../components/warga/ProjekCard';
import ModalBayarProjek from '../../components/warga/ModalBayarProjek';
import { formatRupiahProyek, formatTanggalProyek, isProyekTelat } from '../../lib/proyek/constants';
import {
  getTotalTerbayar,
  getTotalPending,
  getSisaWarga,
} from '../../lib/proyek/calculations';
import { uploadBuktiProyek } from '../../lib/proyek/storage';

export default function DashboardWargaProjek() {
  const [warga, setWarga] = useState(null);
  const [proyekList, setProyekList] = useState([]);
  const [iuranProyekList, setIuranProyekList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModalBayar, setShowModalBayar] = useState(false);
  const [proyekDipilih, setProyekDipilih] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const savedSession = localStorage.getItem('warga_session');
    if (!savedSession) {
      router.push('/');
      return;
    }
    const userData = JSON.parse(savedSession);
    setWarga(userData);
    loadData(userData.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async (wargaId) => {
    setLoading(true);
    try {
      const [resProyek, resIuran] = await Promise.all([
        supabase
          .from('proyek')
          .select('*')
          .in('status', ['aktif', 'selesai'])
          .order('created_at', { ascending: false }),
        supabase
          .from('iuran_proyek')
          .select('*')
          .eq('warga_id', wargaId)
          .order('created_at', { ascending: false }),
      ]);
      setProyekList(resProyek.data || []);
      setIuranProyekList(resIuran.data || []);
    } catch (err) {
      console.error('Gagal load data proyek:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('warga_session');
    router.push('/');
  };

  // ── Preview cicilan di modal ──
  const handleBayar = (proyek) => {
    setProyekDipilih(proyek);
    setShowModalBayar(true);
  };

  const handleSubmitBayar = async ({ nominal, fileBukti, catatan }) => {
    setSubmitting(true);
    try {
      const batchId = crypto.randomUUID();
      const uploadedUrls = [];

      for (let i = 0; i < 3; i++) {
        const file = fileBukti[i];
        if (!file) continue;
        const url = await uploadBuktiProyek(file, warga.id, batchId, i);
        uploadedUrls.push(url);
      }

      const { error } = await supabase.from('iuran_proyek').insert([
        {
          proyek_id: proyekDipilih.id,
          warga_id: warga.id,
          tanggal: new Date().toISOString().split('T')[0],
          jumlah: nominal,
          status: 'pending',
          metode: 'qris',
          batch_id: batchId,
          bukti_urls: uploadedUrls,
          catatan: catatan || null,
        },
      ]);

      if (error) throw error;

      alert('✅ Pengajuan cicilan berhasil dikirim! Menunggu approve bendahara.');
      setShowModalBayar(false);
      setProyekDipilih(null);
      loadData(warga.id);
    } catch (err) {
      console.error(err);
      alert('Gagal: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!warga) return null;

  // Filter proyek: tampil semua, tapi urutkan aktif dulu
  const proyekTampil = proyekList.sort((a, b) => {
    if (a.status === 'aktif' && b.status !== 'aktif') return -1;
    if (a.status !== 'aktif' && b.status === 'aktif') return 1;
    return 0;
  });

  // Riwayat cicilan semua proyek
  const riwayatCicilan = iuranProyekList;

  return (
    <>
      <Head>
        <title>Projek - Portal Warga RT 38</title>
      </Head>
      <Layout warga={warga} onLogout={handleLogout}>
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-4">
          <h3 className="text-base font-bold text-white">🏗️ Projek RT 38</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Iuran khusus untuk proyek lingkungan (CCTV, jalan, dll)
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Memuat data proyek...</div>
        ) : (
          <>
            {/* Daftar Proyek */}
            {proyekTampil.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center">
                <div className="text-4xl mb-2">🏗️</div>
                <p className="text-sm text-slate-400">Belum ada proyek aktif saat ini.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {proyekTampil.map((proyek) => {
                  const terbayar = getTotalTerbayar(iuranProyekList, warga.id, proyek.id);
                  const pending = getTotalPending(iuranProyekList, warga.id, proyek.id);
                  const sisa = getSisaWarga(iuranProyekList, warga.id, proyek);
                  const adaPending = pending > 0;

                  let statusWarga = 'belum';
                  if (terbayar >= Number(proyek.nominal_per_warga)) statusWarga = 'lunas';
                  else if (terbayar > 0) statusWarga = 'kurang';

                  return (
                    <ProjectsCard
                      key={proyek.id}
                      proyek={proyek}
                      terbayar={terbayar}
                      sisa={sisa}
                      statusWarga={statusWarga}
                      adaPending={adaPending}
                      onBayar={() => handleBayar(proyek)}
                    />
                  );
                })}
              </div>
            )}

            {/* Riwayat Cicilan */}
            {riwayatCicilan.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white">📜 Riwayat Cicilan Anda</h3>
                </div>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
                      <tr>
                        <th className="p-3">Tanggal</th>
                        <th className="p-3">Proyek</th>
                        <th className="p-3 text-right">Nominal</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {riwayatCicilan.map((c) => {
                        const p = proyekList.find((x) => x.id === c.proyek_id);
                        return (
                          <tr key={c.id} className="hover:bg-slate-800/40">
                            <td className="p-3 text-slate-400 whitespace-nowrap text-[10px]">
                              {formatTanggalProyek(c.tanggal_transaksi || c.tanggal)}
                            </td>
                            <td className="p-3 text-slate-300 text-[11px]">
                              {p?.nama || '-'}
                            </td>
                            <td className="p-3 text-right font-mono font-semibold text-emerald-400">
                              + {formatRupiahProyek(c.jumlah)}
                            </td>
                            <td className="p-3">
                              {c.status === 'approved' ? (
                                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                                  ✓ Approved
                                </span>
                              ) : (
                                <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded">
                                  ⏳ Menunggu
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </Layout>

      {/* Modal Bayar */}
      {showModalBayar && proyekDipilih && (
        <ModalBayarProjek
          show={showModalBayar}
          onClose={() => {
            setShowModalBayar(false);
            setProyekDipilih(null);
          }}
          proyek={proyekDipilih}
          sisaWarga={getSisaWarga(iuranProyekList, warga.id, proyekDipilih)}
          sudahBayar={getTotalTerbayar(iuranProyekList, warga.id, proyekDipilih.id)}
          onSubmit={handleSubmitBayar}
          submitting={submitting}
        />
      )}
    </>
  );
}

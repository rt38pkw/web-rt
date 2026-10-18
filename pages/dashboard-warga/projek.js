import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/warga/Layout';
import ProjectsCard from '../../components/warga/ProjekCard';
import ModalBayarProjek from '../../components/warga/ModalBayarProjek';
import ModalRekapProjek from '../../components/warga/ModalRekapProjek';
import { formatRupiahProyek, formatTanggalProyek } from '../../lib/proyek/constants';
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
  const [kasProyekList, setKasProyekList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal bayar
  const [showModalBayar, setShowModalBayar] = useState(false);
  const [proyekDipilih, setProyekDipilih] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal rekap
  const [showRekap, setShowRekap] = useState(false);
  const [rekapProyek, setRekapProyek] = useState(null);
  const [allWargaList, setAllWargaList] = useState([]);
  const [allIuranList, setAllIuranList] = useState([]);
  const [loadingRekap, setLoadingRekap] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const savedSession = localStorage.getItem('warga_session');
    if (!savedSession) {
      router.replace('/');
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
      const [resProyek, resIuran, resKas] = await Promise.all([
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
        supabase
          .from('kas_proyek')
          .select('*')
          .eq('warga_id', wargaId)
          .order('tanggal', { ascending: false }),
      ]);
      
      // Filter proyek yang valid (punya id & nominal)
      const proyekValid = (resProyek.data || []).filter(p => p && p.id && p.nominal_per_warga);
      
      setProyekList(proyekValid);
      setIuranProyekList(resIuran.data || []);
      setKasProyekList(resKas.data || []);
    } catch (err) {
      console.error('Gagal load data proyek:', err);
    } finally {
      setLoading(false);
    }
  };

  // ═══ PERBAIKAN FUNGSI LOGOUT ═══
  const handleLogout = () => {
    if (!confirm('Keluar dari akun warga?')) return;
    localStorage.removeItem('warga_session');
    router.replace('/'); // Pakai replace agar tidak bisa di-back
  };

  const handleBayar = (proyek) => {
    setProyekDipilih(proyek);
    setShowModalBayar(true);
  };

  const handleSubmitBayar = async ({ nominal, nominalIuran, nominalDonasi, fileBukti, catatan }) => {
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

      const today = new Date().toISOString().split('T')[0];

      if (nominalIuran > 0) {
        const { error: errIuran } = await supabase.from('iuran_proyek').insert([
          {
            proyek_id: proyekDipilih.id,
            warga_id: warga.id,
            tanggal: today,
            jumlah: nominalIuran,
            status: 'pending',
            metode: 'qris',
            batch_id: batchId,
            bukti_urls: uploadedUrls,
            catatan: catatan || null,
          },
        ]);
        if (errIuran) throw errIuran;
      }

      if (nominalDonasi > 0) {
        const { error: errKas } = await supabase.from('kas_proyek').insert([
          {
            proyek_id: proyekDipilih.id,
            warga_id: warga.id,
            tipe: 'donasi',
            tanggal: today,
            nominal: nominalDonasi,
            keterangan: `Donasi otomatis dari kelebihan bayar (batch ${batchId.slice(0, 8)})`,
          },
        ]);
        if (errKas) throw errKas;
      }

      let pesan = '✅ Pengajuan berhasil dikirim!';
      if (nominalDonasi > 0) {
        pesan += `\n\n📊 Rincian:\n• Cicilan iuran: ${formatRupiahProyek(nominalIuran)}\n• Donasi otomatis: ${formatRupiahProyek(nominalDonasi)}\n\nDonasi langsung tercatat, cicilan menunggu approve bendahara.`;
      } else {
        pesan += ' Menunggu approve bendahara.';
      }
      alert(pesan);

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

  const handleLihatRekap = async (proyek) => {
    setLoadingRekap(true);
    try {
      if (allWargaList.length === 0) {
        const [resWarga, resIuran] = await Promise.all([
          supabase.from('warga').select('*').order('no_rumah'),
          supabase.from('iuran_proyek').select('*').eq('proyek_id', proyek.id),
        ]);
        setAllWargaList(resWarga.data || []);
        setAllIuranList(resIuran.data || []);
      } else {
        const { data } = await supabase
          .from('iuran_proyek')
          .select('*')
          .eq('proyek_id', proyek.id);
        setAllIuranList(data || []);
      }
      setRekapProyek(proyek);
      setShowRekap(true);
    } catch (err) {
      alert('Gagal memuat rekap: ' + err.message);
    } finally {
      setLoadingRekap(false);
    }
  };

  if (!warga) return null;

  // Urutkan: Aktif di atas
  const proyekTampil = [...proyekList].sort((a, b) => {
    if (a.status === 'aktif' && b.status !== 'aktif') return -1;
    if (a.status !== 'aktif' && b.status === 'aktif') return 1;
    return 0;
  });

  const riwayatCicilan = iuranProyekList.map((i) => ({
    id: 'i-' + i.id,
    tanggal: i.tanggal_transaksi || i.tanggal,
    tipe: 'cicilan',
    proyek_id: i.proyek_id,
    nominal: Number(i.jumlah),
    status: i.status,
    catatan: i.catatan,
  }));

  const riwayatDonasi = kasProyekList
    .filter((k) => k.tipe === 'donasi')
    .map((k) => ({
      id: 'd-' + k.id,
      tanggal: k.tanggal,
      tipe: 'donasi',
      proyek_id: k.proyek_id,
      nominal: Number(k.nominal),
      status: 'approved',
      catatan: k.keterangan,
    }));

  const riwayatGabungan = [...riwayatCicilan, ...riwayatDonasi]
    .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  return (
    <>
      <Head>
        <title>Projek - Portal Warga RT 38</title>
      </Head>
      <Layout warga={warga} onLogout={handleLogout}>
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-4">
          <h3 className="text-base font-bold text-white">🏗️ Projek RT 38</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Iuran khusus untuk proyek lingkungan. Bayar lebih? Otomatis jadi donasi proyek.
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Memuat data proyek...</div>
        ) : (
          <>
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

                  const donasiWarga = kasProyekList
                    .filter((k) => k.proyek_id === proyek.id && k.warga_id === warga.id && k.tipe === 'donasi')
                    .reduce((s, k) => s + Number(k.nominal), 0);

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
                      donasiWarga={donasiWarga}
                      onBayar={() => handleBayar(proyek)}
                      onLihatRekap={() => handleLihatRekap(proyek)}
                    />
                  );
                })}
              </div>
            )}

            {riwayatGabungan.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white">📜 Riwayat Cicilan & Donasi Anda</h3>
                </div>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
                      <tr>
                        <th className="p-3">Tanggal</th>
                        <th className="p-3">Proyek</th>
                        <th className="p-3">Tipe</th>
                        <th className="p-3 text-right">Nominal</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {riwayatGabungan.map((r) => {
                        const p = proyekList.find((x) => x.id === r.proyek_id);
                        return (
                          <tr key={r.id} className="hover:bg-slate-800/40">
                            <td className="p-3 text-slate-400 whitespace-nowrap text-[10px]">
                              {formatTanggalProyek(r.tanggal)}
                            </td>
                            <td className="p-3 text-slate-300 text-[11px]">{p?.nama || '-'}</td>
                            <td className="p-3">
                              {r.tipe === 'cicilan' ? (
                                <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                                  Cicilan
                                </span>
                              ) : (
                                <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded">
                                  💚 Donasi
                                </span>
                              )}
                            </td>
                            <td className={`p-3 text-right font-mono font-semibold ${r.tipe === 'donasi' ? 'text-purple-400' : 'text-emerald-400'}`}>
                              {r.tipe === 'donasi' ? '+' : ''} {formatRupiahProyek(r.nominal)}
                            </td>
                            <td className="p-3">
                              {r.status === 'approved' ? (
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

      {/* ═══ MODAL BAYAR ═══ */}
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

      {/* ═══ MODAL REKAP ═══ */}
      {showRekap && rekapProyek && (
        <ModalRekapProjek
          show={showRekap}
          onClose={() => setShowRekap(false)}
          proyek={rekapProyek}
          wargaList={allWargaList}
          iuranProyekList={allIuranList}
        />
      )}
    </>
  );
}

// pages/dashboard-warga/projek.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/warga/Layout';
import ProjectsCard from '../../components/warga/ProjekCard'; // Pastikan nama import sesuai file Anda
import ModalBayarProjek from '../../components/warga/ModalBayarProjek';
import ModalRekapProjek from '../../components/warga/ModalRekapProjek';
import ModalKasProyek from '../../components/warga/ModalKasProyek'; // IMPORT BARU
import { formatRupiahProyek, formatTanggalProyek } from '../../lib/proyek/constants';
import { getTotalTerbayar, getTotalPending, getSisaWarga } from '../../lib/proyek/calculations';
import { uploadBuktiProyek } from '../../lib/proyek/storage';

export default function DashboardWargaProjek() {
  const [warga, setWarga] = useState(null);
  const [proyekList, setProyekList] = useState([]);
  const [iuranProyekList, setIuranProyekList] = useState([]);
  const [kasProyekList, setKasProyekList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModalBayar, setShowModalBayar] = useState(false);
  const [proyekDipilih, setProyekDipilih] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [showRekap, setShowRekap] = useState(false);
  const [rekapProyek, setRekapProyek] = useState(null);
  const [allWargaList, setAllWargaList] = useState([]);
  const [allIuranList, setAllIuranList] = useState([]);
  const [loadingRekap, setLoadingRekap] = useState(false);

  // STATE BARU UNTUK KAS PROYEK
  const [showKasProyek, setShowKasProyek] = useState(false);
  const [kasProyekDipilih, setKasProyekDipilih] = useState(null);

  const router = useRouter();

  // ... (Gunakan fungsi loadData, useEffect Realtime, handleLogout, handleBayar, handleSubmitBayar, handleLihatRekap SAMA PERSIS seperti sebelumnya)

  const loadData = async (wargaId) => {
    // ... (kode loadData sama seperti sebelumnya)
    setLoading(true);
    try {
      const [resProyek, resIuran, resKas] = await Promise.all([
        supabase.from('proyek').select('*').in('status', ['aktif', 'selesai']).order('created_at', { ascending: false }),
        supabase.from('iuran_proyek').select('*').eq('warga_id', wargaId).order('created_at', { ascending: false }),
        supabase.from('kas_proyek').select('*').order('tanggal', { ascending: false }),
      ]);
      
      const proyekValid = (resProyek.data || []).filter(p => p && p.id && p.nominal_per_warga);
      
      setProyekList(proyekValid);
      setIuranProyekList(resIuran.data || []);
      setKasProyekList(resKas.data || []); // Simpan semua kas_proyek
    } catch (err) {
      console.error('Gagal load data proyek:', err);
    } finally {
      setLoading(false);
    }
  };

  // ... (useEffect login & realtime)

  // FUNGSI BARU UNTUK BUKA KAS PROYEK
  const handleLihatKas = (proyek) => {
    setKasProyekDipilih(proyek);
    setShowKasProyek(true);
  };

  // ... (handleLogout, handleBayar, handleSubmitBayar, handleLihatRekap)

  return (
    <>
      <Head>
        <title>Projek - Portal Warga RT 38</title>
      </Head>
      <Layout warga={warga} onLogout={handleLogout}>
        
        {/* ... (Header dan List Proyek sama seperti sebelumnya) ... */}
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
                      onLihatKas={() => handleLihatKas(proyek)} // PASSING FUNGSI BARU
                    />
                  );
                })}
              </div>
            )}

            {/* ... (Tabel Riwayat sama seperti sebelumnya) ... */}
          </>
        )}
      </Layout>

      {/* MODAL BAYAR */}
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

      {/* MODAL REKAP */}
      {showRekap && rekapProyek && (
        <ModalRekapProjek
          show={showRekap}
          onClose={() => setShowRekap(false)}
          proyek={rekapProyek}
          wargaList={allWargaList}
          iuranProyekList={allIuranList}
        />
      )}

      {/* MODAL KAS PROYEK (BARU) */}
      <ModalKasProyek 
        show={showKasProyek}
        onClose={() => {
          setShowKasProyek(false);
          setKasProyekDipilih(null);
        }}
        proyek={kasProyekDipilih}
        iuranList={iuranProyekList}
        kasList={kasProyekList}
      />
    </>
  );
}

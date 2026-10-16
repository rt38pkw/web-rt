import { useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import KeuanganLayout from '../../components/keuangan/Layout';
import TabTunai from '../../components/keuangan/TabTunai';
import ModalEditTunai from '../../components/keuangan/ModalEditTunai';
import ModalKonfirmasiHapus from '../../components/keuangan/ModalKonfirmasiHapus';
import { PERIODE_BULAN } from '../../lib/keuangan/constants';
import { tarifWarga, formatRupiah } from '../../lib/keuangan/helpers';
import {
  useKeuanganData,
  getPendingBatches,
  invalidateKeuanganCache,
} from '../../lib/keuangan/hooks';

export default function PageTunai() {
  const {
    user,
    iuran = [],
    warga = [],
    tarifList = [],
    loading,
    refetch,
  } = useKeuanganData();

  const [tunaiWargaId, setTunaiWargaId] = useState('');
  const [tunaiBulan, setTunaiBulan] = useState([]);
  const [tunaiTanggal, setTunaiTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [tunaiCatatan, setTunaiCatatan] = useState('');
  const [tunaiSubmitting, setTunaiSubmitting] = useState(false);

  const [modalEditTunai, setModalEditTunai] = useState(null);
  const [modalHapusTunai, setModalHapusTunai] = useState(null);
  const [hapusSubmitting, setHapusSubmitting] = useState(false);

  const iuranList = Array.isArray(iuran) ? iuran : [];
  const wargaList = Array.isArray(warga) ? warga : [];
  const tarifListSafe = Array.isArray(tarifList) ? tarifList : [];

  // ═══ RIWAYAT TUNAI (grup per batch_id) ═══
  const riwayatTunai = useMemo(() => {
    const tunaiRecords = iuranList.filter((i) => i.metode === 'tunai');
    const grouped = {};
    tunaiRecords.forEach((i) => {
      const key = i.batch_id || i.id;
      if (!grouped[key]) grouped[key] = { batchId: key, items: [] };
      grouped[key].items.push(i);
    });
    return Object.values(grouped).sort((a, b) => {
      const ta = a.items[0]?.tanggal_transaksi || '';
      const tb = b.items[0]?.tanggal_transaksi || '';
      return tb.localeCompare(ta);
    });
  }, [iuranList]);

  if (typeof window === 'undefined') return null;

  if (loading) {
    return (
      <KeuanganLayout user={user}>
        <div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div>
      </KeuanganLayout>
    );
  }

  const iuranWargaTerpilih = iuranList.filter((i) => i.warga_id === tunaiWargaId);
  const wargaTerpilih = wargaList.find((w) => w.id === tunaiWargaId);
  const tarifTerpilih = wargaTerpilih ? tarifWarga(wargaTerpilih, tarifListSafe, 2026) : 0;

  const bulanBelumLunas = PERIODE_BULAN.filter((bln) => {
    const totalApproved = iuranWargaTerpilih
      .filter((i) => i.bulan_tahun === bln.kode && i.status === 'approved')
      .reduce((s, i) => s + Number(i.jumlah || 0), 0);
    const adaPending = iuranWargaTerpilih.some(
      (i) => i.bulan_tahun === bln.kode && i.status === 'pending'
    );
    return !adaPending && totalApproved < tarifTerpilih;
  });

  const totalTunai = (() => {
    if (!wargaTerpilih || tarifTerpilih === 0) return 0;
    return tunaiBulan.reduce((sum, bln) => {
      const totalApproved = iuranWargaTerpilih
        .filter((i) => i.bulan_tahun === bln && i.status === 'approved')
        .reduce((s, i) => s + Number(i.jumlah || 0), 0);
      return sum + Math.max(0, tarifTerpilih - totalApproved);
    }, 0);
  })();

  // ═══ INPUT TUNAI BARU ═══
  async function handleSubmitTunai(e) {
    e.preventDefault();
    if (!tunaiWargaId || tunaiBulan.length === 0) {
      alert('Pilih warga dan minimal 1 bulan');
      return;
    }
    if (tarifTerpilih === 0) {
      alert('Tarif 2026 belum ditetapkan.');
      return;
    }

    const w = wargaList.find((x) => x.id === tunaiWargaId);
    const namaBulan = tunaiBulan
      .map((k) => PERIODE_BULAN.find((b) => b.kode === k)?.nama || k)
      .join(', ');

    if (!window.confirm(
      `Konfirmasi:\n\n` +
      `Warga: ${w?.no_rumah} - ${w?.nama_lengkap}\n` +
      `Bulan: ${namaBulan}\n` +
      `Total: ${formatRupiah(totalTunai)}\n\n` +
      `Yakin?`
    )) return;

    setTunaiSubmitting(true);
    try {
      const batchId = crypto.randomUUID();
      const records = tunaiBulan
        .map((bln) => {
          const totalApproved = iuranWargaTerpilih
            .filter((i) => i.bulan_tahun === bln && i.status === 'approved')
            .reduce((s, i) => s + Number(i.jumlah || 0), 0);
          return {
            warga_id: tunaiWargaId,
            bulan_tahun: bln,
            jumlah: Math.max(0, tarifTerpilih - totalApproved),
            status: 'approved',
            metode: 'tunai',
            batch_id: batchId,
            bukti_urls: null,
            catatan: tunaiCatatan || null,
            tanggal_transaksi: tunaiTanggal,
          };
        })
        .filter((r) => r.jumlah > 0);
      if (records.length === 0) throw new Error('Tidak ada nominal');
      const { error } = await supabase.from('iuran').insert(records);
      if (error) throw error;
      alert('✅ Iuran tunai berhasil dicatat!');
      setTunaiWargaId('');
      setTunaiBulan([]);
      setTunaiCatatan('');
      invalidateKeuanganCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setTunaiSubmitting(false);
    }
  }

  // ═══ EDIT TUNAI ═══
  function handleEditTunai(batch) {
    setModalEditTunai(batch);
  }

  async function handleSaveEditTunai({ batchId, items, catatan, tanggal }) {
    try {
      // Hapus semua record lama dengan batchId
      const { error: errDel } = await supabase
        .from('iuran')
        .delete()
        .eq('batch_id', batchId);
      if (errDel) throw errDel;

      // Insert ulang dengan data baru
      const newRecords = items.map((item) => {
        const wargaId = modalEditTunai.items[0]?.warga_id;
        return {
          warga_id: wargaId,
          bulan_tahun: item.bulan_tahun,
          jumlah: item.jumlah,
          status: 'approved',
          metode: 'tunai',
          batch_id: batchId,
          bukti_urls: null,
          catatan: catatan || null,
          tanggal_transaksi: tanggal,
        };
      });

      const { error: errIns } = await supabase.from('iuran').insert(newRecords);
      if (errIns) throw errIns;

      alert('✅ Iuran tunai berhasil diupdate!');
      setModalEditTunai(null);
      invalidateKeuanganCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  }

  // ═══ HAPUS TUNAI ═══
  function handleHapusTunai(batch) {
    setModalHapusTunai(batch);
  }

  async function confirmHapusTunai() {
    if (!modalHapusTunai) return;
    setHapusSubmitting(true);
    try {
      const { error } = await supabase
        .from('iuran')
        .delete()
        .eq('batch_id', modalHapusTunai.batchId);
      if (error) throw error;
      alert('✅ Iuran tunai dihapus.');
      setModalHapusTunai(null);
      invalidateKeuanganCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setHapusSubmitting(false);
    }
  }

  const wargaModalHapus = modalHapusTunai
    ? wargaList.find((x) => x.id === modalHapusTunai.items[0]?.warga_id)
    : null;
  const totalHapus = modalHapusTunai
    ? modalHapusTunai.items.reduce((s, i) => s + Number(i.jumlah || 0), 0)
    : 0;

  return (
    <KeuanganLayout user={user} pendingCount={getPendingBatches(iuranList).length}>
      <TabTunai
        warga={wargaList}
        tarifList={tarifListSafe}
        tunaiWargaId={tunaiWargaId}
        setTunaiWargaId={setTunaiWargaId}
        tunaiBulan={tunaiBulan}
        setTunaiBulan={setTunaiBulan}
        tunaiTanggal={tunaiTanggal}
        setTunaiTanggal={setTunaiTanggal}
        tunaiCatatan={tunaiCatatan}
        setTunaiCatatan={setTunaiCatatan}
        bulanBelumLunas={bulanBelumLunas}
        totalTunai={totalTunai}
        tunaiSubmitting={tunaiSubmitting}
        handleSubmitTunai={handleSubmitTunai}
        riwayatTunai={riwayatTunai}
        handleEditTunai={handleEditTunai}
        handleHapusTunai={handleHapusTunai}
      />

      {modalEditTunai && (
        <ModalEditTunai
          batch={modalEditTunai}
          warga={wargaList.find((x) => x.id === modalEditTunai.items[0]?.warga_id)}
          tarifList={tarifListSafe}
          onClose={() => setModalEditTunai(null)}
          onSave={handleSaveEditTunai}
        />
      )}

      <ModalKonfirmasiHapus
        open={!!modalHapusTunai}
        onClose={() => setModalHapusTunai(null)}
        onConfirm={confirmHapusTunai}
        submitting={hapusSubmitting}
        title="Hapus Iuran Tunai"
        data={
          modalHapusTunai
            ? {
                Warga: `${wargaModalHapus?.no_rumah} - ${wargaModalHapus?.nama_lengkap}`,
                Bulan: `${modalHapusTunai.items.length} bulan`,
                Total: formatRupiah(totalHapus),
              }
            : {}
        }
        warning={
          <>
            ⚠️ <strong>Dampak:</strong>
            <div className="mt-1 text-[10px]">
              • Saldo kas <strong>turun</strong> {formatRupiah(totalHapus)}<br />
              • Grid bulan yang dihapus <strong>kembali kuning/belum</strong><br />
              • Tunggakan warga akan muncul
            </div>
          </>
        }
      />
    </KeuanganLayout>
  );
}

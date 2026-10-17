import { useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import KeuanganLayout from '../../components/keuangan/Layout';
import TabTunai from '../../components/keuangan/TabTunai';
import ModalEditTunai from '../../components/keuangan/ModalEditTunai';
import ModalKonfirmasiHapus from '../../components/keuangan/ModalKonfirmasiHapus';
import { formatRupiah } from '../../lib/keuangan/helpers';
import { distribusikanTunai } from '../../lib/keuangan/tunai';
import { getPeriodeBulan } from '../../lib/keuangan/constants'; 
import {
  useKeuanganData,
  getPendingBatches,
  invalidateKeuanganCache,
} from '../../lib/keuangan/hooks';

export default function PageTunai() {
  const {
    user, iuran = [], warga = [], tarifList = [], deposit = [], loading, refetch,
  } = useKeuanganData();

  const [tunaiWargaId, setTunaiWargaId] = useState('');
  const [tunaiNominal, setTunaiNominal] = useState('');
  const [tunaiTanggal, setTunaiTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [tunaiCatatan, setTunaiCatatan] = useState('');
  const [tunaiSubmitting, setTunaiSubmitting] = useState(false);

  const [modalEditTunai, setModalEditTunai] = useState(null);
  const [modalHapusTunai, setModalHapusTunai] = useState(null);
  const [hapusSubmitting, setHapusSubmitting] = useState(false);

  const iuranList = Array.isArray(iuran) ? iuran : [];
  const wargaList = Array.isArray(warga) ? warga : [];
  const depositList = Array.isArray(deposit) ? deposit : [];

  // FULL 1 TAHUN (April - Desember 2026) untuk alokasi pembayaran
  const bulanList = useMemo(() => {
    return getPeriodeBulan(2026);
  }, []);

  // RIWAYAT TUNAI
  const riwayatTunai = useMemo(() => {
    const tunaiRecords = iuranList.filter((i) => i.metode === 'tunai');
    const grouped = {};
    
    tunaiRecords.forEach((i) => {
      const key = i.batch_id || i.id;
      if (!grouped[key]) {
        const dep = depositList.find(d => d.keterangan?.includes(key.slice(0, 8)));
        grouped[key] = { 
          batchId: key, 
          items: [],
          totalDeposit: dep ? dep.jumlah : 0 
        };
      }
      grouped[key].items.push(i);
    });
    
    return Object.values(grouped).sort((a, b) => {
      const ta = a.items[0]?.tanggal_transaksi || '';
      const tb = b.items[0]?.tanggal_transaksi || '';
      return tb.localeCompare(ta);
    });
  }, [iuranList, depositList]);

  if (typeof window === 'undefined') return null;

  if (loading) {
    return (
      <KeuanganLayout user={user}>
        <div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div>
      </KeuanganLayout>
    );
  }

  // INPUT TUNAI BARU
  async function handleSubmitTunai(e) {
    e.preventDefault();
    const nominal = Number(tunaiNominal) || 0;
    if (!tunaiWargaId || nominal <= 0) {
      alert('Pilih warga dan isi nominal');
      return;
    }

    const w = wargaList.find((x) => x.id === tunaiWargaId);
    const tarif = w?.kategori === 'Usaha' ? 30000 : 15000;
    const iuranWarga = iuranList.filter((i) => i.warga_id === tunaiWargaId);

    // Alokasi menggunakan list full 1 tahun
    const { hasil, sisaUang } = distribusikanTunai(nominal, bulanList, iuranWarga, tarif);

    if (hasil.length === 0) {
      alert('Semua bulan (April-Desember) sudah lunas. Uang akan masuk ke Deposit.');
    }

    const detail = hasil.map((h) => `${h.namaBulan}: ${formatRupiah(h.nominal)}`).join('\n');
    const confirmMsg = `Konfirmasi:\n\nWarga: ${w?.no_rumah} - ${w?.nama_lengkap}\nNominal: ${formatRupiah(nominal)}\n\nDistribusi:\n${detail}\n\n` + (sisaUang > 0 ? `Sisa jadi deposit: ${formatRupiah(sisaUang)}\n\n` : '') + `Lanjutkan?`;

    if (!window.confirm(confirmMsg)) return;

    setTunaiSubmitting(true);
    try {
      const batchId = crypto.randomUUID();
      
      if (hasil.length > 0) {
        const records = hasil.map((h) => ({
          warga_id: tunaiWargaId, bulan_tahun: h.bulan, jumlah: h.nominal, status: 'approved',
          metode: 'tunai', batch_id: batchId, bukti_urls: null, catatan: tunaiCatatan || null, tanggal_transaksi: tunaiTanggal,
        }));
        const { error } = await supabase.from('iuran').insert(records);
        if (error) throw error;
      }

      if (sisaUang > 0) {
        const { error: errDep } = await supabase.from('deposit_warga').insert([{
          warga_id: tunaiWargaId, tanggal: tunaiTanggal, tipe: 'masuk', jumlah: sisaUang,
          keterangan: `Sisa uang tunai ${formatRupiah(nominal)} (batch ${batchId.slice(0, 8)})`, created_by: user?.id,
        }]);
        if (errDep) throw errDep;
      }

      alert(`✅ Iuran tunai berhasil!`);
      setTunaiWargaId(''); setTunaiNominal(''); setTunaiCatatan('');
      invalidateKeuanganCache(); refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setTunaiSubmitting(false);
    }
  }

  // EDIT TUNAI
  function handleEditTunai(batch) {
    const totalIuran = batch.items.reduce((s, i) => s + Number(i.jumlah || 0), 0);
    const totalNominal = totalIuran + (batch.totalDeposit || 0);
    setModalEditTunai({ ...batch, totalNominal });
  }

  async function handleSaveEditTunai({ batchId, nominalTotal, catatan, tanggal }) {
    try {
      const wargaId = modalEditTunai.items[0]?.warga_id;
      const w = wargaList.find((x) => x.id === wargaId);
      const tarif = w?.kategori === 'Usaha' ? 30000 : 15000;

      await supabase.from('iuran').delete().eq('batch_id', batchId);
      const iuranWargaLain = iuranList.filter((i) => i.warga_id === wargaId && i.batch_id !== batchId);

      const { hasil, sisaUang } = distribusikanTunai(nominalTotal, bulanList, iuranWargaLain, tarif);

      if (hasil.length > 0) {
        const newRecords = hasil.map((h) => ({
          warga_id: wargaId, bulan_tahun: h.bulan, jumlah: h.nominal, status: 'approved',
          metode: 'tunai', batch_id: batchId, bukti_urls: null, catatan: catatan || null, tanggal_transaksi: tanggal,
        }));
        const { error } = await supabase.from('iuran').insert(newRecords);
        if (error) throw error;
      }

      const { data: oldDep } = await supabase
        .from('deposit_warga').select('*').like('keterangan', `%batch ${batchId.slice(0, 8)}%`).maybeSingle();

      if (sisaUang > 0) {
        if (oldDep) {
          await supabase.from('deposit_warga').update({ jumlah: sisaUang, tanggal }).eq('id', oldDep.id);
        } else {
          await supabase.from('deposit_warga').insert([{
            warga_id: wargaId, tanggal, tipe: 'masuk', jumlah: sisaUang,
            keterangan: `Sisa uang tunai (batch ${batchId.slice(0, 8)})`, created_by: user?.id,
          }]);
        }
      } else if (oldDep) {
        await supabase.from('deposit_warga').delete().eq('id', oldDep.id);
      }

      alert('✅ Iuran tunai & deposit disesuaikan!');
      setModalEditTunai(null); invalidateKeuanganCache(); refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  }

  // HAPUS TUNAI
  function handleHapusTunai(batch) { setModalHapusTunai(batch); }

  async function confirmHapusTunai() {
    if (!modalHapusTunai) return;
    setHapusSubmitting(true);
    try {
      await supabase.from('iuran').delete().eq('batch_id', modalHapusTunai.batchId);
      await supabase.from('deposit_warga').delete().like('keterangan', `%batch ${modalHapusTunai.batchId.slice(0, 8)}%`);
      alert('✅ Iuran & deposit terkait berhasil dihapus.');
      setModalHapusTunai(null); invalidateKeuanganCache(); refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setHapusSubmitting(false);
    }
  }

  const wargaModalHapus = modalHapusTunai ? wargaList.find((x) => x.id === modalHapusTunai.items[0]?.warga_id) : null;
  const totalHapus = modalHapusTunai ? modalHapusTunai.items.reduce((s, i) => s + Number(i.jumlah || 0), 0) : 0;

  return (
    <KeuanganLayout user={user} pendingCount={getPendingBatches(iuranList).length}>
      <TabTunai
        warga={wargaList} 
        iuran={iuranList} 
        bulanList={bulanList}
        tunaiWargaId={tunaiWargaId}
        setTunaiWargaId={setTunaiWargaId} 
        tunaiNominal={tunaiNominal} 
        setTunaiNominal={setTunaiNominal}
        tunaiTanggal={tunaiTanggal} 
        setTunaiTanggal={setTunaiTanggal} 
        tunaiCatatan={tunaiCatatan}
        setTunaiCatatan={setTunaiCatatan} 
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
          tarifList={tarifList} 
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
        data={modalHapusTunai ? { 
          Warga: `${wargaModalHapus?.no_rumah} - ${wargaModalHapus?.nama_lengkap}`, 
          Bulan: `${modalHapusTunai.items.length} bulan`, 
          Total: formatRupiah(totalHapus) 
        } : {}}
        warning={
          <>
            <span className="text-rose-400 font-bold">⚠️ Dampak:</span>
            <div className="mt-1 text-[10px]">
              • Saldo kas <strong>turun</strong> {formatRupiah(totalHapus)}<br />
              • <strong>Deposit terkait juga akan dihapus</strong>
            </div>
          </>
        }
      />
    </KeuanganLayout>
  );
}

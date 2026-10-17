import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import KeuanganLayout from '../../components/keuangan/Layout';
import TabTunai from '../../components/keuangan/TabTunai';
import ModalEditTunai from '../../components/keuangan/ModalEditTunai';
import ModalKonfirmasiHapus from '../../components/keuangan/ModalKonfirmasiHapus';
import { formatRupiah } from '../../lib/keuangan/helpers';
import { distribusikanTunai } from '../../lib/keuangan/tunai';
import { getPeriodeBulan } from '../../lib/keuangan/constants'; 
import { useKeuanganData, getPendingBatches, invalidateKeuanganCache } from '../../lib/keuangan/hooks';

export default function PageTunai() {
  const { user, iuran = [], warga = [], tarifList = [], loading, refetch } = useKeuanganData();

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
  const bulanList = useMemo(() => getPeriodeBulan(2026), []);

  // TARIK DATA DEPOSIT LANGSUNG
  const [depositList, setDepositList] = useState([]);
  useEffect(() => {
    supabase.from('deposit_warga').select('*').eq('tipe', 'masuk').then(({ data }) => {
      if (data) setDepositList(data);
    });
  }, [iuranList]);

  // GABUNGKAN RIWAYAT PAKAI BATCH_ID
  const riwayatTunai = useMemo(() => {
    const grouped = {};
    iuranList.filter(i => i.metode === 'tunai').forEach(i => {
      const key = i.batch_id || i.id;
      if (!grouped[key]) {
        const dep = depositList.find(d => d.batch_id === key);
        grouped[key] = { batchId: key, items: [], totalDeposit: dep ? Number(dep.jumlah) : 0 };
      }
      grouped[key].items.push(i);
    });
    return Object.values(grouped).sort((a, b) => b.items[0]?.tanggal_transaksi?.localeCompare(a.items[0]?.tanggal_transaksi));
  }, [iuranList, depositList]);

  if (typeof window === 'undefined') return null;
  if (loading) return <KeuanganLayout user={user}><div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div></KeuanganLayout>;

  async function handleSubmitTunai(e) {
    e.preventDefault();
    const nominal = Number(tunaiNominal) || 0;
    if (!tunaiWargaId || nominal <= 0) return alert('Pilih warga dan isi nominal');

    const w = wargaList.find((x) => x.id === tunaiWargaId);
    const tarif = w?.kategori === 'Usaha' ? 30000 : 15000;
    const iuranWarga = iuranList.filter((i) => i.warga_id === tunaiWargaId);

    const { hasil, sisaUang } = distribusikanTunai(nominal, bulanList, iuranWarga, tarif);
    
    if (!window.confirm(`Warga: ${w?.no_rumah}\nNominal: ${formatRupiah(nominal)}\nSisa jadi deposit: ${formatRupiah(sisaUang)}`)) return;

    setTunaiSubmitting(true);
    try {
      const batchId = crypto.randomUUID();
      if (hasil.length > 0) {
        await supabase.from('iuran').insert(hasil.map((h) => ({
          warga_id: tunaiWargaId, bulan_tahun: h.bulan, jumlah: h.nominal, status: 'approved',
          metode: 'tunai', batch_id: batchId, catatan: tunaiCatatan || null, tanggal_transaksi: tunaiTanggal,
        })));
      }
      if (sisaUang > 0) {
        await supabase.from('deposit_warga').insert([{
          warga_id: tunaiWargaId, tanggal: tunaiTanggal, tipe: 'masuk', jumlah: sisaUang, batch_id: batchId,
          keterangan: `Sisa uang tunai ${formatRupiah(nominal)}`, created_by: user?.id,
        }]);
      }
      alert(`✅ Berhasil!`);
      setTunaiWargaId(''); setTunaiNominal(''); setTunaiCatatan('');
      invalidateKeuanganCache(); refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setTunaiSubmitting(false);
    }
  }

  function handleEditTunai(batch) {
    const totalIuran = batch.items.reduce((s, i) => s + Number(i.jumlah || 0), 0);
    setModalEditTunai({ ...batch, totalNominal: totalIuran + (batch.totalDeposit || 0) });
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
        await supabase.from('iuran').insert(hasil.map((h) => ({
          warga_id: wargaId, bulan_tahun: h.bulan, jumlah: h.nominal, status: 'approved',
          metode: 'tunai', batch_id: batchId, catatan: catatan || null, tanggal_transaksi: tanggal,
        })));
      }

      const { data: oldDep } = await supabase.from('deposit_warga').select('*').eq('batch_id', batchId).maybeSingle();

      if (sisaUang > 0) {
        if (oldDep) await supabase.from('deposit_warga').update({ jumlah: sisaUang, tanggal }).eq('id', oldDep.id);
        else await supabase.from('deposit_warga').insert([{ warga_id: wargaId, tanggal, tipe: 'masuk', jumlah: sisaUang, batch_id: batchId, created_by: user?.id }]);
      } else if (oldDep) {
        await supabase.from('deposit_warga').delete().eq('id', oldDep.id);
      }

      alert('✅ Disesuaikan!');
      setModalEditTunai(null); invalidateKeuanganCache(); refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  }

  async function confirmHapusTunai() {
    if (!modalHapusTunai) return;
    setHapusSubmitting(true);
    try {
      await supabase.from('iuran').delete().eq('batch_id', modalHapusTunai.batchId);
      await supabase.from('deposit_warga').delete().eq('batch_id', modalHapusTunai.batchId);
      alert('✅ Iuran & deposit terhapus.');
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
        warga={wargaList} iuran={iuranList} bulanList={bulanList} tunaiWargaId={tunaiWargaId} setTunaiWargaId={setTunaiWargaId} 
        tunaiNominal={tunaiNominal} setTunaiNominal={setTunaiNominal} tunaiTanggal={tunaiTanggal} setTunaiTanggal={setTunaiTanggal} 
        tunaiCatatan={tunaiCatatan} setTunaiCatatan={setTunaiCatatan} tunaiSubmitting={tunaiSubmitting} handleSubmitTunai={handleSubmitTunai} 
        riwayatTunai={riwayatTunai} handleEditTunai={handleEditTunai} handleHapusTunai={(b) => setModalHapusTunai(b)} 
      />
      {modalEditTunai && <ModalEditTunai batch={modalEditTunai} warga={wargaList.find((x) => x.id === modalEditTunai.items[0]?.warga_id)} onClose={() => setModalEditTunai(null)} onSave={handleSaveEditTunai} />}
      
      <ModalKonfirmasiHapus 
        open={!!modalHapusTunai} onClose={() => setModalHapusTunai(null)} onConfirm={confirmHapusTunai} submitting={hapusSubmitting} 
        title="Hapus Iuran Tunai" 
        data={modalHapusTunai ? { Warga: `${wargaModalHapus?.no_rumah} - ${wargaModalHapus?.nama_lengkap}`, Total: formatRupiah(totalHapus) } : {}} 
        warning={<><span className="text-rose-400 font-bold">⚠️ Dampak:</span><div className="mt-1 text-[10px]">• Saldo kas <strong>turun</strong> {formatRupiah(totalHapus)}<br />• <strong>Deposit terkait juga akan dihapus</strong></div></>} 
      />
    </KeuanganLayout>
  );
}

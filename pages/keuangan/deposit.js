import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import KeuanganLayout from '../../components/keuangan/Layout';
import TabDeposit from '../../components/keuangan/TabDeposit';
import ModalPakaiDeposit from '../../components/keuangan/ModalPakaiDeposit';
import { getBulanTahun } from '../../lib/keuangan/constants';
import { tarifWarga } from '../../lib/keuangan/helpers';
import {
  useKeuanganData,
  getPendingBatches,
  getSaldoDepositWarga,
  invalidateKeuanganCache,
} from '../../lib/keuangan/hooks';

export default function PageDeposit() {
  const { user, iuran, warga, depositList, tarifList, loading, refetch } = useKeuanganData();
  const [depWargaId, setDepWargaId] = useState('');
  const [depTgl, setDepTgl] = useState(new Date().toISOString().split('T')[0]);
  const [depJumlah, setDepJumlah] = useState('');
  const [depKet, setDepKet] = useState('');
  const [depSubmitting, setDepSubmitting] = useState(false);

  const [modalPakaiDeposit, setModalPakaiDeposit] = useState(null);
  const [pakaiTahun, setPakaiTahun] = useState(2027);
  const [pakaiBulan, setPakaiBulan] = useState([]);

  async function handleSubmitDeposit(e) {
    e.preventDefault();
    if (!depWargaId || !depJumlah) {
      alert('Pilih warga dan isi jumlah');
      return;
    }
    setDepSubmitting(true);
    try {
      const { error } = await supabase.from('deposit_warga').insert([
        {
          warga_id: depWargaId,
          tanggal: depTgl,
          tipe: 'masuk',
          jumlah: Number(depJumlah),
          keterangan: depKet || null,
          created_by: user.id,
        },
      ]);
      if (error) throw error;
      alert('✅ Deposit dicatat!');
      setDepWargaId('');
      setDepJumlah('');
      setDepKet('');
      invalidateKeuanganCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setDepSubmitting(false);
    }
  }

  const bulanPakaiDeposit = getBulanTahun(pakaiTahun);
  const wargaPakaiDeposit = warga.find((w) => w.id === modalPakaiDeposit?.wargaId);
  const saldoDepositWargaIni = wargaPakaiDeposit
    ? getSaldoDepositWarga(depositList, wargaPakaiDeposit.id)
    : 0;
  const tarifPakaiDeposit = wargaPakaiDeposit
    ? tarifWarga(wargaPakaiDeposit, tarifList, pakaiTahun)
    : 0;
  const totalPakaiDeposit = pakaiBulan.length * tarifPakaiDeposit;
  const sisaDepositSetelah = saldoDepositWargaIni - totalPakaiDeposit;

  async function handleSubmitPakaiDeposit() {
    if (pakaiBulan.length === 0) {
      alert('Pilih minimal 1 bulan');
      return;
    }
    if (tarifPakaiDeposit === 0) {
      alert(`Tarif tahun ${pakaiTahun} belum ditetapkan. Set dulu di tab 💰 Tarif.`);
      return;
    }
    if (totalPakaiDeposit > saldoDepositWargaIni) {
      alert('Saldo deposit tidak cukup');
      return;
    }
    try {
      const batchId = crypto.randomUUID();
      const today = new Date().toISOString().split('T')[0];

      const iuranRecords = pakaiBulan.map((bln) => ({
        warga_id: wargaPakaiDeposit.id,
        bulan_tahun: bln,
        jumlah: tarifPakaiDeposit,
        status: 'approved',
        metode: 'deposit',
        batch_id: batchId,
        bukti_urls: null,
        catatan: `Dibayar via deposit ${today}`,
        tanggal_transaksi: today,
      }));
      const { error: e1 } = await supabase.from('iuran').insert(iuranRecords);
      if (e1) throw e1;

      const { error: e2 } = await supabase.from('deposit_warga').insert([
        {
          warga_id: wargaPakaiDeposit.id,
          tanggal: today,
          tipe: 'pakai',
          jumlah: totalPakaiDeposit,
          keterangan: `Pakai deposit untuk ${pakaiBulan.length} bulan (${pakaiBulan.join(', ')})`,
          created_by: user.id,
        },
      ]);
      if (e2) throw e2;

      alert('✅ Deposit berhasil dipakai untuk iuran!');
      setModalPakaiDeposit(null);
      setPakaiBulan([]);
      invalidateKeuanganCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  }

  if (loading) {
    return (
      <KeuanganLayout user={user}>
        <div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div>
      </KeuanganLayout>
    );
  }

  return (
    <KeuanganLayout user={user} pendingCount={getPendingBatches(iuran).length}>
      <TabDeposit
        warga={warga}
        tarifList={tarifList}
        depositList={depositList}
        getSaldoDepositWarga={(id) => getSaldoDepositWarga(depositList, id)}
        depWargaId={depWargaId}
        setDepWargaId={setDepWargaId}
        depTgl={depTgl}
        setDepTgl={setDepTgl}
        depJumlah={depJumlah}
        setDepJumlah={setDepJumlah}
        depKet={depKet}
        setDepKet={setDepKet}
        depSubmitting={depSubmitting}
        handleSubmitDeposit={handleSubmitDeposit}
        setModalPakaiDeposit={setModalPakaiDeposit}
      />

      {modalPakaiDeposit && wargaPakaiDeposit && (
        <ModalPakaiDeposit
          modalPakaiDeposit={modalPakaiDeposit}
          setModalPakaiDeposit={setModalPakaiDeposit}
          pakaiTahun={pakaiTahun}
          setPakaiTahun={setPakaiTahun}
          pakaiBulan={pakaiBulan}
          setPakaiBulan={setPakaiBulan}
          bulanPakaiDeposit={bulanPakaiDeposit}
          tarifPakaiDeposit={tarifPakaiDeposit}
          totalPakaiDeposit={totalPakaiDeposit}
          saldoDepositWargaIni={saldoDepositWargaIni}
          sisaDepositSetelah={sisaDepositSetelah}
          handleSubmitPakaiDeposit={handleSubmitPakaiDeposit}
        />
      )}
    </KeuanganLayout>
  );
}

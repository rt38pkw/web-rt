import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import KeuanganLayout from '../../components/keuangan/Layout';
import TabDeposit from '../../components/keuangan/TabDeposit';
import ModalPakaiDeposit from '../../components/keuangan/ModalPakaiDeposit';
import ModalAutoDistribute from '../../components/keuangan/ModalAutoDistribute';
import ModalEditDeposit from '../../components/keuangan/ModalEditDeposit';
import { getBulanTahun } from '../../lib/keuangan/constants';
import { tarifWarga } from '../../lib/keuangan/helpers';
import {
  useKeuanganData,
  getPendingBatches,
  getSaldoDepositWarga,
  invalidateKeuanganCache,
} from '../../lib/keuangan/hooks';

export default function PageDeposit() {
  const {
    user,
    iuran = [],
    warga = [],
    depositList = [],
    tarifList = [],
    loading,
    refetch,
  } = useKeuanganData();

  const [depWargaId, setDepWargaId] = useState('');
  const [depTgl, setDepTgl] = useState(new Date().toISOString().split('T')[0]);
  const [depJumlah, setDepJumlah] = useState('');
  const [depKet, setDepKet] = useState('');
  const [depSubmitting, setDepSubmitting] = useState(false);

  const [modalPakaiDeposit, setModalPakaiDeposit] = useState(null);
  const [modalAutoDistribute, setModalAutoDistribute] = useState(null);
  const [modalEditDeposit, setModalEditDeposit] = useState(null);
  const [pakaiTahun, setPakaiTahun] = useState(2027);
  const [pakaiBulan, setPakaiBulan] = useState([]);

  const iuranList = Array.isArray(iuran) ? iuran : [];
  const wargaList = Array.isArray(warga) ? warga : [];
  const depositListSafe = Array.isArray(depositList) ? depositList : [];

  // ===== UTILITY =====
  function cekDepositSudahDipakai(depositId) {
    const data = depositListSafe.find((d) => d.id === depositId);
    if (!data) return { sudah: false, totalPakai: 0, sisaSaldo: 0 };

    const totalMasuk = depositListSafe
      .filter((x) => x.warga_id === data.warga_id && x.tipe === 'masuk')
      .reduce((s, x) => s + Number(x.jumlah || 0), 0);
    const totalPakai = depositListSafe
      .filter((x) => x.warga_id === data.warga_id && x.tipe === 'pakai')
      .reduce((s, x) => s + Number(x.jumlah || 0), 0);
    const sisaSaldo = totalMasuk - totalPakai;
    const sudahDipakai = Number(data.jumlah) > sisaSaldo;

    return { sudah: sudahDipakai, totalPakai, sisaSaldo };
  }

  // ===== INPUT DEPOSIT MASUK =====
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
          created_by: user?.id,
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

  // ===== EDIT DEPOSIT =====
  async function handleSaveEditDeposit({ id, tanggal, jumlah, keterangan }) {
    try {
      const cek = cekDepositSudahDipakai(id);
      if (cek.sudah) {
        alert(
          '🔒 Tidak bisa edit deposit ini.\n\nDeposit ini sudah dipakai untuk iuran.\nUndo distribusi dulu.'
        );
        return;
      }
      const { error } = await supabase
        .from('deposit_warga')
        .update({ tanggal, jumlah, keterangan })
        .eq('id', id);
      if (error) throw error;
      alert('✅ Deposit berhasil diupdate!');
      setModalEditDeposit(null);
      invalidateKeuanganCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  }

  // ===== HAPUS DEPOSIT MASUK =====
  async function handleHapusDeposit(d) {
    const cek = cekDepositSudahDipakai(d.id);
    if (cek.sudah) {
      alert('🔒 Tidak bisa hapus deposit ini.\n\nDeposit ini sudah dipakai untuk iuran.\nUndo distribusi dulu.');
      return;
    }
    if (!confirm(`Hapus deposit Rp ${Number(d.jumlah).toLocaleString('id-ID')}?`)) return;
    try {
      const { error } = await supabase.from('deposit_warga').delete().eq('id', d.id);
      if (error) throw error;
      alert('✅ Deposit dihapus.');
      invalidateKeuanganCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  }

  // ===== UNDO DISTRIBUSI =====
  async function handleUndoDistribusi(d) {
    if (!confirm(`↩️ Undo distribusi deposit Rp ${Number(d.jumlah).toLocaleString('id-ID')}?\n\nSemua iuran terkait akan DIHAPUS.`)) return;
    try {
      const tanggalStr = d.tanggal;
      const { data: iuranTerkait, error: err1 } = await supabase
        .from('iuran')
        .select('id, bulan_tahun, jumlah, catatan, tanggal_transaksi')
        .eq('warga_id', d.warga_id)
        .eq('metode', 'deposit')
        .eq('tanggal_transaksi', tanggalStr);
      if (err1) throw err1;
      if (!iuranTerkait || iuranTerkait.length === 0) {
        if (!confirm('Tidak ditemukan iuran terkait. Hapus record pakai saja?')) return;
      } else {
        if (!confirm(`Akan menghapus ${iuranTerkait.length} record iuran. Lanjut?`)) return;
        const ids = iuranTerkait.map((i) => i.id);
        const { error: err2 } = await supabase.from('iuran').delete().in('id', ids);
        if (err2) throw err2;
      }
      const { error: err3 } = await supabase.from('deposit_warga').delete().eq('id', d.id);
      if (err3) throw err3;
      alert('✅ Distribusi berhasil di-undo.');
      invalidateKeuanganCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  }

  // ===== PAKAI DEPOSIT MANUAL =====
  const bulanPakaiDeposit = getBulanTahun(pakaiTahun);
  const wargaPakaiDeposit = wargaList.find((w) => w.id === modalPakaiDeposit?.wargaId);
  const saldoDepositWargaIni = wargaPakaiDeposit
    ? getSaldoDepositWarga(depositListSafe, wargaPakaiDeposit.id)
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
      alert(`Tarif tahun ${pakaiTahun} belum ditetapkan.`);
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
          keterangan: `Pakai deposit untuk ${pakaiBulan.length} bulan`,
          created_by: user?.id,
        },
      ]);
      if (e2) throw e2;
      alert('✅ Deposit berhasil dipakai!');
      setModalPakaiDeposit(null);
      setPakaiBulan([]);
      invalidateKeuanganCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  }

  // ===== AUTO-DISTRIBUTE =====
  async function handleConfirmAutoDistribute({ tahun, hasil, totalPakai, tarif }) {
    try {
      const batchId = crypto.randomUUID();
      const today = new Date().toISOString().split('T')[0];
      const iuranRecords = hasil.map((h) => ({
        warga_id: modalAutoDistribute.wargaId,
        bulan_tahun: h.bulan,
        jumlah: h.nominal,
        status: 'approved',
        metode: 'deposit',
        batch_id: batchId,
        bukti_urls: null,
        catatan: `Auto-distribute deposit ${today}${h.tipe === 'kurang' ? ` (kurang ${h.sisaKurang})` : ''}`,
        tanggal_transaksi: today,
      }));
      const { error: e1 } = await supabase.from('iuran').insert(iuranRecords);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('deposit_warga').insert([
        {
          warga_id: modalAutoDistribute.wargaId,
          tanggal: today,
          tipe: 'pakai',
          jumlah: totalPakai,
          keterangan: `Auto-distribute untuk ${hasil.length} bulan tahun ${tahun}`,
          created_by: user?.id,
        },
      ]);
      if (e2) throw e2;
      alert('✅ Auto-distribute berhasil!');
      setModalAutoDistribute(null);
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
    <KeuanganLayout user={user} pendingCount={getPendingBatches(iuranList).length}>
      <TabDeposit
        warga={wargaList}
        tarifList={tarifList}
        depositList={depositListSafe}
        getSaldoDepositWarga={(id) => getSaldoDepositWarga(depositListSafe, id)}
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
        setModalAutoDistribute={setModalAutoDistribute}
        setModalEditDeposit={setModalEditDeposit}
        handleHapusDeposit={handleHapusDeposit}
        handleUndoDistribusi={handleUndoDistribusi}
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

      {modalAutoDistribute && (() => {
        const w = wargaList.find((x) => x.id === modalAutoDistribute.wargaId);
        if (!w) return null;
        return (
          <ModalAutoDistribute
            warga={w}
            tarifList={tarifList}
            saldoDeposit={getSaldoDepositWarga(depositListSafe, w.id)}
            iuranWarga={iuranList.filter((i) => i.warga_id === w.id)}
            onClose={() => setModalAutoDistribute(null)}
            onConfirm={handleConfirmAutoDistribute}
          />
        );
      })()}

      {modalEditDeposit && (
        <ModalEditDeposit
          data={modalEditDeposit}
          warga={wargaList}
          onClose={() => setModalEditDeposit(null)}
          onSave={handleSaveEditDeposit}
        />
      )}
    </KeuanganLayout>
  );
}

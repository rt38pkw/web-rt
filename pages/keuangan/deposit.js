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
  const { user, iuran, warga, depositList, tarifList, loading, refetch } = useKeuanganData();
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

  // ===== EDIT DEPOSIT =====
  async function handleSaveEditDeposit({ id, tanggal, jumlah, keterangan }) {
    try {
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
    // Cek apakah deposit ini sudah dipakai (ada tipe pakai untuk warga ini)
    const totalMasuk = depositList
      .filter((x) => x.warga_id === d.warga_id && x.tipe === 'masuk')
      .reduce((s, x) => s + Number(x.jumlah || 0), 0);
    const totalPakai = depositList
      .filter((x) => x.warga_id === d.warga_id && x.tipe === 'pakai')
      .reduce((s, x) => s + Number(x.jumlah || 0), 0);

    // Kalau deposit mau dihapus > sisa saldo → berarti ada bagian yang sudah dipakai
    const sisaSaldo = totalMasuk - totalPakai;
    if (Number(d.jumlah) > sisaSaldo) {
      alert(
        `⚠️ Deposit ini sudah sebagian dipakai untuk iuran.\n\n` +
        `Total deposit: Rp ${totalMasuk.toLocaleString('id-ID')}\n` +
        `Sudah dipakai: Rp ${totalPakai.toLocaleString('id-ID')}\n` +
        `Sisa saldo: Rp ${sisaSaldo.toLocaleString('id-ID')}\n\n` +
        `Hapus dulu distribusi pakai-nya (via Undo) sebelum hapus deposit masuk ini.`
      );
      return;
    }

    if (!confirm(`Hapus deposit Rp ${Number(d.jumlah).toLocaleString('id-ID')}?\n\nTindakan ini tidak bisa dibatalkan.`)) return;
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

  // ===== UNDO DISTRIBUSI (pakai) =====
  async function handleUndoDistribusi(d) {
    if (
      !confirm(
        `↩️ Undo distribusi deposit ini?\n\n` +
        `Jumlah: Rp ${Number(d.jumlah).toLocaleString('id-ID')}\n` +
        `Keterangan: ${d.keterangan || '-'}\n\n` +
        `Semua iuran yang dihasilkan dari distribusi ini AKAN DIHAPUS.\n` +
        `Saldo deposit warga akan kembali.\n\n` +
        `Lanjutkan?`
      )
    ) return;

    try {
      // Cari record iuran yang match: warga sama, metode deposit, tanggal_transaksi sama,
      // catatan mengandung timestamp hari yang sama dengan distribusi ini
      // Pendekatan paling aman: cari iuran dengan catatan yang mengandung tanggal d.tanggal
      const tanggalStr = d.tanggal; // format 'YYYY-MM-DD'

      // Ambil semua iuran warga dengan metode deposit di sekitar tanggal itu
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
      }

      // Hapus iuran terkait
      if (iuranTerkait && iuranTerkait.length > 0) {
        const ids = iuranTerkait.map((i) => i.id);
        const { error: err2 } = await supabase.from('iuran').delete().in('id', ids);
        if (err2) throw err2;
      }

      // Hapus record pakai
      const { error: err3 } = await supabase.from('deposit_warga').delete().eq('id', d.id);
      if (err3) throw err3;

      alert('✅ Distribusi berhasil di-undo. Saldo deposit dikembalikan.');
      invalidateKeuanganCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  }

  // ===== PAKAI DEPOSIT MANUAL =====
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
          created_by: user.id,
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

  // ===== LOADING =====
  if (loading) {
    return (
      <KeuanganLayout user={user}>
        <div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div>
      </KeuanganLayout>
    );
  }

  // ===== RENDER =====
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
        setModalAutoDistribute={setModalAutoDistribute}
        setModalEditDeposit={setModalEditDeposit}
        handleHapusDeposit={handleHapusDeposit}
        handleUndoDistribusi={handleUndoDistribusi}
      />

      {/* Modal Pakai Manual */}
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

      {/* Modal Auto-Distribute */}
      {modalAutoDistribute && (() => {
        const w = warga.find((x) => x.id === modalAutoDistribute.wargaId);
        if (!w) return null;
        return (
          <ModalAutoDistribute
            warga={w}
            tarifList={tarifList}
            saldoDeposit={getSaldoDepositWarga(depositList, w.id)}
            iuranWarga={iuran.filter((i) => i.warga_id === w.id)}
            onClose={() => setModalAutoDistribute(null)}
            onConfirm={handleConfirmAutoDistribute}
          />
        );
      })()}

      {/* Modal Edit Deposit */}
      {modalEditDeposit && (
        <ModalEditDeposit
          data={modalEditDeposit}
          warga={warga}
          onClose={() => setModalEditDeposit(null)}
          onSave={handleSaveEditDeposit}
        />
      )}
    </KeuanganLayout>
  );
}

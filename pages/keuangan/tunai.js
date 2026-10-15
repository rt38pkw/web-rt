import { useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import KeuanganLayout from '../../components/keuangan/Layout';
import TabTunai from '../../components/keuangan/TabTunai';
import { getBulanTahun } from '../../lib/keuangan/constants';
import { tarifWarga, formatRupiah } from '../../lib/keuangan/helpers';
import { useKeuanganData, getPendingBatches, invalidateKeuanganCache } from '../../lib/keuangan/hooks';

export default function PageTunai() {
  const { user, iuran, warga, tarifList, loading, refetch } = useKeuanganData();

  // Tahun default: tahun berjalan
  const [tunaiTahun, setTunaiTahun] = useState(new Date().getFullYear());
  const [tunaiWargaId, setTunaiWargaId] = useState('');
  const [tunaiBulan, setTunaiBulan] = useState([]);
  const [tunaiTanggal, setTunaiTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [tunaiCatatan, setTunaiCatatan] = useState('');
  const [tunaiSubmitting, setTunaiSubmitting] = useState(false);

  // List tahun yang tersedia (dari tarif_iuran)
  const tahunTersedia = useMemo(() => {
    const set = new Set(tarifList.map((t) => Number(t.tahun)));
    return [...set].sort((a, b) => a - b);
  }, [tarifList]);

  // Kalau tarifList belum ready, pakai fallback tahun berjalan
  const tahunOptions = tahunTersedia.length > 0 ? tahunTersedia : [new Date().getFullYear()];

  const iuranWargaTerpilih = iuran.filter((i) => i.warga_id === tunaiWargaId);
  const wargaTerpilih = warga.find((w) => w.id === tunaiWargaId);
  const tarifTerpilih = wargaTerpilih
    ? tarifWarga(wargaTerpilih, tarifList, tunaiTahun)
    : 0;

  // Bulan-bulan untuk tahun yang dipilih
  const periodeBulanTahun = getBulanTahun(tunaiTahun);

  const bulanBelumLunas = periodeBulanTahun.filter((bln) => {
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

  async function handleSubmitTunai(e) {
    e.preventDefault();

    // ── PENGAMAN: validasi ulang ──
    if (!tunaiWargaId || tunaiBulan.length === 0) {
      alert('Pilih warga dan minimal 1 bulan');
      return;
    }
    if (tarifTerpilih === 0) {
      alert(`Tarif ${tunaiTahun} belum ditetapkan. Set dulu di tab 💰 Tarif.`);
      return;
    }

    // ── PENGAMAN: konfirmasi sebelum simpan ──
    const w = warga.find((x) => x.id === tunaiWargaId);
    const namaBulan = tunaiBulan
      .map((k) => periodeBulanTahun.find((b) => b.kode === k)?.nama || k)
      .join(', ');
    const konfirmasi = window.confirm(
      `Konfirmasi pencatatan:\n\n` +
      `Warga: ${w?.no_rumah} - ${w?.nama_lengkap}\n` +
      `Tahun: ${tunaiTahun}\n` +
      `Bulan: ${namaBulan}\n` +
      `Total: ${formatRupiah(totalTunai)}\n\n` +
      `Yakin data ini benar?`
    );
    if (!konfirmasi) return;

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

  if (loading) {
    return (
      <KeuanganLayout user={user}>
        <div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div>
      </KeuanganLayout>
    );
  }

  return (
    <KeuanganLayout user={user} pendingCount={getPendingBatches(iuran).length}>
      <TabTunai
        warga={warga}
        tarifList={tarifList}
        tahunTersedia={tahunOptions}
        tunaiTahun={tunaiTahun}
        setTunaiTahun={setTunaiTahun}
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
      />
    </KeuanganLayout>
  );
}

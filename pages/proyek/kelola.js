import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/proyek/Layout';
import { useProyekData, getPendingProyekCount, invalidateProyekCache } from '../../lib/proyek/hooks';
import { formatRupiahProyek, formatTanggalProyek, isProyekTelat } from '../../lib/proyek/constants';
import { getProgressProyek } from '../../lib/proyek/calculations';
import { canDeleteProyek } from '../../lib/proyek/kas';

export default function PageProyekKelola() {
  const { user, warga, proyekList, iuranProyekList, kasProyekList, loading, refetch } = useProyekData();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [nama, setNama] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [nominal, setNominal] = useState('');
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (typeof window === 'undefined') return null;

  const resetForm = () => {
    setEditId(null);
    setNama('');
    setDeskripsi('');
    setNominal('');
    setDeadline('');
  };

  const handleEdit = (proyek) => {
    setEditId(proyek.id);
    setNama(proyek.nama);
    setDeskripsi(proyek.deskripsi || '');
    setNominal(String(proyek.nominal_per_warga));
    setDeadline(proyek.deadline);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nama.trim() || !nominal || !deadline) {
      alert('Lengkapi data');
      return;
    }
    if (Number(nominal) <= 0) {
      alert('Nominal harus lebih dari 0');
      return;
    }

    const newTarget = Number(nominal);

    // ═══ LOGIKA SINKRONISASI SAAT EDIT TARIF ═══
    if (editId) {
      const proyekLama = proyekList.find(p => p.id === editId);
      const oldTarget = Number(proyekLama.nominal_per_warga);
      
      if (newTarget !== oldTarget) {
        const ok = confirm(
          `⚠️ PERINGATAN PERUBAHAN NOMINAL!\n\n` +
          `Nominal proyek akan diubah dari ${formatRupiahProyek(oldTarget)} ` +
          `menjadi ${formatRupiahProyek(newTarget)}.\n\n` +
          `Sistem akan OTOMATIS MENYESUAIKAN semua data iuran & donasi warga yang sudah terlanjur bayar.\n` +
          `• Jika tarif naik, Donasi warga akan ditarik untuk menutupi kekurangan Iuran.\n` +
          `• Jika tarif turun, Kelebihan Iuran akan dipindahkan menjadi Donasi.\n\n` +
          `Lanjutkan?`
        );
        if (!ok) return;
      }
    }

    setSubmitting(true);
    try {
      if (editId) {
        const proyekLama = proyekList.find(p => p.id === editId);
        const oldTarget = Number(proyekLama.nominal_per_warga);

        // 1. Update data proyek utama
        const { error } = await supabase
          .from('proyek')
          .update({
            nama: nama.trim(),
            deskripsi: deskripsi.trim() || null,
            nominal_per_warga: newTarget,
            deadline,
          })
          .eq('id', editId);
        if (error) throw error;

        // 2. JALANKAN SINKRONISASI JIKA TARIF BERUBAH
        if (newTarget !== oldTarget) {
          const affectedWargaIds = [...new Set([
            ...iuranProyekList.filter(i => i.proyek_id === editId).map(i => i.warga_id),
            ...kasProyekList.filter(k => k.proyek_id === editId && k.tipe === 'donasi').map(k => k.warga_id)
          ])];

          for (const wId of affectedWargaIds) {
            const wIuran = iuranProyekList.filter(i => i.proyek_id === editId && i.warga_id === wId);
            const wKas = kasProyekList.filter(k => k.proyek_id === editId && k.warga_id === wId && k.tipe === 'donasi');

            const totalIuranLama = wIuran.reduce((s, i) => s + Number(i.jumlah), 0);
            const totalDonasiLama = wKas.reduce((s, k) => s + Number(k.nominal), 0);
            const totalPaid = totalIuranLama + totalDonasiLama;

            if (totalPaid === 0) continue;

            const iuranBaru = Math.min(totalPaid, newTarget);
            const donasiBaru = Math.max(0, totalPaid - newTarget);

            const note = `Penyesuaian tarif proyek (${formatRupiahProyek(oldTarget)} -> ${formatRupiahProyek(newTarget)})`;

            // A. Sinkronisasi Iuran
            if (iuranBaru !== totalIuranLama) {
              if (wIuran.length > 0) {
                await supabase.from('iuran_proyek').update({ 
                  jumlah: iuranBaru, 
                  catatan: note 
                }).eq('id', wIuran[0].id);
                
                for (let i = 1; i < wIuran.length; i++) {
                  await supabase.from('iuran_proyek').delete().eq('id', wIuran[i].id);
                }
              } else if (iuranBaru > 0) {
                await supabase.from('iuran_proyek').insert({
                  proyek_id: editId, warga_id: wId, tanggal: new Date().toISOString().split('T')[0],
                  jumlah: iuranBaru, status: 'approved', metode: 'penyesuaian',
                  catatan: note
                });
              }
            }

            // B. Sinkronisasi Donasi
            if (donasiBaru !== totalDonasiLama) {
              if (wKas.length > 0) {
                if (donasiBaru > 0) {
                  await supabase.from('kas_proyek').update({ 
                    nominal: donasiBaru,
                    keterangan: note
                  }).eq('id', wKas[0].id);
                } else {
                  await supabase.from('kas_proyek').delete().eq('id', wKas[0].id);
                }
                for (let i = 1; i < wKas.length; i++) {
                  await supabase.from('kas_proyek').delete().eq('id', wKas[i].id);
                }
              } else if (donasiBaru > 0) {
                await supabase.from('kas_proyek').insert({
                  proyek_id: editId, warga_id: wId, tipe: 'donasi', tanggal: new Date().toISOString().split('T')[0],
                  nominal: donasiBaru, keterangan: note
                });
              }
            }
          }
        }

        alert('✅ Proyek & Data Warga berhasil disinkronkan!');
      } else {
        const { error } = await supabase.from('proyek').insert([
          {
            nama: nama.trim(),
            deskripsi: deskripsi.trim() || null,
            nominal_per_warga: newTarget,
            deadline,
            status: 'aktif',
            created_by: user?.id,
          },
        ]);
        if (error) throw error;
        alert('✅ Proyek berhasil dibuat!');
      }

      resetForm();
      setShowForm(false);
      invalidateProyekCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatalkan = async (proyek) => {
    if (!confirm(`Batalkan proyek "${proyek.nama}"?\n\nWarga tidak bisa lagi bayar. Anda bisa me-refund uang mereka di menu Kas Proyek.`)) return;
    try {
      const { error } = await supabase.from('proyek').update({ status: 'batal' }).eq('id', proyek.id);
      if (error) throw error;
      alert('✅ Proyek dibatalkan. Silakan refund warga di menu Kas Proyek.');
      invalidateProyekCache();
      refetch();
    } catch (err) {
      alert('Gagal membatalkan: ' + err.message);
    }
  };

  const handleHapus = async (proyek) => {
    const bisaHapus = await canDeleteProyek(proyek.id);
    if (!bisaHapus) {
      alert('❌ Proyek ini sudah memiliki transaksi. Gunakan tombol "Batalkan Proyek" jika ingin menghentikan.');
      return;
    }
    if (!confirm(`Hapus proyek "${proyek.nama}"? (Proyek ini masih kosong tanpa transaksi)`)) return;
    try {
      const { error } = await supabase.from('proyek').delete().eq('id', proyek.id);
      if (error) throw error;
      alert('✅ Proyek dihapus.');
      invalidateProyekCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  };

  const handleUbahStatus = async (proyek, statusBaru) => {
    if (!confirm(`Ubah status proyek "${proyek.nama}" menjadi "${statusBaru}"?`)) return;
    try {
      const { error } = await supabase.from('proyek').update({ status: statusBaru }).eq('id', proyek.id);
      if (error) throw error;
      alert('✅ Status proyek diubah!');
      invalidateProyekCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  };

  if (loading) {
    return (
      <Layout user={user}>
        <div className="text-center py-10 text-slate-500 text-xs">Memuat data...</div>
      </Layout>
    );
  }

  const pendingCount = getPendingProyekCount(iuranProyekList);

  return (
    <Layout user={user} pendingCount={pendingCount}>
      <div className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-bold text-white">➕ Kelola Proyek</h2>
            <p className="text-[11px] text-slate-400">Buat, edit, batalkan, atau hapus proyek</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-semibold px-4 py-2 rounded-lg"
          >
            {showForm ? '✕ Tutup Form' : '+ Buat Proyek Baru'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white mb-2">
              {editId ? '✏️ Edit Proyek' : '📝 Buat Proyek Baru'}
            </h3>

            <div>
              <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
                Nama Proyek <span className="text-rose-400">*</span>
              </label>
              <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} required placeholder="Contoh: Pengadaan CCTV" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Deskripsi</label>
              <textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} rows={2} placeholder="Deskripsi singkat proyek (opsional)" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Nominal per Warga (Rp) <span className="text-rose-400">*</span></label>
                <input type="number" value={nominal} onChange={(e) => setNominal(e.target.value)} required placeholder="80000" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Deadline <span className="text-rose-400">*</span></label>
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {editId && (
                <button type="button" onClick={() => { resetForm(); setShowForm(false); }} className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs">Batal</button>
              )}
              <button type="submit" disabled={submitting} className={`${editId ? 'w-2/3' : 'w-full'} bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-xs`}>
                {submitting ? 'Menyinkronkan Data...' : editId ? '💾 Update & Sinkronisasi' : '💾 Buat Proyek'}
              </button>
            </div>
          </form>
        )}

        {proyekList.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-2">🏗️</div>
            <p className="text-xs text-slate-400">Belum ada proyek. Buat proyek pertama!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {proyekList.map((proyek) => {
              const progress = getProgressProyek(iuranProyekList, warga, proyek);
              const telat = isProyekTelat(proyek);
              const jumlahTransaksi = iuranProyekList.filter((i) => i.proyek_id === proyek.id).length;

              return (
                <div key={proyek.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-start gap-2 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-white">🏗️ {proyek.nama}</h3>
                        {proyek.status === 'aktif' && !telat && <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">Aktif</span>}
                        {proyek.status === 'aktif' && telat && <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded">🔴 Telat</span>}
                        {proyek.status === 'selesai' && <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">Selesai</span>}
                        {proyek.status === 'batal' && <span className="text-[10px] bg-slate-500/10 text-slate-400 border border-slate-500/20 px-2 py-0.5 rounded">Dibatalkan</span>}
                      </div>
                      {proyek.deskripsi && <p className="text-[11px] text-slate-400 mt-1">{proyek.deskripsi}</p>}
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 flex-wrap">
                        <span>Target: <strong className="text-amber-300">{formatRupiahProyek(proyek.nominal_per_warga)}</strong>/warga</span>
                        <span>•</span>
                        <span>Deadline: {formatTanggalProyek(proyek.deadline)}</span>
                        <span>•</span>
                        <span>{jumlahTransaksi} transaksi</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950 rounded-xl p-3">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1.5">
                      <span>Progress: {progress.jumlahLunas}/{progress.jumlahWarga} lunas</span>
                      <span className="text-white font-bold">{progress.persen}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div className={`h-full transition-all ${progress.persen === 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-amber-500 to-amber-400'}`} style={{ width: `${progress.persen}%` }} />
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => handleEdit(proyek)} className="text-[11px] bg-blue-600 hover:bg-blue-500 text-white font-semibold px-3 py-1.5 rounded-lg">✏️ Edit</button>
                    {proyek.status === 'aktif' && <button onClick={() => handleBatalkan(proyek)} className="text-[11px] bg-orange-600 hover:bg-orange-500 text-white font-semibold px-3 py-1.5 rounded-lg">🚫 Batalkan</button>}
                    {proyek.status === 'selesai' && <button onClick={() => handleUbahStatus(proyek, 'aktif')} className="text-[11px] bg-amber-600 hover:bg-amber-500 text-white font-semibold px-3 py-1.5 rounded-lg">↻ Buka Lagi</button>}
                    <button onClick={() => handleHapus(proyek)} className="text-[11px] bg-rose-600 hover:bg-rose-500 text-white font-semibold px-3 py-1.5 rounded-lg">🗑️ Hapus</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

// pages/proyek/tunai.js
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/proyek/Layout';
import ModalEditTunai from '../../components/proyek/ModalEditTunai';
import ModalKonfirmasiHapus from '../../components/keuangan/ModalKonfirmasiHapus';
import { useProyekData, getPendingProyekCount, invalidateProyekCache } from '../../lib/proyek/hooks';
import { formatRupiahProyek, formatTanggalProyek } from '../../lib/proyek/constants';
import { getTotalTerbayar, getSisaWarga } from '../../lib/proyek/calculations';
import { insertKasProyek } from '../../lib/proyek/kas';

export default function PageProyekTunai() {
  const { user, warga, proyekList, iuranProyekList, kasProyekList, loading, refetch } = useProyekData();

  const [proyekId, setProyekId] = useState('');
  const [wargaId, setWargaId] = useState('');
  const [nominal, setNominal] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [catatan, setCatatan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [modalEdit, setModalEdit] = useState(null);
  const [modalHapus, setModalHapus] = useState(null);
  const [hapusSubmitting, setHapusSubmitting] = useState(false);

  // ═══ STATE UNTUK SEARCHABLE DROPDOWN ═══
  const [searchProyek, setSearchProyek] = useState('');
  const [isProyekOpen, setIsProyekOpen] = useState(false);
  const proyekRef = useRef(null);

  const [searchWarga, setSearchWarga] = useState('');
  const [isWargaOpen, setIsWargaOpen] = useState(false);
  const wargaRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (proyekRef.current && !proyekRef.current.contains(event.target)) setIsProyekOpen(false);
      if (wargaRef.current && !wargaRef.current.contains(event.target)) setIsWargaOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (typeof window === 'undefined') return null;

  const proyekTerpilih = proyekList.find((p) => p.id === proyekId);
  const wargaTerpilih = warga.find((w) => w.id === wargaId);

  // Sinkronisasi teks input dropdown
  useEffect(() => {
    if (proyekTerpilih) setSearchProyek(proyekTerpilih.nama);
    else setSearchProyek('');
  }, [proyekId, proyekTerpilih]);

  useEffect(() => {
    if (wargaTerpilih) setSearchWarga(`${wargaTerpilih.no_rumah} - ${wargaTerpilih.nama_lengkap}`);
    else setSearchWarga('');
  }, [wargaId, wargaTerpilih]);

  const sudahBayar = proyekTerpilih && wargaTerpilih
    ? getTotalTerbayar(iuranProyekList, wargaTerpilih.id, proyekTerpilih.id)
    : 0;
  const sisa = proyekTerpilih && wargaTerpilih
    ? getSisaWarga(iuranProyekList, wargaTerpilih.id, proyekTerpilih)
    : 0;

  const nominalNum = Number(nominal) || 0;
  const masukIuran = Math.min(nominalNum, sisa);
  const masukDonasi = Math.max(0, nominalNum - sisa);
  const terlaluKecil = nominalNum <= 0;

  // ═══ INPUT BARU TUNai (SPLIT) ═══
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!proyekId || !wargaId) {
      alert('Pilih proyek dan warga');
      return;
    }
    if (terlaluKecil) {
      alert('Nominal harus lebih dari 0');
      return;
    }

    let pesan = `Konfirmasi input tunai:\n\n` +
      `Proyek: ${proyekTerpilih.nama}\n` +
      `Warga: ${wargaTerpilih.no_rumah} - ${wargaTerpilih.nama_lengkap}\n` +
      `Nominal: ${formatRupiahProyek(nominalNum)}\n\n`;
    
    if (masukDonasi > 0) {
      pesan += `📊 Rincian:\n• Cicilan: ${formatRupiahProyek(masukIuran)}\n• Donasi: ${formatRupiahProyek(masukDonasi)}\n\n`;
    }

    if (!window.confirm(pesan + `Lanjutkan?`)) return;

    setSubmitting(true);
    try {
      const batchId = crypto.randomUUID();

      // 1. Simpan Iuran (kalau ada)
      if (masukIuran > 0) {
        const { error: errIuran } = await supabase.from('iuran_proyek').insert([
          {
            proyek_id: proyekId,
            warga_id: wargaId,
            tanggal,
            jumlah: masukIuran,
            status: 'approved', // Tunai langsung approved
            metode: 'tunai',
            batch_id: batchId,
            bukti_urls: null,
            catatan: catatan || null,
            tanggal_transaksi: tanggal,
          },
        ]);
        if (errIuran) throw errIuran;
      }

      // 2. Simpan Donasi (kalau ada kelebihan)
      if (masukDonasi > 0) {
        await insertKasProyek({
          proyek_id: proyekId,
          warga_id: wargaId,
          tipe: 'donasi',
          tanggal,
          nominal: masukDonasi,
          keterangan: `Donasi dari kelebihan bayar tunai (batch ${batchId.slice(0, 8)})`,
        });
      }

      alert('✅ Transaksi tunai berhasil dicatat!');
      setWargaId('');
      setNominal('');
      setCatatan('');
      invalidateProyekCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ═══ EDIT TUNai (UPDATE IURAN & DONASI) ═══
  const handleSaveEdit = async ({ id, jumlah, tanggal, catatan }) => {
    try {
      const itemLama = modalEdit;
      const proyek = proyekList.find((p) => p.id === itemLama.proyek_id);
      
      // Ambil nominal iuran asli dari database (bukan total)
      const iuranAsli = itemLama._original_iuran !== undefined ? itemLama._original_iuran : itemLama.jumlah;
      
      // 1. Hitung sisa SEBELUM transaksi ini diedit
      const sisaSaatIni = getSisaWarga(iuranProyekList, itemLama.warga_id, proyek);
      const sisaTanpaIni = sisaSaatIni + iuranAsli;

      // 2. Hitung ulang alokasi (Iuran vs Donasi)
      const iuranBaru = Math.min(jumlah, sisaTanpaIni);
      const donasiBaru = Math.max(0, jumlah - sisaTanpaIni);

      // 3. Update tabel iuran_proyek
      const { error: errIuran } = await supabase
        .from('iuran_proyek')
        .update({ jumlah: iuranBaru, tanggal, catatan, tanggal_transaksi: tanggal })
        .eq('id', id);
      if (errIuran) throw errIuran;

      // 4. Sinkronisasi tabel kas_proyek (Donasi)
      if (itemLama.batch_id) {
        const { data: kasLama, error: errCariKas } = await supabase
          .from('kas_proyek')
          .select('id')
          .eq('tipe', 'donasi')
          .like('keterangan', `%${itemLama.batch_id.slice(0, 8)}%`);

        if (errCariKas) throw errCariKas;

        if (kasLama && kasLama.length > 0) {
          if (donasiBaru > 0) {
            // Update nominal donasi jika masih ada kelebihan
            await supabase.from('kas_proyek').update({ nominal: donasiBaru, tanggal }).eq('id', kasLama[0].id);
          } else {
            // Hapus donasi jika diedit jadi pas / kurang
            await supabase.from('kas_proyek').delete().eq('id', kasLama[0].id);
          }
        } else if (donasiBaru > 0) {
          // Buat donasi baru jika sebelumnya tidak ada, tapi diedit jadi lebih
          await insertKasProyek({
            proyek_id: itemLama.proyek_id,
            warga_id: itemLama.warga_id,
            tipe: 'donasi',
            tanggal,
            nominal: donasiBaru,
            keterangan: `Donasi dari kelebihan bayar tunai (batch ${itemLama.batch_id.slice(0, 8)})`,
          });
        }
      }

      alert('✅ Transaksi tunai & donasi berhasil disesuaikan!');
      setModalEdit(null);
      invalidateProyekCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  };

  // ═══ HAPUS TUNai (HAPUS IURAN & DONASI) ═══
  const confirmHapus = async () => {
    if (!modalHapus) return;
    setHapusSubmitting(true);
    try {
      // 1. Hapus dari iuran_proyek
      const { error: errIuran } = await supabase
        .from('iuran_proyek')
        .delete()
        .eq('id', modalHapus.id);
      if (errIuran) throw errIuran;

      // 2. Hapus donasi terkait di kas_proyek (jika ada batch_id)
      if (modalHapus.batch_id) {
        const { error: errKas } = await supabase
          .from('kas_proyek')
          .delete()
          .eq('tipe', 'donasi')
          .like('keterangan', `%${modalHapus.batch_id.slice(0, 8)}%`);
        if (errKas) throw errKas;
      }

      alert('✅ Cicilan tunai & donasi terkait berhasil dihapus.');
      setModalHapus(null);
      invalidateProyekCache();
      refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setHapusSubmitting(false);
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

  const riwayatTunai = iuranProyekList
    .filter((i) => i.metode === 'tunai' && i.status === 'approved')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const wargaHapus = modalHapus ? warga.find((w) => w.id === modalHapus.warga_id) : null;
  const proyekHapus = modalHapus ? proyekList.find((p) => p.id === modalHapus.proyek_id) : null;

  // ═══ FILTER DROPDOWN ═══
  const filteredProyek = proyekList.filter((p) => 
    p.status === 'aktif' && p.nama.toLowerCase().includes(searchProyek.toLowerCase())
  );

  const filteredWarga = warga.filter((w) => 
    `${w.no_rumah} ${w.nama_lengkap}`.toLowerCase().includes(searchWarga.toLowerCase())
  );

  return (
    <Layout user={user} pendingCount={pendingCount}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Form Input */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 h-fit"
        >
          <h3 className="text-sm font-bold text-white">💵 Input Cicilan Tunai</h3>
          <p className="text-[10px] text-slate-500">Untuk warga yang bayar tunai. Kelebihan otomatis jadi donasi.</p>

          {/* SEARCHABLE PROYEK */}
          <div className="relative" ref={proyekRef}>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Proyek</label>
            <input
              type="text"
              placeholder="Ketik nama proyek..."
              value={searchProyek}
              onChange={(e) => {
                setSearchProyek(e.target.value);
                setIsProyekOpen(true);
                if (e.target.value === '') { setProyekId(''); setNominal(''); }
              }}
              onFocus={() => setIsProyekOpen(true)}
              required={!proyekId}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
            />
            {isProyekOpen && (
              <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                {filteredProyek.length === 0 ? (
                  <div className="p-3 text-xs text-slate-400 text-center">Proyek tidak ditemukan</div>
                ) : (
                  filteredProyek.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setProyekId(p.id);
                        setSearchProyek(p.nama);
                        setIsProyekOpen(false);
                        setNominal('');
                      }}
                      className={`w-full text-left px-3 py-2.5 text-xs border-b border-slate-700/50 last:border-0 hover:bg-slate-700 transition ${
                        proyekId === p.id ? 'bg-blue-600/20 text-blue-300 font-semibold' : 'text-slate-200'
                      }`}
                    >
                      <div className="font-semibold">{p.nama}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{formatRupiahProyek(p.nominal_per_warga)}</div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* SEARCHABLE WARGA */}
          <div className="relative" ref={wargaRef}>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Warga</label>
            <input
              type="text"
              placeholder="Ketik no rumah atau nama..."
              value={searchWarga}
              onChange={(e) => {
                setSearchWarga(e.target.value);
                setIsWargaOpen(true);
                if (e.target.value === '') { setWargaId(''); setNominal(''); }
              }}
              onFocus={() => setIsWargaOpen(true)}
              required={!wargaId}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
            />
            {isWargaOpen && (
              <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                {filteredWarga.length === 0 ? (
                  <div className="p-3 text-xs text-slate-400 text-center">Warga tidak ditemukan</div>
                ) : (
                  filteredWarga.map((w) => {
                    const s = proyekTerpilih ? getSisaWarga(iuranProyekList, w.id, proyekTerpilih) : 0;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          setWargaId(w.id);
                          setSearchWarga(`${w.no_rumah} - ${w.nama_lengkap}`);
                          setIsWargaOpen(false);
                          setNominal('');
                        }}
                        className={`w-full text-left px-3 py-2.5 text-xs border-b border-slate-700/50 last:border-0 hover:bg-slate-700 transition ${
                          wargaId === w.id ? 'bg-blue-600/20 text-blue-300 font-semibold' : 'text-slate-200'
                        }`}
                      >
                        <div className="font-semibold">{w.no_rumah} - {w.nama_lengkap} {proyekTerpilih && s === 0 ? '✓ Lunas' : ''}</div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {proyekTerpilih && wargaTerpilih && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Terbayar:</span>
                <strong className="text-emerald-400">{formatRupiahProyek(sudahBayar)}</strong>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Sisa:</span>
                <strong className="text-amber-400">{formatRupiahProyek(sisa)}</strong>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
              Nominal Diterima (Rp)
            </label>
            <input
              type="number"
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
              required
              placeholder="0"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
            />
            {sisa > 0 && (
              <button
                type="button"
                onClick={() => setNominal(String(sisa))}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded mt-1"
              >
                Isi Pas Sisa ({formatRupiahProyek(sisa)})
              </button>
            )}
          </div>

          {/* PREVIEW SPLIT */}
          {nominalNum > 0 && masukDonasi > 0 && (
            <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-3 space-y-2 mt-2">
              <div className="text-[11px] font-semibold text-purple-300">📊 Rincian:</div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">→ Cicilan Iuran</span>
                <strong className="text-emerald-400">{formatRupiahProyek(masukIuran)}</strong>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">→ Donasi (kelebihan)</span>
                <strong className="text-purple-400">+ {formatRupiahProyek(masukDonasi)}</strong>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Tanggal</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">Catatan</label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={2}
              placeholder="Opsional"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !proyekId || !wargaId || terlaluKecil}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-semibold py-2.5 rounded-xl"
          >
            {submitting ? 'Menyimpan...' : 'Simpan Cicilan Tunai'}
          </button>
        </form>

        {/* Riwayat Tunai */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">📋 Riwayat Tunai ({riwayatTunai.length})</h3>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Warga</th>
                  <th className="p-3">Proyek</th>
                  <th className="p-3 text-right">Iuran</th>
                  <th className="p-3 text-right">Donasi</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {riwayatTunai.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-slate-500">
                      Belum ada cicilan tunai.
                    </td>
                  </tr>
                ) : (
                  riwayatTunai.map((item) => {
                    const w = warga.find((x) => x.id === item.warga_id);
                    const p = proyekList.find((x) => x.id === item.proyek_id);
                    
                    const donasiTerkait = kasProyekList.find(
                      (k) => k.tipe === 'donasi' && k.keterangan?.includes(item.batch_id?.slice(0, 8))
                    );
                    const nominalDonasi = donasiTerkait ? donasiTerkait.nominal : 0;

                    return (
                      <tr key={item.id} className="hover:bg-slate-800/40">
                        <td className="p-3 text-slate-400 whitespace-nowrap text-[10px]">
                          {formatTanggalProyek(item.tanggal)}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-white">{w?.nama_lengkap || '-'}</div>
                          <div className="text-[10px] text-slate-500">{w?.no_rumah}</div>
                        </td>
                        <td className="p-3 text-slate-300 text-[11px]">{p?.nama || '-'}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">
                          {formatRupiahProyek(item.jumlah)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-purple-400">
                          {nominalDonasi > 0 ? `+ ${formatRupiahProyek(nominalDonasi)}` : '-'}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => {
                                // Simpan nilai iuran asli, dan oper TOTAL ke modal edit
                                const totalNominal = item.jumlah + nominalDonasi;
                                setModalEdit({
                                  ...item,
                                  _original_iuran: item.jumlah,
                                  jumlah: totalNominal,
                                });
                              }}
                              className="text-blue-400 hover:text-blue-300 text-[10px] font-semibold px-1"
                            >✏️</button>
                            <button
                              onClick={() => setModalHapus(item)}
                              className="text-rose-400 hover:text-rose-300 text-[10px] font-semibold px-1"
                            >🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalEdit && (
        <ModalEditTunai
          data={modalEdit}
          warga={warga.find((w) => w.id === modalEdit.warga_id)}
          proyek={proyekList.find((p) => p.id === modalEdit.proyek_id)}
          onClose={() => setModalEdit(null)}
          onSave={handleSaveEdit}
        />
      )}

      <ModalKonfirmasiHapus
        open={!!modalHapus}
        onClose={() => setModalHapus(null)}
        onConfirm={confirmHapus}
        submitting={hapusSubmitting}
        title="Hapus Cicilan Tunai"
        data={
          modalHapus ? {
            Warga: `${wargaHapus?.no_rumah} - ${wargaHapus?.nama_lengkap}`,
            Proyek: proyekHapus?.nama,
            Nominal: formatRupiahProyek(modalHapus.jumlah),
          } : {}
        }
        warning={
          <>
            ⚠️ <strong>Dampak:</strong>
            <div className="mt-1 text-[10px]">
              • Progress proyek akan <strong>turun</strong><br />
              • Sisa tunggakan warga akan <strong>naik</strong><br />
              • <strong>Donasi terkait juga akan dihapus</strong><br />
              • Riwayat warga akan update otomatis
            </div>
          </>
        }
      />
    </Layout>
  );
}

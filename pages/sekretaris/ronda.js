import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/sekretaris/Layout';

export default function SekretarisRonda() {
  const [activeTab, setActiveTab] = useState('jadwal'); 

  // ═══ STATE JADWAL ═══
  const [periodeList, setPeriodeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'detail'
  const [selectedPeriode, setSelectedPeriode] = useState(null);

  // State Modal Buat Periode
  const [showModal, setShowModal] = useState(false);
  const [namaPeriode, setNamaPeriode] = useState('');
  const [tglMulai, setTglMulai] = useState('');
  const [tglSelesai, setTglSelesai] = useState('');
  const [jamMulai, setJamMulai] = useState('23:00');
  const [jamSelesai, setJamSelesai] = useState('02:00');
  const [jamReminder, setJamReminder] = useState('07:00');
  const [jumlahPerGrup, setJumlahPerGrup] = useState(3);
  
  // State Draft & Generate
  const [draftData, setDraftData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  // ═══ STATE ATURAN KHUSUS ═══
  const [wargaList, setWargaList] = useState([]);
  const [loadingWarga, setLoadingWarga] = useState(false);
  const [searchWarga, setSearchWarga] = useState('');

  useEffect(() => {
    if (activeTab === 'jadwal') fetchPeriode();
    else fetchWargaRonda();
  }, [activeTab]);

  // ═══ FUNGSI JADWAL ═══
  async function fetchPeriode() {
    setLoading(true);
    const { data, error } = await supabase.from('periode_ronda').select('*').order('created_at', { ascending: false });
    if (!error && data) setPeriodeList(data);
    setLoading(false);
  }

  const handleBuatPeriode = async (e) => {
    e.preventDefault();
    if (!namaPeriode.trim() || !tglMulai) return alert('Nama & Tanggal Wajib diisi!');

    setProcessing(true);
    try {
      const { error } = await supabase.from('periode_ronda').insert([{
        nama_periode: namaPeriode.trim(), tanggal_mulai: tglMulai, tanggal_selesai: tglSelesai || null,
        jam_mulai: jamMulai, jam_selesai: jamSelesai, jam_reminder: jamReminder,
        jumlah_per_grup: Number(jumlahPerGrup), status: 'draft'
      }]);
      if (error) throw error;
      
      alert('✅ Periode Ronda berhasil dibuat!');
      setShowModal(false);
      setNamaPeriode(''); setTglMulai(''); setTglSelesai('');
      fetchPeriode();
    } catch (err) { alert('Gagal: ' + err.message); } finally { setProcessing(false); }
  };

  const handleHapusPeriode = async (id, nama) => {
    if (!confirm(`Hapus periode "${nama}" beserta seluruh jadwalnya?`)) return;
    setProcessing(true);
    try {
      const { error } = await supabase.from('periode_ronda').delete().eq('id', id);
      if (error) throw error;
      alert('✅ Periode dihapus!');
      fetchPeriode();
    } catch (err) { alert('❌ Gagal: ' + err.message); } finally { setProcessing(false); }
  };

  // ═══ LIHAT DETAIL & LOAD JADWAL ═══
  const handleLihatDetail = async (periode) => {
    setSelectedPeriode(periode);
    setViewMode('detail');
    setIsPublished(periode.status === 'published');
    
    // Cek apakah sudah ada jadwal tersimpan
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('jadwal_ronda')
        .select('*, petugas:petugas_ronda(*, penghuni:penghuni_id(*))')
        .eq('periode_id', periode.id)
        .order('tanggal');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Format ulang agar sesuai dengan draftData
        const formatted = data.map(j => ({
          id: j.id,
          tanggal: j.tanggal,
          hari: new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(new Date(j.tanggal)),
          putaran: j.putaran,
          grup_id: j.grup_id,
          is_libur: j.status === 'libur',
          has_conflict: false, // Untuk sementara false, karena sudah disimpan
          catatan: j.catatan_sistem || '',
          petugas: j.petugas.map(p => p.penghuni)
        }));
        setDraftData(formatted);
      } else {
        setDraftData([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ═══ FUNGSI GENERATE DRAFT ═══
  const handleGenerateDraft = async () => {
    if (isPublished) return alert('Jadwal sudah di-publish. Kembalikan ke Draft untuk meng-generate ulang.');
    if (!confirm('Generate ulang akan menghapus draft yang belum disimpan. Lanjutkan?')) return;

    setIsGenerating(true);
    try {
      const { data: penghuni, error } = await supabase
        .from('penghuni').select('*')
        .eq('is_aktif', true).eq('status_verifikasi', 'approved').eq('ikut_ronda', true);

      if (error) throw error;
      if (penghuni.length < 2) throw new Error('Peserta ronda terlalu sedikit.');

      const perGrup = selectedPeriode.jumlah_per_grup || 3;
      const totalPeserta = penghuni.length;
      let jumlahGrup = Math.floor(totalPeserta / perGrup);
      let sisa = totalPeserta % perGrup;
      if (sisa === 1) jumlahGrup = Math.max(1, jumlahGrup - 1); 

      const shuffled = [...penghuni].sort(() => 0.5 - Math.random());
      const grupArr = [];
      let currentIdx = 0;
      for (let i = 0; i < jumlahGrup; i++) {
        let ukuran = perGrup;
        if (i === jumlahGrup - 1) ukuran = totalPeserta - currentIdx;
        grupArr.push({ id: i + 1, anggota: shuffled.slice(currentIdx, currentIdx + ukuran) });
        currentIdx += ukuran;
      }

      const hariArr = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      let currentDate = new Date(selectedPeriode.tanggal_mulai);
      let tempDraft = [];

      for (let putaran = 1; putaran <= 3; putaran++) {
        for (let g = 0; g < grupArr.length; g++) {
          const grup = grupArr[g];
          const tglString = currentDate.toISOString().split('T')[0];
          const namaHari = hariArr[currentDate.getDay()];

          let hasConflict = false;
          let catatan = '';
          let anggotaFinal = [...grup.anggota];

          // Fair Swap
          for (let i = 0; i < anggotaFinal.length; i++) {
            const p = anggotaFinal[i];
            if (p.hari_ronda_khusus) {
              const arrayHari = p.hari_ronda_khusus.split(',').map(s => s.trim().toLowerCase());
              if (!arrayHari.includes(namaHari.toLowerCase())) {
                let swapped = false;
                for (let k = 0; k < grupArr.length; k++) {
                  if (k === g) continue; 
                  const calonTukar = grupArr[k].anggota.find(x => !x.hari_ronda_khusus || x.hari_ronda_khusus.toLowerCase().includes(namaHari.toLowerCase()));
                  if (calonTukar) {
                    const idxP = anggotaFinal.indexOf(p);
                    const idxX = grupArr[k].anggota.indexOf(calonTukar);
                    anggotaFinal[idxP] = calonTukar;
                    grupArr[k].anggota[idxX] = p;
                    swapped = true;
                    break;
                  }
                }
                if (!swapped) {
                  hasConflict = true;
                  catatan = `${p.nama_lengkap} hanya bisa hari ${p.hari_ronda_khusus}`;
                  break;
                }
              }
            }
          }

          tempDraft.push({
            id: `${putaran}-${grup.id}`, tanggal: tglString, hari: namaHari, putaran, grup_id: grup.id,
            petugas: anggotaFinal, is_libur: false, has_conflict: hasConflict, catatan
          });
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      setDraftData(tempDraft);
      alert('✅ Draft berhasil di-generate! Silakan periksa warna merah (jika ada).');
    } catch (err) { alert('Gagal generate: ' + err.message); } finally { setIsGenerating(false); }
  };

  const handleToggleLibur = (index) => {
    if (isPublished) return;
    const newDraft = [...draftData];
    newDraft[index].is_libur = !newDraft[index].is_libur;
    setDraftData(newDraft);
  };

  // ═══ FUNGSI SIMPAN & PUBLISH KE DB ═══
  const handleSimpanJadwal = async (targetStatus) => {
    if (draftData.length === 0) return alert('Draft kosong!');
    if (!confirm(`Simpan jadwal sebagai ${targetStatus.toUpperCase()}?`)) return;

    setIsSaving(true);
    try {
      // 1. Hapus jadwal lama (jika ada) untuk periode ini
      await supabase.from('jadwal_ronda').delete().eq('periode_id', selectedPeriode.id);

      // 2. Loop dan masukkan jadwal baru
      for (const item of draftData) {
        const { data: jadwalBaru, error: errJ } = await supabase.from('jadwal_ronda').insert([{
          periode_id: selectedPeriode.id,
          tanggal: item.tanggal,
          grup_id: item.grup_id,
          putaran: item.putaran,
          status: item.is_libur ? 'libur' : 'aktif',
          catatan_sistem: item.catatan || null
        }]).select('id').single();

        if (errJ) throw errJ;

        // Masukkan petugas
        if (!item.is_libur) {
          const petugasInserts = item.petugas.map(p => ({
            jadwal_id: jadwalBaru.id,
            penghuni_id: p.id
          }));
          const { error: errP } = await supabase.from('petugas_ronda').insert(petugasInserts);
          if (errP) throw errP;
        }
      }

      // 3. Update status periode
      const { error: errU } = await supabase.from('periode_ronda').update({ status: targetStatus }).eq('id', selectedPeriode.id);
      if (errU) throw errU;

      alert(`✅ Jadwal berhasil disimpan & di-${targetStatus}!`);
      setIsPublished(targetStatus === 'published');
      fetchPeriode(); // Refresh list
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ═══ FUNGSI ATURAN KHUSUS ═══
  const fetchWargaRonda = async () => {
    setLoadingWarga(true);
    const { data } = await supabase.from('warga').select('*, penghuni:penghuni(*)').order('no_rumah');
    if (data) {
      const filtered = data.map(w => {
        const kk = w.penghuni?.find(p => p.is_aktif && p.hubungan === 'Kepala Keluarga');
        return { ...w, kk_data: kk };
      }).filter(w => w.kk_data);
      setWargaList(filtered);
    }
    setLoadingWarga(false);
  };

  const handleUpdateAturan = async (penghuniId, field, value) => {
    setProcessing(true);
    try {
      const { error } = await supabase.from('penghuni').update({ [field]: value }).eq('id', penghuniId);
      if (error) throw error;
      fetchWargaRonda(); 
    } catch (err) { alert('Gagal update: ' + err.message); } finally { setProcessing(false); }
  };

  const formatTanggal = (dateStr) => dateStr ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr)) : '-';
  const formatJam = (timeStr) => timeStr ? timeStr.substring(0, 5) : '-';

  // ═══════════════════════════════════════════════
  // ═══ RENDER HALAMAN DETAIL (TABEL EXCEL STYLE) ═══
  // ═══════════════════════════════════════════════
  if (viewMode === 'detail' && selectedPeriode) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setViewMode('list')} className="bg-slate-800 hover:bg-slate-700 text-white p-2.5 rounded-xl transition">← Kembali</button>
              <div>
                <h2 className="text-lg font-bold text-white">{selectedPeriode.nama_periode} {isPublished && <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded ml-2 uppercase">Published</span>}</h2>
                <p className="text-xs text-slate-400">Mulai {formatTanggal(selectedPeriode.tanggal_mulai)} • {selectedPeriode.jumlah_per_grup || 3} Org/Grup</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              {!isPublished ? (
                <>
                  <button onClick={handleGenerateDraft} disabled={isGenerating || draftData.length > 0} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition shadow-lg">
                    {isGenerating ? 'Memproses...' : '⚡ Generate Draft'}
                  </button>
                  <button onClick={() => handleSimpanJadwal('draft')} disabled={isSaving || draftData.length === 0} className="bg-orange-600 hover:bg-orange-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition shadow-lg">
                    💾 Simpan Draft
                  </button>
                  <button onClick={() => handleSimpanJadwal('published')} disabled={isSaving || draftData.length === 0} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition shadow-lg">
                    🚀 Publish
                  </button>
                </>
              ) : (
                <button onClick={() => alert('Fitur Batal Publish akan dibuat selanjutnya.')} className="bg-rose-600/20 text-rose-400 font-semibold px-4 py-2.5 rounded-xl text-xs transition border border-rose-500/30">
                  Batalkan Publish
                </button>
              )}
            </div>
          </div>

          {draftData.length === 0 ? (
             <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-10 text-center">
             <div className="text-5xl mb-3">📝</div>
             <h3 className="text-base font-bold text-white mb-1">Jadwal Belum Ada</h3>
             <p className="text-xs text-slate-400">Klik "Generate Draft" untuk membuat jadwal otomatis.</p>
           </div>
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3 border-r border-slate-800 text-center">Hari</th>
                      <th className="p-3 border-r border-slate-800 text-center">Tanggal</th>
                      <th className="p-3 border-r border-slate-800 text-center">Putaran</th>
                      {/* Render Kolom Petugas Dinamis */}
                      {Array.from({ length: selectedPeriode.jumlah_per_grup || 3 }).map((_, i) => (
                        <th key={i} className="p-3 border-r border-slate-800">Petugas {i + 1}</th>
                      ))}
                      <th className="p-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {draftData.map((item, idx) => (
                      <tr key={idx} className={`hover:bg-slate-800/40 ${item.is_libur ? 'opacity-50 grayscale bg-slate-900' : ''}`}>
                        <td className="p-3 border-r border-slate-800 text-center font-semibold text-white">{item.hari}</td>
                        <td className="p-3 border-r border-slate-800 text-center text-slate-300">{formatTanggal(item.tanggal)}</td>
                        <td className="p-3 border-r border-slate-800 text-center text-slate-500">{item.putaran}</td>
                        
                        {/* Render nama petugas di kolom masing-masing */}
                        {item.is_libur ? (
                          <td colSpan={selectedPeriode.jumlah_per_grup || 3} className="p-3 border-r border-slate-800 text-center text-rose-400 font-bold italic">LIBUR</td>
                        ) : (
                          <>
                            {item.petugas.map((p, pIdx) => (
                              <td key={pIdx} className="p-3 border-r border-slate-800 text-slate-200">
                                <div className={item.has_conflict && p.hari_ronda_khusus ? 'text-rose-400' : ''}>
                                  {p.nama_lengkap.split(' ')[0]} <span className="text-[9px] text-slate-500">({p.no_rumah || p.warga?.no_rumah})</span>
                                </div>
                              </td>
                            ))}
                            {/* Isi kolom kosong jika jumlah petugas kurang dari max kolom */}
                            {Array.from({ length: (selectedPeriode.jumlah_per_grup || 3) - item.petugas.length }).map((_, emptyIdx) => (
                              <td key={`empty-${emptyIdx}`} className="p-3 border-r border-slate-800 text-slate-600">-</td>
                            ))}
                          </>
                        )}
                        
                        <td className="p-3 text-center">
                          <button onClick={() => handleToggleLibur(idx)} disabled={isPublished} className={`px-2 py-1 rounded text-[10px] font-semibold transition ${item.is_libur ? 'bg-emerald-600/20 text-emerald-400' : 'bg-rose-600/20 text-rose-400'}`}>
                            {item.is_libur ? 'Aktifkan' : 'Libur'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {draftData.some(d => d.has_conflict) && (
                <div className="p-3 bg-rose-950/40 border-t border-rose-500/30 text-xs text-rose-400">
                  ⚠️ Perhatian: Ada jadwal yang bentrok (nama merah). Silakan tukar jadwal manual atau ubah aturan khusus.
                </div>
              )}
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // ═══════════════════════════════════════════════
  // ═══ RENDER HALAMAN LIST (TABS) ═══
  // ═══════════════════════════════════════════════
  const filteredWarga = wargaList.filter(w => 
    w.nama_lengkap?.toLowerCase().includes(searchWarga.toLowerCase()) || 
    w.no_rumah?.toLowerCase().includes(searchWarga.toLowerCase())
  );

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* HEADER TABS */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2 flex gap-2">
          <button onClick={() => setActiveTab('jadwal')} className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition ${activeTab === 'jadwal' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}>📅 Jadwal Ronda</button>
          <button onClick={() => setActiveTab('aturan')} className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition ${activeTab === 'aturan' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}>⚙️ Aturan Khusus Peserta</button>
        </div>

        {/* ═══ TAB 1: JADWAL RONDA ═══ */}
        {activeTab === 'jadwal' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div>
                <h2 className="text-lg font-bold text-white">Jadwal Ronda Warga</h2>
                <p className="text-xs text-slate-400">Buat periode, atur jadwal, dan publikasikan ke warga.</p>
              </div>
              <button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition shadow-lg shrink-0">+ Buat Periode Baru</button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs animate-pulse">Memuat data periode...</div>
            ) : periodeList.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 text-center flex flex-col items-center justify-center">
                <div className="text-5xl mb-3">🛡️</div>
                <h3 className="text-base font-bold text-white mb-1">Belum Ada Periode Ronda</h3>
                <p className="text-xs text-slate-400 mb-4">Silakan buat periode baru untuk mulai menyusun jadwal.</p>
              </div>
            ) : (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400">
                    <tr>
                      <th className="p-4">Nama Periode</th>
                      <th className="p-4">Tanggal</th>
                      <th className="p-4">Jam / Grup</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {periodeList.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40">
                        <td className="p-4"><div className="font-bold text-white text-sm">{p.nama_periode}</div></td>
                        <td className="p-4 text-slate-300">{formatTanggal(p.tanggal_mulai)} {p.tanggal_selesai ? ` - ${formatTanggal(p.tanggal_selesai)}` : ''}</td>
                        <td className="p-4 text-slate-300">{formatJam(p.jam_mulai)} - {formatJam(p.jam_selesai)} WIB<div className="text-[10px] text-indigo-400 mt-0.5">{p.jumlah_per_grup || 3} Orang / Grup</div></td>
                        <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${p.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>{p.status}</span></td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleLihatDetail(p)} className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-semibold transition">👁️ Lihat Detail</button>
                            <button onClick={() => handleHapusPeriode(p.id, p.nama_periode)} disabled={processing} className="bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-semibold transition">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB 2: ATURAN KHUSUS ═══ */}
        {activeTab === 'aturan' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-3">
              <div>
                <h2 className="text-lg font-bold text-white">Aturan Khusus Ronda</h2>
                <p className="text-xs text-slate-400">Atur siapa saja yang <strong>tidak ikut ronda</strong>, atau yang <strong>hanya bisa hari tertentu</strong> (pisahkan dengan koma jika lebih dari satu, contoh: "Sabtu, Minggu").</p>
              </div>
              <input type="text" placeholder="Cari nama atau no. rumah..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={searchWarga} onChange={(e) => setSearchWarga(e.target.value)} />
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400">
                  <tr>
                    <th className="p-4">Nama Kepala Keluarga</th>
                    <th className="p-4 text-center">Ikut Ronda?</th>
                    <th className="p-4">Hari Khusus (Opsional)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {loadingWarga ? (
                    <tr><td colSpan="3" className="text-center py-8 text-slate-500">Memuat...</td></tr>
                  ) : filteredWarga.map((w) => {
                    const kk = w.kk_data;
                    return (
                      <tr key={w.id} className="hover:bg-slate-800/40">
                        <td className="p-4">
                          <div className="font-bold text-white">{kk.nama_lengkap}</div>
                          <div className="text-[10px] text-teal-400 font-mono">{w.no_rumah}</div>
                        </td>
                        <td className="p-4 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={kk.ikut_ronda !== false} onChange={(e) => handleUpdateAturan(kk.id, 'ikut_ronda', e.target.checked)} />
                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                          </label>
                        </td>
                        <td className="p-4">
                          <input 
                            type="text" placeholder="Cth: Sabtu, Minggu"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white"
                            defaultValue={kk.hari_ronda_khusus || ''}
                            onBlur={(e) => { if (e.target.value !== (kk.hari_ronda_khusus || '')) handleUpdateAturan(kk.id, 'hari_ronda_khusus', e.target.value); }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* MODAL BUAT PERIODE */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">➕ Buat Periode Ronda</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleBuatPeriode} className="space-y-3">
              <div><label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Nama Periode *</label><input type="text" required placeholder="Contoh: Desember 2026" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={namaPeriode} onChange={(e) => setNamaPeriode(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Tanggal Mulai *</label><input type="date" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white [color-scheme:dark]" value={tglMulai} onChange={(e) => setTglMulai(e.target.value)} /></div>
                <div><label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Tanggal Selesai</label><input type="date" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white [color-scheme:dark]" value={tglSelesai} onChange={(e) => setTglSelesai(e.target.value)} /></div>
              </div>
              <div><label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Jumlah Personil / Grup *</label><input type="number" min="2" max="10" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={jumlahPerGrup} onChange={(e) => setJumlahPerGrup(e.target.value)} /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Jam Mulai</label><input type="time" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2.5 text-xs text-white [color-scheme:dark]" value={jamMulai} onChange={(e) => setJamMulai(e.target.value)} /></div>
                <div><label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Jam Selesai</label><input type="time" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2.5 text-xs text-white [color-scheme:dark]" value={jamSelesai} onChange={(e) => setJamSelesai(e.target.value)} /></div>
                <div><label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Reminder</label><input type="time" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2.5 text-xs text-white [color-scheme:dark]" value={jamReminder} onChange={(e) => setJamReminder(e.target.value)} /></div>
              </div>
              <div className="flex gap-2 pt-3 border-t border-slate-800 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs">Batal</button>
                <button type="submit" disabled={processing} className="w-2/3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs transition">{processing ? 'Menyimpan...' : 'Simpan Periode'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

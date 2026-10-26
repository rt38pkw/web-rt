import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/sekretaris/Layout';

export default function SekretarisRonda() {
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

  // State Draft Generator
  const [draftData, setDraftData] = useState([]); // Array hasil generate
  const [isGenerating, setIsGenerating] = useState(false);
  const [penghuniRonda, setPenghuniRonda] = useState([]);

  useEffect(() => {
    fetchPeriode();
  }, []);

  async function fetchPeriode() {
    setLoading(true);
    const { data, error } = await supabase
      .from('periode_ronda')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) setPeriodeList(data);
    setLoading(false);
  }

  const handleBuatPeriode = async (e) => {
    e.preventDefault();
    if (!namaPeriode.trim() || !tglMulai) return alert('Nama & Tanggal Wajib diisi!');

    setProcessing(true);
    try {
      const { error } = await supabase.from('periode_ronda').insert([{
        nama_periode: namaPeriode.trim(),
        tanggal_mulai: tglMulai,
        tanggal_selesai: tglSelesai || null,
        jam_mulai: jamMulai,
        jam_selesai: jamSelesai,
        jam_reminder: jamReminder,
        jumlah_per_grup: Number(jumlahPerGrup),
        status: 'draft'
      }]);
      if (error) throw error;
      
      alert('✅ Periode Ronda berhasil dibuat!');
      setShowModal(false);
      setNamaPeriode(''); setTglMulai(''); setTglSelesai('');
      fetchPeriode();
    } catch (err) { alert('Gagal: ' + err.message); } finally { setProcessing(false); }
  };

  const handleLihatDetail = (periode) => {
    setSelectedPeriode(periode);
    setViewMode('detail');
    setDraftData([]); // Reset draft saat masuk detail
  };

  // ══════════════════════════════════════════════════════════════
  // ═══ LOGIKA GENERATE (INTI ALGORITMA) ═══
  // ══════════════════════════════════════════════════════════════
  const handleGenerateDraft = async () => {
    setIsGenerating(true);
    try {
      // 1. Ambil semua peserta ronda
      const { data: penghuni, error } = await supabase
        .from('penghuni')
        .select('*')
        .eq('is_aktif', true)
        .eq('status_verifikasi', 'approved')
        .eq('ikut_ronda', true); // Hanya yang ikut ronda

      if (error) throw error;
      if (penghuni.length < 2) throw new Error('Peserta ronda terlalu sedikit.');
      setPenghuniRonda(penghuni);

      // 2. Bagi menjadi grup (termasuk logika sisa)
      const perGrup = selectedPeriode.jumlah_per_grup || 3;
      const totalPeserta = penghuni.length;
      let jumlahGrup = Math.floor(totalPeserta / perGrup);
      let sisa = totalPeserta % perGrup;
      
      // Jika sisa 1, gabung ke grup pertama (biar tidak ada grup 1 orang)
      if (sisa === 1) jumlahGrup = Math.max(1, jumlahGrup - 1); 

      const shuffled = [...penghuni].sort(() => 0.5 - Math.random()); // Acak

      const grupArr = [];
      let currentIdx = 0;
      for (let i = 0; i < jumlahGrup; i++) {
        let ukuran = perGrup;
        // Jika ini grup terakhir, ambil semua sisanya
        if (i === jumlahGrup - 1) ukuran = totalPeserta - currentIdx;
        
        grupArr.push({
          id: i + 1,
          anggota: shuffled.slice(currentIdx, currentIdx + ukuran)
        });
        currentIdx += ukuran;
      }

      // 3. Buat Draft Tanggal (3 Putaran)
      const hariArr = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      let currentDate = new Date(selectedPeriode.tanggal_mulai);
      const totalHari = jumlahGrup * 3; // 3 Putaran

      let tempDraft = [];
      for (let putaran = 1; putaran <= 3; putaran++) {
        for (let g = 0; g < grupArr.length; g++) {
          const grup = grupArr[g];
          const tglString = currentDate.toISOString().split('T')[0];
          const namaHari = hariArr[currentDate.getDay()];

          // Logika Fair Swap (Sederhana)
          let hasConflict = false;
          let catatan = '';
          let anggotaFinal = [...grup.anggota];

          // Cek Aturan Khusus
          for (let i = 0; i < anggotaFinal.length; i++) {
            const p = anggotaFinal[i];
            if (p.hari_ronda_khusus) {
              const arrayHari = p.hari_ronda_khusus.split(',').map(s => s.trim().toLowerCase());
              if (!arrayHari.includes(namaHari.toLowerCase())) {
                // Mencoba tukar (Hanya cek grup di putaran yang sama, belum lintas putaran)
                let swapped = false;
                for (let k = 0; k < grupArr.length; k++) {
                  if (k === g) continue; // Skip diri sendiri
                  const calonTukar = grupArr[k].anggota.find(x => {
                    // Cari orang yang TIDAK punya aturan khusus di hari ini, 
                    // TAPI nama harinya cocok dengan hari saat ini untuk si p
                    return !x.hari_ronda_khusus || x.hari_ronda_khusus.toLowerCase().includes(namaHari.toLowerCase());
                  });
                  if (calonTukar) {
                    // Tukar posisi di array
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
                  break; // Hentikan cek jika sudah konflik
                }
              }
            }
          }

          tempDraft.push({
            id: `${putaran}-${grup.id}`,
            tanggal: tglString,
            hari: namaHari,
            putaran: putaran,
            grup_id: grup.id,
            petugas: anggotaFinal,
            is_libur: false,
            has_conflict: hasConflict,
            catatan: catatan
          });

          // Tambah 1 hari
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      setDraftData(tempDraft);
      alert('✅ Draft berhasil di-generate! Silakan periksa warna merah (jika ada).');

    } catch (err) {
      alert('Gagal generate: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleLibur = (index) => {
    const newDraft = [...draftData];
    newDraft[index].is_libur = !newDraft[index].is_libur;
    setDraftData(newDraft);
  };

  const formatTanggal = (dateStr) => dateStr ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr)) : '-';
  const formatJam = (timeStr) => timeStr ? timeStr.substring(0, 5) : '-';

  // ═══ RENDER HALAMAN DETAIL ═══
  if (viewMode === 'detail' && selectedPeriode) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto space-y-4">
          
          {/* Header Detail */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setViewMode('list')} className="bg-slate-800 hover:bg-slate-700 text-white p-2.5 rounded-xl transition">← Kembali</button>
              <div>
                <h2 className="text-lg font-bold text-white">{selectedPeriode.nama_periode}</h2>
                <p className="text-xs text-slate-400">
                  Mulai {formatTanggal(selectedPeriode.tanggal_mulai)} • {selectedPeriode.jumlah_per_grup || 3} Org/Grup
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleGenerateDraft} disabled={isGenerating} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition shadow-lg">
                {isGenerating ? 'Memproses...' : '⚡ Generate Draft'}
              </button>
              <button onClick={() => alert('Fitur Import Excel segera hadir!')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition shadow-lg">
                📥 Import Excel
              </button>
            </div>
          </div>

          {/* Tabel Draft */}
          {draftData.length === 0 ? (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-10 text-center">
              <div className="text-5xl mb-3">📝</div>
              <h3 className="text-base font-bold text-white mb-1">Draft Belum Ada</h3>
              <p className="text-xs text-slate-400">Klik "Generate Draft" untuk membuat jadwal otomatis 3 putaran.</p>
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <span className="text-sm font-bold text-white">Total: {draftData.length} Hari (3 Putaran)</span>
                <button onClick={() => alert('Fitur Simpan ke Database akan dibuat berikutnya.')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg text-xs">💾 Simpan ke Database</button>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400">
                  <tr>
                    <th className="p-3">Tgl / Hari</th>
                    <th className="p-3">Putaran</th>
                    <th className="p-3">Grup</th>
                    <th className="p-3">Petugas Ronda</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {draftData.map((item, idx) => (
                    <tr key={idx} className={`hover:bg-slate-800/40 transition ${item.is_libur ? 'opacity-50 grayscale' : ''}`}>
                      <td className="p-3">
                        <div className="font-bold text-white">{formatTanggal(item.tanggal)}</div>
                        <div className="text-[10px] text-slate-400">{item.hari}</div>
                      </td>
                      <td className="p-3 text-slate-300">Putaran {item.putaran}</td>
                      <td className="p-3 text-slate-300">Grup {item.grup_id}</td>
                      <td className="p-3">
                        {item.is_libur ? (
                          <span className="text-rose-400 font-bold italic">Diliburkan</span>
                        ) : (
                          <>
                            <ul className="list-disc pl-3">
                              {item.petugas.map((p, pIdx) => (
                                <li key={pIdx} className={item.has_conflict && p.hari_ronda_khusus ? 'text-rose-400' : 'text-slate-200'}>
                                  {p.nama_lengkap} <span className="text-[9px] text-slate-500">({p.no_rumah || p.warga?.no_rumah})</span>
                                </li>
                              ))}
                            </ul>
                            {item.has_conflict && (
                              <div className="text-[10px] text-rose-400 mt-1 font-semibold">⚠️ Bentrok: {item.catatan}</div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button onClick={() => handleToggleLibur(idx)} className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition ${item.is_libur ? 'bg-emerald-600/20 text-emerald-400' : 'bg-rose-600/20 text-rose-400'}`}>
                          {item.is_libur ? 'Aktifkan' : 'Liburkan'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // ═══ RENDER HALAMAN LIST ═══
  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex justify-between items-center bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div>
            <h2 className="text-lg font-bold text-white">Jadwal Ronda Warga</h2>
            <p className="text-xs text-slate-400">Buat periode, atur jadwal, dan publikasikan ke warga.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition shadow-lg shrink-0">
            + Buat Periode Baru
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs animate-pulse">Memuat data periode...</div>
        ) : periodeList.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 text-center flex flex-col items-center justify-center">
            <div className="text-5xl mb-3">🛡️</div>
            <h3 className="text-base font-bold text-white mb-1">Belum Ada Periode Ronda</h3>
            <p className="text-xs text-slate-400 mb-4">Silakan buat periode baru untuk mulai menyusun jadwal.</p>
            <button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition">Buat Periode Sekarang</button>
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
                    <td className="p-4 text-slate-300">
                      {formatTanggal(p.tanggal_mulai)} {p.tanggal_selesai ? ` - ${formatTanggal(p.tanggal_selesai)}` : '(Fleksibel)'}
                    </td>
                    <td className="p-4 text-slate-300">
                      {formatJam(p.jam_mulai)} - {formatJam(p.jam_selesai)} WIB
                      <div className="text-[10px] text-indigo-400 mt-0.5">{p.jumlah_per_grup || 3} Orang / Grup</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${p.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleLihatDetail(p)} className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-semibold transition">👁️ Lihat Detail</button>
                        <button onClick={() => handleHapusPeriode(p.id, p.nama_periode)} className="bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-semibold transition">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              <div><label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Nama Periode *</label><input type="text" required placeholder="Contoh: Desember 2026 - Januari 2027" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={namaPeriode} onChange={(e) => setNamaPeriode(e.target.value)} /></div>
              
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Tanggal Mulai *</label><input type="date" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white [color-scheme:dark]" value={tglMulai} onChange={(e) => setTglMulai(e.target.value)} /></div>
                <div><label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Tanggal Selesai</label><input type="date" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white [color-scheme:dark]" value={tglSelesai} onChange={(e) => setTglSelesai(e.target.value)} /></div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Jumlah Personil / Grup *</label>
                <input type="number" min="2" max="10" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={jumlahPerGrup} onChange={(e) => setJumlahPerGrup(e.target.value)} />
                <p className="text-[9px] text-slate-500 mt-1">*Menentukan berapa orang per malam.</p>
              </div>

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

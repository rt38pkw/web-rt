// pages/sekretaris/ronda.js
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/sekretaris/Layout';
import { generateJadwalRonda } from '../../lib/ronda/generator';
import { simpanJadwalRonda } from '../../lib/ronda/rpc';
import ModalBuatPeriode from '../../components/ronda/ModalBuatPeriode';
import TabelJadwal from '../../components/ronda/TabelJadwal';
import TabelAturanKhusus from '../../components/ronda/TabelAturanKhusus';

export default function SekretarisRonda() {
  const [activeTab, setActiveTab] = useState('jadwal'); 
  const [periodeList, setPeriodeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [viewMode, setViewMode] = useState('list'); 
  const [selectedPeriode, setSelectedPeriode] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [draftData, setDraftData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [hasConflict, setHasConflict] = useState(false);

  const [wargaList, setWargaList] = useState([]);
  const [loadingWarga, setLoadingWarga] = useState(false);
  const [searchWarga, setSearchWarga] = useState('');

  useEffect(() => {
    if (activeTab === 'jadwal') fetchPeriode();
    else fetchWargaRonda();
  }, [activeTab]);

  async function fetchPeriode() {
    setLoading(true);
    const { data, error } = await supabase.from('periode_ronda').select('*').order('created_at', { ascending: false });
    if (!error && data) setPeriodeList(data);
    setLoading(false);
  }

  const handleBuatPeriode = async (formData) => {
    setProcessing(true);
    try {
      const { error } = await supabase.from('periode_ronda').insert([formData]);
      if (error) throw error;
      alert('✅ Periode Ronda berhasil dibuat!');
      setShowModal(false);
      fetchPeriode();
    } catch (err) { alert('Gagal: ' + err.message); } finally { setProcessing(false); }
  };

  // ═══ PERBAIKAN: VALIDASI HAPUS PERIODE ═══
  const handleHapusPeriode = async (id, nama, status) => {
    if (status === 'published') {
      return alert('❌ Gagal: Periode yang sudah di-publish tidak boleh dihapus! Silakan klik "Batalkan Publish" terlebih dahulu.');
    }
    if (!confirm(`Hapus periode "${nama}" beserta seluruh jadwalnya?`)) return;
    setProcessing(true);
    try {
      const { error } = await supabase.from('periode_ronda').delete().eq('id', id);
      if (error) throw error;
      alert('✅ Periode dihapus!'); fetchPeriode();
    } catch (err) { alert('❌ Gagal: ' + err.message); } finally { setProcessing(false); }
  };

  const handleLihatDetail = async (periode) => {
    setSelectedPeriode(periode);
    setViewMode('detail');
    setIsPublished(periode.status === 'published');
    setHasConflict(false);
    setLoading(true);
    try {
      const { data, error } = await supabase.from('jadwal_ronda').select('*, petugas:petugas_ronda(*, penghuni:penghuni_id(*, warga:warga_id(no_rumah)))').eq('periode_id', periode.id).order('tanggal');
      if (error) throw error;
      
      if (data && data.length > 0) {
        setDraftData(data.map(j => ({
          id: j.id, 
          tanggal: j.tanggal, 
          hari: new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(new Date(j.tanggal)),
          grup_id: j.grup_id, 
          is_libur: j.status === 'libur', 
          has_conflict: false, 
          catatan: j.catatan_sistem || '',
          petugas: j.petugas.map(p => p.penghuni)
        })));
      } else { setDraftData([]); }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleGenerateDraft = async () => {
    if (isPublished) return alert('Jadwal sudah di-publish. Tidak bisa generate ulang.');
    if (!confirm('Generate ulang akan menimpa draft saat ini. Lanjutkan?')) return;

    setIsGenerating(true);
    try {
      const { data: penghuni, error } = await supabase.from('penghuni').select('*, warga:warga_id(no_rumah)').eq('is_aktif', true).eq('status_verifikasi', 'approved').eq('ikut_ronda', true);
      if (error) throw error;

      // Ambil History Map dari jadwal PUBLISHED sebelumnya
      const { data: historyData, error: histErr } = await supabase
        .from('jadwal_ronda')
        .select('tanggal, petugas:petugas_ronda(penghuni_id), periode:periode_id(status)')
        .lt('tanggal', selectedPeriode.tanggal_mulai)
        .order('tanggal', { ascending: false });

      if (histErr) throw histErr;

      let historyMap = {};
      if (historyData) {
        historyData.forEach(j => {
          if (j.periode && j.periode.status === 'published' && j.petugas) {
            j.petugas.forEach(p => {
              if (!historyMap[p.penghuni_id]) {
                historyMap[p.penghuni_id] = j.tanggal;
              }
            });
          }
        });
      }
      
      const { draft, hasConflict } = generateJadwalRonda(penghuni, selectedPeriode, historyMap);
      
      setDraftData(draft);
      setHasConflict(hasConflict);
      alert('✅ Draft berhasil di-generate dengan kalkulasi Cross-Periode!');
    } catch (err) { alert('Gagal generate: ' + err.message); } finally { setIsGenerating(false); }
  };

  const handleToggleLibur = (index) => {
    if (isPublished) return;
    const newDraft = [...draftData];
    newDraft[index].is_libur = !newDraft[index].is_libur;
    setDraftData(newDraft);
  };

  const handleSimpanJadwal = async (targetStatus) => {
    if (draftData.length === 0) return alert('Draft kosong!');
    if (targetStatus === 'published' && hasConflict) return alert('❌ Tidak bisa Publish! Masih ada jadwal yang bentrok.');
    if (!confirm(`Simpan jadwal sebagai ${targetStatus.toUpperCase()}?`)) return;

    setIsSaving(true);
    try {
      await simpanJadwalRonda(selectedPeriode.id, targetStatus, draftData);
      
      alert(`✅ Berhasil disimpan sebagai ${targetStatus.toUpperCase()}!`);
      setIsPublished(targetStatus === 'published');
      setSelectedPeriode({ ...selectedPeriode, status: targetStatus });
      fetchPeriode();
    } catch (err) { alert('Gagal menyimpan: ' + err.message); } finally { setIsSaving(false); }
  };

  const handleBatalPublish = async () => {
    if (!confirm('Batalkan publish? Jadwal akan kembali menjadi draft dan bisa diedit/di-generate ulang.')) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('periode_ronda').update({ status: 'draft' }).eq('id', selectedPeriode.id);
      if (error) throw error;
      
      setIsPublished(false);
      setSelectedPeriode({ ...selectedPeriode, status: 'draft' });
      fetchPeriode();
      alert('✅ Publish dibatalkan. Status kembali ke Draft.');
    } catch (err) { alert('Gagal: ' + err.message); } finally { setIsSaving(false); }
  };

  const handleHapusDraft = async () => {
    if (!confirm('Hapus semua jadwal draft saat ini? Anda bisa generate ulang dari awal.')) return;
    setIsSaving(true);
    try {
      const { data: jadwalIds } = await supabase.from('jadwal_ronda').select('id').eq('periode_id', selectedPeriode.id);
      if (jadwalIds && jadwalIds.length > 0) {
        const ids = jadwalIds.map(j => j.id);
        await supabase.from('petugas_ronda').delete().in('jadwal_id', ids);
        await supabase.from('jadwal_ronda').delete().eq('periode_id', selectedPeriode.id);
      }
      setDraftData([]);
      alert('✅ Draft berhasil dihapus. Silakan klik Generate Draft.');
    } catch (err) { alert('Gagal: ' + err.message); } finally { setIsSaving(false); }
  };

  const fetchWargaRonda = async () => {
    setLoadingWarga(true);
    const { data } = await supabase.from('warga').select('*, penghuni:penghuni(*)').order('no_rumah');
    if (data) {
      setWargaList(data.map(w => ({ ...w, kk_data: w.penghuni?.find(p => p.is_aktif && p.hubungan === 'Kepala Keluarga') })).filter(w => w.kk_data));
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
            
            <div className="flex flex-wrap gap-2">
              {!isPublished ? (
                <>
                  <button onClick={handleGenerateDraft} disabled={isGenerating || draftData.length > 0} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition shadow-lg">
                    {isGenerating ? 'Memproses...' : '⚡ Generate Draft'}
                  </button>
                  <button onClick={() => handleSimpanJadwal('draft')} disabled={isSaving || draftData.length === 0} className="bg-orange-600 hover:bg-orange-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition shadow-lg">💾 Simpan Draft</button>
                  <button onClick={() => handleSimpanJadwal('published')} disabled={isSaving || draftData.length === 0 || hasConflict} className={`font-semibold px-4 py-2.5 rounded-xl text-xs transition shadow-lg ${hasConflict ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>🚀 Publish</button>
                  
                  {draftData.length > 0 && (
                    <button onClick={handleHapusDraft} disabled={isSaving} className="bg-rose-600/20 border border-rose-500/30 hover:bg-rose-600 hover:text-white text-rose-400 font-semibold px-4 py-2.5 rounded-xl text-xs transition shadow-lg">🗑️ Hapus Draft</button>
                  )}
                </>
              ) : (
                <button onClick={handleBatalPublish} disabled={isSaving} className="bg-rose-600/20 border border-rose-500/30 hover:bg-rose-600 hover:text-white text-rose-400 font-semibold px-4 py-2.5 rounded-xl text-xs transition shadow-lg">
                  {isSaving ? 'Memproses...' : '🔓 Batalkan Publish'}
                </button>
              )}
            </div>
          </div>
          
          {hasConflict && <div className="bg-rose-950/40 border border-rose-500/50 rounded-xl p-3 text-xs text-rose-400 flex items-center gap-2"><span className="text-lg">⚠️</span> Terdapat jadwal yang bentrok. Silakan periksa nama berwarna merah.</div>}
          
          <TabelJadwal 
            draftData={draftData} 
            selectedPeriode={selectedPeriode} 
            isPublished={isPublished} 
            onToggleLibur={handleToggleLibur} 
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2 flex gap-2">
          <button onClick={() => setActiveTab('jadwal')} className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition ${activeTab === 'jadwal' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}>📅 Jadwal Ronda</button>
          <button onClick={() => setActiveTab('aturan')} className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition ${activeTab === 'aturan' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}>⚙️ Aturan Khusus Peserta</button>
        </div>
        
        {activeTab === 'jadwal' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div><h2 className="text-lg font-bold text-white">Jadwal Ronda Warga</h2><p className="text-xs text-slate-400">Buat periode, atur jadwal, dan publikasikan ke warga.</p></div>
              <button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition shadow-lg shrink-0">+ Buat Periode Baru</button>
            </div>
            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs animate-pulse">Memuat data periode...</div>
            ) : periodeList.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 text-center flex flex-col items-center justify-center"><div className="text-5xl mb-3">🛡️</div><h3 className="text-base font-bold text-white mb-1">Belum Ada Periode Ronda</h3><p className="text-xs text-slate-400 mb-4">Silakan buat periode baru untuk mulai menyusun jadwal.</p></div>
            ) : (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400"><tr><th className="p-4">Nama Periode</th><th className="p-4">Tanggal</th><th className="p-4">Jam / Grup</th><th className="p-4">Status</th><th className="p-4 text-right">Aksi</th></tr></thead>
                  <tbody className="divide-y divide-slate-800">
                    {periodeList.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40">
                        <td className="p-4"><div className="font-bold text-white text-sm">{p.nama_periode}</div></td>
                        <td className="p-4 text-slate-300">{formatTanggal(p.tanggal_mulai)} {p.tanggal_selesai ? ` - ${formatTanggal(p.tanggal_selesai)}` : `(3 Putaran)`}</td>
                        <td className="p-4 text-slate-300">{formatJam(p.jam_mulai)} - {formatJam(p.jam_selesai)} WIB<div className="text-[10px] text-indigo-400 mt-0.5">{p.jumlah_per_grup || 3} Orang / Grup</div></td>
                        <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${p.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>{p.status}</span></td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleLihatDetail(p)} className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-semibold transition">👁️ Lihat Detail</button>
                            
                            {/* PERBAIKAN: Cek status sebelum menampilkan tombol hapus */}
                            {p.status !== 'published' ? (
                              <button 
                                onClick={() => handleHapusPeriode(p.id, p.nama_periode, p.status)} 
                                disabled={processing} 
                                className="bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-semibold transition" 
                                title="Hapus Draft"
                              >
                                🗑️
                              </button>
                            ) : (
                              <button 
                                disabled 
                                className="bg-slate-800/50 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-semibold cursor-not-allowed" 
                                title="Tidak bisa hapus periode yang sudah Publish. Batalkan Publish terlebih dahulu."
                              >
                                🔒
                              </button>
                            )}
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

        {activeTab === 'aturan' && (
          <TabelAturanKhusus 
            wargaList={wargaList} 
            loading={loadingWarga} 
            search={searchWarga} 
            setSearch={setSearchWarga} 
            onUpdateAturan={handleUpdateAturan} 
          />
        )}
      </div>

      <ModalBuatPeriode 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        onSave={handleBuatPeriode} 
        processing={processing} 
      />
    </Layout>
  );
}

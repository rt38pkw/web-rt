import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/sekretaris/Layout';

export default function SekretarisRonda() {
  const [periodeList, setPeriodeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // State Modal Buat Periode
  const [showModal, setShowModal] = useState(false);
  const [namaPeriode, setNamaPeriode] = useState('');
  const [tglMulai, setTglMulai] = useState('');
  const [tglSelesai, setTglSelesai] = useState('');
  const [jamMulai, setJamMulai] = useState('23:00');
  const [jamSelesai, setJamSelesai] = useState('02:00');
  const [jamReminder, setJamReminder] = useState('07:00');

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
    if (!namaPeriode.trim() || !tglMulai) {
      alert('Nama Periode dan Tanggal Mulai wajib diisi!');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase.from('periode_ronda').insert([{
        nama_periode: namaPeriode.trim(),
        tanggal_mulai: tglMulai,
        tanggal_selesai: tglSelesai || null,
        jam_mulai: jamMulai,
        jam_selesai: jamSelesai,
        jam_reminder: jamReminder,
        status: 'draft'
      }]);

      if (error) throw error;
      
      alert('✅ Periode Ronda berhasil dibuat!');
      setShowModal(false);
      setNamaPeriode(''); setTglMulai(''); setTglSelesai('');
      setJamMulai('23:00'); setJamSelesai('02:00'); setJamReminder('07:00');
      fetchPeriode();
    } catch (err) {
      alert('Gagal membuat periode: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleHapusPeriode = async (id, nama) => {
    if (!confirm(`Hapus periode "${nama}"?\n\nSemua jadwal di dalamnya juga akan terhapus.`)) return;
    setProcessing(true);
    try {
      await supabase.from('periode_ronda').delete().eq('id', id);
      fetchPeriode();
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const formatJam = (timeStr) => {
    if (!timeStr) return '-';
    // timeStr format: "23:00:00"
    return timeStr.substring(0, 5);
  };

  const formatTanggal = (dateStr) => {
    if (!dateStr) return '-';
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr));
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-4">
        
        <div className="flex justify-between items-center bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div>
            <h2 className="text-lg font-bold text-white">Jadwal Ronda Warga</h2>
            <p className="text-xs text-slate-400">Buat periode, atur jadwal, dan publikasikan ke warga.</p>
          </div>
          <button 
            onClick={() => setShowModal(true)} 
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition shadow-lg shrink-0"
          >
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
                  <th className="p-4">Jam Ronda</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {periodeList.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="p-4">
                      <div className="font-bold text-white text-sm">{p.nama_periode}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Dibuat: {formatTanggal(p.created_at)}</div>
                    </td>
                    <td className="p-4 text-slate-300">
                      {formatTanggal(p.tanggal_mulai)} {p.tanggal_selesai ? ` - ${formatTanggal(p.tanggal_selesai)}` : '(3 Putaran)'}
                    </td>
                    <td className="p-4 text-slate-300">
                      {formatJam(p.jam_mulai)} - {formatJam(p.jam_selesai)} WIB
                      <div className="text-[10px] text-amber-400 mt-0.5">Reminder: {formatJam(p.jam_reminder)}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${p.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => alert('Fitur Detail Draft akan dibuat pada tahap selanjutnya!')} 
                          className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-semibold transition"
                        >
                          👁️ Lihat Detail
                        </button>
                        <button 
                          onClick={() => handleHapusPeriode(p.id, p.nama_periode)} 
                          className="bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-semibold transition"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL BUAT PERIODE BARU */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">➕ Buat Periode Ronda</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            
            <form onSubmit={handleBuatPeriode} className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Nama Periode *</label>
                <input type="text" required placeholder="Contoh: Desember 2026 - Januari 2027" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={namaPeriode} onChange={(e) => setNamaPeriode(e.target.value)} />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Tanggal Mulai *</label>
                  <input type="date" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white [color-scheme:dark]" value={tglMulai} onChange={(e) => setTglMulai(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Tanggal Selesai (Opsional)</label>
                  <input type="date" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white [color-scheme:dark]" value={tglSelesai} onChange={(e) => setTglSelesai(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Jam Mulai</label>
                  <input type="time" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2.5 text-xs text-white [color-scheme:dark]" value={jamMulai} onChange={(e) => setJamMulai(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Jam Selesai</label>
                  <input type="time" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2.5 text-xs text-white [color-scheme:dark]" value={jamSelesai} onChange={(e) => setJamSelesai(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Jam Reminder</label>
                  <input type="time" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2.5 text-xs text-white [color-scheme:dark]" value={jamReminder} onChange={(e) => setJamReminder(e.target.value)} />
                </div>
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

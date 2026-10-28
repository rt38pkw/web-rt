// components/ronda/ModalSetupOtomatis.js
import { useState } from 'react';
import TabelAturanKhusus from './TabelAturanKhusus'; // Import komponen tabel

export default function ModalSetupOtomatis({ 
  isOpen, 
  onClose, 
  onGenerate, 
  isGenerating,
  wargaList,
  loadingWarga,
  onUpdateAturan
}) {
  const [view, setView] = useState('form'); // 'form' atau 'aturan'
  const [tglMulai, setTglMulai] = useState('');
  const [tipePeriode, setTipePeriode] = useState('auto');
  const [tglSelesai, setTglSelesai] = useState('');
  const [jumlahPerGrup, setJumlahPerGrup] = useState(3);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onGenerate({
      tanggal_mulai: tglMulai,
      tanggal_selesai: tipePeriode === 'custom' && tglSelesai ? tglSelesai : null,
      tipe_periode: tipePeriode,
      jumlah_per_grup: Number(jumlahPerGrup)
    });
  };

  // Jika sedang di view 'aturan', tampilkan Tabel Aturan Khusus
  if (view === 'aturan') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
            <div>
              <h3 className="text-base font-bold text-white">⚙️ Aturan Khusus Peserta</h3>
              <p className="text-[10px] text-slate-400">Atur warga yang tidak ikut ronda atau hanya bisa di hari tertentu.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setView('form')} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-semibold">
                ← Kembali ke Form
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
             <TabelAturanKhusus 
                wargaList={wargaList} 
                loading={loadingWarga} 
                search="" 
                setSearch={() => {}} 
                onUpdateAturan={onUpdateAturan} 
              />
          </div>
        </div>
      </div>
    );
  }

  // View Default (Form Setup)
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white">⚡ Setup Otomatis</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Tanggal Mulai *</label>
              <input type="date" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white [color-scheme:dark]" value={tglMulai} onChange={(e) => setTglMulai(e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Tipe Periode *</label>
              <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={tipePeriode} onChange={(e) => setTipePeriode(e.target.value)}>
                <option value="auto">3 Putaran Otomatis</option>
                <option value="custom">Custom (Tgl Selesai)</option>
              </select>
            </div>
          </div>
          
          {tipePeriode === 'custom' && (
            <div>
              <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Tanggal Selesai *</label>
              <input type="date" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white [color-scheme:dark]" value={tglSelesai} onChange={(e) => setTglSelesai(e.target.value)} />
            </div>
          )}
          
          <div>
            <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Jumlah Personil / Grup *</label>
            <input type="number" min="2" max="10" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={jumlahPerGrup} onChange={(e) => setJumlahPerGrup(e.target.value)} />
          </div>

          {/* TOMBOL MENUJU ATURAN KHUSUS */}
          <div className="pt-2 border-t border-slate-800 mt-2">
             <button type="button" onClick={() => setView('aturan')} className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2">
               ⚙️ Atur Hari Khusus Warga (Opsional)
             </button>
          </div>

          <div className="flex gap-2 pt-3 border-t border-slate-800">
            <button type="button" onClick={onClose} className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs">Batal</button>
            <button type="submit" disabled={isGenerating} className="w-2/3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs transition">
              {isGenerating ? 'Memproses...' : 'Generate Sekarang'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

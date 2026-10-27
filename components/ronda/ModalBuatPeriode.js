// components/ronda/ModalBuatPeriode.js
import { useState } from 'react';

export default function ModalBuatPeriode({ isOpen, onClose, onSave, processing }) {
  const [namaPeriode, setNamaPeriode] = useState('');
  const [tglMulai, setTglMulai] = useState('');
  const [tipePeriode, setTipePeriode] = useState('auto');
  const [tglSelesai, setTglSelesai] = useState('');
  const [jamMulai, setJamMulai] = useState('23:00');
  const [jamSelesai, setJamSelesai] = useState('02:00');
  const [jamReminder, setJamReminder] = useState('07:00');
  const [jumlahPerGrup, setJumlahPerGrup] = useState(3);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      nama_periode: namaPeriode.trim(),
      tanggal_mulai: tglMulai,
      tanggal_selesai: tipePeriode === 'custom' && tglSelesai ? tglSelesai : null,
      tipe_periode: tipePeriode,
      jam_mulai: jamMulai,
      jam_selesai: jamSelesai,
      jam_reminder: jamReminder,
      jumlah_per_grup: Number(jumlahPerGrup),
      status: 'draft'
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white">➕ Buat Periode Ronda</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Nama Periode *</label>
            <input type="text" required placeholder="Contoh: Desember 2026" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={namaPeriode} onChange={(e) => setNamaPeriode(e.target.value)} />
          </div>
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
              <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Reminder</label>
              <input type="time" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2.5 text-xs text-white [color-scheme:dark]" value={jamReminder} onChange={(e) => setJamReminder(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Jumlah Personil / Grup *</label>
            <input type="number" min="2" max="10" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={jumlahPerGrup} onChange={(e) => setJumlahPerGrup(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-3 border-t border-slate-800 mt-4">
            <button type="button" onClick={onClose} className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs">Batal</button>
            <button type="submit" disabled={processing} className="w-2/3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs transition">
              {processing ? 'Menyimpan...' : 'Simpan Periode'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

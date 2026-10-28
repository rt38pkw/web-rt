// components/warga/ModalUbahPin.js
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function ModalUbahPin({ show, onClose, wargaId, currentPassword }) {
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 1. Validasi Input
    if (oldPin !== currentPassword) {
      return setError('PIN Lama tidak sesuai.');
    }
    if (newPin.length < 6) {
      return setError('PIN Baru minimal 6 karakter.');
    }
    if (newPin !== confirmPin) {
      return setError('Konfirmasi PIN Baru tidak cocok.');
    }
    if (newPin === '123456') {
      return setError('PIN Baru tidak boleh 123456 (PIN default).');
    }

    // 2. Update ke Database
    setLoading(true);
    try {
      const { error: errUpdate } = await supabase
        .from('warga')
        .update({ password: newPin })
        .eq('id', wargaId);

      if (errUpdate) throw errUpdate;

      alert('✅ PIN berhasil diubah! Silakan gunakan PIN baru saat login berikutnya.');
      onClose();
    } catch (err) {
      setError('Gagal mengubah PIN: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">🔐 Ubah PIN Akun</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        {error && <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-2.5 rounded-xl text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">PIN Lama</label>
            <input type="password" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:border-indigo-500" value={oldPin} onChange={(e) => setOldPin(e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">PIN Baru</label>
            <input type="password" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:border-indigo-500" value={newPin} onChange={(e) => setNewPin(e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Konfirmasi PIN Baru</label>
            <input type="password" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:border-indigo-500" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} />
          </div>

          <div className="flex gap-2 pt-3 border-t border-slate-800 mt-4">
            <button type="button" onClick={onClose} className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs">Batal</button>
            <button type="submit" disabled={loading} className="w-2/3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs transition">
              {loading ? 'Menyimpan...' : 'Simpan PIN Baru'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

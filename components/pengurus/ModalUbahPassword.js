// components/pengurus/ModalUbahPassword.js
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function ModalUbahPassword({ show, onClose, user }) {
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPass.length < 6) return setError('Password baru minimal 6 karakter.');
    if (newPass !== confirmPass) return setError('Konfirmasi password tidak cocok.');
    if (newPass === '123456') return setError('Password tidak boleh 123456 (default).');

    setLoading(true);
    try {
      // 1. Cek Password Lama
      const { data: pData, error: errP } = await supabase
        .from('pengurus')
        .select('password')
        .eq('id', user.id)
        .single();

      if (errP) throw errP;
      if (pData.password !== oldPass) throw new Error('Password lama salah.');

      // 2. Update Password Baru
      const { error: errUpdate } = await supabase
        .from('pengurus')
        .update({ password: newPass })
        .eq('id', user.id);

      if (errUpdate) throw errUpdate;

      alert('✅ Password berhasil diubah!');
      setOldPass(''); setNewPass(''); setConfirmPass('');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">🔐 Ubah Password</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        {error && <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-2.5 rounded-xl text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Password Lama</label>
            <input type="password" required autoComplete="current-password" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:border-blue-500" value={oldPass} onChange={(e) => setOldPass(e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Password Baru</label>
            <input type="password" required autoComplete="new-password" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:border-blue-500" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Konfirmasi Password Baru</label>
            <input type="password" required autoComplete="new-password" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:border-blue-500" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} />
          </div>

          <div className="flex gap-2 pt-3 border-t border-slate-800 mt-4">
            <button type="button" onClick={onClose} className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs">Batal</button>
            <button type="submit" disabled={loading} className="w-2/3 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-xs transition">
              {loading ? 'Menyimpan...' : 'Simpan Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

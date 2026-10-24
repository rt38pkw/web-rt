import { useState } from 'react';

export default function ModalLengkapiProfil({ show, onClose, warga }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // State Form Step 1
  const [nik, setNik] = useState(warga?.nik || '');
  const [noWa, setNoWa] = useState(warga?.no_wa || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  if (!show) return null;

  const handleNextStep = () => {
    if (step === 1) {
      if (password && password !== confirmPassword) {
        alert('Password baru dan Konfirmasi Password tidak cocok!');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    // Logika simpan ke database akan kita isi di tahap berikutnya
    setTimeout(() => {
      setLoading(false);
      alert('✅ Data berhasil diajukan! Menunggu verifikasi Sekretaris.');
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5">
        
        {/* Header Wizard */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-white text-base">Lengkapi Profil Anda</h3>
            <p className="text-xs text-slate-400">Langkah {step} dari 3</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        {/* Step 1: Identitas & Password */}
        {step === 1 && (
          <div className="space-y-3 animate-in fade-in">
            <h4 className="text-sm font-semibold text-white mb-2">1. Identitas & Keamanan</h4>
            <div>
              <label className="block text-xs text-slate-300 mb-1">NIK (Wajib)</label>
              <input type="text" value={nik} onChange={(e) => setNik(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" placeholder="16 digit NIK" />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">No WhatsApp</label>
              <input type="text" value={noWa} onChange={(e) => setNoWa(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" placeholder="08123..." />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Password Baru (Opsional)</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" placeholder="Kosongkan jika tidak diubah" />
            </div>
            {password.length > 0 && (
              <div>
                <label className="block text-xs text-slate-300 mb-1">Ulangi Password Baru</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-xs text-white ${confirmPassword && confirmPassword !== password ? 'border-rose-500' : 'border-slate-800'}`} placeholder="Ketik ulang password" />
                {confirmPassword && confirmPassword !== password && <p className="text-[10px] text-rose-400 mt-1">Password tidak cocok!</p>}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Anggota Keluarga */}
        {step === 2 && (
          <div className="space-y-3 animate-in fade-in">
            <h4 className="text-sm font-semibold text-white mb-2">2. Daftar Penghuni (Opsional)</h4>
            <p className="text-xs text-slate-400">Tambahkan anggota keluarga atau penyewa yang tinggal bersama Anda.</p>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
              Fitur Tabel Anggota Keluarga (Segera Hadir)
            </div>
          </div>
        )}

        {/* Step 3: Upload KK */}
        {step === 3 && (
          <div className="space-y-3 animate-in fade-in">
            <h4 className="text-sm font-semibold text-white mb-2">3. Upload Kartu Keluarga</h4>
            <p className="text-xs text-slate-400">Foto KK ini hanya digunakan untuk validasi data oleh Sekretaris RT dan akan dihapus setelah disetujui.</p>
            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center hover:bg-slate-800/50 transition cursor-pointer">
              <div className="text-3xl mb-2">📸</div>
              <p className="text-xs text-slate-400">Klik untuk upload foto KK (JPG/PNG)</p>
            </div>
          </div>
        )}

        {/* Footer Navigasi */}
        <div className="flex gap-2 pt-3 border-t border-slate-800">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs">Kembali</button>
          )}
          {step < 3 ? (
            <button onClick={handleNextStep} className={`${step > 1 ? 'w-2/3' : 'w-full'} bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-xs`}>Lanjut →</button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-xs">{loading ? 'Mengirim...' : 'Kirim Pengajuan'}</button>
          )}
        </div>
      </div>
    </div>
  );
}

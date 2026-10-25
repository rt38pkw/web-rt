import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadKK } from '../../lib/iuran/storage';

export default function ModalLengkapiProfil({ show, onClose, warga, role, onSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const isPenyewa = role === 'penyewa';

  // State Step 1
  const [nik, setNik] = useState(warga?.nik || '');
  const [noWa, setNoWa] = useState(warga?.no_wa || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // State Step 2 (Anggota Keluarga)
  const [anggotaKeluarga, setAnggotaKeluarga] = useState([]);
  const [newNama, setNewNama] = useState('');
  const [newNik, setNewNik] = useState('');
  const [newHubungan, setNewHubungan] = useState('Istri');

  // State Step 3 (Upload KK)
  const [fileKK, setFileKK] = useState(null);
  const [previewKK, setPreviewKK] = useState(null);

  if (!show) return null;

  const handleNextStep = () => {
    if (step === 1) {
      if (!isPenyewa && password && password !== confirmPassword) {
        alert('Password baru dan Konfirmasi Password tidak cocok!');
        return;
      }
      if (!nik || !noWa) {
        alert('NIK dan No WhatsApp wajib diisi!');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleTambahAnggota = () => {
    if (!newNama.trim()) return;
    setAnggotaKeluarga([...anggotaKeluarga, { nama: newNama, nik: newNik, hubungan: newHubungan }]);
    setNewNama(''); setNewNik(''); setNewHubungan('Istri');
  };

  const handleHapusAnggota = (index) => {
    setAnggotaKeluarga(anggotaKeluarga.filter((_, i) => i !== index));
  };

  const handleFileKKChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileKK(file);
    setPreviewKK(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!fileKK) {
      alert('Foto Kartu Keluarga wajib diunggah untuk validasi!');
      return;
    }

    setLoading(true);
    try {
      const urlKK = await uploadKK(fileKK, warga.id);

      if (isPenyewa) {
        // === LOGIKA SIMPAN PENYEWA ===
        // 1. Cari data penghuni Kepala Keluarga yang sudah ada
        const { data: existingPenghuni } = await supabase
          .from('penghuni')
          .select('id')
          .eq('warga_id', warga.id)
          .eq('hubungan', 'Kepala Keluarga')
          .maybeSingle();

        if (existingPenghuni) {
          // Jika sudah ada (data injeksi), UPDATE
          await supabase.from('penghuni').update({
            nama_lengkap: warga.nama_lengkap === 'Belum Ada' ? 'Penyewa' : warga.nama_lengkap, // Fallback nama
            nik: nik.trim(),
            no_hp: noWa.trim(),
            url_kk: urlKK,
            status_verifikasi: 'pending'
          }).eq('id', existingPenghuni.id);
        } else {
          // Jika belum ada, INSERT
          await supabase.from('penghuni').insert([{
            warga_id: warga.id,
            nama_lengkap: 'Penyewa',
            nik: nik.trim(),
            no_hp: noWa.trim(),
            hubungan: 'Kepala Keluarga',
            is_aktif: true,
            url_kk: urlKK,
            status_verifikasi: 'pending'
          }]);
        }

        // Simpan anggota keluarga (selalu INSERT jika baru ditambahkan)
        if (anggotaKeluarga.length > 0) {
          const records = anggotaKeluarga.map(a => ({
            warga_id: warga.id,
            nama_lengkap: a.nama,
            nik: a.nik,
            hubungan: a.hubungan,
            is_aktif: true,
            status_verifikasi: 'pending'
          }));
          await supabase.from('penghuni').insert(records);
        }

      } else {
        // === LOGIKA SIMPAN PEMILIK ===
        const updateData = {
          nik: nik.trim(),
          no_wa: noWa.trim(),
          url_kk: urlKK,
          status_verifikasi_profil: 'pending'
        };
        if (password.trim()) updateData.password_pending = password.trim();

        await supabase.from('warga').update(updateData).eq('id', warga.id);

        // Simpan anggota keluarga Pemilik (jika ada)
        if (anggotaKeluarga.length > 0) {
          const records = anggotaKeluarga.map(a => ({
            warga_id: warga.id,
            nama_lengkap: a.nama,
            nik: a.nik,
            hubungan: a.hubungan,
            is_aktif: true,
            status_verifikasi: 'pending' // Nanti di-approve massal bareng pemilik
          }));
          await supabase.from('penghuni').insert(records);
        }
      }

      alert('✅ Data berhasil diajukan! Menunggu verifikasi Sekretaris.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      alert('Gagal mengirim data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 sticky top-0 bg-slate-900 z-10">
          <div>
            <h3 className="font-bold text-white text-base">Lengkapi Profil {isPenyewa ? 'Penyewa' : 'Pemilik'}</h3>
            <p className="text-xs text-slate-400">Langkah {step} dari 3</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        {step === 1 && (
          <div className="space-y-3 animate-in fade-in">
            <h4 className="text-sm font-semibold text-white mb-2">1. Identitas & Keamanan</h4>
            <div>
              <label className="block text-xs text-slate-300 mb-1">NIK (Wajib)</label>
              <input type="text" value={nik} onChange={(e) => setNik(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" placeholder="16 digit NIK" />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">No WhatsApp (Wajib)</label>
              <input type="text" value={noWa} onChange={(e) => setNoWa(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" placeholder="08123..." />
            </div>
            
            {/* INPUT PASSWORD HANYA UNTUK PEMILIK */}
            {!isPenyewa && (
              <>
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
              </>
            )}
            {isPenyewa && (
              <div className="p-3 bg-blue-950/30 rounded-xl border border-blue-500/20">
                <p className="text-xs text-blue-400">ℹ️ Password login Anda dikelola oleh Pemilik/Sekretaris. Anda tidak dapat mengubahnya di sini.</p>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 animate-in fade-in">
            <h4 className="text-sm font-semibold text-white mb-2">2. Daftar Penghuni (Opsional)</h4>
            <p className="text-xs text-slate-400 mb-2">Tambahkan anggota keluarga yang tinggal serumah (Istri, Anak, Saudara).</p>
            
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
              <input type="text" placeholder="Nama Lengkap" value={newNama} onChange={(e) => setNewNama(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white" />
              <div className="flex gap-2">
                <input type="text" placeholder="NIK (opsional)" value={newNik} onChange={(e) => setNewNik(e.target.value)} className="w-1/2 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white" />
                <select value={newHubungan} onChange={(e) => setNewHubungan(e.target.value)} className="w-1/2 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white">
                  <option value="Istri">Istri</option>
                  <option value="Anak">Anak</option>
                  <option value="Saudara">Saudara</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <button type="button" onClick={handleTambahAnggota} className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs py-1.5 rounded-lg mt-1 font-semibold">+ Tambahkan</button>
            </div>

            <div className="space-y-2">
              {anggotaKeluarga.map((a, i) => (
                <div key={i} className="flex justify-between items-center bg-slate-800/50 p-2 rounded-lg border border-slate-700">
                  <div>
                    <div className="text-xs text-white font-semibold">{a.nama} <span className="text-[10px] text-slate-400">({a.hubungan})</span></div>
                    {a.nik && <div className="text-[9px] text-slate-400">NIK: {a.nik}</div>}
                  </div>
                  <button onClick={() => handleHapusAnggota(i)} className="text-rose-400 hover:text-rose-300 text-xs">Hapus</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 animate-in fade-in">
            <h4 className="text-sm font-semibold text-white mb-2">3. Upload Kartu Keluarga</h4>
            <p className="text-xs text-slate-400">Foto KK ini hanya digunakan untuk validasi data oleh Sekretaris RT.</p>
            
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileKKChange} id="upload-kk" className="hidden" />
            <label htmlFor="upload-kk" className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center hover:bg-slate-800/50 transition cursor-pointer flex flex-col items-center justify-center min-h-[150px]">
              {previewKK ? (
                <img src={previewKK} alt="Preview KK" className="max-h-40 object-contain rounded-lg" />
              ) : (
                <>
                  <div className="text-3xl mb-2">📸</div>
                  <p className="text-xs text-slate-400">Klik untuk upload foto KK (JPG/PNG)</p>
                </>
              )}
            </label>
          </div>
        )}

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

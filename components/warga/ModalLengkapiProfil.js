import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadKK } from '../../lib/iuran/storage';

export default function ModalLengkapiProfil({ show, onClose, warga, role, dataPenyewaAktif, alasanReject, onSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const isPenyewa = role === 'penyewa';

  // State Step 1
  const [namaLengkap, setNamaLengkap] = useState('');
  const [nik, setNik] = useState('');
  const [noKk, setNoKk] = useState('');
  const [noWa, setNoWa] = useState('');
  const [tglLahir, setTglLahir] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState('L');
  const [pekerjaan, setPekerjaan] = useState('');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // State Step 2
  const [anggotaKeluarga, setAnggotaKeluarga] = useState([]);
  const [newNama, setNewNama] = useState('');
  const [newNik, setNewNik] = useState('');
  const [newTglLahir, setNewTglLahir] = useState('');
  const [newJenisKelamin, setNewJenisKelamin] = useState('L');
  const [newPekerjaan, setNewPekerjaan] = useState('');
  const [newHubungan, setNewHubungan] = useState('Istri');

  // State Step 3
  const [fileKK, setFileKK] = useState(null);
  const [previewKK, setPreviewKK] = useState(null);

  const sanitizeNik = (val) => {
    const str = String(val || '');
    const numbersOnly = str.replace(/\D/g, '');
    return numbersOnly.length === 16 ? numbersOnly : '';
  };

  const sanitizeWa = (val) => String(val || '').replace(/\D/g, '');

  useEffect(() => {
    if (!show) return;

    if (isPenyewa && dataPenyewaAktif) {
      setNamaLengkap(dataPenyewaAktif.nama_lengkap || '');
      setNik(sanitizeNik(dataPenyewaAktif.nik));
      setNoKk(sanitizeNik(dataPenyewaAktif.no_kk));
      setNoWa(sanitizeWa(dataPenyewaAktif.no_hp));
      setTglLahir(dataPenyewaAktif.tanggal_lahir || '');
      setJenisKelamin(dataPenyewaAktif.jenis_kelamin || 'L');
      setPekerjaan(dataPenyewaAktif.pekerjaan || '');
    } else if (!isPenyewa) {
      const sumberData = dataPenyewaAktif || warga;
      setNamaLengkap(sumberData.nama_lengkap === 'Belum Ada' ? '' : (sumberData.nama_lengkap || ''));
      setNik(sanitizeNik(sumberData.nik));
      setNoKk(sanitizeNik(sumberData.no_kk));
      setNoWa(sanitizeWa(sumberData.no_wa || sumberData.no_hp));
      setTglLahir(sumberData.tanggal_lahir || '');
      setJenisKelamin(sumberData.jenis_kelamin || 'L');
      setPekerjaan(sumberData.pekerjaan || '');
    }
  }, [show, isPenyewa, dataPenyewaAktif, warga]);

  if (!show) return null;

  const handleNumberChange = (e, setter) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 16) setter(val);
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!namaLengkap.trim()) { alert('Nama Lengkap wajib diisi!'); return; }
      if (!nik || nik.length !== 16) { alert('NIK wajib diisi 16 digit!'); return; }
      if (!noKk || noKk.length !== 16) { alert('No. KK wajib diisi 16 digit!'); return; }
      if (!noWa.trim()) { alert('No WhatsApp wajib diisi!'); return; }
      if (!isPenyewa && password && password !== confirmPassword) { alert('Password tidak cocok!'); return; }
      setStep(2);
    } else if (step === 2) {
      if (newNama.trim() !== '' || newNik.trim() !== '') {
        alert('Data anggota belum disimpan. Klik "+ Tambahkan" atau kosongkan form.');
        return;
      }
      setStep(3);
    }
  };

  const handleTambahAnggota = () => {
    if (!newNama.trim()) { alert('Nama wajib diisi!'); return; }
    if (!newNik || newNik.length !== 16) { alert('NIK wajib 16 digit!'); return; }
    setAnggotaKeluarga([...anggotaKeluarga, { 
      nama: newNama, 
      nik: newNik, 
      hubungan: newHubungan,
      tanggal_lahir: newTglLahir || null,
      jenis_kelamin: newJenisKelamin,
      pekerjaan: newPekerjaan.trim() || null
    }]);
    setNewNama(''); setNewNik(''); setNewTglLahir(''); setNewJenisKelamin('L'); setNewPekerjaan(''); setNewHubungan('Istri');
  };

  const handleHapusAnggota = (index) => setAnggotaKeluarga(anggotaKeluarga.filter((_, i) => i !== index));

  const handleFileKKChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileKK(file);
    setPreviewKK(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!fileKK) { alert('Foto KK wajib diunggah!'); return; }

    setLoading(true);
    try {
      const urlKK = await uploadKK(fileKK, warga.id);
      const tipe = isPenyewa ? 'penyewa' : 'pemilik';

      // 1. Simpan Profil Kepala Keluarga
      const { data: existingPenghuni } = await supabase
        .from('penghuni')
        .select('id')
        .eq('warga_id', warga.id)
        .eq('is_aktif', true)
        .maybeSingle();

      const dataPenghuni = {
        warga_id: warga.id, nama_lengkap: namaLengkap.trim(), nik: nik.trim(), no_kk: noKk.trim(), no_hp: noWa.trim(),
        tanggal_lahir: tglLahir || null,
        jenis_kelamin: jenisKelamin,
        pekerjaan: pekerjaan.trim() || null,
        hubungan: 'Kepala Keluarga', tipe_penghuni: tipe, is_aktif: true, status_verifikasi: 'pending', url_kk: urlKK, alasan_reject: null
      };

      if (existingPenghuni) {
        await supabase.from('penghuni').update(dataPenghuni).eq('id', existingPenghuni.id);
      } else {
        await supabase.from('penghuni').insert([dataPenghuni]);
      }

      // 2. Update data warga (Pemilik) jika perlu
      if (!isPenyewa) {
        const updateWarga = {
          nama_lengkap: namaLengkap.trim(), nik: nik.trim(), no_kk: noKk.trim(), no_wa: noWa.trim()
        };
        if (password.trim()) updateWarga.password_pending = password.trim();
        await supabase.from('warga').update(updateWarga).eq('id', warga.id);
      }

      // 3. Simpan Anggota Keluarga
      if (anggotaKeluarga.length > 0) {
        const records = anggotaKeluarga.map(a => ({
          warga_id: warga.id, nama_lengkap: a.nama, nik: a.nik, hubungan: a.hubungan, 
          tanggal_lahir: a.tanggal_lahir, jenis_kelamin: a.jenis_kelamin, pekerjaan: a.pekerjaan,
          tipe_penghuni: tipe, is_aktif: true, status_verifikasi: 'pending'
        }));
        await supabase.from('penghuni').insert(records);
      }

      alert('✅ Data berhasil diajukan!');
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

        {alasanReject && (
          <div className="bg-rose-950/40 border border-rose-500/50 rounded-xl p-3 flex items-start gap-2">
            <span className="text-sm mt-0.5">⚠️</span>
            <div>
              <h4 className="text-xs font-bold text-rose-300">Ditolak Sebelumnya:</h4>
              <p className="text-[11px] text-rose-400 mt-0.5">{alasanReject}</p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3 animate-in fade-in">
            <h4 className="text-sm font-semibold text-white mb-2">1. Identitas Kepala Keluarga</h4>
            
            <div><label className="block text-xs text-slate-300 mb-1">Nama Lengkap *</label><input type="text" value={namaLengkap} onChange={(e) => setNamaLengkap(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" /></div>
            
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-slate-300 mb-1">NIK (Wajib)</label><input type="text" inputMode="numeric" value={nik} onChange={(e) => handleNumberChange(e, setNik)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" /></div>
              <div><label className="block text-xs text-slate-300 mb-1">No. KK (Wajib)</label><input type="text" inputMode="numeric" value={noKk} onChange={(e) => handleNumberChange(e, setNoKk)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-slate-300 mb-1">No WhatsApp</label><input type="text" inputMode="tel" value={noWa} onChange={(e) => setNoWa(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" /></div>
              <div><label className="block text-xs text-slate-300 mb-1">Tanggal Lahir</label><input type="date" value={tglLahir} onChange={(e) => setTglLahir(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Jenis Kelamin</label>
                <select value={jenisKelamin} onChange={(e) => setJenisKelamin(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
              <div><label className="block text-xs text-slate-300 mb-1">Pekerjaan (Opsional)</label><input type="text" value={pekerjaan} onChange={(e) => setPekerjaan(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" placeholder="Karyawan, dll" /></div>
            </div>
            
            {!isPenyewa && (
              <div className="pt-3 border-t border-slate-800">
                <label className="block text-xs text-slate-300 mb-1">Password Baru (Opsional)</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white mb-2" />
                {password.length > 0 && (
                  <div>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" placeholder="Ulangi password" />
                    {confirmPassword && confirmPassword !== password && <p className="text-[10px] text-rose-400 mt-1">Password tidak cocok!</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 animate-in fade-in">
            <h4 className="text-sm font-semibold text-white mb-2">2. Anggota Keluarga</h4>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
              <input type="text" placeholder="Nama Lengkap" value={newNama} onChange={(e) => setNewNama(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white" />
              <div className="flex gap-2">
                <input type="text" inputMode="numeric" placeholder="16 digit NIK" value={newNik} onChange={(e) => handleNumberChange(e, setNewNik)} className="w-1/2 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white" />
                <select value={newHubungan} onChange={(e) => setNewHubungan(e.target.value)} className="w-1/2 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white">
                  <option value="Istri">Istri</option>
                  <option value="Anak">Anak</option>
                  <option value="Saudara">Saudara</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <div className="flex gap-2">
                <input type="date" value={newTglLahir} onChange={(e) => setNewTglLahir(e.target.value)} className="w-1/3 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white" />
                <select value={newJenisKelamin} onChange={(e) => setNewJenisKelamin(e.target.value)} className="w-1/3 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white">
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
                <input type="text" placeholder="Pekerjaan (Opsi)" value={newPekerjaan} onChange={(e) => setNewPekerjaan(e.target.value)} className="w-1/3 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white" />
              </div>
              <button type="button" onClick={handleTambahAnggota} className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs py-1.5 rounded-lg mt-1 font-semibold">+ Tambahkan</button>
            </div>

            <div className="space-y-2">
              {anggotaKeluarga.map((a, i) => (
                <div key={i} className="flex justify-between items-center bg-slate-800/50 p-2 rounded-lg border border-slate-700">
                  <div>
                    <div className="text-xs text-white font-semibold">{a.nama} <span className="text-[10px] text-slate-400">({a.hubungan})</span></div>
                    <div className="text-[9px] text-slate-400">NIK: {a.nik} | {a.jenis_kelamin === 'L' ? 'L' : 'P'}</div>
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
            <input type="file" accept="image/*" onChange={handleFileKKChange} id="upload-kk" className="hidden" />
            <label htmlFor="upload-kk" className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center hover:bg-slate-800/50 cursor-pointer flex flex-col items-center justify-center min-h-[150px]">
              {previewKK ? (<img src={previewKK} alt="Preview" className="max-h-40 object-contain rounded-lg" />) : (<><div className="text-3xl mb-2">📸</div><p className="text-xs text-slate-400">Upload Foto KK</p></>)}
            </label>
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t border-slate-800">
          {step > 1 && (<button onClick={() => setStep(step - 1)} className="w-1/3 bg-slate-800 text-slate-300 font-semibold py-2.5 rounded-xl text-xs">Kembali</button>)}
          {step < 3 ? (<button onClick={handleNextStep} className={`${step > 1 ? 'w-2/3' : 'w-full'} bg-blue-600 text-white font-semibold py-2.5 rounded-xl text-xs`}>Lanjut →</button>) : (<button onClick={handleSubmit} disabled={loading} className="w-full bg-emerald-600 text-white font-semibold py-2.5 rounded-xl text-xs">{loading ? 'Mengirim...' : 'Kirim Pengajuan'}</button>)}
        </div>
      </div>
    </div>
  );
}

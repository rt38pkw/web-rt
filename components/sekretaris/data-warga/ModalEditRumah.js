// components/sekretaris/data-warga/ModalEditRumah.js
import { useState, useEffect } from 'react';

export default function ModalEditRumah({ 
  showEditModal, setShowEditModal, handleUpdateWarga, editNama, setEditNama, 
  editNoRumah, setEditNoRumah, editStatusHuni, setEditStatusHuni, 
  editKategori, setEditKategori, editNik, setEditNik, editNoKk, setEditNoKk, 
  editNoWa, setEditNoWa, handleAngkaChange, processingId, editId,
  originalKategori // PROP BARU: Untuk mendeteksi apakah kategori berubah
}) {
  const [blokRumah, setBlokRumah] = useState('');
  const [nomorRumah, setNomorRumah] = useState('');
  const [editKategoriDate, setEditKategoriDate] = useState(new Date().toISOString().split('T')[0]);

  // Pisahkan data saat modal dibuka
  useEffect(() => {
    if (showEditModal && editNoRumah) {
      const parts = editNoRumah.split('-');
      if (parts.length === 2) {
        setBlokRumah(parts[0].trim());
        setNomorRumah(parts[1].trim());
      } else {
        setBlokRumah(editNoRumah);
        setNomorRumah('');
      }
    }
  }, [showEditModal, editNoRumah]);

  // Gabungkan kembali saat ada perubahan
  useEffect(() => {
    if (blokRumah || nomorRumah) {
      let finalNomor = nomorRumah;
      if (finalNomor.length === 1) finalNomor = '0' + finalNomor;
      setEditNoRumah(`${blokRumah.trim().toUpperCase()} - ${finalNomor}`);
    } else {
      setEditNoRumah('');
    }
  }, [blokRumah, nomorRumah, setEditNoRumah]);

  const handleNomorChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(0, 2);
    setNomorRumah(val);
  };

  const handleNomorBlur = () => {
    if (nomorRumah.length === 1) {
      setNomorRumah('0' + nomorRumah);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    let finalNomor = nomorRumah;
    if (finalNomor.length === 1) finalNomor = '0' + finalNomor;
    if (!blokRumah.trim()) return alert('Blok rumah wajib diisi!');
    if (!finalNomor) return alert('Nomor rumah wajib diisi!');
    const combinedNoRumah = `${blokRumah.trim().toUpperCase()} - ${finalNomor}`;
    
    // Kirim tanggal berlaku kategori (jika berubah) ke parent
    handleUpdateWarga(e, combinedNoRumah, editKategoriDate);
  };

  if (!showEditModal) return null;

  const isKategoriBerubah = editKategori !== originalKategori;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white">✏️ Edit Data Rumah</h3>
          <button type="button" onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white">✕</button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <input type="text" required placeholder="Nama Lengkap Pemilik *" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={editNama} onChange={(e) => setEditNama(e.target.value)} />
          
          <div className="flex gap-2 items-center">
            <input type="text" required placeholder="Blok (Cth: A1) *" className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white uppercase" value={blokRumah} onChange={(e) => setBlokRumah(e.target.value.toUpperCase())} />
            <span className="text-slate-500 font-bold">-</span>
            <input type="text" required placeholder="No. (Cth: 06) *" className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={nomorRumah} onChange={handleNomorChange} onBlur={handleNomorBlur} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={editStatusHuni} onChange={(e) => setEditStatusHuni(e.target.value)}>
              <option value="pemilik">Dihuni Pemilik</option>
              <option value="sewa">Disewakan</option>
              <option value="kosong">Kosong</option>
            </select>
            <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={editKategori} onChange={(e) => setEditKategori(e.target.value)}>
              <option value="Warga">Warga</option>
              <option value="Usaha">Usaha</option>
            </select>
          </div>

          {/* INPUT TANGGAL BERLAKU (MUNCUL HANYA JIKA KATEGORI BERUBAH) */}
          {isKategoriBerubah && (
            <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3">
              <label className="block text-[10px] font-semibold text-amber-300 uppercase mb-1">
                Mulai Tanggal Berapa Status {editKategori} Ini Berlaku? *
              </label>
              <input 
                type="date" 
                value={editKategoriDate} 
                onChange={(e) => setEditKategoriDate(e.target.value)} 
                required 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white [color-scheme:dark]" 
              />
              <p className="text-[9px] text-amber-400/80 mt-1">Sistem akan mencatat riwayat ini. Tagihan bulan lalu tidak akan berubah.</p>
            </div>
          )}

          <input type="text" inputMode="numeric" placeholder="NIK (16 digit)" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={editNik} onChange={(e) => handleAngkaChange(e, setEditNik)} />
          <input type="text" inputMode="numeric" placeholder="No. KK (16 digit)" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={editNoKk} onChange={(e) => handleAngkaChange(e, setEditNoKk)} />
          <input type="text" placeholder="No. WhatsApp" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={editNoWa} onChange={(e) => setEditNoWa(e.target.value)} />
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowEditModal(false)} className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs">Batal</button>
            <button type="submit" disabled={processingId === editId} className="w-2/3 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-xs">{processingId === editId ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

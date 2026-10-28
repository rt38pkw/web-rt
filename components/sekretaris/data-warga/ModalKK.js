// components/sekretaris/data-warga/ModalKK.js
export default function ModalKK({ 
  showKKModal, setShowKKModal, selectedKKWarga, kkData, isAddingNewKK, 
  isKelolaMode, setIsKelolaMode, previewKK, setPreviewKK, setZoomImage, processingId,
  handleTambahKKSubmit, handleTambahAnggotaSubmit, handleHapusAnggota, handleFileKKChange,
  newNama, setNewNama, newNik, setNewNik, newNoKk, setNewNoKk, newNoHp, setNewNoHp,
  newTglLahir, setNewTglLahir, newJenisKelamin, setNewJenisKelamin, newPekerjaan, 
  setNewPekerjaan, newHubungan, setNewHubungan, handleAngkaChange
}) {
  if (!showKKModal || !selectedKKWarga) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-6xl h-[95vh] rounded-3xl flex flex-col overflow-hidden shadow-2xl">
        
        <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-950/60 shrink-0">
          <div>
            <h3 className="text-base font-bold text-white">📄 Kartu Keluarga ({selectedKKWarga.no_rumah})</h3>
            <p className="text-xs text-slate-400">Pemilik: {selectedKKWarga.nama_lengkap}</p>
          </div>
          <button onClick={() => setShowKKModal(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Sisi Kiri: Data KK */}
          <div className="w-full md:w-1/2 bg-slate-900 p-4 border-b md:border-b-0 md:border-r border-slate-800 overflow-y-auto space-y-4">
            
            {isAddingNewKK ? (
              <form onSubmit={handleTambahKKSubmit} className="space-y-3">
                <h4 className="text-sm font-bold text-indigo-400">Tambah Kepala Keluarga Baru</h4>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Nama Lengkap *</label>
                  <input type="text" required placeholder="Contoh: Budi Santoso" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={newNama} onChange={(e) => setNewNama(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">NIK (Wajib)</label>
                    <input type="text" inputMode="numeric" placeholder="16 digit" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={newNik} onChange={(e) => handleAngkaChange(e, setNewNik)} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">No. KK (Wajib)</label>
                    <input type="text" inputMode="numeric" placeholder="16 digit" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={newNoKk} onChange={(e) => handleAngkaChange(e, setNewNoKk)} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">No. WhatsApp</label>
                  <input type="text" placeholder="08123456xxx" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={newNoHp} onChange={(e) => setNewNoHp(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Tanggal Lahir</label>
                    <input type="date" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white [color-scheme:dark]" value={newTglLahir} onChange={(e) => setNewTglLahir(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Jenis Kelamin</label>
                    <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={newJenisKelamin} onChange={(e) => setNewJenisKelamin(e.target.value)}>
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Pekerjaan (Opsional)</label>
                  <input type="text" placeholder="Karyawan / Wiraswasta" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" value={newPekerjaan} onChange={(e) => setNewPekerjaan(e.target.value)} />
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Upload Foto KK *</label>
                  <input type="file" accept="image/*" onChange={handleFileKKChange} className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-600/20 file:text-indigo-400 hover:file:bg-indigo-600/30" />
                </div>
                <button type="submit" disabled={processingId === selectedKKWarga.id} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl text-xs mt-4">
                  {processingId === selectedKKWarga.id ? 'Menyimpan...' : 'Simpan Kartu Keluarga'}
                </button>
              </form>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-300">Data Terdaftar</h4>
                  <button onClick={() => setIsKelolaMode(!isKelolaMode)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${isKelolaMode ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>
                    {isKelolaMode ? '✕ Tutup Kelola' : '✏️ Kelola Anggota'}
                  </button>
                </div>

                <div className="space-y-2">
                  {kkData.map((a, i) => (
                    <div key={i} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex justify-between items-center">
                      <div>
                        <div className="text-sm font-bold text-white">{a.nama_lengkap}</div>
                        <div className="text-[10px] text-slate-400">NIK: {a.nik || '-'}</div>
                        <div className="text-[10px] text-slate-400">Tgl Lahir: {a.tanggal_lahir || '-'} | {a.jenis_kelamin === 'P' ? 'Perempuan' : 'Laki-laki'}</div>
                        {a.pekerjaan && <div className="text-[10px] text-slate-400">Kerja: {a.pekerjaan}</div>}
                        <div className={`text-[10px] font-bold mt-1 ${a.hubungan === 'Kepala Keluarga' ? 'text-indigo-400' : 'text-slate-400'}`}>{a.hubungan}</div>
                      </div>
                      {isKelolaMode && a.hubungan !== 'Kepala Keluarga' && (
                        <button onClick={() => handleHapusAnggota(a.id, a.nama_lengkap)} className="bg-rose-600/20 text-rose-400 p-2 rounded-lg text-[10px] hover:bg-rose-600 hover:text-white transition">Keluarkan</button>
                      )}
                    </div>
                  ))}
                </div>

                {isKelolaMode && (
                  <form onSubmit={handleTambahAnggotaSubmit} className="bg-indigo-950/20 border border-indigo-500/30 p-3 rounded-xl space-y-3 mt-4">
                    <h5 className="text-xs font-bold text-indigo-300">+ Tambah Anggota / Update KK</h5>
                    
                    <div className="pt-1 pb-2 border-b border-slate-800">
                      <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Ganti Foto KK (Opsional)</label>
                      <input type="file" accept="image/*" onChange={handleFileKKChange} className="w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30" />
                      {previewKK && <p className="text-[9px] text-emerald-400 mt-1">✓ Foto baru siap disimpan</p>}
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Nama Lengkap Anggota *</label>
                      <input type="text" required placeholder="Contoh: Siti Aminah" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" value={newNama} onChange={(e) => setNewNama(e.target.value)} />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">NIK Anggota</label>
                      <input type="text" inputMode="numeric" placeholder="16 digit" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" value={newNik} onChange={(e) => handleAngkaChange(e, setNewNik)} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Tanggal Lahir</label>
                        <input type="date" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white [color-scheme:dark]" value={newTglLahir} onChange={(e) => setNewTglLahir(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Jenis Kelamin</label>
                        <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" value={newJenisKelamin} onChange={(e) => setNewJenisKelamin(e.target.value)}>
                          <option value="L">Laki-laki</option>
                          <option value="P">Perempuan</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Pekerjaan (Opsional)</label>
                      <input type="text" placeholder="Pelajar / Karyawan" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" value={newPekerjaan} onChange={(e) => setNewPekerjaan(e.target.value)} />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Hubungan Keluarga</label>
                      <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" value={newHubungan} onChange={(e) => setNewHubungan(e.target.value)}>
                        <option value="Istri">Istri</option>
                        <option value="Anak">Anak</option>
                        <option value="Saudara">Saudara</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                    
                    <button type="submit" disabled={processingId === selectedKKWarga.id} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded-xl text-xs transition mt-2">Simpan Anggota</button>
                  </form>
                )}
              </>
            )}
          </div>

          {/* Sisi Kanan: Gambar KK */}
          <div className="w-full md:w-1/2 bg-black/50 relative flex items-center justify-center overflow-auto p-4">
            {previewKK ? (
               <div className="relative w-full h-full flex items-center justify-center">
                 <img src={previewKK} alt="Preview Foto Baru" className="max-w-full max-h-full object-contain rounded-lg cursor-zoom-in" onClick={() => setZoomImage(previewKK)} />
                 <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] px-2 py-1 rounded">Foto Baru</span>
               </div>
            ) : isAddingNewKK ? (
              <div className="text-slate-500 text-sm flex flex-col items-center gap-2">
                <span className="text-4xl">📸</span>
                <p>Pilih file foto KK di sebelah kiri.</p>
              </div>
            ) : (
              kkData[0]?.url_kk ? (
                <img src={kkData[0].url_kk} alt="KK Terdaftar" className="max-w-full max-h-full object-contain rounded-lg cursor-zoom-in" onClick={() => setZoomImage(kkData[0].url_kk)} />
              ) : (
                <div className="text-slate-500 text-sm flex flex-col items-center gap-2">
                  <span className="text-4xl">📄</span>
                  <p>Foto KK belum di-upload.</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

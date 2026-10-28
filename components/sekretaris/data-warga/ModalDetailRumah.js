// components/sekretaris/data-warga/ModalDetailRumah.js
export default function ModalDetailRumah({ 
  detailRumah, setDetailRumah, openEditModal, handleResetPassword, 
  handleSelesaikanSewa, handleHapusWarga, processingId 
}) {
  if (!detailRumah) return null;

  return (
    <div 
      className="fixed inset-0 z-[999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      onClick={() => setDetailRumah(null)} // TUTUP MODAL JIKA KLIK AREA LUAR
    >
      <div 
        className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()} // CEGAH TUTUP JIKA KLIK DI DALAM KOTAK
      >
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white">🏠 Detail Data Rumah</h3>
          
          {/* TOMBOL X */}
          <button 
            type="button" 
            onClick={() => setDetailRumah(null)} // UBAH KE setDetailRumah
            className="relative z-[1000] text-slate-400 hover:text-white bg-slate-800 hover:bg-rose-500/20 w-8 h-8 flex items-center justify-center rounded-full transition cursor-pointer text-lg"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-slate-800/50 pb-2">
            <span className="text-slate-400">No. Rumah</span>
            <span className="text-teal-400 font-bold font-mono">{detailRumah.no_rumah}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800/50 pb-2">
            <span className="text-slate-400">Nama Pemilik</span>
            <span className="text-white font-bold">{detailRumah.nama_lengkap}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800/50 pb-2">
            <span className="text-slate-400">NIK</span>
            <span className="text-white font-mono">{detailRumah.nik || '-'}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800/50 pb-2">
            <span className="text-slate-400">No. KK</span>
            <span className="text-white font-mono">{detailRumah.no_kk || '-'}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800/50 pb-2">
            <span className="text-slate-400">WhatsApp</span>
            <span className="text-white">{detailRumah.no_wa || '-'}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800/50 pb-2">
            <span className="text-slate-400">Kategori</span>
            <span className="text-white">{detailRumah.kategori}</span>
          </div>
          <div className="flex justify-between pb-2">
            <span className="text-slate-400">Status Huni</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${detailRumah.status_huni === 'sewa' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>{detailRumah.status_huni}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800">
          <button type="button" onClick={() => openEditModal(detailRumah)} className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white font-semibold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1">
            ✏️ Edit Data
          </button>
          <button type="button" onClick={() => handleResetPassword(detailRumah)} disabled={processingId === detailRumah.id} className="bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white font-semibold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1">
            🔑 Reset Sandi
          </button>
          {detailRumah.status_huni === 'sewa' && (
            <button type="button" onClick={() => handleSelesaikanSewa(detailRumah)} disabled={processingId === detailRumah.id} className="col-span-2 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white font-semibold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1">
              🚪 Selesaikan Sewa
            </button>
          )}
          <button type="button" onClick={() => handleHapusWarga(detailRumah)} disabled={processingId === detailRumah.id} className="col-span-2 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white font-semibold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1">
            🗑️ Hapus Data Rumah
          </button>
        </div>
        
        {/* TOMBOL TUTUP BAWAH */}
        <button 
          type="button"
          onClick={() => setDetailRumah(null)} // UBAH KE setDetailRumah
          className="w-full mt-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl text-xs transition border border-slate-700"
        >
          Tutup
        </button>

      </div>
    </div>
  );
}

import { useState } from 'react';
import { formatRupiah, formatTanggal } from '../../lib/keuangan/helpers';

export default function ModalKasRT({
  show,
  onClose,
  iuranList = [],
  pemasukanLainList = [],
  pengeluaranList = [],
}) {
  const [showAllPemasukan, setShowAllPemasukan] = useState(false);
  const [showAllPengeluaran, setShowAllPengeluaran] = useState(false);

  if (!show) return null;

  // ═══ PERHITUNGAN ═══
  const totalIuran = iuranList
    .filter((i) => i.status === 'approved' && i.metode !== 'deposit')
    .reduce((s, i) => s + Number(i.jumlah || 0), 0);

  const totalPemasukanLain = pemasukanLainList.reduce((s, p) => s + Number(p.nominal || 0), 0);
  const totalPengeluaran = pengeluaranList.reduce((s, p) => s + Number(p.nominal || 0), 0);
  const saldoKas = (totalIuran + totalPemasukanLain) - totalPengeluaran;

  // ═══ LOGIKA TAMPILAN (Biar nggak kepanjangan) ═══
  const MAX_ITEMS = 4;
  const tampilPemasukan = showAllPemasukan ? pemasukanLainList : pemasukanLainList.slice(0, MAX_ITEMS);
  const tampilPengeluaran = showAllPengeluaran ? pengeluaranList : pengeluaranList.slice(0, MAX_ITEMS);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      
      {/* Modal Container: Dibatasi max-h 90vh (90% tinggi layar) */}
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* ═══ HEADER (Sticky di atas) ═══ */}
        <div className="flex justify-between items-center border-b border-slate-800 p-4 sm:p-6 shrink-0 bg-slate-900 z-10">
          <div>
            <h3 className="font-bold text-white text-base">💰 Transparansi Saldo Kas RT 38</h3>
            <p className="text-[11px] text-slate-400 mt-1">Rincian arus kas masuk dan keluar</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center text-sm shrink-0">
            ✕
          </button>
        </div>

        {/* ═══ BODY (Bisa di-scroll) ═══ */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
          
          {/* RINGKASAN KAS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Pemasukan</div>
              <div className="text-lg font-bold text-emerald-400 mt-1">{formatRupiah(totalIuran + totalPemasukanLain)}</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Pengeluaran</div>
              <div className="text-lg font-bold text-rose-400 mt-1">{formatRupiah(totalPengeluaran)}</div>
            </div>
            <div className="bg-slate-950 border border-blue-500/30 rounded-xl p-4">
              <div className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold">Sisa Saldo Kas</div>
              <div className="text-lg font-bold text-white mt-1">{formatRupiah(saldoKas)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* KOLOM PEMASUKAN */}
            <div className="space-y-2 flex flex-col">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">📥 Pemasukan</h4>
              
              {/* Iuran */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex justify-between items-center shrink-0">
                <span className="text-xs text-slate-300">💰 Iuran Warga (Total)</span>
                <strong className="text-emerald-400 text-xs">{formatRupiah(totalIuran)}</strong>
              </div>
              
              {/* Pemasukan Lainnya */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl flex flex-col flex-1 overflow-hidden">
                <div className="p-3 bg-slate-900 border-b border-slate-800 text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                  ➕ Pemasukan Lainnya
                </div>
                
                <div className="divide-y divide-slate-800/60 overflow-y-auto">
                  {pemasukanLainList.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-[11px]">Belum ada pemasukan lain.</div>
                  ) : (
                    tampilPemasukan.map((p) => (
                      <div key={p.id} className="p-3 flex justify-between gap-2 hover:bg-slate-800/40">
                        <div>
                          <div className="text-slate-300 text-[11px] font-semibold">{p.jenis}</div>
                          <div className="text-[10px] text-slate-400 italic truncate max-w-[150px]">{p.keterangan || '-'}</div>
                          <div className="text-[10px] text-slate-500">{formatTanggal(p.tanggal)}</div>
                        </div>
                        <div className="text-right font-mono text-emerald-400 text-[11px] font-semibold whitespace-nowrap">
                          {formatRupiah(p.nominal)}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Tombol Lihat Semua */}
                {pemasukanLainList.length > MAX_ITEMS && (
                  <button 
                    onClick={() => setShowAllPemasukan(!showAllPemasukan)}
                    className="p-2 text-[10px] text-blue-400 font-semibold bg-slate-900 hover:bg-slate-800 border-t border-slate-800 transition"
                  >
                    {showAllPemasukan ? '← Sembunyikan' : `Lihat Semua (${pemasukanLainList.length})`}
                  </button>
                )}
              </div>
            </div>

            {/* KOLOM PENGELUARAN */}
            <div className="space-y-2 flex flex-col">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">📤 Pengeluaran</h4>
              
              <div className="bg-slate-950 border border-slate-800 rounded-xl flex flex-col flex-1 overflow-hidden">
                <div className="p-3 bg-slate-900 border-b border-slate-800 text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                  Rincian Pengeluaran
                </div>
                
                <div className="divide-y divide-slate-800/60 overflow-y-auto">
                  {pengeluaranList.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-[11px]">Belum ada pengeluaran.</div>
                  ) : (
                    tampilPengeluaran.map((p) => (
                      <div key={p.id} className="p-3 flex justify-between gap-2 hover:bg-slate-800/40">
                        <div>
                          <div className="text-slate-300 text-[11px] font-semibold truncate max-w-[180px]">{p.keterangan || p.jenis}</div>
                          <div className="text-[10px] text-slate-500">{formatTanggal(p.tanggal)}</div>
                        </div>
                        <div className="text-right font-mono text-rose-400 text-[11px] font-semibold whitespace-nowrap">
                          {formatRupiah(p.nominal)}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Tombol Lihat Semua */}
                {pengeluaranList.length > MAX_ITEMS && (
                  <button 
                    onClick={() => setShowAllPengeluaran(!showAllPengeluaran)}
                    className="p-2 text-[10px] text-blue-400 font-semibold bg-slate-900 hover:bg-slate-800 border-t border-slate-800 transition"
                  >
                    {showAllPengeluaran ? '← Sembunyikan' : `Lihat Semua (${pengeluaranList.length})`}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

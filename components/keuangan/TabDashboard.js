// components/keuangan/TabDashboard.js
import { useState } from 'react';
import { formatRupiah, formatTanggal } from '../../lib/keuangan/helpers';
import Link from 'next/link';
import ModalRincianIuran from './ModalRincianIuran';

export default function TabDashboard({
  saldoKasBebas,
  saldoDepositTotal,
  totalUangRekening,
  totalPemasukan,
  totalPengeluaran,
  totalIuranApproved,
  totalPemasukanLain,
  pendingBatches = [],
  pengeluaran = [],
  iuranList = [],
}) {
  const [showModalIuran, setShowModalIuran] = useState(false);

  const persenIuran = totalPemasukan > 0 ? (totalIuranApproved / totalPemasukan) * 100 : 0;
  const persenLain = totalPemasukan > 0 ? (totalPemasukanLain / totalPemasukan) * 100 : 0;

  return (
    <div className="space-y-3">
      
      {/* ═══ 1. PANEL SALDO UTAMA (Compact) ═══ */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700 rounded-2xl p-4 shadow-xl">
        {/* Total Uang Rekening */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-3">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Uang Rekening</div>
            <div className="text-2xl font-black text-emerald-400">{formatRupiah(totalUangRekening)}</div>
          </div>
          <div className="bg-slate-800/60 p-2 rounded-xl text-lg">🏦</div>
        </div>

        {/* Kas Bebas & Deposit */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-950/50 rounded-xl p-2.5 border border-blue-500/20">
            <div className="text-[9px] text-blue-300 uppercase font-semibold mb-0.5">🏦 Kas Bebas</div>
            <div className="text-sm font-bold text-white">{formatRupiah(saldoKasBebas)}</div>
          </div>
          <div className="bg-slate-950/50 rounded-xl p-2.5 border border-purple-500/20 flex flex-col justify-between">
            <div className="text-[9px] text-purple-300 uppercase font-semibold mb-0.5">💎 Deposit</div>
            <div className="text-sm font-bold text-white">{formatRupiah(saldoDepositTotal)}</div>
          </div>
        </div>
      </div>

      {/* ═══ 2. ARUS KAS (Pemasukan vs Pengeluaran) ═══ */}
      <div className="grid grid-cols-2 gap-2">
        
        {/* Pemasukan */}
        <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-1">
            <span className="text-[9px] text-emerald-400 uppercase tracking-wider font-bold">Pemasukan</span>
            <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1 rounded font-bold">{persenIuran.toFixed(0)}% Iuran</span>
          </div>
          <div className="text-sm font-black text-emerald-400 mb-1">{formatRupiah(totalPemasukan)}</div>
          
          <div className="w-full bg-slate-800 rounded-full h-1 mt-1 overflow-hidden flex">
            <div className="bg-emerald-500 h-full" style={{ width: `${persenIuran}%` }}></div>
            <div className="bg-blue-500 h-full" style={{ width: `${persenLain}%` }}></div>
          </div>

          <div className="flex justify-between text-[9px] mt-2">
            <div className="cursor-pointer group" onClick={() => setShowModalIuran(true)}>
              <span className="text-slate-400 block group-hover:text-emerald-300 transition">💰 Iuran</span>
              <span className="text-emerald-400 font-semibold underline decoration-emerald-500/30">{formatRupiah(totalIuranApproved)}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block">➕ Lain</span>
              <span className="text-blue-400 font-semibold">{formatRupiah(totalPemasukanLain)}</span>
            </div>
          </div>
        </div>

        {/* Pengeluaran */}
        <div className="bg-slate-900 border border-rose-500/30 rounded-xl p-3 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-1">
              <span className="text-[9px] text-rose-400 uppercase tracking-wider font-bold">Pengeluaran</span>
            </div>
            <div className="text-sm font-black text-rose-400">{formatRupiah(totalPengeluaran)}</div>
          </div>
          <Link href="/keuangan/pengeluaran" className="text-[9px] text-slate-400 hover:text-white mt-2 flex items-center gap-1">Lihat Detail →</Link>
        </div>
      </div>

      {/* ═══ 3. PENDING & PENGELUARAN TERBARU ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        
        {/* Pending Verifikasi */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold text-white">⏳ Menunggu Verifikasi</h3>
            {pendingBatches.length > 0 && <Link href="/keuangan/verifikasi" className="text-[9px] text-blue-400 hover:underline">Semua →</Link>}
          </div>
          {pendingBatches.length === 0 ? (
            <p className="text-[10px] text-slate-500 py-2 text-center">Tidak ada pending.</p>
          ) : (
            <div className="space-y-1.5">
              {pendingBatches.slice(0, 2).map((b) => (
                <div key={b.batchId} className="flex justify-between items-center bg-slate-950/60 rounded-lg p-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold text-white truncate">{b.items[0]?.warga?.nama_lengkap}</div>
                    <div className="text-[9px] text-slate-500">{b.items.length} bln • {formatRupiah(b.items.reduce((s, i) => s + Number(i.jumlah || 0), 0))}</div>
                  </div>
                  <Link href="/keuangan/verifikasi" className="text-[9px] bg-blue-600 hover:bg-blue-500 text-white px-1.5 py-1 rounded">Cek</Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pengeluaran Terbaru */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold text-white">➖ Pengeluaran Terbaru</h3>
            <Link href="/keuangan/pengeluaran" className="text-[9px] text-blue-400 hover:underline">Semua →</Link>
          </div>
          <div className="space-y-1.5">
            {pengeluaran.slice(0, 2).map((p) => (
              <div key={p.id} className="flex justify-between items-start gap-2 bg-slate-950/60 rounded-lg p-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] text-slate-500">{formatTanggal(p.tanggal)} • {p.jenis}</div>
                  <div className="text-[10px] text-slate-300 truncate">{p.keterangan || '-'}</div>
                </div>
                <div className="text-[10px] font-bold text-rose-400 whitespace-nowrap">{formatRupiah(p.nominal)}</div>
              </div>
            ))}
            {pengeluaran.length === 0 && <p className="text-[10px] text-slate-500 py-2 text-center">Belum ada pengeluaran.</p>}
          </div>
        </div>
      </div>

      <ModalRincianIuran show={showModalIuran} onClose={() => setShowModalIuran(false)} iuranList={iuranList} />
    </div>
  );
}

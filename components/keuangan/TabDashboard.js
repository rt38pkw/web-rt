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
  pendingBatches,
  pengeluaran,
  iuranList = [],
}) {
  const [showModalIuran, setShowModalIuran] = useState(false);

  const persenIuran = totalPemasukan > 0 ? (totalIuranApproved / totalPemasukan) * 100 : 0;
  const persenLain = totalPemasukan > 0 ? (totalPemasukanLain / totalPemasukan) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* ═══ KARTU UTAMA ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-blue-950/60 to-slate-900 border border-blue-500/30 rounded-2xl p-5">
          <span className="text-[10px] text-blue-300 uppercase tracking-wider font-semibold">
            🏦 Saldo Kas Bebas
          </span>
          <div className="text-2xl font-black text-white mt-1">{formatRupiah(saldoKasBebas)}</div>
          <p className="text-[10px] text-slate-500 mt-1">
            Milik RT, bisa dipakai bebas
          </p>
        </div>

        {/* KARTU PEMASUKAN */}
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">
                Total Pemasukan
              </span>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                {persenIuran.toFixed(0)}% dari Iuran
              </span>
            </div>
            <div className="text-xl font-black text-emerald-400 mt-1">
              {formatRupiah(totalPemasukan)}
            </div>
          </div>
          
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden flex">
            <div className="bg-emerald-500 h-full" style={{ width: `${persenIuran}%` }} title="Iuran"></div>
            <div className="bg-blue-500 h-full" style={{ width: `${persenLain}%` }} title="Lain-lain"></div>
          </div>

          <div className="flex justify-between text-[10px] mt-2">
            <div 
              className="cursor-pointer group"
              onClick={() => setShowModalIuran(true)}
            >
              <span className="text-slate-400 block group-hover:text-emerald-300 transition">💰 Iuran (Klik Rincian)</span>
              <span className="text-emerald-400 font-semibold underline decoration-emerald-500/30 underline-offset-2">
                {formatRupiah(totalIuranApproved)}
              </span>
            </div>

            <div className="text-right">
              <span className="text-slate-400 block">➕ Lain-lain</span>
              <span className="text-blue-400 font-semibold">{formatRupiah(totalPemasukanLain)}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-5">
          <span className="text-[10px] text-rose-400 uppercase tracking-wider font-semibold">
            Total Pengeluaran
          </span>
          <div className="text-xl font-black text-rose-400 mt-1">
            {formatRupiah(totalPengeluaran)}
          </div>
        </div>
      </div>

      {/* ═══ BANNER DEPOSIT (FULL WIDTH) ═══ */}
      <div className="bg-gradient-to-r from-purple-950/40 to-slate-900 border border-purple-500/30 rounded-2xl p-5 flex justify-between items-center flex-wrap gap-3">
        <div>
          <span className="text-[10px] text-purple-300 uppercase tracking-wider font-semibold">
            💎 Saldo Deposit Warga
          </span>
          <div className="text-xl font-black text-purple-300 mt-1">
            {formatRupiah(saldoDepositTotal)}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Titipan warga untuk iuran tahun berikutnya</p>
        </div>
        <Link href="/keuangan/deposit" className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl shrink-0">
          Kelola Deposit →
        </Link>
      </div>

      {/* ═══ TOTAL UANG REKENING ═══ */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex justify-between items-center flex-wrap gap-3">
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            📊 Total Uang di Rekening
          </span>
          <p className="text-[10px] text-slate-500 mt-0.5">Kas Bebas + Deposit</p>
        </div>
        <div className="text-xl font-black text-white">
          {formatRupiah(totalUangRekening)}
        </div>
      </div>

      {/* ═══ PENDING + PENGELUARAN ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-white">⏳ Menunggu Verifikasi</h3>
            {pendingBatches.length > 0 && (
              <Link href="/keuangan/verifikasi" className="text-[10px] text-blue-400 hover:underline">Lihat semua →</Link>
            )}
          </div>
          {pendingBatches.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">Tidak ada pending.</p>
          ) : (
            <div className="space-y-2">
              {pendingBatches.slice(0, 3).map((b) => (
                <div key={b.batchId} className="flex justify-between items-center bg-slate-950/60 rounded-xl p-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{b.items[0]?.warga?.nama_lengkap}</div>
                    <div className="text-[10px] text-slate-500">
                      {b.items.length} bulan • {formatRupiah(b.items.reduce((s, i) => s + Number(i.jumlah || 0), 0))}
                    </div>
                  </div>
                  <Link href="/keuangan/verifikasi" className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded-lg">Lihat</Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-white">➖ Pengeluaran Terbaru</h3>
            <Link href="/keuangan/pengeluaran" className="text-[10px] text-blue-400 hover:underline">Lihat semua →</Link>
          </div>
          <div className="space-y-2">
            {pengeluaran.slice(0, 4).map((p) => (
              <div key={p.id} className="flex justify-between items-start gap-2 bg-slate-950/60 rounded-xl p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-slate-500">
                    {formatTanggal(p.tanggal)} • {p.jenis}
                  </div>
                  <div className="text-xs text-slate-300 truncate">{p.keterangan || '-'}</div>
                </div>
                <div className="text-xs font-bold text-rose-400 whitespace-nowrap">{formatRupiah(p.nominal)}</div>
              </div>
            ))}
            {pengeluaran.length === 0 && (
              <p className="text-xs text-slate-500 py-4 text-center">Belum ada pengeluaran.</p>
            )}
          </div>
        </div>
      </div>

      {/* MODAL RINCIAN IURAN */}
      <ModalRincianIuran 
        show={showModalIuran} 
        onClose={() => setShowModalIuran(false)} 
        iuranList={iuranList} 
      />
    </div>
  );
}

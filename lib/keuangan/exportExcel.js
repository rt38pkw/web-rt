// lib/keuangan/exportExcel.js
import * as XLSX from 'xlsx';

export function exportLaporanKeuangan({ iuranList, pengeluaranList, pemasukanLainList, saldoKasBebas, totalPemasukan, totalPengeluaran }) {
  // 1. Buat Worksheet untuk Ringkasan
  const dataRingkasan = [
    ['LAPORAN KEUANGAN RT 38'],
    ['Tanggal Unduh', new Date().toLocaleString('id-ID')],
    [],
    ['RINGKASAN KAS'],
    ['Saldo Kas Bebas RT', saldoKasBebas],
    ['Total Pemasukan (Iuran + Lain)', totalPemasukan],
    ['Total Pengeluaran', totalPengeluaran],
  ];
  const wsRingkasan = XLSX.utils.aoa_to_sheet(dataRingkasan);
  wsRingkasan['!cols'] = [{ wch: 30 }, { wch: 20 }];

  // 2. Buat Worksheet untuk Detail Iuran
  const dataIuran = [
    ['Tanggal Transaksi', 'Nama Warga', 'No Rumah', 'Bulan Iuran', 'Metode', 'Jumlah (Rp)', 'Status']
  ];
  iuranList.forEach(item => {
    dataIuran.push([
      item.tanggal_transaksi || item.created_at?.split('T')[0] || '-',
      item.warga?.nama_lengkap || '-',
      item.warga?.no_rumah || '-',
      item.bulan_tahun || '-',
      item.metode || '-',
      Number(item.jumlah || 0),
      item.status.toUpperCase()
    ]);
  });
  const wsIuran = XLSX.utils.aoa_to_sheet(dataIuran);
  wsIuran['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];

  // 3. Buat Worksheet untuk Detail Pengeluaran
  const dataPengeluaran = [
    ['Tanggal', 'Jenis', 'Keterangan', 'Nominal (Rp)']
  ];
  pengeluaranList.forEach(item => {
    dataPengeluaran.push([
      item.tanggal || '-',
      item.jenis || '-',
      item.keterangan || '-',
      Number(item.nominal || 0)
    ]);
  });
  const wsPengeluaran = XLSX.utils.aoa_to_sheet(dataPengeluaran);
  wsPengeluaran['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 40 }, { wch: 15 }];

  // 4. Buat Worksheet untuk Detail Pemasukan Lain
  const dataPemasukan = [
    ['Tanggal', 'Jenis', 'Keterangan', 'Nominal (Rp)']
  ];
  pemasukanLainList.forEach(item => {
    dataPemasukan.push([
      item.tanggal || '-',
      item.jenis || '-',
      item.keterangan || '-',
      Number(item.nominal || 0)
    ]);
  });
  const wsPemasukan = XLSX.utils.aoa_to_sheet(dataPemasukan);
  wsPemasukan['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 40 }, { wch: 15 }];

  // 5. Gabungkan semua ke dalam 1 File Excel (Workbook)
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsRingkasan, 'Ringkasan Kas');
  XLSX.utils.book_append_sheet(wb, wsIuran, 'Detail Iuran');
  XLSX.utils.book_append_sheet(wb, wsPengeluaran, 'Detail Pengeluaran');
  XLSX.utils.book_append_sheet(wb, wsPemasukan, 'Pemasukan Lain');

  // 6. Unduh File
  const namaFile = `Laporan_Keuangan_RT38_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, namaFile);
}

// lib/keuangan/exportExcel.js
import * as XLSX from 'xlsx';

export function exportLaporanKeuangan({ iuranList, pengeluaranList, pemasukanLainList, saldoKasBebas, totalPemasukan, totalPengeluaran }) {
  
  // ═══════════════════════════════════════════════════════════════
  // SHEET 1: LAPORAN KAS (RINGKASAN + RINCIAN)
  // ═══════════════════════════════════════════════════════════════
  const dataSheet1 = [
    ['LAPORAN KEUANGAN RT 38'],
    ['Tanggal Unduh', new Date().toLocaleString('id-ID')],
    [],
    ['RINGKASAN KAS'],
    ['Saldo Kas Bebas RT', saldoKasBebas],
    ['Total Pemasukan (Iuran + Lain)', totalPemasukan],
    ['Total Pengeluaran', totalPengeluaran],
    [],
    ['RINCIAN PEMASUKAN LAIN'],
    ['Tanggal', 'Jenis', 'Keterangan', 'Nominal (Rp)']
  ];

  // Masukkan data pemasukan lain
  pemasukanLainList.forEach(item => {
    dataSheet1.push([
      item.tanggal || '-',
      item.jenis || '-',
      item.keterangan || '-',
      Number(item.nominal || 0)
    ]);
  });

  // Spasi antar tabel
  dataSheet1.push([]);
  dataSheet1.push(['RINCIAN PENGELUARAN']);
  dataSheet1.push(['Tanggal', 'Jenis', 'Keterangan', 'Nominal (Rp)']);

  // Masukkan data pengeluaran
  pengeluaranList.forEach(item => {
    dataSheet1.push([
      item.tanggal || '-',
      item.jenis || '-',
      item.keterangan || '-',
      Number(item.nominal || 0)
    ]);
  });

  const ws1 = XLSX.utils.aoa_to_sheet(dataSheet1);
  // Atur lebar kolom Sheet 1
  ws1['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 40 }, { wch: 15 }];


  // ═══════════════════════════════════════════════════════════════
  // SHEET 2: REKAP IURAN WARGA
  // ═══════════════════════════════════════════════════════════════
  const rekapMap = {};
  
  // Hanya hitung yang sudah approved
  iuranList.filter(i => i.status === 'approved').forEach(item => {
    const id = item.warga_id || item.warga?.no_rumah || '-';
    if (!rekapMap[id]) {
      rekapMap[id] = {
        noRumah: item.warga?.no_rumah || '-',
        nama: item.warga?.nama_lengkap || '-',
        totalBayar: 0,
        jumlahBulan: 0
      };
    }
    rekapMap[id].totalBayar += Number(item.jumlah || 0);
    rekapMap[id].jumlahBulan += 1;
  });

  const dataSheet2 = [
    ['REKAP IURAN WARGA (LUNAS)'],
    [],
    ['No. Rumah', 'Nama Warga', 'Jumlah Bulan Lunas', 'Total Nominal Dibayar (Rp)']
  ];

  // Urutkan berdasarkan No Rumah (A-Z)
  const sortedRekap = Object.values(rekapMap).sort((a, b) => a.noRumah.localeCompare(b.noRumah));

  sortedRekap.forEach(r => {
    dataSheet2.push([r.noRumah, r.nama, r.jumlahBulan, r.totalBayar]);
  });

  const ws2 = XLSX.utils.aoa_to_sheet(dataSheet2);
  ws2['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 25 }];


  // ═══════════════════════════════════════════════════════════════
  // SHEET 3: DETAIL TRANSAKSI IURAN (AUDIT TRAIL)
  // ═══════════════════════════════════════════════════════════════
  const dataSheet3 = [
    ['DETAIL RIWAYAT IURAN'],
    [],
    ['Tanggal Transaksi', 'Nama Warga', 'No Rumah', 'Bulan Iuran', 'Metode', 'Jumlah (Rp)']
  ];

  // Urutkan berdasarkan tanggal terbaru (jika ada), atau urutkan berdasarkan nama
  iuranList.filter(i => i.status === 'approved').forEach(item => {
    dataSheet3.push([
      item.tanggal_transaksi || item.created_at?.split('T')[0] || '-',
      item.warga?.nama_lengkap || '-',
      item.warga?.no_rumah || '-',
      item.bulan_tahun || '-',
      item.metode ? item.metode.toUpperCase() : '-',
      Number(item.jumlah || 0)
    ]);
  });

  const ws3 = XLSX.utils.aoa_to_sheet(dataSheet3);
  ws3['!cols'] = [{ wch: 18 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];


  // ═══════════════════════════════════════════════════════════════
  // GABUNGKAN & UNDUH
  // ═══════════════════════════════════════════════════════════════
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Laporan Kas');
  XLSX.utils.book_append_sheet(wb, ws2, 'Rekap Iuran Warga');
  XLSX.utils.book_append_sheet(wb, ws3, 'Detail Riwayat Iuran');

  const namaFile = `Laporan_Keuangan_RT38_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, namaFile);
}

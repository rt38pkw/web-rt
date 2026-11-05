// lib/keuangan/exportExcel.js
import * as XLSX from 'xlsx';
import { simpanFileKeHP } from '../download-helper';

export async function exportLaporanKeuangan({ iuranList, pengeluaranList, pemasukanLainList, saldoKasBebas, totalPemasukan, totalPengeluaran }) {
  
  // ═══ (Kode bikin Sheet 1, 2, 3 sama persis kayak sebelumnya) ═══
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
  pemasukanLainList.forEach(item => { dataSheet1.push([item.tanggal || '-', item.jenis || '-', item.keterangan || '-', Number(item.nominal || 0)]); });
  dataSheet1.push([]);
  dataSheet1.push(['RINCIAN PENGELUARAN']);
  dataSheet1.push(['Tanggal', 'Jenis', 'Keterangan', 'Nominal (Rp)']);
  pengeluaranList.forEach(item => { dataSheet1.push([item.tanggal || '-', item.jenis || '-', item.keterangan || '-', Number(item.nominal || 0)]); });
  const ws1 = XLSX.utils.aoa_to_sheet(dataSheet1);
  ws1['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 40 }, { wch: 15 }];

  const rekapMap = {};
  iuranList.filter(i => i.status === 'approved').forEach(item => {
    const id = item.warga_id || item.warga?.no_rumah || '-';
    if (!rekapMap[id]) rekapMap[id] = { noRumah: item.warga?.no_rumah || '-', nama: item.warga?.nama_lengkap || '-', totalBayar: 0, jumlahBulan: 0 };
    rekapMap[id].totalBayar += Number(item.jumlah || 0);
    rekapMap[id].jumlahBulan += 1;
  });
  const dataSheet2 = [['REKAP IURAN WARGA (LUNAS)'], [], ['No. Rumah', 'Nama Warga', 'Jumlah Bulan Lunas', 'Total Nominal Dibayar (Rp)']];
  Object.values(rekapMap).sort((a, b) => a.noRumah.localeCompare(b.noRumah)).forEach(r => { dataSheet2.push([r.noRumah, r.nama, r.jumlahBulan, r.totalBayar]); });
  const ws2 = XLSX.utils.aoa_to_sheet(dataSheet2);
  ws2['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 25 }];

  const dataSheet3 = [['DETAIL RIWAYAT IURAN'], [], ['Tanggal Transaksi', 'Nama Warga', 'No Rumah', 'Bulan Iuran', 'Metode', 'Jumlah (Rp)']];
  iuranList.filter(i => i.status === 'approved').forEach(item => {
    dataSheet3.push([item.tanggal_transaksi || item.created_at?.split('T')[0] || '-', item.warga?.nama_lengkap || '-', item.warga?.no_rumah || '-', item.bulan_tahun || '-', item.metode ? item.metode.toUpperCase() : '-', Number(item.jumlah || 0)]);
  });
  const ws3 = XLSX.utils.aoa_to_sheet(dataSheet3);
  ws3['!cols'] = [{ wch: 18 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Laporan Kas');
  XLSX.utils.book_append_sheet(wb, ws2, 'Rekap Iuran Warga');
  XLSX.utils.book_append_sheet(wb, ws3, 'Detail Riwayat Iuran');

  const namaFile = `Laporan_Keuangan_RT38_${new Date().toISOString().split('T')[0]}.xlsx`;
  
  // ═══ UBAH CARA SIMPAN ═══
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
  
  try {
    const msg = await simpanFileKeHP(excelBuffer, namaFile, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    alert(msg);
  } catch (e) {
    alert('Gagal simpan Excel: ' + e.message);
  }
}

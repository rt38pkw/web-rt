// lib/proyek/exportPdf.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // PERBAIKAN: Import sebagai fungsi
import { formatRupiahProyek, formatTanggalProyek } from './constants';

export function exportKasProyekToPdf(proyek, kas, riwayatGabungan, wargaList) {
  try {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    // ─── HEADER ───
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("LAPORAN KAS PROYEK RT 38", 105, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Proyek: ${proyek.nama}`, 14, 25);
    doc.text(`Tanggal Cetak: ${today}`, 14, 30);

    // ─── RINGKASAN KAS ───
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("RINGKASAN KAS", 14, 42);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    let yPos = 50;
    
    doc.text(`Iuran Terkumpul`, 14, yPos);
    doc.text(`: ${formatRupiahProyek(kas.totalIuran)}`, 60, yPos);
    yPos += 6;
    
    doc.text(`Donasi Terkumpul`, 14, yPos);
    doc.text(`: ${formatRupiahProyek(kas.totalDonasi)}`, 60, yPos);
    yPos += 6;
    
    doc.text(`Total Pengeluaran`, 14, yPos);
    doc.text(`: ${formatRupiahProyek(kas.totalPengeluaran)}`, 60, yPos);
    yPos += 6;
    
    doc.text(`Total Refund`, 14, yPos);
    doc.text(`: ${formatRupiahProyek(kas.totalRefund)}`, 60, yPos);
    yPos += 6;

    doc.setFont("helvetica", "bold");
    doc.text(`Sisa Saldo Akhir`, 14, yPos);
    doc.text(`: ${formatRupiahProyek(kas.saldo)}`, 60, yPos);
    yPos += 12;

    // ─── TABEL 1: RINCIAN DONASI ───
    const donasiList = riwayatGabungan.filter(r => r.tipe === 'donasi');
    if (donasiList.length > 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("RINCIAN DONASI", 14, yPos);
      yPos += 4;

      const donasiData = donasiList.map(d => {
        const w = wargaList.find(x => x.id === d.warga_id);
        return [
          formatTanggalProyek(d.tanggal),
          w ? `${w.no_rumah} - ${w.nama_lengkap}` : 'Warga RT 38',
          d.keterangan || '-',
          formatRupiahProyek(d.nominal)
        ];
      });

      // PERBAIKAN: Gunakan autoTable(doc, {...}) bukan doc.autoTable()
      autoTable(doc, {
        startY: yPos,
        head: [['Tanggal', 'Donatur', 'Keterangan', 'Nominal']],
        body: donasiData,
        theme: 'grid',
        headStyles: { fillColor: [147, 51, 234] }, 
        styles: { fontSize: 8 },
      });
      yPos = doc.lastAutoTable.finalY + 12;
    }

    // ─── TABEL 2: RINCIAN PENGELUARAN ───
    const pengeluaranList = riwayatGabungan.filter(r => r.tipe === 'pengeluaran');
    if (pengeluaranList.length > 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("RINCIAN PENGELUARAN", 14, yPos);
      yPos += 4;

      const pengeluaranData = pengeluaranList.map(d => [
        formatTanggalProyek(d.tanggal),
        d.keterangan || '-',
        formatRupiahProyek(d.nominal)
      ]);

      // PERBAIKAN: Gunakan autoTable(doc, {...})
      autoTable(doc, {
        startY: yPos,
        head: [['Tanggal', 'Keterangan', 'Nominal']],
        body: pengeluaranData,
        theme: 'grid',
        headStyles: { fillColor: [225, 29, 72] }, 
        styles: { fontSize: 8 },
      });
      yPos = doc.lastAutoTable.finalY + 12;
    }

    // ─── SIMPAN FILE ───
    const namaFile = `Laporan_Kas_${proyek.nama.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(namaFile);
    
  } catch (error) {
    console.error("Error cetak PDF:", error);
    alert("Gagal mencetak PDF: " + error.message);
  }
}

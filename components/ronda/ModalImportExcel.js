// components/ronda/ModalImportExcel.js
import { useState } from 'react';
import * as XLSX from 'xlsx';

// ═══ FUNGSI SANITASI NOMOR RUMAH ═══
// Mengubah input acak menjadi format baku: "A1 - 01"
const sanitizeNoRumah = (input) => {
  if (!input) return '';
  // 1. Ubah ke huruf besar & hapus semua spasi
  let clean = input.toString().toUpperCase().replace(/\s+/g, '');
  
  // 2. Ekstrak Huruf, Angka Blok, dan Angka Rumah menggunakan Regex
  // Contoh: A101 -> A, 1, 01 | A21-15 -> A, 21, 15
  const match = clean.match(/^([A-Z]+)(\d+)[-_.]?(\d+)$/);
  
  if (match) {
    const letter = match[1]; // A
    const block = match[2];  // 1 atau 21
    const number = match[3]; // 01 atau 15
    
    // Pastikan angka rumah selalu 2 digit (misal 5 jadi 05)
    const formattedNumber = number.padStart(2, '0');
    
    return `${letter}${block} - ${formattedNumber}`;
  }
  
  // Jika format terlalu aneh dan tidak bisa dibaca, kembalikan seperti aslinya
  return input.toString().trim();
};

export default function ModalImportExcel({ isOpen, onClose, onSave, wargaList, isSaving }) {
  const [previewData, setPreviewData] = useState([]);
  const [errors, setErrors] = useState([]);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }); 
      
      processExcelData(data);
    };
    reader.readAsBinaryString(file);
  };

  const processExcelData = (rows) => {
    const newErrors = [];
    const parsed = [];
    
    // Buat "Kamus" Warga berdasarkan nomor rumah yang sudah disanitasi
    const wargaMap = {};
    wargaList.forEach(w => {
      if (w.kk_data && w.no_rumah) {
        const cleanDbFormat = sanitizeNoRumah(w.no_rumah);
        wargaMap[cleanDbFormat] = w.kk_data;
      }
    });

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0]) continue; 

      const tanggal = row[0];
      const petugasInput = row.slice(1).filter(val => val);
      
      let petugasValid = [];
      let petugasPreview = []; // Untuk ditampilkan di layar
      
      for (const inputNoRumah of petugasInput) {
        const cleanInput = sanitizeNoRumah(inputNoRumah);
        const wargaMatch = wargaMap[cleanInput];
        
        if (wargaMatch) {
          petugasValid.push(wargaMatch);
          petugasPreview.push({
            nama: wargaMatch.nama_lengkap.split(' ')[0],
            noRumahAsli: inputNoRumah,
            noRumahBaku: cleanInput
          });
        } else {
          newErrors.push(`Baris ${i + 1}: Nomor rumah "${inputNoRumah}" (dibaca sistem sebagai "${cleanInput}") tidak ditemukan di database.`);
        }
      }

      if (petugasValid.length > 0) {
        parsed.push({
          tanggal: new Date(tanggal).toISOString().split('T')[0],
          grup_id: i,
          petugas: petugasValid,
          petugasPreview: petugasPreview,
          is_libur: false,
          has_conflict: false,
          catatan: 'Hasil Import Excel'
        });
      }
    }

    setErrors(newErrors);
    setPreviewData(parsed);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
          <div>
            <h3 className="text-base font-bold text-white">📥 Import Excel</h3>
            <p className="text-[10px] text-slate-400">Kolom 1 = Tanggal (YYYY-MM-DD). Kolom 2 dst = Nomor Rumah (Bebas ketik, sistem akan merapikan).</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-4">
          <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-600/20 file:text-indigo-400 hover:file:bg-indigo-600/30" />

          {errors.length > 0 && (
            <div className="bg-rose-950/40 border border-rose-500/50 rounded-xl p-3 text-xs text-rose-400">
              <p className="font-bold mb-1">❌ Gagal Membaca Data:</p>
              <ul className="list-disc pl-4 space-y-1">
                {errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}

          {previewData.length > 0 && (
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400">
                  <tr>
                    <th className="p-2 border-b border-slate-800">Tanggal</th>
                    <th className="p-2 border-b border-slate-800">Petugas (Nama & No. Rumah)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {previewData.map((row, idx) => (
                    <tr key={idx}>
                      <td className="p-2 text-white">{row.tanggal}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-2">
                          {row.petugasPreview.map((p, pIdx) => (
                            <span key={pIdx} className="bg-slate-800 px-2 py-1 rounded text-slate-300">
                              {p.nama} (<span className="text-teal-400 font-mono">{p.noRumahBaku}</span>)
                              {p.noRumahAsli !== p.noRumahBaku && (
                                <span className="text-[9px] text-amber-400 ml-1">(Dikoreksi dr: {p.noRumahAsli})</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-3 border-t border-slate-800 mt-4 shrink-0">
          <button type="button" onClick={onClose} className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs">Batal</button>
          <button onClick={() => onSave(previewData)} disabled={isSaving || previewData.length === 0 || errors.length > 0} className="w-2/3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-xs transition disabled:opacity-50">
            {isSaving ? 'Menyimpan...' : 'Simpan ke Draft'}
          </button>
        </div>
      </div>
    </div>
  );
}

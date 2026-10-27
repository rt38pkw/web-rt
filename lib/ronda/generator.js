// lib/ronda/generator.js

export function generateJadwalRonda(penghuniList, periode, historyMap = {}, hariArr = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']) {
  if (!penghuniList || penghuniList.length < 2) {
    throw new Error('Peserta ronda terlalu sedikit (minimal 2 orang).');
  }

  const N = Number(periode.jumlah_per_grup) || 3;
  const totalPeople = penghuniList.length;
  
  // ═══ 1. PEMBAGIAN GRUP ANTI-KEROPOS ═══
  let numGroups = Math.floor(totalPeople / N);
  if (numGroups < 2) numGroups = 2; 

  const baseSize = Math.floor(totalPeople / numGroups);
  const remainder = totalPeople % numGroups;

  const shuffled = [...penghuniList].sort(() => 0.5 - Math.random());
  let grupArr = [];
  let currentIdx = 0;

  for (let i = 0; i < numGroups; i++) {
    // Menyebar sisa orang (remainder) ke grup-grup paling awal
    const ukuran = baseSize + (i < remainder ? 1 : 0);
    grupArr.push({
      id: i + 1,
      anggota: shuffled.slice(currentIdx, currentIdx + ukuran).map(p => ({ ...p }))
    });
    currentIdx += ukuran;
  }

  // ═══ 2. HITUNG TOTAL HARI ═══
  let totalDays = 0;
  if (periode.tipe_periode === 'custom' && periode.tanggal_selesai) {
    const start = new Date(periode.tanggal_mulai);
    const end = new Date(periode.tanggal_selesai);
    totalDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
  } else {
    totalDays = numGroups * 3;
  }

  // ═══ 3. BENTUK DRAFT AWAL ═══
  const startDate = new Date(periode.tanggal_mulai);
  let draft = [];
  
  for (let d = 0; d < totalDays; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    date.setHours(12, 0, 0, 0); // Fix timezone
    
    const grup = grupArr[d % numGroups];
    
    draft.push({
      id: `d-${d}`, 
      tanggal: date.toISOString().split('T')[0], 
      hari: hariArr[date.getDay()], 
      grup_id: grup.id,
      petugas: [...grup.anggota], 
      is_libur: false, 
      has_conflict: false, 
      catatan: ''
    });
  }

  // ═══ 4. STRICT SLOT + SWAP (HISTORY & INTERVAL DINAMIS) ═══
  const normalInterval = numGroups;
  let anyConflict = false;

  // Fungsi Helper Cek Validitas
  const checkValid = (p, dateStr, dayOfWeek) => {
    // 1. Cek Aturan Khusus
    if (p.hari_ronda_khusus) {
      const allowed = p.hari_ronda_khusus.split(',').map(s => s.trim().toLowerCase());
      if (!allowed.includes(dayOfWeek.toLowerCase())) return false;
    }
    // 2. Cek History Cross-Period
    if (historyMap[p.id]) {
      const diffDays = Math.ceil(Math.abs(new Date(dateStr) - new Date(historyMap[p.id])) / (1000 * 60 * 60 * 24));
      if (diffDays < normalInterval) return false;
    }
    return true;
  };

  for (let i = 0; i < draft.length; i++) {
    const day = draft[i];
    
    for (let j = day.petugas.length - 1; j >= 0; j--) {
      const p = day.petugas[j];

      // Jika tidak valid (melanggar aturan khusus atau history jarak)
      if (!checkValid(p, day.tanggal, day.hari)) {
        let swapped = false;
        
        // Cari hari lain untuk swap (hanya ke depan agar aman)
        for (let k = i + 1; k < draft.length; k++) {
          const targetDay = draft[k];
          
          // Cek apakah p valid di targetDay (bisa jadi karena hari berbeda / jarak sudah cukup)
          if (!checkValid(p, targetDay.tanggal, targetDay.hari)) continue;

          for (let l = 0; l < targetDay.petugas.length; l++) {
            const q = targetDay.petugas[l];
            
            // Cek apakah q valid di day (currentDay)
            if (!checkValid(q, day.tanggal, day.hari)) continue;

            // Cek duplikasi
            if (day.petugas.some(x => x.id === q.id) || targetDay.petugas.some(x => x.id === p.id)) continue;

            // Lakukan Swap!
            day.petugas[j] = q;
            targetDay.petugas[l] = p;
            swapped = true;
            break;
          }
          if (swapped) break;
        }

        // Jika tidak ada yang bisa ditukar
        if (!swapped) {
          if (p.hari_ronda_khusus) {
            day.petugas.splice(j, 1); // Drop paksa untuk aturan khusus
            day.catatan = day.catatan 
              ? `${day.catatan}, ${p.nama_lengkap} (jatah dikurangi)` 
              : `${p.nama_lengkap} (jatah dikurangi krn aturan khusus)`;
          } else {
            day.has_conflict = true; // Warga biasa ditandai bentrok agar Sekretaris waspada
            anyConflict = true;
            day.catatan = day.catatan 
              ? `${day.catatan}, ${p.nama_lengkap} (bentrok history)` 
              : `${p.nama_lengkap} (bentrok history)`;
          }
        }
      }
    }
  }

  return { draft, hasConflict: anyConflict };
}

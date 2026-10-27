// lib/ronda/generator.js

export function generateJadwalRonda(penghuniList, periode, hariArr = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']) {
  if (!penghuniList || penghuniList.length < 2) {
    throw new Error('Peserta ronda terlalu sedikit (minimal 2 orang).');
  }

  const N = Number(periode.jumlah_per_grup) || 3;
  const totalPeople = penghuniList.length;
  const numGroups = Math.ceil(totalPeople / N);
  
  // ═══ INI DIA KUNCI PERUBAHANNYA ═══
  // Interval normal = jarak antar jadwal untuk 1 grup.
  // Karena 1 grup dapat 1 hari, dan total grup ada numGroups, 
  // maka grup tersebut akan dapat jadwal setiap numGroups hari.
  const normalInterval = numGroups; 
  
  // 1. Hitung Total Hari
  let totalDays = 0;
  if (periode.tipe_periode === 'custom' && periode.tanggal_selesai) {
    const start = new Date(periode.tanggal_mulai);
    const end = new Date(periode.tanggal_selesai);
    totalDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
  } else {
    totalDays = numGroups * 3; // 3 Putaran Otomatis
  }

  // 2. Acak & Bagi Grup
  const shuffled = [...penghuniList].sort(() => 0.5 - Math.random());
  let grupArr = [];
  let currentIdx = 0;
  for (let i = 0; i < numGroups; i++) {
    let ukuran = N;
    if (i === numGroups - 1) ukuran = totalPeople - currentIdx;
    grupArr.push({ 
      id: i + 1, 
      anggota: shuffled.slice(currentIdx, currentIdx + ukuran).map(p => ({ ...p })) 
    });
    currentIdx += ukuran;
  }

  // 3. Bentuk Draft Awal
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

  // 4. LOGIKA STRICT SLOT + SWAP (INTERVAL DINAMIS)
  let anyConflict = false;
  const lastSpecialSchedule = {}; 

  for (let i = 0; i < draft.length; i++) {
    const day = draft[i];
    const currentDateObj = new Date(day.tanggal);
    
    for (let j = day.petugas.length - 1; j >= 0; j--) {
      const p = day.petugas[j];
      
      if (p.hari_ronda_khusus) {
        const allowed = p.hari_ronda_khusus.split(',').map(s => s.trim().toLowerCase());
        
        if (allowed.includes(day.hari.toLowerCase())) {
          lastSpecialSchedule[p.id] = currentDateObj;
        } else {
          let swapped = false;
          
          for (let k = 0; k < draft.length; k++) {
            if (i === k) continue;
            const targetDay = draft[k];
            const targetDateObj = new Date(targetDay.tanggal);

            if (allowed.includes(targetDay.hari.toLowerCase())) {
              let isIntervalValid = true;
              
              // ═══ CEK INTERVAL DINAMIS ═══
              if (lastSpecialSchedule[p.id]) {
                const diffDays = Math.ceil(Math.abs(targetDateObj - lastSpecialSchedule[p.id]) / (1000 * 60 * 60 * 24));
                // Cek apakah jarak hari ini lebih kecil dari interval normal
                if (diffDays < normalInterval) isIntervalValid = false; 
              }
              
              if (!isIntervalValid) continue;

              for (let l = 0; l < targetDay.petugas.length; l++) {
                const q = targetDay.petugas[l];
                let qAllowedHere = true;
                
                if (q.hari_ronda_khusus) {
                  const qAllowed = q.hari_ronda_khusus.split(',').map(s => s.trim().toLowerCase());
                  if (!qAllowed.includes(day.hari.toLowerCase())) qAllowedHere = false;
                }

                if (qAllowedHere && !day.petugas.some(x => x.id === q.id) && !targetDay.petugas.some(x => x.id === p.id)) {
                  day.petugas[j] = q;
                  targetDay.petugas[l] = p;
                  swapped = true;
                  lastSpecialSchedule[p.id] = targetDateObj;
                  break;
                }
              }
            }
            if (swapped) break;
          }

          // Jika tidak dapat tempat yang intervalnya aman, potong jatah (drop)
          if (!swapped) {
            day.petugas.splice(j, 1);
            day.catatan = day.catatan 
              ? `${day.catatan}, ${p.nama_lengkap} (jatah dikurangi)` 
              : `${p.nama_lengkap} (jatah dikurangi krn aturan khusus)`;
          }
        }
      }
    }
  }

  return { draft, hasConflict: anyConflict };
}

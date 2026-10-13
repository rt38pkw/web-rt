# Aplikasi Web RT (Sistem Informasi RT)

Aplikasi web-based untuk pengelolaan administrasi RT, iuran warga via QRIS, papan pengumuman, dan pengajuan surat pengantar.

## Fitur Utama
1. **Papan Pengumuman & Beranda** (`pages/index.js`)
2. **Pendataan Warga** (`pages/warga.js`)
3. **Iuran QRIS & Upload Resi** (`pages/iuran.js`)
4. **Dashboard Bendahara / Approve** (`pages/admin-iuran.js`)
5. **Pengajuan Surat Online** (`pages/surat.js`)

## Cara Menjalankan Secara Lokal
1. Ekstrak file zip ini.
2. Buka terminal di folder proyek dan jalankan:
   ```bash
   npm install
   ```
3. Buka file `.env.local` dan isi `NEXT_PUBLIC_SUPABASE_URL` serta `NEXT_PUBLIC_SUPABASE_ANON_KEY` sesuai project Supabase Anda.
4. Jalankan aplikasi:
   ```bash
   npm run dev
   ```
5. Buka `http://localhost:3000` di browser.

## Cara Deploy Ke Vercel (Gratis)
1. Upload folder ini ke akun GitHub Anda.
2. Hubungkan repositori GitHub Anda ke [Vercel](https://vercel.com).
3. Tambahkan Environment Variable `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` di pengaturan Vercel.
4. Deploy!

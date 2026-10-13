import { useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Home() {
  const [noRumah, setNoRumah] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // Cek ke tabel warga berdasarkan nomor rumah dan password
      const { data, error } = await supabase
        .from('warga')
        .select('*')
        .eq('no_rumah', noRumah.trim())
        .eq('password', password)
        .single();

      if (error || !data) {
        setErrorMsg('Nomor Rumah atau Password salah! Periksa kembali.');
        setLoading(false);
        return;
      }

      // Simpan sesi warga ke localStorage agar bisa dibaca di dashboard warga
      localStorage.setItem('warga_session', JSON.stringify(data));
      
      // Arahkan ke dashboard warga
      router.push('/dashboard-warga');
    } catch (err) {
      setErrorMsg('Terjadi kesalahan koneksi. Silakan coba lagi.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <Head>
        <title>Portal Warga - RT 38 Puri Kencana Wagir</title>
      </Head>

      {/* Header / Navigasi Atas */}
      <header className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <img src="/logo.png" alt="Logo RT 38" className="w-10 h-10 object-contain rounded-full border border-slate-700 p-0.5" />
          <div>
            <h1 className="font-bold text-sm tracking-wide">RT 38 PURI KENCANA</h1>
            <p className="text-xs text-slate-400">Wagir • Rukun • Peduli • Bersama</p>
          </div>
        </div>
        <button 
          onClick={() => router.push('/admin')}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition"
        >
          🔐 Login Pengurus
        </button>
      </header>

      {/* Konten Utama (Greeting & Login Warga) */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl mb-4 text-blue-400 text-2xl shadow-inner">
            👋
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight mb-2">Selamat Datang, Warga RT 38</h2>
          <p className="text-sm text-slate-400">
            Portal digital layanan mandiri warga. Masukkan Nomor Rumah dan Password Anda untuk mengakses informasi iuran dan pengajuan surat.
          </p>
        </div>

        {/* Card Form Login */}
        <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl text-center">
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Nomor Rumah
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: A1 - 06"
                value={noRumah}
                onChange={(e) => setNoRumah(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Gunakan format sesuai data bendahara (Misal: A1 - 06)</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password / PIN
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-white text-xs"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Default awal: <code className="text-slate-300">123456</code></span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl text-sm transition shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {loading ? 'Sedang Masuk...' : 'Masuk ke Dashboard Warga'}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-slate-500 border-t border-slate-900">
        RT 38 Puri Kencana Wagir &copy; 2026 • Sistem Administrasi Lingkungan
      </footer>
    </div>
  );
}

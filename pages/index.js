import { useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';
import InstallButton from '../components/InstallButton'; // TAMBAHAN IMPORT

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

      localStorage.setItem('warga_session', JSON.stringify(data));
      router.push('/dashboard-warga');
    } catch (err) {
      setErrorMsg('Terjadi kesalahan koneksi. Silakan coba lagi.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      <Head>
        <title>Portal Warga - RT 38 Puri Kencana Wagir</title>
      </Head>

      {/* Header / Navigasi Atas */}
     <header className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
            <img src="/logo-rt38.png" alt="Logo RT 38" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-bold text-xs sm:text-sm tracking-wide text-white leading-tight">RT 38 PURI KENCANA WAGIR</h1>
            <p className="text-[10px] sm:text-xs text-slate-400">Rukun • Peduli • Bersama</p>
          </div>
        </div>
        
        {/* TOMBOL INSTALL DITARUH DI HEADER KANAN */}
        <div>
          <InstallButton />
        </div>
      </header>

      {/* Konten Utama (Greeting & Card Login Warga) */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 my-6">
        
        {/* Teks Greeting / Sambutan */}
        <div className="text-center max-w-lg mb-6 px-4">
          <span className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold rounded-full mb-2">
            ✨ Layanan Mandiri Warga RT 38
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Selamat Datang di Portal Warga 👋
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Silakan masuk menggunakan Nomor Rumah dan Password untuk mengecek status iuran bulanan serta mengajukan layanan surat pengantar secara online.
          </p>
        </div>

        {/* Card Form Login */}
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800/80 rounded-3xl p-8 shadow-2xl shadow-blue-950/30 backdrop-blur-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center overflow-hidden shadow-inner p-1">
              <img 
                src="/logo-rt38.png" 
                alt="Logo RT" 
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-white">Masuk Akun Warga</h3>
            <p className="text-xs text-slate-400 mt-0.5">RT 38 Puri Kencana Wagir</p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl text-center font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                Nomor Rumah
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: A1 - 06"
                value={noRumah}
                onChange={(e) => setNoRumah(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition shadow-inner"
              />
              <span className="text-[10px] text-slate-500 mt-1.5 block">Sesuai data bendahara (Misal: <code className="text-slate-400">A1 - 06</code>)</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                Password / PIN
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition pr-10 shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white text-sm transition"
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '🐵'}
                </button>
              </div>
              <span className="text-[10px] text-slate-500 mt-1.5 block">Default awal: <code className="text-slate-300 font-mono">123456</code></span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-xl text-sm transition shadow-lg shadow-blue-600/25 disabled:opacity-50 active:scale-[0.99]"
            >
              {loading ? 'Memproses Masuk...' : 'Masuk Dashboard Warga'}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-slate-500 border-t border-slate-900 bg-slate-950/60">
        RT 38 Puri Kencana Wagir &copy; 2026 • Sistem Administrasi Lingkungan
      </footer>
    </div>
  );
}

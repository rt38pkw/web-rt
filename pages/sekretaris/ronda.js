import { useState, useEffect } from 'react';
import Layout from '../../components/sekretaris/Layout';

export default function SekretarisRonda() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const saved = sessionStorage.getItem('pengurusSession');
    if (saved) setUser(JSON.parse(saved));
    else window.location.replace('/admin');
  }, []);

  if (!user) return null;

  return (
    <Layout user={user}>
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="text-5xl mb-4">🛡️</div>
        <h2 className="text-xl font-bold text-white mb-2">Jadwal Ronda Warga</h2>
        <p className="text-sm text-slate-400 max-w-md">Fitur pengelolaan jadwal ronda keamanan lingkungan sedang dalam tahap pengembangan.</p>
      </div>
    </Layout>
  );
}

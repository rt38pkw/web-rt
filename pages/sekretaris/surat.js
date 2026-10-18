import { useState, useEffect } from 'react';
import Layout from '../../components/sekretaris/Layout';

export default function SekretarisSurat() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // UBAH KE LOCALSTORAGE
    const saved = localStorage.getItem('pengurusSession');
    if (saved) setUser(JSON.parse(saved));
    else window.location.replace('/admin');
  }, []);

  if (!user) return null;

  return (
    <Layout user={user}>
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="text-5xl mb-4">📄</div>
        <h2 className="text-xl font-bold text-white mb-2">Manajemen Surat Menyurat</h2>
        <p className="text-sm text-slate-400 max-w-md">Fitur pengajuan dan pencetakan surat pengantar RT sedang dalam tahap pengembangan.</p>
      </div>
    </Layout>
  );
}

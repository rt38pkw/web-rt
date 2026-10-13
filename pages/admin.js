import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ warga: 0, pendingIuran: 0, pengumuman: 0 });

  useEffect(() => {
    const savedUser = sessionStorage.getItem('pengurusSession');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      fetchStats();
    }
  }, []);
const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase
      .from('pengurus')
      .select('*')
      .eq('username', usernameInput.trim())
      .eq('password', passwordInput.trim())
      .maybeSingle(); // Gunakan maybeSingle agar tidak melempar error jika data tidak ditemukan

    setLoading(false);

    console.log("Data hasil query:", data);
    console.log("Error Supabase:", error);

    if (error || !data) {
      alert(`Login gagal! Error: ${error ? error.message : 'Username/Password tidak ditemukan di database'}`);
    } else {
      setUser(data);
      sessionStorage.setItem('pengurusSession', JSON.stringify(data));
      fetchStats();
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('pengurusSession');
    setUser(null);
  };

  async function fetchStats() {
    try {
      const { count: wargaCount } = await supabase.from('warga').select('*', { count: 'exact', head: true });
      const { count: pendingCount } = await supabase.from('iuran').select('*', { count: 'exact', head: true }).eq('status', 'Pending');
      const { count: pengumumanCount } = await supabase.from('pengumuman').select('*', { count: 'exact', head: true });

      setStats({
        warga: wargaCount || 0,
        pendingIuran: pendingCount || 0,
        pengumuman: pengumumanCount || 0,
      });
    } catch (err) {
      console.error(err);
    }
  }

  // Tampilan Form Login Pengurus
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">Login Pengurus RT</h2>
          <p className="text-sm text-gray-500 text-center mb-6">Masukan akun sesuai jabatan/hak akses Anda</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                className="w-full border rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Contoh: bendahara_rt"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                className="w-full border rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Masukkan password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              {loading ? 'Memeriksa...' : 'Masuk Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Pengecekan Privilege Berdasarkan Role
  const canAccessIuran = user.role === 'ketua' || user.role === 'bendahara';
  const canAccessSurat = user.role === 'ketua' || user.role === 'sekretaris';
  const canAccessWarga = user.role === 'ketua' || user.role === 'sekretaris';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header Admin */}
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Dashboard Back End Admin RT</h1>
            <p className="text-sm text-gray-500">
              Selamat datang, <span className="font-semibold text-blue-600">{user.nama}</span> ({user.role.toUpperCase()})
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition"
          >
            Keluar / Logout
          </button>
        </div>

        {/* Ringkasan Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
            <p className="text-sm text-gray-500">Total Warga Terdaftar</p>
            <h3 className="text-3xl font-bold text-gray-800 mt-1">{stats.warga} Orang</h3>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-yellow-500">
            <p className="text-sm text-gray-500">Menunggu Verifikasi Iuran</p>
            <h3 className="text-3xl font-bold text-yellow-600 mt-1">{stats.pendingIuran} Transaksi</h3>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
            <p className="text-sm text-gray-500">Total Pengumuman</p>
            <h3 className="text-3xl font-bold text-gray-800 mt-1">{stats.pengumuman} Info</h3>
          </div>
        </div>

        {/* Menu Navigasi Sesuai Role Privilege */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {canAccessIuran ? (
            <Link href="/admin-iuran" className="block bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition border border-gray-100">
              <div className="text-3xl mb-3">💳</div>
              <h4 className="font-bold text-lg text-gray-800">Verifikasi Iuran</h4>
              <p className="text-sm text-gray-500 mt-1">Cek bukti transfer QRIS & approve iuran warga.</p>
            </Link>
          ) : (
            <div className="bg-gray-100 p-6 rounded-xl opacity-60 cursor-not-allowed border border-gray-200">
              <div className="text-3xl mb-3">🔒</div>
              <h4 className="font-bold text-lg text-gray-600">Verifikasi Iuran</h4>
              <p className="text-xs text-red-500 mt-1">Akses khusus Ketua & Bendahara.</p>
            </div>
          )}

          {canAccessWarga ? (
            <Link href="/warga" className="block bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition border border-gray-100">
              <div className="text-3xl mb-3">👥</div>
              <h4 className="font-bold text-lg text-gray-800">Data Warga</h4>
              <p className="text-sm text-gray-500 mt-1">Lihat dan tambah data kependudukan warga RT.</p>
            </Link>
          ) : (
            <div className="bg-gray-100 p-6 rounded-xl opacity-60 cursor-not-allowed border border-gray-200">
              <div className="text-3xl mb-3">🔒</div>
              <h4 className="font-bold text-lg text-gray-600">Data Warga</h4>
              <p className="text-xs text-red-500 mt-1">Akses khusus Ketua & Sekretaris.</p>
            </div>
          )}

          {canAccessSurat ? (
            <Link href="/surat" className="block bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition border border-gray-100">
              <div className="text-3xl mb-3">📄</div>
              <h4 className="font-bold text-lg text-gray-800">Pengajuan Surat</h4>
              <p className="text-sm text-gray-500 mt-1">Kelola dan cetak permohonan surat pengantar.</p>
            </Link>
          ) : (
            <div className="bg-gray-100 p-6 rounded-xl opacity-60 cursor-not-allowed border border-gray-200">
              <div className="text-3xl mb-3">🔒</div>
              <h4 className="font-bold text-lg text-gray-600">Pengajuan Surat</h4>
              <p className="text-xs text-red-500 mt-1">Akses khusus Ketua & Sekretaris.</p>
            </div>
          )}

          <Link href="/" className="block bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition border border-gray-100">
            <div className="text-3xl mb-3">🌐</div>
            <h4 className="font-bold text-lg text-gray-800">Lihat Web Utama</h4>
            <p className="text-sm text-gray-500 mt-1">Kembali ke tampilan beranda publik warga.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ... (import sama seperti sebelumnya)

export default function DashboardWargaProjek() {
  // ... state ...

  // ═══ TAMBAHKAN INI UNTUK CEK DATA ═══
  const validProyekList = Array.isArray(proyekList) ? proyekList.filter(p => p && p.id) : [];

  // ... fungsi lainnya ...

  return (
    <>
      <Head>...</Head>
      <Layout warga={warga} onLogout={handleLogout}>
        {/* ... */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Memuat data proyek...</div>
        ) : (
          <>
            {validProyekList.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center">
                <div className="text-4xl mb-2">🏗️</div>
                <p className="text-sm text-slate-400">Belum ada proyek aktif saat ini.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {validProyekList.map((proyek) => {
                  // Pastikan proyek punya nominal valid
                  if (!proyek.nominal_per_warga) return null;

                  // ... hitung terbayar, pending, sisa ...
                  // ... return <ProjectsCard key={proyek.id} ... />
                })}
              </div>
            )}
            {/* ... riwayat ... */}
          </>
        )}
      </Layout>

      {showModalBayar && proyekDipilih && proyekDipilih.id && (
        <ModalBayarProjek ... />
      )}

      {showRekap && rekapProyek && rekapProyek.id && (
        <ModalRekapProjek ... />
      )}
    </>
  );
}

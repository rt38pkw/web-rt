import Layout from '../../components/sekretaris/Layout';

export default function SekretarisSurat() {
  return (
    <Layout>
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="text-5xl mb-4">📄</div>
        <h2 className="text-xl font-bold text-white mb-2">Manajemen Surat Menyurat</h2>
        <p className="text-sm text-slate-400 max-w-md">Fitur pengajuan dan pencetakan surat pengantar RT sedang dalam tahap pengembangan.</p>
      </div>
    </Layout>
  );
}

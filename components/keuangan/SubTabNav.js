export default function SubTabNav({ activeTab, setActiveTab, pendingCount = 0 }) {
  const TABS = [
    { key: 'ringkasan', label: '📊 Ringkasan' },
    { key: 'verifikasi', label: '⏳ Verifikasi', badge: pendingCount },
    { key: 'tunai', label: '💵 Tunai' },
    { key: 'tunggakan', label: '⚠️ Tunggakan' },
    { key: 'kelola', label: '➕ Kelola Proyek' },
  ];

  return (
    <div className="grid grid-cols-3 sm:flex sm:gap-2 gap-1.5 sm:overflow-x-auto sm:pb-1 sm:scrollbar-none">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => setActiveTab(t.key)}
          className={`relative px-3 py-2 rounded-xl text-[11px] sm:text-xs font-semibold border transition shrink-0 ${
            activeTab === t.key
              ? 'bg-amber-600 text-white border-amber-500'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          {t.label}
          {t.badge > 0 && (
            <span className="ml-1 inline-block bg-orange-500 text-white text-[9px] px-1.5 rounded-full">
              {t.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

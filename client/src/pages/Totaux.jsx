import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTotals } from '../services/api';
import { toast } from 'react-toastify';
import {
  FiAlertTriangle, FiAlertCircle, FiFileText, FiBook,
  FiMessageSquare, FiSearch, FiClipboard, FiFilter,
  FiChevronDown, FiChevronUp, FiBarChart2
} from 'react-icons/fi';

const MONTHS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const ALL_CATEGORIES = [
  { key: 'anomalies', label: 'Anomalies', icon: FiSearch, barCls: 'bg-pink-500', bgCls: 'bg-pink-50', textCls: 'text-pink-700', ringCls: 'ring-pink-300', headerBg: 'bg-pink-100' },
  { key: 'interpellations', label: 'Interpellations', icon: FiAlertTriangle, barCls: 'bg-amber-500', bgCls: 'bg-amber-50', textCls: 'text-amber-700', ringCls: 'ring-amber-300', headerBg: 'bg-amber-100' },
  { key: 'accidents', label: 'Accidents', icon: FiAlertCircle, barCls: 'bg-red-500', bgCls: 'bg-red-50', textCls: 'text-red-700', ringCls: 'ring-red-300', headerBg: 'bg-red-100' },
  { key: 'autres_incidents', label: 'Autres Incidents', icon: FiFileText, barCls: 'bg-orange-500', bgCls: 'bg-orange-50', textCls: 'text-orange-700', ringCls: 'ring-orange-300', headerBg: 'bg-orange-100' },
  { key: 'formations', label: 'Formations', icon: FiBook, barCls: 'bg-green-500', bgCls: 'bg-green-50', textCls: 'text-green-700', ringCls: 'ring-green-300', headerBg: 'bg-green-100' },
  { key: 'reclamations', label: 'Réclamations', icon: FiMessageSquare, barCls: 'bg-purple-500', bgCls: 'bg-purple-50', textCls: 'text-purple-700', ringCls: 'ring-purple-300', headerBg: 'bg-purple-100' },
  { key: 'controle_rm', label: 'Contrôle RM', icon: FiClipboard, barCls: 'bg-teal-500', bgCls: 'bg-teal-50', textCls: 'text-teal-700', ringCls: 'ring-teal-300', headerBg: 'bg-teal-100' },
];

const Totaux = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [activeTab, setActiveTab] = useState('anomalies');
  const [expandedSm, setExpandedSm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterYear) params.year = filterYear;
      if (filterMonth) params.month = filterMonth;
      const res = await getTotals(params);
      setData(res.data);
    } catch (err) {
      toast.error('Erreur lors du chargement des totaux');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [filterYear, filterMonth]);

  const categories = useMemo(() => {
    if (!data) return ALL_CATEGORIES;
    return data.isCity ? ALL_CATEGORIES.filter(c => c.key === 'anomalies') : ALL_CATEGORIES;
  }, [data]);

  useEffect(() => {
    if (data?.isCity) setActiveTab('anomalies');
  }, [data]);

  const activeCatConfig = categories.find(c => c.key === activeTab) || categories[0];

  const supermarketRows = useMemo(() => {
    if (!data || !data.categories[activeTab]) return [];
    const catData = data.categories[activeTab];
    const q = searchQuery.toLowerCase();

    return data.supermarkets
      .map(sm => {
        const smData = catData.perSupermarket[sm.id] || { total: 0, details: {} };
        return {
          id: sm.id,
          name: sm.name,
          region: sm.region,
          total: smData.total,
          details: Object.entries(smData.details)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count })),
        };
      })
      .filter(r => !q || r.name.toLowerCase().includes(q))
      .sort((a, b) => b.total - a.total);
  }, [data, activeTab, searchQuery]);

  const grandTotal = useMemo(() => {
    if (!data || !data.categories[activeTab]) return 0;
    return data.categories[activeTab].total;
  }, [data, activeTab]);

  const subCatTotals = useMemo(() => {
    if (!data || !data.categories[activeTab]) return [];
    const t = data.categories[activeTab].subCategoryTotals || {};
    return Object.entries(t).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [data, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-orange-100 rounded-xl">
            <FiBarChart2 className="text-orange-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Totaux</h1>
            <p className="text-sm text-gray-500">
              {user?.region ? `${user.region} — ` : ''}Vue d'ensemble des données
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-600">
            <FiFilter size={14} />
            <span>Filtres</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none"
            >
              <option value="">Toutes les années</option>
              {(data?.years || []).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none"
            >
              <option value="">Tous les mois</option>
              {MONTHS.slice(1).map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Rechercher un magasin..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none flex-1 min-w-[200px]"
            />
          </div>
        </div>

        {/* Category KPI cards */}
        <div className={`grid gap-3 mb-6 ${categories.length === 1 ? 'grid-cols-1 max-w-xs' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7'}`}>
          {categories.map(cat => {
            const total = data?.categories?.[cat.key]?.total || 0;
            const isActive = activeTab === cat.key;
            const Icon = cat.icon;
            return (
              <button
                key={cat.key}
                onClick={() => { setActiveTab(cat.key); setExpandedSm(null); }}
                className={`rounded-xl p-3 text-left transition-all border-2 ${
                  isActive
                    ? `${cat.bgCls} border-current ${cat.textCls} shadow-md ring-2 ${cat.ringCls}`
                    : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} className={isActive ? cat.textCls : 'text-gray-400'} />
                  <span className={`text-xs font-medium truncate ${isActive ? cat.textCls : 'text-gray-500'}`}>
                    {cat.label}
                  </span>
                </div>
                <p className={`text-xl font-bold ${isActive ? cat.textCls : 'text-gray-800'}`}>{total}</p>
              </button>
            );
          })}
        </div>

        {/* Subcategory overview */}
        {subCatTotals.length > 0 && (
          <div className={`${activeCatConfig.bgCls} rounded-xl p-4 mb-6 border`}>
            <h3 className={`text-sm font-semibold ${activeCatConfig.textCls} mb-3`}>
              Répartition {activeCatConfig.label} — Total: {grandTotal}
            </h3>
            <div className="flex flex-wrap gap-2">
              {subCatTotals.map(sc => (
                <span
                  key={sc.name}
                  className="bg-white rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 border shadow-sm"
                >
                  {sc.name}: <span className={`font-bold ${activeCatConfig.textCls}`}>{sc.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Supermarket table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className={`${activeCatConfig.headerBg} px-6 py-3 border-b`}>
            <h3 className={`font-semibold ${activeCatConfig.textCls} flex items-center gap-2`}>
              {(() => { const Icon = activeCatConfig.icon; return <Icon size={16} />; })()}
              {activeCatConfig.label} par magasin
              <span className="text-xs font-normal ml-1">({supermarketRows.length} magasins)</span>
            </h3>
          </div>

          {supermarketRows.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">Aucune donnée</p>
              <p className="text-sm mt-1">Aucun enregistrement trouvé pour cette période</p>
            </div>
          ) : (
            <div className="divide-y">
              {supermarketRows.map((sm) => {
                const isExpanded = expandedSm === sm.id;
                const maxCount = supermarketRows[0]?.total || 1;
                const pct = maxCount > 0 ? (sm.total / maxCount) * 100 : 0;

                return (
                  <div key={sm.id}>
                    <button
                      onClick={() => setExpandedSm(isExpanded ? null : sm.id)}
                      className="w-full px-6 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">{sm.name}</p>
                        <p className="text-xs text-gray-400">{sm.region}</p>
                      </div>
                      <div className="w-32 sm:w-48 hidden sm:block">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${activeCatConfig.barCls} transition-all`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <span className={`text-lg font-bold ${activeCatConfig.textCls} w-12 text-right`}>
                        {sm.total}
                      </span>
                      {sm.details.length > 0 ? (
                        isExpanded
                          ? <FiChevronUp size={16} className="text-gray-400" />
                          : <FiChevronDown size={16} className="text-gray-400" />
                      ) : <span className="w-4" />}
                    </button>

                    {isExpanded && sm.details.length > 0 && (
                      <div className={`${activeCatConfig.bgCls} px-6 py-3 border-t`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {sm.details.map(d => {
                            const detPct = sm.total > 0 ? (d.count / sm.total) * 100 : 0;
                            return (
                              <div key={d.name} className="bg-white rounded-lg px-3 py-2 border text-sm flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-gray-700 truncate text-xs">{d.name}</p>
                                  <div className="h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${activeCatConfig.barCls}`}
                                      style={{ width: `${detPct}%` }}
                                    />
                                  </div>
                                </div>
                                <span className={`font-bold text-sm ${activeCatConfig.textCls}`}>{d.count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Grand total footer */}
        <div className="mt-4 text-center text-sm text-gray-400">
          Total {activeCatConfig.label}: <span className="font-bold text-gray-600">{grandTotal}</span>
          {' '}— {supermarketRows.filter(s => s.total > 0).length} magasins concernés
        </div>
      </div>
    </div>
  );
};

export default Totaux;

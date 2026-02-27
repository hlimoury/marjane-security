import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getDashboardSubCategoryDetail } from '../services/api';
import { toast } from 'react-toastify';
import {
  FiArrowLeft, FiFilter, FiEye, FiSearch, FiMapPin,
  FiAlertTriangle, FiAlertCircle, FiFileText, FiBook, FiMessageSquare,
  FiChevronDown, FiChevronUp
} from 'react-icons/fi';

const MONTHS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const REGIONS = ['REGION CENTRE 1', 'REGION CENTRE 02', 'REGION SUD', 'REGION ORIENT', 'REGION NORD'];

const REGION_COLORS = {
  'REGION CENTRE 1': 'bg-blue-100 text-blue-700',
  'REGION CENTRE 02': 'bg-indigo-100 text-indigo-700',
  'REGION SUD': 'bg-orange-100 text-orange-700',
  'REGION ORIENT': 'bg-purple-100 text-purple-700',
  'REGION NORD': 'bg-teal-100 text-teal-700',
};

const CATEGORY_CONFIG = {
  anomalies: {
    label: 'Anomalies',
    icon: FiSearch,
    bgCls: 'bg-pink-100',
    textCls: 'text-pink-700',
    barCls: 'bg-pink-500',
  },
  interpellations: {
    label: 'Interpellations',
    icon: FiAlertTriangle,
    bgCls: 'bg-amber-100',
    textCls: 'text-amber-700',
    barCls: 'bg-amber-500',
  },
  accidents: {
    label: 'Accidents',
    icon: FiAlertCircle,
    bgCls: 'bg-red-100',
    textCls: 'text-red-700',
    barCls: 'bg-red-500',
  },
  autres_incidents: {
    label: 'Autres Incidents',
    icon: FiFileText,
    bgCls: 'bg-orange-100',
    textCls: 'text-orange-700',
    barCls: 'bg-orange-500',
  },
  formations: {
    label: 'Formations',
    icon: FiBook,
    bgCls: 'bg-green-100',
    textCls: 'text-green-700',
    barCls: 'bg-green-500',
  },
  reclamations: {
    label: 'Réclamations',
    icon: FiMessageSquare,
    bgCls: 'bg-purple-100',
    textCls: 'text-purple-700',
    barCls: 'bg-purple-500',
  },
};

const DashboardSubCategoryDetail = () => {
  const navigate = useNavigate();
  const { category, subcategory } = useParams();
  const [searchParams] = useSearchParams();
  const decodedSubcategory = decodeURIComponent(subcategory);
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.anomalies;
  const Icon = config.icon;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [filterRegion, setFilterRegion] = useState(searchParams.get('region') || '');
  const [filterYear, setFilterYear] = useState(searchParams.get('year') || '');
  const [filterMonth, setFilterMonth] = useState(searchParams.get('month') || '');

  const [sortKey, setSortKey] = useState('count');
  const [sortDir, setSortDir] = useState('desc');

  const [showEntries, setShowEntries] = useState(false);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear - 2];
  }, []);

  useEffect(() => {
    loadData();
  }, [category, subcategory, filterRegion, filterYear, filterMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getDashboardSubCategoryDetail(category, decodedSubcategory, {
        region: filterRegion,
        year: filterYear,
        month: filterMonth,
      });
      setData(res.data);
    } catch (err) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const filteredSupermarkets = useMemo(() => {
    if (!data?.supermarkets) return [];
    let list = [...data.supermarkets];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.region.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      let va = a[sortKey];
      let vb = b[sortKey];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [data, search, sortKey, sortDir]);

  const maxCount = useMemo(() => {
    if (!filteredSupermarkets.length) return 1;
    return Math.max(...filteredSupermarkets.map(s => s.count), 1);
  }, [filteredSupermarkets]);

  const hasFilters = filterRegion || filterYear || filterMonth || search;

  const resetFilters = () => {
    setFilterRegion('');
    setFilterYear('');
    setFilterMonth('');
    setSearch('');
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const goBack = () => {
    const params = new URLSearchParams();
    if (filterRegion) params.set('region', filterRegion);
    if (filterYear) params.set('year', filterYear);
    if (filterMonth) params.set('month', filterMonth);
    const qs = params.toString();
    navigate(`/dashboard/${category}${qs ? '?' + qs : ''}`);
  };

  const SortHeader = ({ label, col, className = '' }) => (
    <th
      className={`py-3 px-4 font-semibold text-gray-600 cursor-pointer hover:text-blue-600 select-none ${className}`}
      onClick={() => handleSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === col && (sortDir === 'asc' ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />)}
      </span>
    </th>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Back button */}
      <button
        onClick={goBack}
        className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 text-sm mb-4 transition-colors"
      >
        <FiArrowLeft size={16} />
        <span>Retour aux sous-catégories</span>
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <span>{config.label}</span>
          <span>→</span>
          <span className={`font-medium ${config.textCls}`}>{decodedSubcategory}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">{decodedSubcategory}</h1>
        <div className="flex items-center gap-4 mt-3">
          <div className={`${config.bgCls} ${config.textCls} px-4 py-2 rounded-lg`}>
            <span className="text-2xl font-bold">{data?.totalEntries || 0}</span>
            <span className="text-sm ml-2">entrées</span>
          </div>
          <div className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg">
            <span className="text-2xl font-bold">{filteredSupermarkets.length}</span>
            <span className="text-sm ml-2">supermarchés</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <FiFilter size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-600">Filtres</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un supermarché..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Toutes les régions</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Toutes les années</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Tous les mois</option>
            {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* Supermarkets Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            Supermarchés concernés ({filteredSupermarkets.length})
          </h2>
        </div>

        {filteredSupermarkets.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            Aucun supermarché trouvé
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <SortHeader label="Supermarché" col="name" className="text-left" />
                  <SortHeader label="Région" col="region" className="text-left" />
                  <SortHeader label="Nb d'entrées" col="count" className="text-center" />
                  <th className="py-3 px-4 font-semibold text-gray-600 text-left">Périodes</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 text-center">Proportion</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSupermarkets.map((sm, idx) => {
                  const pct = (sm.count / maxCount) * 100;
                  return (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-800">{sm.name}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${REGION_COLORS[sm.region] || 'bg-gray-100 text-gray-700'}`}>
                          {sm.region}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold ${config.textCls}`}>{sm.count}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {sm.instances.slice(0, 4).map((inst, i) => (
                            <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              {inst}
                            </span>
                          ))}
                          {sm.instances.length > 4 && (
                            <span className="text-xs text-gray-400">+{sm.instances.length - 4}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2 min-w-[60px]">
                            <div
                              className={`h-2 rounded-full ${config.barCls} transition-all`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-10 text-right">{Math.round(pct)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => navigate(`/supermarket/${sm.id}`)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Voir le supermarché"
                        >
                          <FiEye size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toggle to show all entries */}
      {data?.entries && data.entries.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setShowEntries(!showEntries)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-lg font-semibold text-gray-800">
              Toutes les entrées ({data.entries.length})
            </h2>
            {showEntries ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
          </button>

          {showEntries && (
            <div className="border-t border-gray-100 divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {data.entries.map((entry, idx) => (
                <div key={idx} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-800">{entry.supermarket_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${REGION_COLORS[entry.region] || 'bg-gray-100 text-gray-700'}`}>
                          {entry.region}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {MONTHS[entry.month]} {entry.year}
                        {entry.date && ` — ${entry.date}`}
                      </p>
                      {category === 'anomalies' && entry.criticite && (
                        <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          entry.criticite === 'Critique' ? 'bg-red-100 text-red-700' :
                          entry.criticite === 'Majeur' ? 'bg-orange-100 text-orange-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {entry.criticite}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => navigate(`/instance/${entry.instance_id}/${category}`)}
                      className="text-blue-600 hover:text-blue-800 shrink-0"
                      title="Voir l'instance"
                    >
                      <FiEye size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardSubCategoryDetail;

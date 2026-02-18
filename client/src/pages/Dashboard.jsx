import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats } from '../services/api';
import { toast } from 'react-toastify';
import {
  FiShoppingCart, FiCalendar, FiAlertTriangle, FiAlertCircle,
  FiFileText, FiBook, FiMessageSquare, FiSearch,
  FiMapPin, FiTrendingUp, FiFilter, FiChevronDown,
  FiChevronUp, FiEye
} from 'react-icons/fi';

const MONTHS = ['', 'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];
const REGIONS = ['REGION CENTRE 1', 'REGION CENTRE 02', 'REGION SUD', 'REGION ORIENT', 'REGION NORD'];

const REGION_COLORS = {
  'REGION CENTRE 1': { bg: 'bg-blue-100', text: 'text-blue-700', bar: 'bg-blue-500', ring: 'ring-blue-500' },
  'REGION CENTRE 02': { bg: 'bg-indigo-100', text: 'text-indigo-700', bar: 'bg-indigo-500', ring: 'ring-indigo-500' },
  'REGION SUD': { bg: 'bg-orange-100', text: 'text-orange-700', bar: 'bg-orange-500', ring: 'ring-orange-500' },
  'REGION ORIENT': { bg: 'bg-purple-100', text: 'text-purple-700', bar: 'bg-purple-500', ring: 'ring-purple-500' },
  'REGION NORD': { bg: 'bg-teal-100', text: 'text-teal-700', bar: 'bg-teal-500', ring: 'ring-teal-500' },
};

const CATEGORIES = [
  { key: 'interpellations', label: 'Interpellations', icon: FiAlertTriangle, color: 'amber', barCls: 'bg-amber-500', bgCls: 'bg-amber-100', textCls: 'text-amber-700' },
  { key: 'accidents', label: 'Accidents', icon: FiAlertCircle, color: 'red', barCls: 'bg-red-500', bgCls: 'bg-red-100', textCls: 'text-red-700' },
  { key: 'autres_incidents', label: 'Autres Incidents', icon: FiFileText, color: 'orange', barCls: 'bg-orange-500', bgCls: 'bg-orange-100', textCls: 'text-orange-700' },
  { key: 'formations', label: 'Formations', icon: FiBook, color: 'green', barCls: 'bg-green-500', bgCls: 'bg-green-100', textCls: 'text-green-700' },
  { key: 'reclamations', label: 'Reclamations', icon: FiMessageSquare, color: 'purple', barCls: 'bg-purple-500', bgCls: 'bg-purple-100', textCls: 'text-purple-700' },
  { key: 'anomalies', label: 'Anomalies', icon: FiSearch, color: 'pink', barCls: 'bg-pink-500', bgCls: 'bg-pink-100', textCls: 'text-pink-700' },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [filterRegion, setFilterRegion] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [expandedSection, setExpandedSection] = useState({
    region: true, category: true, monthly: true, supermarkets: true, rayons: true
  });

  const [supermarketSort, setSupermarketSort] = useState({ key: 'name', dir: 'asc' });
  const [smPage, setSmPage] = useState(1);
  const SM_PER_PAGE = 15;

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const res = await getDashboardStats();
      setRawData(res.data);
    } catch (err) {
      toast.error('Erreur lors du chargement du dashboard');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (key) => setExpandedSection(prev => ({ ...prev, [key]: !prev[key] }));

  // Derived filtered data
  const filtered = useMemo(() => {
    if (!rawData) return null;

    let instances = rawData.instances || [];
    let supermarkets = rawData.supermarkets || [];

    if (filterRegion) {
      instances = instances.filter(i => i.region === filterRegion);
      supermarkets = supermarkets.filter(s => s.region === filterRegion);
    }
    if (filterYear) {
      instances = instances.filter(i => i.year === parseInt(filterYear));
    }
    if (filterMonth) {
      instances = instances.filter(i => i.month === parseInt(filterMonth));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchingSupermarketIds = new Set(
        supermarkets.filter(s => s.name.toLowerCase().includes(q)).map(s => s.id)
      );
      instances = instances.filter(i => matchingSupermarketIds.has(i.supermarket_id));
      supermarkets = supermarkets.filter(s => s.name.toLowerCase().includes(q));
    }

    // KPI totals
    const totalSupermarkets = supermarkets.length;
    const totalInstances = instances.length;
    const categoryTotals = {};
    CATEGORIES.forEach(c => {
      categoryTotals[c.key] = instances.reduce((sum, i) => sum + parseInt(i[`${c.key}_count`] || 0), 0);
    });

    // Completion
    let filledCount = 0;
    const totalPossible = instances.length * 8;
    instances.forEach(i => {
      CATEGORIES.forEach(c => { if (parseInt(i[`has_${c.key}`])) filledCount++; });
      const sm = supermarkets.find(s => s.id === i.supermarket_id);
      if (sm) {
        if (parseInt(sm.has_dispositifs)) filledCount++;
        if (parseInt(sm.has_scoring)) filledCount++;
      }
    });
    const completionPct = totalPossible > 0 ? Math.round((filledCount / totalPossible) * 100) : 0;

    // Region breakdown
    const regionBreakdown = REGIONS.map(region => {
      const regionInstances = instances.filter(i => i.region === region);
      const regionSupermarkets = supermarkets.filter(s => s.region === region);
      const row = {
        region,
        supermarkets: regionSupermarkets.length,
        instances: regionInstances.length,
      };
      CATEGORIES.forEach(c => {
        row[c.key] = regionInstances.reduce((sum, i) => sum + parseInt(i[`${c.key}_count`] || 0), 0);
      });
      return row;
    }).filter(r => r.supermarkets > 0 || r.instances > 0);

    // Monthly breakdown
    const monthlyMap = {};
    instances.forEach(i => {
      const key = `${i.year}-${String(i.month).padStart(2, '0')}`;
      if (!monthlyMap[key]) {
        monthlyMap[key] = { year: i.year, month: i.month, instances: 0 };
        CATEGORIES.forEach(c => { monthlyMap[key][c.key] = 0; });
      }
      monthlyMap[key].instances++;
      CATEGORIES.forEach(c => {
        monthlyMap[key][c.key] += parseInt(i[`${c.key}_count`] || 0);
      });
    });
    const monthly = Object.values(monthlyMap).sort((a, b) => b.year - a.year || b.month - a.month);

    // Supermarket detail table
    const smMap = {};
    supermarkets.forEach(s => {
      smMap[s.id] = {
        ...s,
        instance_count: 0,
        total_entries: 0,
        filled: 0,
        possible: 0,
      };
      CATEGORIES.forEach(c => { smMap[s.id][c.key] = 0; });
    });
    instances.forEach(i => {
      if (!smMap[i.supermarket_id]) return;
      const sm = smMap[i.supermarket_id];
      sm.instance_count++;
      sm.possible += 8;
      CATEGORIES.forEach(c => {
        sm[c.key] += parseInt(i[`${c.key}_count`] || 0);
        sm.total_entries += parseInt(i[`${c.key}_count`] || 0);
        if (parseInt(i[`has_${c.key}`])) sm.filled++;
      });
      const supermarket = supermarkets.find(s => s.id === i.supermarket_id);
      if (supermarket) {
        if (parseInt(supermarket.has_dispositifs)) sm.filled++;
        if (parseInt(supermarket.has_scoring)) sm.filled++;
      }
    });
    const smList = Object.values(smMap);

    // Available years for filter
    const years = [...new Set((rawData.instances || []).map(i => i.year))].sort((a, b) => b - a);

    return {
      totalSupermarkets, totalInstances, categoryTotals,
      completionPct, filledCount, totalPossible,
      regionBreakdown, monthly, smList, years,
      rayonStats: rawData.rayon_stats || {},
      accidentTypeStats: rawData.accident_type_stats || {},
      anomalyCategoryStats: rawData.anomaly_category_stats || {},
    };
  }, [rawData, filterRegion, filterYear, filterMonth, searchQuery]);

  // Sorted & paginated supermarket list
  const sortedSupermarkets = useMemo(() => {
    if (!filtered) return [];
    const list = [...filtered.smList];
    list.sort((a, b) => {
      let va = a[supermarketSort.key];
      let vb = b[supermarketSort.key];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return supermarketSort.dir === 'asc' ? -1 : 1;
      if (va > vb) return supermarketSort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filtered, supermarketSort]);

  const paginatedSm = sortedSupermarkets.slice((smPage - 1) * SM_PER_PAGE, smPage * SM_PER_PAGE);
  const smTotalPages = Math.ceil(sortedSupermarkets.length / SM_PER_PAGE);

  const handleSmSort = (key) => {
    setSupermarketSort(prev =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }
    );
    setSmPage(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (!filtered) return null;

  const maxCatVal = Math.max(...Object.values(filtered.categoryTotals), 1);
  const maxRegionInst = Math.max(...filtered.regionBreakdown.map(r => r.instances), 1);

  const SectionHeader = ({ title, sectionKey, icon: Icon }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      className="flex items-center justify-between w-full text-left"
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon size={18} className="text-blue-600" />}
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      </div>
      {expandedSection[sectionKey] ? <FiChevronUp size={18} className="text-gray-400" /> : <FiChevronDown size={18} className="text-gray-400" />}
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard Administrateur</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d'ensemble de la securite — Marjane</p>
      </div>

      {/* Filters Bar */}
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
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSmPage(1); }}
              placeholder="Rechercher un supermarche..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <select
            value={filterRegion}
            onChange={(e) => { setFilterRegion(e.target.value); setSmPage(1); }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Toutes les regions</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select
            value={filterYear}
            onChange={(e) => { setFilterYear(e.target.value); setSmPage(1); }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Toutes les annees</option>
            {(filtered.years || []).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={filterMonth}
            onChange={(e) => { setFilterMonth(e.target.value); setSmPage(1); }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Tous les mois</option>
            {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
        {(filterRegion || filterYear || filterMonth || searchQuery) && (
          <button
            onClick={() => { setFilterRegion(''); setFilterYear(''); setFilterMonth(''); setSearchQuery(''); setSmPage(1); }}
            className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Reinitialiser les filtres
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard icon={FiShoppingCart} label="Supermarches" value={filtered.totalSupermarkets} bgCls="bg-blue-100" textCls="text-blue-700" />
        <KpiCard icon={FiCalendar} label="Instances" value={filtered.totalInstances} bgCls="bg-indigo-100" textCls="text-indigo-700" />
        {CATEGORIES.map(c => (
          <KpiCard key={c.key} icon={c.icon} label={c.label} value={filtered.categoryTotals[c.key]} bgCls={c.bgCls} textCls={c.textCls} />
        ))}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-500 text-xs font-medium">Completion</p>
            <span className={`text-xs font-bold ${filtered.completionPct >= 70 ? 'text-green-600' : filtered.completionPct >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
              {filtered.completionPct}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
            <div
              className={`h-2.5 rounded-full transition-all ${filtered.completionPct >= 70 ? 'bg-green-500' : filtered.completionPct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${filtered.completionPct}%` }}
            />
          </div>
          <p className="text-gray-400 text-xs">{filtered.filledCount} / {filtered.totalPossible} remplies</p>
        </div>
      </div>

      {/* Region Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <SectionHeader title="Repartition par Region" sectionKey="region" icon={FiMapPin} />
        {expandedSection.region && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Region</th>
                  <th className="text-center py-2 px-2 font-semibold text-gray-600">Superm.</th>
                  <th className="text-center py-2 px-2 font-semibold text-gray-600">Instances</th>
                  {CATEGORIES.map(c => (
                    <th key={c.key} className="text-center py-2 px-2 font-semibold text-gray-600" title={c.label}>
                      {c.label.substring(0, 6)}.
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.regionBreakdown.map(r => {
                  const rc = REGION_COLORS[r.region] || {};
                  return (
                    <tr key={r.region} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${rc.bg || 'bg-gray-100'} ${rc.text || 'text-gray-700'}`}>
                          <span className={`w-2 h-2 rounded-full ${rc.bar || 'bg-gray-500'}`} />
                          {r.region}
                        </span>
                      </td>
                      <td className="text-center py-3 px-2 font-semibold text-gray-800">{r.supermarkets}</td>
                      <td className="text-center py-3 px-2 font-semibold text-gray-800">{r.instances}</td>
                      {CATEGORIES.map(c => (
                        <td key={c.key} className="text-center py-3 px-2 text-gray-700">
                          {r[c.key] > 0 ? (
                            <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2 py-0.5 rounded">{r[c.key]}</span>
                          ) : (
                            <span className="text-gray-300">0</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {filtered.regionBreakdown.length > 1 && (
                  <tr className="bg-blue-50 font-semibold">
                    <td className="py-3 px-3 text-blue-800 text-xs">TOTAL</td>
                    <td className="text-center py-3 px-2 text-blue-800">{filtered.regionBreakdown.reduce((s, r) => s + r.supermarkets, 0)}</td>
                    <td className="text-center py-3 px-2 text-blue-800">{filtered.regionBreakdown.reduce((s, r) => s + r.instances, 0)}</td>
                    {CATEGORIES.map(c => (
                      <td key={c.key} className="text-center py-3 px-2 text-blue-800">
                        {filtered.regionBreakdown.reduce((s, r) => s + r[c.key], 0)}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Category Breakdown Visual */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <SectionHeader title="Totaux par Categorie" sectionKey="category" icon={FiTrendingUp} />
          {expandedSection.category && (
            <div className="mt-4 space-y-3">
              {CATEGORIES.map(c => {
                const val = filtered.categoryTotals[c.key];
                const pct = maxCatVal > 0 ? (val / maxCatVal) * 100 : 0;
                const Icon = c.icon;
                return (
                  <div key={c.key} className="flex items-center gap-3">
                    <Icon size={16} className="text-gray-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 font-medium">{c.label}</span>
                        <span className="font-bold text-gray-800">{val}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${c.barCls} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rayon / Interpellation breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <SectionHeader title="Interpellations par Rayon" sectionKey="rayons" icon={FiAlertTriangle} />
          {expandedSection.rayons && (
            <div className="mt-4">
              {Object.keys(filtered.rayonStats).length === 0 ? (
                <p className="text-gray-400 text-sm">Aucune donnee</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(filtered.rayonStats)
                    .sort((a, b) => b[1] - a[1])
                    .map(([rayon, count]) => {
                      const maxR = Math.max(...Object.values(filtered.rayonStats));
                      return (
                        <div key={rayon} className="flex items-center gap-3">
                          <span className="text-xs text-gray-600 font-medium w-28 shrink-0 truncate" title={rayon}>{rayon}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div className="h-2 rounded-full bg-amber-500 transition-all" style={{ width: `${(count / maxR) * 100}%` }} />
                          </div>
                          <span className="text-xs font-bold text-gray-800 w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <SectionHeader title="Donnees Mensuelles" sectionKey="monthly" icon={FiCalendar} />
        {expandedSection.monthly && (
          <div className="mt-4 overflow-x-auto">
            {filtered.monthly.length === 0 ? (
              <p className="text-gray-400 text-sm">Aucune donnee</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Periode</th>
                    <th className="text-center py-2 px-2 font-semibold text-gray-600">Instances</th>
                    {CATEGORIES.map(c => (
                      <th key={c.key} className="text-center py-2 px-2 font-semibold text-gray-600" title={c.label}>
                        {c.label.substring(0, 6)}.
                      </th>
                    ))}
                    <th className="text-center py-2 px-2 font-semibold text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.monthly.map(m => {
                    const total = CATEGORIES.reduce((s, c) => s + m[c.key], 0);
                    return (
                      <tr key={`${m.year}-${m.month}`} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 px-3 font-medium text-gray-800">{MONTHS[m.month]} {m.year}</td>
                        <td className="text-center py-3 px-2 text-gray-700">{m.instances}</td>
                        {CATEGORIES.map(c => (
                          <td key={c.key} className="text-center py-3 px-2 text-gray-700">
                            {m[c.key] > 0 ? m[c.key] : <span className="text-gray-300">0</span>}
                          </td>
                        ))}
                        <td className="text-center py-3 px-2 font-bold text-gray-800">{total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Supermarket Detail Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <SectionHeader title={`Detail par Supermarche (${sortedSupermarkets.length})`} sectionKey="supermarkets" icon={FiShoppingCart} />
        {expandedSection.supermarkets && (
          <div className="mt-4">
            {sortedSupermarkets.length === 0 ? (
              <p className="text-gray-400 text-sm">Aucun supermarche</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <SortTh label="Nom" col="name" sort={supermarketSort} onClick={handleSmSort} />
                        <SortTh label="Region" col="region" sort={supermarketSort} onClick={handleSmSort} />
                        <SortTh label="Instances" col="instance_count" sort={supermarketSort} onClick={handleSmSort} />
                        <SortTh label="Entrees" col="total_entries" sort={supermarketSort} onClick={handleSmSort} />
                        <th className="text-center py-2 px-2 font-semibold text-gray-600">Completion</th>
                        <th className="text-center py-2 px-2 font-semibold text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedSm.map(sm => {
                        const pct = sm.possible > 0 ? Math.round((sm.filled / sm.possible) * 100) : 0;
                        const rc = REGION_COLORS[sm.region] || {};
                        return (
                          <tr key={sm.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-3 px-3 font-medium text-gray-800">{sm.name}</td>
                            <td className="py-3 px-2">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rc.bg || 'bg-gray-100'} ${rc.text || 'text-gray-700'}`}>
                                {sm.region}
                              </span>
                            </td>
                            <td className="text-center py-3 px-2 text-gray-700">{sm.instance_count}</td>
                            <td className="text-center py-3 px-2 text-gray-700">{sm.total_entries}</td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2 justify-center">
                                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-gray-600 w-8">{pct}%</span>
                              </div>
                            </td>
                            <td className="text-center py-3 px-2">
                              <button
                                onClick={() => navigate(`/supermarket/${sm.id}`)}
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                title="Voir"
                              >
                                <FiEye size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {smTotalPages > 1 && (
                  <div className="flex flex-wrap gap-2 mt-4 justify-center">
                    {Array.from({ length: smTotalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setSmPage(page)}
                        className={`min-w-[32px] h-8 px-2 rounded text-xs font-medium transition-colors ${
                          page === smPage ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const KpiCard = ({ icon: Icon, label, value, bgCls, textCls }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
    <div className="flex items-center gap-3">
      <div className={`${bgCls} rounded-lg p-2.5 shrink-0`}>
        <Icon size={18} className={textCls} />
      </div>
      <div className="min-w-0">
        <p className="text-gray-500 text-xs font-medium truncate">{label}</p>
        <p className="text-xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  </div>
);

const SortTh = ({ label, col, sort, onClick }) => (
  <th
    className="text-left py-2 px-3 font-semibold text-gray-600 cursor-pointer hover:text-blue-600 select-none"
    onClick={() => onClick(col)}
  >
    <span className="inline-flex items-center gap-1">
      {label}
      {sort.key === col && (sort.dir === 'asc' ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />)}
    </span>
  </th>
);

export default Dashboard;

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getDashboardSubCategories } from '../services/api';
import { toast } from 'react-toastify';
import {
  FiArrowLeft, FiFilter, FiChevronRight, FiChevronDown, FiChevronUp, FiSearch,
  FiAlertTriangle, FiAlertCircle, FiFileText, FiBook, FiMessageSquare, FiClipboard
} from 'react-icons/fi';

const MONTHS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const REGIONS = ['REGION CENTRE 1', 'REGION CENTRE 02', 'REGION SUD', 'REGION ORIENT', 'REGION NORD'];

const AXES = [
  {
    key: 'axe1',
    label: 'AXE 1 — Hygiène & Nuisibles',
    subs: [
      'Sol sale',
      'Cagettes / supports sales',
      'Déchets visibles en surface de vente',
      'Moucherons',
      'Insectes rampants',
      'Rongeurs',
      'Tenue des salariés non conforme',
      'Check-out caisse sale',
    ],
  },
  {
    key: 'axe2',
    label: 'AXE 2 — Disponibilité & Qualité Produit',
    subs: [
      'Produit abîmé',
      'Produit périmé',
      'Rupture rayon Marché (Fruits & Légumes)',
      'Rupture rayon Épicerie',
      'Rupture rayon Boucherie',
      'Rupture rayon Fromage',
      'Rupture multiple rayons',
      'Rupture rayon Poissonnerie',
    ],
  },
  {
    key: 'axe3',
    label: 'AXE 3 — Sécurité & Organisation',
    subs: [
      'Allée bloquée',
      'Palette dangereuse',
      'Issue de secours obstruée',
      'Moyens d\'incendie bloqués',
      'Sol glissant',
      'Réserve non rangée',
      'Frigo encombré',
      'Porte frigo ouverte',
      'Non port des EPI',
      'Absence de l\'ADS en poste',
    ],
  },
  {
    key: 'axe4',
    label: 'AXE 4 — Expérience Client & Climat Interne',
    subs: [
      'Attente critique stand fromage',
      'Attente critique stand boucherie',
      'Attente critique stand Poissonnerie',
      'Attente critique Balance FLEG',
      'File d\'attente critique caisses',
      'Nombre de caisses ouvertes insuffisant',
      'Conflit visible entre salariés',
      'Comportement non professionnel (personnel)',
      'Comportement non professionnel ADS',
    ],
  },
];

const CATEGORY_CONFIG = {
  anomalies: {
    label: 'Anomalies',
    subLabel: 'Sous-catégories d\'anomalies',
    icon: FiSearch,
    color: 'pink',
    bgCls: 'bg-pink-100',
    textCls: 'text-pink-700',
    barCls: 'bg-pink-500',
    ringCls: 'ring-pink-500',
  },
  interpellations: {
    label: 'Interpellations',
    subLabel: 'Rayons concernés',
    icon: FiAlertTriangle,
    color: 'amber',
    bgCls: 'bg-amber-100',
    textCls: 'text-amber-700',
    barCls: 'bg-amber-500',
    ringCls: 'ring-amber-500',
  },
  accidents: {
    label: 'Accidents',
    subLabel: 'Causes d\'accidents',
    icon: FiAlertCircle,
    color: 'red',
    bgCls: 'bg-red-100',
    textCls: 'text-red-700',
    barCls: 'bg-red-500',
    ringCls: 'ring-red-500',
  },
  autres_incidents: {
    label: 'Autres Incidents',
    subLabel: 'Types d\'incidents',
    icon: FiFileText,
    color: 'orange',
    bgCls: 'bg-orange-100',
    textCls: 'text-orange-700',
    barCls: 'bg-orange-500',
    ringCls: 'ring-orange-500',
  },
  formations: {
    label: 'Formations',
    subLabel: 'Types de formations',
    icon: FiBook,
    color: 'green',
    bgCls: 'bg-green-100',
    textCls: 'text-green-700',
    barCls: 'bg-green-500',
    ringCls: 'ring-green-500',
  },
  reclamations: {
    label: 'Réclamations',
    subLabel: 'Motifs de réclamation',
    icon: FiMessageSquare,
    color: 'purple',
    bgCls: 'bg-purple-100',
    textCls: 'text-purple-700',
    barCls: 'bg-purple-500',
    ringCls: 'ring-purple-500',
  },
  controle_rm: {
    label: 'Contrôle RM',
    subLabel: 'Type — Sous-type',
    icon: FiClipboard,
    color: 'teal',
    bgCls: 'bg-teal-100',
    textCls: 'text-teal-700',
    barCls: 'bg-teal-500',
    ringCls: 'ring-teal-500',
  },
};

const DashboardCategoryDetail = () => {
  const navigate = useNavigate();
  const { category } = useParams();
  const [searchParams] = useSearchParams();
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.anomalies;
  const Icon = config.icon;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [filterRegion, setFilterRegion] = useState(searchParams.get('region') || '');
  const [filterYear, setFilterYear] = useState(searchParams.get('year') || '');
  const [filterMonth, setFilterMonth] = useState(searchParams.get('month') || '');
  const [filterAxe, setFilterAxe] = useState('');
  const [expandedMotif, setExpandedMotif] = useState(null);

  const [years, setYears] = useState([]);
  const isAnomalies = category === 'anomalies';
  const isReclamations = category === 'reclamations';

  useEffect(() => {
    loadData();
  }, [category, filterRegion, filterYear, filterMonth]);

  useEffect(() => {
    loadYears();
  }, []);

  const loadYears = async () => {
    try {
      const res = await getDashboardSubCategories(category, {});
      const currentYear = new Date().getFullYear();
      setYears([currentYear, currentYear - 1, currentYear - 2]);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getDashboardSubCategories(category, {
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

  const filteredSubCategories = useMemo(() => {
    if (!data?.subCategories) return [];
    let list = data.subCategories;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q));
    }

    if (isAnomalies && filterAxe) {
      const selectedAxe = AXES.find(a => a.key === filterAxe);
      if (selectedAxe) {
        list = list.filter(s => selectedAxe.subs.includes(s.name));
      }
    }

    return list;
  }, [data, search, filterAxe, isAnomalies]);

  const maxCount = useMemo(() => {
    if (!filteredSubCategories.length) return 1;
    return Math.max(...filteredSubCategories.map(s => s.count), 1);
  }, [filteredSubCategories]);

  const hasFilters = filterRegion || filterYear || filterMonth || search || filterAxe;

  const resetFilters = () => {
    setFilterRegion('');
    setFilterYear('');
    setFilterMonth('');
    setSearch('');
    setFilterAxe('');
  };

  const handleSubCategoryClick = (subCategory) => {
    const params = new URLSearchParams();
    if (filterRegion) params.set('region', filterRegion);
    if (filterYear) params.set('year', filterYear);
    if (filterMonth) params.set('month', filterMonth);
    const qs = params.toString();
    navigate(`/dashboard/${category}/subcategory/${encodeURIComponent(subCategory)}${qs ? '?' + qs : ''}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 text-sm mb-4 transition-colors"
      >
        <FiArrowLeft size={16} />
        <span>Retour au Dashboard</span>
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className={`${config.bgCls} rounded-lg p-2.5`}>
            <Icon size={24} className={config.textCls} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{config.label}</h1>
            <p className="text-gray-500 text-sm">{config.subLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className={`${config.bgCls} ${config.textCls} px-4 py-2 rounded-lg`}>
            <span className="text-2xl font-bold">{data?.total || 0}</span>
            <span className="text-sm ml-2">entrées au total</span>
          </div>
          <div className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg">
            <span className="text-2xl font-bold">{filteredSubCategories.length}</span>
            <span className="text-sm ml-2">sous-catégories</span>
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
              placeholder="Rechercher..."
              className={`w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:${config.ringCls} outline-none`}
            />
          </div>
          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:${config.ringCls} outline-none`}
          >
            <option value="">Toutes les régions</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:${config.ringCls} outline-none`}
          >
            <option value="">Toutes les années</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:${config.ringCls} outline-none`}
          >
            <option value="">Tous les mois</option>
            {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
        {isAnomalies && (
          <div className="mt-3">
            <select
              value={filterAxe}
              onChange={(e) => setFilterAxe(e.target.value)}
              className={`w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 outline-none`}
            >
              <option value="">Tous les axes</option>
              {AXES.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
            </select>
          </div>
        )}
        {hasFilters && (
          <button
            onClick={resetFilters}
            className={`mt-3 text-xs ${config.textCls} hover:opacity-80 font-medium`}
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* Sub-categories list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            {config.subLabel} ({filteredSubCategories.length})
          </h2>
        </div>

        {filteredSubCategories.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            Aucune sous-catégorie trouvée
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredSubCategories.map((sub, index) => {
              const pct = (sub.count / maxCount) * 100;
              const hasDetails = isReclamations && sub.details && sub.details.length > 0;
              const isExpanded = expandedMotif === sub.name;
              return (
                <div key={index}>
                  <div className="flex items-center w-full p-4 hover:bg-gray-50 transition-colors text-left group">
                    {hasDetails && (
                      <button
                        onClick={() => setExpandedMotif(isExpanded ? null : sub.name)}
                        className="mr-3 shrink-0 text-gray-400 hover:text-purple-600 transition-colors"
                      >
                        {isExpanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
                      </button>
                    )}
                    <button
                      onClick={() => handleSubCategoryClick(sub.name)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium text-gray-800 group-hover:text-orange-600 transition-colors">
                          {sub.name}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bgCls} ${config.textCls}`}>
                          {sub.count} entrée{sub.count > 1 ? 's' : ''}
                        </span>
                        <span className="text-xs text-gray-500">
                          {sub.supermarketCount} magasin{sub.supermarketCount > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${config.barCls} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                    <button
                      onClick={() => handleSubCategoryClick(sub.name)}
                      className="shrink-0 ml-3"
                    >
                      <FiChevronRight size={20} className="text-gray-400 group-hover:text-orange-600 transition-colors" />
                    </button>
                  </div>
                  {hasDetails && isExpanded && (
                    <div className="bg-purple-50 border-t border-purple-100 px-6 py-3 space-y-2">
                      {sub.details.map((det, i) => {
                        const detPct = sub.count > 0 ? (det.count / sub.count) * 100 : 0;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-sm text-purple-800 font-medium w-48 shrink-0 truncate" title={det.name}>{det.name}</span>
                            <div className="flex-1 bg-purple-100 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full bg-purple-400 transition-all" style={{ width: `${detPct}%` }} />
                            </div>
                            <span className="text-xs font-bold text-purple-700 w-8 text-right">{det.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardCategoryDetail;

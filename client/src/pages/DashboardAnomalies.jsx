import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { getDashboardCategory } from '../services/api';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiSearch, FiFilter, FiChevronDown, FiChevronUp, FiEye } from 'react-icons/fi';

const MONTHS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const REGIONS = ['REGION CENTRE 1', 'REGION CENTRE 02', 'REGION SUD', 'REGION ORIENT', 'REGION NORD'];

const AXES_MAP = {
  axe1: 'AXE 1 — Hygiène & Nuisibles',
  axe2: 'AXE 2 — Disponibilité & Qualité Produit',
  axe3: 'AXE 3 — Sécurité & Organisation',
  axe4: 'AXE 4 — Expérience Client & Climat Interne',
};

const REGION_COLORS = {
  'REGION CENTRE 1': 'bg-blue-100 text-blue-700',
  'REGION CENTRE 02': 'bg-indigo-100 text-indigo-700',
  'REGION SUD': 'bg-orange-100 text-orange-700',
  'REGION ORIENT': 'bg-purple-100 text-purple-700',
  'REGION NORD': 'bg-teal-100 text-teal-700',
};

const CRITICITE_COLORS = {
  'Critique': 'bg-red-100 text-red-700',
  'Majeur': 'bg-orange-100 text-orange-700',
  'Modéré': 'bg-yellow-100 text-yellow-700',
};

const CATEGORY_LABELS = {
  anomalies: 'Anomalies',
  interpellations: 'Interpellations',
  accidents: 'Accidents',
  autres_incidents: 'Autres Incidents',
  formations: 'Formations',
  reclamations: 'Réclamations',
};

const ITEMS_PER_PAGE = 20;

const DashboardAnomalies = () => {
  const navigate = useNavigate();
  const { category } = useParams();
  const catType = category || 'anomalies';
  const isAnomalies = catType === 'anomalies';
  const [searchParams] = useSearchParams();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterRegion, setFilterRegion] = useState(searchParams.get('region') || '');
  const [filterYear, setFilterYear] = useState(searchParams.get('year') || '');
  const [filterMonth, setFilterMonth] = useState(searchParams.get('month') || '');
  const [filterAxe, setFilterAxe] = useState('');
  const [filterCriticite, setFilterCriticite] = useState('');
  const [filterCorrection, setFilterCorrection] = useState('');

  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadData();
  }, [catType]);

  const loadData = async () => {
    try {
      const res = await getDashboardCategory(catType);
      setEntries(res.data);
    } catch (err) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const years = useMemo(() => {
    return [...new Set(entries.map(e => e.year))].sort((a, b) => b - a);
  }, [entries]);

  const filtered = useMemo(() => {
    let list = [...entries];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e => {
        const base = e.supermarket_name?.toLowerCase().includes(q) || e.region?.toLowerCase().includes(q);
        if (isAnomalies) {
          return base || (e.sous_categories || []).some(s => s.toLowerCase().includes(q)) || (AXES_MAP[e.axe] || '').toLowerCase().includes(q);
        }
        return base || JSON.stringify(e).toLowerCase().includes(q);
      });
    }
    if (filterRegion) list = list.filter(e => e.region === filterRegion);
    if (filterYear) list = list.filter(e => e.year === parseInt(filterYear));
    if (filterMonth) list = list.filter(e => e.month === parseInt(filterMonth));
    if (filterAxe) list = list.filter(e => e.axe === filterAxe);
    if (filterCriticite) list = list.filter(e => e.criticite === filterCriticite);
    if (filterCorrection) list = list.filter(e => e.correction === filterCorrection);

    list.sort((a, b) => {
      let va = a[sortKey] ?? '';
      let vb = b[sortKey] ?? '';
      if (sortKey === 'supermarket_name' || sortKey === 'region' || sortKey === 'axe') {
        va = String(va).toLowerCase();
        vb = String(vb).toLowerCase();
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [entries, search, filterRegion, filterYear, filterMonth, filterAxe, filterCriticite, filterCorrection, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  };

  const resetFilters = () => {
    setSearch(''); setFilterRegion(''); setFilterYear(''); setFilterMonth('');
    setFilterAxe(''); setFilterCriticite(''); setFilterCorrection('');
    setPage(1);
  };

  const hasFilters = search || filterRegion || filterYear || filterMonth || filterAxe || filterCriticite || filterCorrection;

  // Stats summary
  const stats = useMemo(() => {
    const axeCounts = {};
    const critCounts = {};
    const regionCounts = {};
    filtered.forEach(e => {
      axeCounts[e.axe] = (axeCounts[e.axe] || 0) + 1;
      if (e.criticite) critCounts[e.criticite] = (critCounts[e.criticite] || 0) + 1;
      regionCounts[e.region] = (regionCounts[e.region] || 0) + 1;
    });
    return { axeCounts, critCounts, regionCounts };
  }, [filtered]);

  const SortHeader = ({ label, col, className = '' }) => (
    <th
      className={`py-2 px-3 font-semibold text-gray-600 cursor-pointer hover:text-blue-600 select-none text-left ${className}`}
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
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 text-sm mb-4 transition-colors"
      >
        <FiArrowLeft size={16} />
        <span>Retour au Dashboard</span>
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{CATEGORY_LABELS[catType] || catType} — Détail complet</h1>
        <p className="text-gray-500 text-sm mt-1">{filtered.length} entrée(s) trouvée(s)</p>
      </div>

      {/* Summary cards — anomalies only */}
      {isAnomalies && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {Object.entries(AXES_MAP).map(([key, label]) => (
              <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
                <p className="text-xs text-gray-500 font-medium truncate" title={label}>{label.split('—')[1]?.trim() || label}</p>
                <p className="text-lg font-bold text-gray-800">{stats.axeCounts[key] || 0}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {['Critique', 'Majeur', 'Modéré'].map(c => (
              <div key={c} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${CRITICITE_COLORS[c]}`}>{c}</span>
                <span className="text-lg font-bold text-gray-800">{stats.critCounts[c] || 0}</span>
              </div>
            ))}
          </div>
        </>
      )}

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
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Supermarché, sous-catégorie..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 outline-none"
            />
          </div>
          <select value={filterRegion} onChange={(e) => { setFilterRegion(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 outline-none">
            <option value="">Toutes les régions</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 outline-none">
            <option value="">Toutes les années</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterMonth} onChange={(e) => { setFilterMonth(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 outline-none">
            <option value="">Tous les mois</option>
            {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
        {isAnomalies && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <select value={filterAxe} onChange={(e) => { setFilterAxe(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 outline-none">
              <option value="">Tous les axes</option>
              {Object.entries(AXES_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filterCriticite} onChange={(e) => { setFilterCriticite(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 outline-none">
              <option value="">Toutes criticités</option>
              <option value="Critique">Critique</option>
              <option value="Majeur">Majeur</option>
              <option value="Modéré">Modéré</option>
            </select>
            <select value={filterCorrection} onChange={(e) => { setFilterCorrection(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 outline-none">
              <option value="">Tous types correction</option>
              <option value="Correction immédiate (moins de 15 min)">Correction immédiate</option>
              <option value="Correction rapide (15 à 30 min)">Correction rapide</option>
              <option value="Correction tardive (+ 30 min)">Correction tardive</option>
              <option value="Non corrigé dans la journée">Non corrigé</option>
            </select>
          </div>
        )}
        {hasFilters && (
          <button onClick={resetFilters} className="mt-3 text-xs text-pink-600 hover:text-pink-800 font-medium">
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* Entries list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">Aucune entrée trouvée</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <SortHeader label="Date" col="date" />
                    <SortHeader label="Supermarché" col="supermarket_name" />
                    <SortHeader label="Région" col="region" />
                    <th className="py-2 px-3 font-semibold text-gray-600 text-left">Période</th>
                    {isAnomalies ? (
                      <>
                        <SortHeader label="Axe" col="axe" />
                        <th className="py-2 px-3 font-semibold text-gray-600 text-left">Sous-catégories</th>
                        <SortHeader label="Criticité" col="criticite" />
                        <th className="py-2 px-3 font-semibold text-gray-600 text-left">Heures</th>
                        <th className="py-2 px-3 font-semibold text-gray-600 text-left">Correction</th>
                      </>
                    ) : (
                      <th className="py-2 px-3 font-semibold text-gray-600 text-left">Détails</th>
                    )}
                    <th className="py-2 px-2 font-semibold text-gray-600 text-center">Voir</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((e, idx) => (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-3 text-gray-800 whitespace-nowrap">{e.date || '-'}</td>
                      <td className="py-3 px-3 font-medium text-gray-800">{e.supermarket_name}</td>
                      <td className="py-3 px-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${REGION_COLORS[e.region] || 'bg-gray-100 text-gray-700'}`}>
                          {e.region}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-600 whitespace-nowrap">{MONTHS[e.month]} {e.year}</td>
                      {isAnomalies ? (
                        <>
                          <td className="py-3 px-3 text-gray-700 text-xs">{AXES_MAP[e.axe]?.split('—')[1]?.trim() || e.axe}</td>
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {(e.sous_categories || []).map((s, i) => (
                                <span key={i} className="inline-block bg-pink-50 text-pink-700 text-xs px-1.5 py-0.5 rounded">{s}</span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {e.criticite && (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CRITICITE_COLORS[e.criticite] || 'bg-gray-100 text-gray-700'}`}>
                                {e.criticite}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-xs text-gray-500 space-y-0.5">
                            {e.heure_detection && <div>Dét: {e.heure_detection}</div>}
                            {e.heure_information && <div>Info: {e.heure_information}</div>}
                            {e.heure_prise_en_charge && <div>PeC: {e.heure_prise_en_charge}</div>}
                            {e.heure_conformite && <div>Conf: {e.heure_conformite}</div>}
                          </td>
                          <td className="py-3 px-3 text-xs text-gray-600 max-w-[140px]">{e.correction || '-'}</td>
                        </>
                      ) : (
                        <td className="py-3 px-3 text-xs text-gray-700">
                          <GenericDetails entry={e} catType={catType} />
                        </td>
                      )}
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => navigate(`/instance/${e.instance_id}/${catType}`)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Voir l'instance"
                        >
                          <FiEye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-gray-100">
              {paginated.map((e, idx) => (
                <div key={idx} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{e.supermarket_name}</p>
                      <p className="text-xs text-gray-500">{MONTHS[e.month]} {e.year} — {e.date}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isAnomalies && e.criticite && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CRITICITE_COLORS[e.criticite]}`}>
                          {e.criticite}
                        </span>
                      )}
                      <button onClick={() => navigate(`/instance/${e.instance_id}/${catType}`)} className="text-blue-600">
                        <FiEye size={16} />
                      </button>
                    </div>
                  </div>
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${REGION_COLORS[e.region]}`}>{e.region}</span>
                  {isAnomalies ? (
                    <>
                      <p className="text-xs text-gray-600 font-medium">{AXES_MAP[e.axe] || e.axe}</p>
                      {(e.sous_categories || []).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {e.sous_categories.map((s, i) => (
                            <span key={i} className="bg-pink-50 text-pink-700 text-xs px-1.5 py-0.5 rounded">{s}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-x-3 text-xs text-gray-500">
                        {e.heure_detection && <span>Det: {e.heure_detection}</span>}
                        {e.heure_information && <span>Info: {e.heure_information}</span>}
                        {e.heure_prise_en_charge && <span>PeC: {e.heure_prise_en_charge}</span>}
                        {e.heure_conformite && <span>Conf: {e.heure_conformite}</span>}
                      </div>
                      {e.correction && <p className="text-xs text-gray-500">{e.correction}</p>}
                    </>
                  ) : (
                    <GenericDetails entry={e} catType={catType} />
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-wrap gap-2 p-4 justify-center border-t border-gray-100">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`min-w-[32px] h-8 px-2 rounded text-xs font-medium transition-colors ${
                      p === page ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const GENERIC_SKIP = ['instance_id', 'supermarket_id', 'supermarket_name', 'region', 'month', 'year'];

const GenericDetails = ({ entry, catType }) => {
  const fields = Object.entries(entry).filter(([k]) => !GENERIC_SKIP.includes(k) && entry[k] !== '' && entry[k] !== null && entry[k] !== undefined);
  if (fields.length === 0) return <span className="text-gray-400">-</span>;

  return (
    <div className="space-y-1 text-xs">
      {fields.map(([key, val]) => {
        if (Array.isArray(val)) {
          return (
            <div key={key}>
              <span className="font-medium text-gray-600 capitalize">{key.replace(/_/g, ' ')}: </span>
              {val.map((v, i) => (
                <span key={i} className="inline-block bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded mr-1 mb-0.5">{v}</span>
              ))}
            </div>
          );
        }
        return (
          <div key={key}>
            <span className="font-medium text-gray-600 capitalize">{key.replace(/_/g, ' ')}: </span>
            <span className="text-gray-800">{String(val)}</span>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardAnomalies;

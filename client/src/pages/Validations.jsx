import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiArchive, FiBell, FiCheck, FiEye, FiSearch } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import {
  getAgentNotifications,
  markAgentNotificationSeen,
  validateAgentNotification,
  validateAllAgentNotifications,
  cancelAgentValidation,
} from '../services/api';

const Validations = ({ archived = false }) => {
  const { isRegion } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [validatingAll, setValidatingAll] = useState(false);
  const [search, setSearch] = useState('');
  const [supermarketId, setSupermarketId] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    if (!isRegion()) {
      navigate('/supermarkets');
      return;
    }
    load();
  }, [archived]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await getAgentNotifications(archived);
      setItems(res.data);
    } catch {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const supermarkets = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      if (!map.has(item.supermarket_id)) map.set(item.supermarket_id, item.supermarket_name);
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'fr'));
  }, [items]);

  const categories = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      if (item.category) map.set(item.category, item.category_label || item.category);
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'fr'));
  }, [items]);

  const filtered = items.filter((item) => {
    const matchesStore = !supermarketId || String(item.supermarket_id) === supermarketId;
    const matchesCategory = !category || item.category === category;
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || (item.supermarket_name || '').toLowerCase().includes(query);
    return matchesStore && matchesCategory && matchesSearch;
  });

  const openItem = async (item) => {
    try {
      await markAgentNotificationSeen(item.id);
    } catch {
      // The destination remains usable even if marking it seen fails.
    }
    const target = item.kind === 'data' && item.category
      ? `/instance/${item.instance_id}/${item.category}?valider=${item.id}`
      : `/instance/${item.instance_id}?valider=${item.id}`;
    navigate(target);
  };

  const validate = async (item) => {
    try {
      setBusyId(item.id);
      await validateAgentNotification(item.id);
      toast.success('Validé et archivé');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur de validation');
    } finally {
      setBusyId(null);
    }
  };

  const validateAll = async () => {
    if (!filtered.length) return;
    if (!window.confirm(`Valider ${filtered.length} notification(s) ?`)) return;
    try {
      setValidatingAll(true);
      const res = await validateAllAgentNotifications(filtered.map((item) => item.id));
      toast.success(`${res.data.validated} notification(s) validée(s)`);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur de validation');
    } finally {
      setValidatingAll(false);
    }
  };

  const cancel = async (item) => {
    if (!window.confirm('Annuler cette validation ? L\'agent pourra à nouveau modifier cette entrée.')) return;
    try {
      setBusyId(item.id);
      await cancelAgentValidation(item.id);
      toast.success('Validation annulée');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur d\'annulation');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-orange-100 p-2.5 rounded-xl">
            {archived ? <FiArchive className="text-orange-600" size={22} /> : <FiBell className="text-orange-600" size={22} />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{archived ? 'Archives des validations' : 'Validations agents'}</h1>
            <p className="text-sm text-gray-500">
              {filtered.length} élément(s) {archived ? 'archivé(s)' : 'en attente'}
            </p>
          </div>
        </div>
        {archived ? (
          <Link to="/validations" className="text-sm font-medium text-orange-600">Retour aux validations</Link>
        ) : (
          <Link to="/validations/archives" className="flex items-center gap-1 text-sm font-medium text-orange-600">
            <FiArchive size={14} /> Archives
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un magasin..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <select
          value={supermarketId}
          onChange={(e) => setSupermarketId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Tous les magasins</option>
          {supermarkets.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Toutes les catégories</option>
          {categories.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        {!archived && (
          <button
            onClick={validateAll}
            disabled={!filtered.length || validatingAll}
            className="flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <FiCheck size={14} /> {validatingAll ? 'Validation...' : 'Tout valider'}
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
          {archived ? 'Aucune validation archivée' : 'Aucune notification en attente'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div key={item.id} className={`bg-white rounded-xl border p-4 ${archived ? 'border-gray-100' : 'border-orange-200'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${archived ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {archived ? 'Archivé' : 'En attente'}
                    </span>
                    <span className="text-xs text-gray-400">{new Date(item.created_at).toLocaleString('fr-FR')}</span>
                  </div>
                  <h2 className="font-semibold text-gray-800 mt-2">{item.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {item.agent_username} · {item.supermarket_name} · {item.period}
                    {item.category_label ? ` · ${item.category_label}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openItem(item)} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-orange-50 text-orange-700 text-sm font-medium">
                    <FiEye size={14} /> Voir
                  </button>
                  {!archived ? (
                    <button
                      onClick={() => validate(item)}
                      disabled={busyId === item.id || validatingAll}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium disabled:bg-green-300"
                    >
                      <FiCheck size={14} /> {busyId === item.id ? '...' : 'Valider'}
                    </button>
                  ) : (
                    <button
                      onClick={() => cancel(item)}
                      disabled={busyId === item.id}
                      className="px-3 py-2 rounded-lg bg-gray-100 text-red-600 text-sm font-medium disabled:text-gray-400"
                    >
                      {busyId === item.id ? '...' : 'Annuler la validation'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Validations;

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiBell, FiCheck, FiEye } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { getAgentNotifications, markAgentNotificationSeen, validateAgentNotification } from '../services/api';

const Validations = () => {
  const { isRegion } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!isRegion()) {
      navigate('/supermarkets');
      return;
    }
    load();
  }, []);

  const load = async () => {
    try {
      const res = await getAgentNotifications();
      setItems(res.data);
    } catch {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

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
      toast.success('Validé et scellé');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur de validation');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" /></div>;
  }

  const pending = items.filter((item) => !item.validated_at);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-orange-100 p-2.5 rounded-xl"><FiBell className="text-orange-600" size={22} /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Validations agents</h1>
          <p className="text-sm text-gray-500">{pending.length} élément(s) en attente</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border p-10 text-center text-gray-400">Aucune activité agent</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className={`bg-white rounded-xl border p-4 ${item.validated_at ? 'border-gray-100' : 'border-orange-200'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.validated_at ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {item.validated_at ? 'Validé' : 'En attente'}
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
                  {!item.validated_at && (
                    <button
                      onClick={() => validate(item)}
                      disabled={busyId === item.id}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium disabled:bg-green-300"
                    >
                      <FiCheck size={14} /> {busyId === item.id ? '...' : 'Valider'}
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

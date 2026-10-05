import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiUsers, FiTrash2, FiPlus } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { getSupermarkets, getAgents, createAgent, updateAgent, deleteAgent } from '../services/api';

const Agents = () => {
  const { isRegion } = useAuth();
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', supermarketIds: [] });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (!isRegion()) {
      navigate('/supermarkets');
      return;
    }
    load();
  }, []);

  const load = async () => {
    try {
      const [storeRes, agentRes] = await Promise.all([getSupermarkets(), getAgents()]);
      setStores(storeRes.data);
      setAgents(agentRes.data);
    } catch {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const toggleStore = (id) => {
    setForm((prev) => ({
      ...prev,
      supermarketIds: prev.supermarketIds.includes(id)
        ? prev.supermarketIds.filter((item) => item !== id)
        : [...prev.supermarketIds, id],
    }));
  };

  const reset = () => {
    setForm({ username: '', password: '', supermarketIds: [] });
    setEditingId(null);
  };

  const startEdit = (agent) => {
    setEditingId(agent.id);
    setForm({
      username: agent.username,
      password: '',
      supermarketIds: agent.supermarkets.map((store) => store.id),
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      if (editingId) {
        await updateAgent(editingId, {
          password: form.password,
          supermarketIds: form.supermarketIds,
        });
        toast.success('Compte agent modifié');
      } else {
        await createAgent(form);
        toast.success('Compte agent créé');
      }
      reset();
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (agent) => {
    if (!window.confirm(`Supprimer le compte ${agent.username} ?`)) return;
    try {
      await deleteAgent(agent.id);
      toast.success('Compte supprimé');
      if (editingId === agent.id) reset();
      await load();
    } catch {
      toast.error('Erreur de suppression');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-orange-100 p-2.5 rounded-xl"><FiUsers className="text-orange-600" size={22} /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Comptes agents</h1>
          <p className="text-sm text-gray-500">Comptes terrain limités aux magasins que vous choisissez</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={submit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">{editingId ? 'Modifier un agent' : 'Créer un agent'}</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom d'utilisateur</label>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              disabled={!!editingId}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {editingId ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!editingId}
              minLength={editingId ? undefined : 6}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Magasins visibles</label>
            <div className="max-h-64 overflow-y-auto border rounded-lg p-2 space-y-1">
              {stores.map((store) => (
                <label key={store.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.supermarketIds.includes(store.id)}
                    onChange={() => toggleStore(store.id)}
                    className="text-orange-500"
                  />
                  <span className="text-sm text-gray-700">{store.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button disabled={saving} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2">
              <FiPlus size={16} /> {saving ? 'Enregistrement...' : editingId ? 'Enregistrer' : 'Créer'}
            </button>
            {editingId && (
              <button type="button" onClick={reset} className="px-4 bg-gray-100 rounded-lg">Annuler</button>
            )}
          </div>
        </form>

        <div className="space-y-3">
          {agents.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400">Aucun compte agent</div>
          ) : agents.map((agent) => (
            <div key={agent.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-800">{agent.username}</h3>
                  <p className="text-xs text-gray-400 mt-1">Créé le {new Date(agent.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(agent)} className="text-sm text-orange-600 font-medium">Modifier</button>
                  <button onClick={() => remove(agent)} className="text-red-600" title="Supprimer"><FiTrash2 /></button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {agent.supermarkets.map((store) => (
                  <span key={store.id} className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full">{store.name}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Agents;

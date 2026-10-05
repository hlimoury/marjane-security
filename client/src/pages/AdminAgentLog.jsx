import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiClipboard } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { getAgentActivity } from '../services/api';

const REGIONS = ['REGION CENTRE 1', 'REGION CENTRE 02', 'REGION CENTRE NORD', 'REGION SUD', 'REGION NORD', 'REGION ORIENT'];

const ACTION_LABELS = {
  login: 'Connexion',
  month_created: 'Mois créé',
  month_updated: 'Mois modifié',
  month_deleted: 'Mois supprimé',
  data_saved: 'Données saisies',
  report_sent: 'Rapport envoyé',
};

const AdminAgentLog = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState('');
  const [agent, setAgent] = useState('');

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/supermarkets');
      return;
    }
    load();
  }, [region]);

  const load = async (agentName = agent) => {
    try {
      setLoading(true);
      const res = await getAgentActivity({ region, agent: agentName });
      setRows(res.data);
    } catch {
      toast.error('Erreur de chargement du journal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-orange-100 p-2.5 rounded-xl"><FiClipboard className="text-orange-600" size={22} /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Journal des agents</h1>
          <p className="text-sm text-gray-500">Connexions, mois, données et rapports des comptes terrain</p>
        </div>
      </div>

      <form
        onSubmit={(event) => { event.preventDefault(); load(agent); }}
        className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex flex-col sm:flex-row gap-3"
      >
        <select value={region} onChange={(e) => setRegion(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Toutes les régions</option>
          {REGIONS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input
          value={agent}
          onChange={(e) => setAgent(e.target.value)}
          placeholder="Nom de l'agent"
          className="border rounded-lg px-3 py-2 text-sm flex-1"
        />
        <button className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium">Filtrer</button>
      </form>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" /></div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl border p-10 text-center text-gray-400">Aucune activité</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600">Date</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Agent</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Région</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Action</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Détail</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">{new Date(row.created_at).toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{row.agent_username}</td>
                  <td className="px-4 py-3 text-gray-600">{row.region || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="bg-orange-50 text-orange-700 text-xs font-semibold px-2 py-1 rounded-full">
                      {ACTION_LABELS[row.action] || row.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{row.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminAgentLog;

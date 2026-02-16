import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSupermarket, getInstances, createInstance, updateInstance, deleteInstance } from '../services/api';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiPlus, FiTrash2, FiEdit2, FiCalendar, FiChevronRight, FiX } from 'react-icons/fi';

const MONTHS = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Fevrier' },
  { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Aout' },
  { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Decembre' },
];

const SupermarketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canManage } = useAuth();
  const [supermarket, setSupermarket] = useState(null);
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingInstanceId, setEditingInstanceId] = useState(null);
  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [superRes, instRes] = await Promise.all([
        getSupermarket(id),
        getInstances(id)
      ]);
      setSupermarket(superRes.data);
      setInstances(instRes.data);
    } catch (err) {
      toast.error('Erreur lors du chargement');
      navigate('/supermarkets');
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = () => {
    setEditingInstanceId(null);
    setFormData({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
    setShowForm(true);
  };

  const openEditForm = (instance) => {
    setEditingInstanceId(instance.id);
    setFormData({ month: instance.month, year: instance.year });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingInstanceId) {
        await updateInstance(editingInstanceId, {
          month: parseInt(formData.month),
          year: parseInt(formData.year)
        });
        toast.success('Instance modifiee avec succes');
      } else {
        await createInstance({
          supermarket_id: parseInt(id),
          month: parseInt(formData.month),
          year: parseInt(formData.year)
        });
        toast.success('Instance ajoutee avec succes');
      }
      setShowForm(false);
      setEditingInstanceId(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const handleDeleteInstance = async (instanceId, month, year) => {
    const monthName = MONTHS.find(m => m.value === month)?.label;
    if (!window.confirm(`Supprimer l'instance ${monthName} ${year} ?`)) return;
    try {
      await deleteInstance(instanceId);
      toast.success('Instance supprimee');
      loadData();
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getMonthName = (monthNum) => {
    return MONTHS.find(m => m.value === monthNum)?.label || monthNum;
  };

  // Generate year options (2020 to current year + 1)
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear + 1; y >= 2020; y--) {
    years.push(y);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (!supermarket) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/supermarkets')}
          className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 text-sm mb-3 transition-colors"
        >
          <FiArrowLeft size={16} />
          <span>Retour aux supermarches</span>
        </button>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{supermarket.name}</h1>
            <p className="text-gray-500 text-sm mt-1">{supermarket.region}</p>
          </div>

          <button
            onClick={openAddForm}
            className="flex items-center space-x-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <FiPlus size={16} />
            <span>Ajouter une instance</span>
          </button>
        </div>
      </div>

      {/* Add/Edit Instance Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                {editingInstanceId ? 'Modifier l\'instance' : 'Nouvelle instance'}
              </h2>
              <button onClick={() => { setShowForm(false); setEditingInstanceId(null); }} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mois</label>
                <select
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {MONTHS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Annee</label>
                <select
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-700 hover:bg-blue-800 text-white py-2.5 rounded-lg font-medium transition-colors"
                >
                  {editingInstanceId ? 'Modifier' : 'Ajouter'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingInstanceId(null); }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Instances List */}
      {instances.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm">
          <FiCalendar size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">Aucune instance pour ce supermarche</p>
          <button
            onClick={openAddForm}
            className="mt-4 text-blue-700 hover:text-blue-800 font-medium"
          >
            + Ajouter la premiere instance
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {instances.map((instance) => (
            <div
              key={instance.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-4 flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <FiCalendar size={20} className="text-blue-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">
                    {getMonthName(instance.month)} {instance.year}
                  </h3>
                  <p className="text-gray-400 text-xs">
                    Cree le {new Date(instance.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigate(`/instance/${instance.id}`)}
                  className="flex items-center space-x-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <span>Voir</span>
                  <FiChevronRight size={14} />
                </button>
                <button
                  onClick={() => openEditForm(instance)}
                  className="bg-yellow-50 hover:bg-yellow-100 text-yellow-600 p-2 rounded-lg transition-colors"
                  title="Modifier"
                >
                  <FiEdit2 size={16} />
                </button>
                <button
                  onClick={() => handleDeleteInstance(instance.id, instance.month, instance.year)}
                  className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SupermarketDetail;

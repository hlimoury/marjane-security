import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSupermarkets, createSupermarket, updateSupermarket, deleteSupermarket } from '../services/api';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiX, FiMapPin, FiShoppingCart } from 'react-icons/fi';

const REGIONS = ['REGION CENTRE 1', 'REGION CENTRE 02', 'REGION SUD', 'REGION ORIENT', 'REGION NORD'];

const Supermarkets = () => {
  const { user, canManage } = useAuth();
  const navigate = useNavigate();
  const [supermarkets, setSupermarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', region: REGIONS[0] });
  const [filterRegion, setFilterRegion] = useState('');

  useEffect(() => {
    loadSupermarkets();
  }, []);

  const loadSupermarkets = async () => {
    try {
      const res = await getSupermarkets();
      setSupermarkets(res.data);
    } catch (err) {
      toast.error('Erreur lors du chargement des supermarches');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateSupermarket(editingId, formData);
        toast.success('Supermarche modifie avec succes');
      } else {
        await createSupermarket(formData);
        toast.success('Supermarche ajoute avec succes');
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', region: REGIONS[0] });
      loadSupermarkets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const handleEdit = (supermarket) => {
    setFormData({ name: supermarket.name, region: supermarket.region });
    setEditingId(supermarket.id);
    setShowForm(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Supprimer le supermarche "${name}" ? Cette action est irreversible.`)) return;
    try {
      await deleteSupermarket(id);
      toast.success('Supermarche supprime');
      loadSupermarkets();
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', region: REGIONS[0] });
  };

  const filteredSupermarkets = filterRegion
    ? supermarkets.filter(s => s.region === filterRegion)
    : supermarkets;

  const regionColor = (region) => {
    const colors = {
      'REGION CENTRE 1': 'bg-blue-100 text-blue-800',
      'REGION CENTRE 02': 'bg-indigo-100 text-indigo-800',
      'REGION SUD': 'bg-orange-100 text-orange-800',
      'REGION ORIENT': 'bg-purple-100 text-purple-800',
      'REGION NORD': 'bg-teal-100 text-teal-800',
    };
    return colors[region] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Supermarches</h1>
          <p className="text-gray-500 text-sm mt-1">
            {user.role === 'region' ? user.region : 'Toutes les regions'} — {filteredSupermarkets.length} supermarche(s)
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Region filter (for admin/main) */}
          {canManage() && (
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="">Toutes les regions</option>
              {REGIONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          )}

          {/* Add button */}
          {canManage() && (
            <button
              onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: '', region: REGIONS[0] }); }}
              className="flex items-center space-x-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <FiPlus size={16} />
              <span>Ajouter</span>
            </button>
          )}
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                {editingId ? 'Modifier le supermarche' : 'Ajouter un supermarche'}
              </h2>
              <button onClick={cancelForm} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="Nom du supermarche"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                <select
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                >
                  {REGIONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-green-700 hover:bg-green-800 text-white py-2.5 rounded-lg font-medium transition-colors"
                >
                  {editingId ? 'Modifier' : 'Ajouter'}
                </button>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supermarkets Grid */}
      {filteredSupermarkets.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm">
          <FiShoppingCart size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">Aucun supermarche trouve</p>
          {canManage() && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-green-700 hover:text-green-800 font-medium"
            >
              + Ajouter votre premier supermarche
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSupermarkets.map((supermarket) => (
            <div
              key={supermarket.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-5"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-800 text-lg">{supermarket.name}</h3>
              </div>

              <div className="flex items-center space-x-2 mb-4">
                <FiMapPin size={14} className="text-gray-400" />
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${regionColor(supermarket.region)}`}>
                  {supermarket.region}
                </span>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => navigate(`/supermarket/${supermarket.id}`)}
                  className="flex-1 flex items-center justify-center space-x-1 bg-green-50 hover:bg-green-100 text-green-700 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <FiEye size={14} />
                  <span>Voir</span>
                </button>

                {canManage() && (
                  <>
                    <button
                      onClick={() => handleEdit(supermarket)}
                      className="flex items-center justify-center space-x-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <FiEdit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(supermarket.id, supermarket.name)}
                      className="flex items-center justify-center space-x-1 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Supermarkets;

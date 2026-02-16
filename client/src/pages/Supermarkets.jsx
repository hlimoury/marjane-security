import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSupermarkets, createSupermarket, updateSupermarket, deleteSupermarket } from '../services/api';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiX, FiMapPin, FiShoppingCart } from 'react-icons/fi';

const REGIONS = ['REGION CENTRE 1', 'REGION CENTRE 02', 'REGION SUD', 'REGION ORIENT', 'REGION NORD'];

const ITEMS_PER_PAGE = 10;

const Supermarkets = () => {
  const { user, isRegion, canManage } = useAuth();
  const navigate = useNavigate();
  const [supermarkets, setSupermarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', region: REGIONS[0] });
  const [filterRegion, setFilterRegion] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

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

  const openAddForm = () => {
    setEditingId(null);
    // Region users: auto-set their region
    if (isRegion()) {
      setFormData({ name: '', region: user.region });
    } else {
      setFormData({ name: '', region: REGIONS[0] });
    }
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = isRegion()
        ? { name: formData.name, region: user.region }
        : formData;

      if (editingId) {
        await updateSupermarket(editingId, dataToSend);
        toast.success('Supermarche modifie avec succes');
      } else {
        await createSupermarket(dataToSend);
        toast.success('Supermarche ajoute avec succes');
      }
      setShowForm(false);
      setEditingId(null);
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

  const totalPages = Math.ceil(filteredSupermarkets.length / ITEMS_PER_PAGE);
  const paginatedSupermarkets = filteredSupermarkets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleFilterChange = (value) => {
    setFilterRegion(value);
    setCurrentPage(1);
  };

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
            {isRegion() ? user.region : 'Toutes les regions'} — {filteredSupermarkets.length} supermarche(s)
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Region filter (for admin/main only) */}
          {canManage() && (
            <select
              value={filterRegion}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="">Toutes les regions</option>
              {REGIONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          )}

          {/* Add button - visible to ALL users */}
          <button
            onClick={openAddForm}
            className="flex items-center space-x-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <FiPlus size={16} />
            <span>Ajouter</span>
          </button>
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

              {/* Region dropdown - only for admin/main, region users get auto-assigned */}
              {isRegion() ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                  <div className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-600">
                    {user.region}
                  </div>
                </div>
              ) : (
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
              )}

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

      {/* Supermarkets Table */}
      {filteredSupermarkets.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm">
          <FiShoppingCart size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">Aucun supermarche trouve</p>
          <button
            onClick={openAddForm}
            className="mt-4 text-green-700 hover:text-green-800 font-medium"
          >
            + Ajouter votre premier supermarche
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-5 font-semibold text-gray-600">Nom</th>
                    <th className="text-left py-3 px-5 font-semibold text-gray-600">Region</th>
                    <th className="text-left py-3 px-5 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSupermarkets.map((supermarket) => (
                    <tr key={supermarket.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-5 text-gray-800 font-medium">{supermarket.name}</td>
                      <td className="py-3 px-5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${regionColor(supermarket.region)}`}>
                          {supermarket.region}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/supermarket/${supermarket.id}`)}
                            className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                          >
                            Voir
                          </button>
                          <button
                            onClick={() => handleEdit(supermarket)}
                            className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDelete(supermarket.id, supermarket.name)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`min-w-[36px] h-9 px-3 rounded text-sm font-medium transition-colors ${
                    page === currentPage
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
  );
};

export default Supermarkets;

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCaracteristique, saveCaracteristique, getInstance } from '../services/api';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';

const TYPES = ['Client', 'Personnel', 'Prestataire'];

const RAYONS = ['Biscuiterie', 'Epicerie', 'DPH', 'Liquide', 'Non alimentaire', 'PF'];

const EMPTY_FORM = {
  type: 'Client',
  nombre: '',
  poursuites: '',
  valeur_kdh: '',
  rayons: [],
  date: '',
};

const MONTHS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const Interpellations = () => {
  const { instanceId } = useParams();
  const navigate = useNavigate();
  const [instance, setInstance] = useState(null);
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [rayonToAdd, setRayonToAdd] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [instanceId]);

  const loadData = async () => {
    try {
      const [instRes, caracRes] = await Promise.all([
        getInstance(instanceId),
        getCaracteristique('interpellations', instanceId)
      ]);
      setInstance(instRes.data);

      if (caracRes.data.exists && caracRes.data.data && caracRes.data.data.entries) {
        setEntries(caracRes.data.data.entries);
      }
    } catch (err) {
      toast.error('Erreur lors du chargement');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const saveEntries = async (newEntries) => {
    setSaving(true);
    try {
      await saveCaracteristique('interpellations', instanceId, { entries: newEntries });
      setEntries(newEntries);
      toast.success('Sauvegardé avec succès');
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();

    if (!form.nombre || !form.date) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }

    const newEntry = {
      type: form.type,
      nombre: Number(form.nombre),
      poursuites: Number(form.poursuites) || 0,
      valeur_kdh: Number(form.valeur_kdh) || 0,
      rayons: form.rayons,
      date: form.date,
    };

    if (editingIndex !== null) {
      const updated = [...entries];
      updated[editingIndex] = newEntry;
      await saveEntries(updated);
      setEditingIndex(null);
    } else {
      await saveEntries([...entries, newEntry]);
    }

    setForm(EMPTY_FORM);
    setRayonToAdd('');
  };

  const handleEdit = (index) => {
    const entry = entries[index];
    const existingRayons = entry.rayons || (entry.rayon ? [entry.rayon] : []);
    setForm({
      type: entry.type,
      nombre: entry.nombre.toString(),
      poursuites: entry.poursuites.toString(),
      valeur_kdh: entry.valeur_kdh.toString(),
      rayons: existingRayons,
      date: entry.date,
    });
    setRayonToAdd('');
    setEditingIndex(index);
  };

  const handleDelete = async (index) => {
    if (!window.confirm('Supprimer cette interpellation ?')) return;
    const updated = entries.filter((_, i) => i !== index);
    await saveEntries(updated);
  };

  const handleCancel = () => {
    setForm(EMPTY_FORM);
    setRayonToAdd('');
    setEditingIndex(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Back button */}
      <button
        onClick={() => navigate(`/instance/${instanceId}`)}
        className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 text-sm mb-4 transition-colors"
      >
        <FiArrowLeft size={16} />
        <span>Retour</span>
      </button>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Interpellations - Instance du Mois</h1>
        {instance && (
          <p className="text-gray-500 text-sm mt-1">
            {instance.supermarket_name} — {MONTHS[instance.month]} {instance.year}
          </p>
        )}
      </div>

      {/* Add/Edit Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          {editingIndex !== null ? 'Modifier l\'interpellation' : 'Ajouter une Interpellation'}
        </h2>

        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de personne</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
            >
              {TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de personnes</label>
              <input
                type="number"
                min="0"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="Nombre de personnes"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Poursuites judiciaires</label>
              <input
                type="number"
                min="0"
                value={form.poursuites}
                onChange={(e) => setForm({ ...form, poursuites: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="Poursuites judiciaires"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valeur marchandise récupérée (KDH)</label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={form.valeur_kdh}
                onChange={(e) => setForm({ ...form, valeur_kdh: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="ex: 2.6"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rayon(s) concerné(s)</label>
              {form.rayons.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.rayons.map((r, i) => (
                    <span key={i} className="inline-flex items-center bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-1 rounded-full">
                      {r}
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, rayons: form.rayons.filter((_, idx) => idx !== i) })}
                        className="ml-1.5 text-amber-600 hover:text-amber-900"
                      >
                        <FiX size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <select
                  value={rayonToAdd}
                  onChange={(e) => setRayonToAdd(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="">-- Sélectionnez un rayon --</option>
                  {RAYONS.filter(r => !form.rayons.includes(r)).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (rayonToAdd && !form.rayons.includes(rayonToAdd)) {
                      setForm({ ...form, rayons: [...form.rayons, rayonToAdd] });
                      setRayonToAdd('');
                    }
                  }}
                  disabled={!rayonToAdd}
                  className="bg-amber-100 hover:bg-amber-200 disabled:bg-gray-100 disabled:text-gray-400 text-amber-700 px-3 py-2.5 rounded-lg transition-colors"
                  title="Ajouter ce rayon"
                >
                  <FiPlus size={18} />
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {editingIndex !== null ? <FiEdit2 size={16} /> : <FiPlus size={16} />}
              <span>{saving ? 'Sauvegarde...' : editingIndex !== null ? 'Modifier' : 'Ajouter'}</span>
            </button>
            {editingIndex !== null && (
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                <FiX size={16} />
                <span>Annuler</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* List of Interpellations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            Liste des Interpellations ({entries.length})
          </h2>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            Aucune interpellation ajoutée
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Nombre</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Poursuites</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Valeur KDH</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Rayon(s)</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr key={index} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-800">{entry.type}</td>
                    <td className="py-3 px-4 text-gray-800">{entry.nombre}</td>
                    <td className="py-3 px-4 text-gray-800">{entry.poursuites}</td>
                    <td className="py-3 px-4 text-gray-800">{entry.valeur_kdh}</td>
                    <td className="py-3 px-4 text-gray-800">
                      {(entry.rayons || (entry.rayon ? [entry.rayon] : [])).map((r, i) => (
                        <span key={i} className="inline-block bg-amber-50 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full mr-1 mb-1">{r}</span>
                      ))}
                    </td>
                    <td className="py-3 px-4 text-gray-800">{entry.date}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(index)}
                          className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        >
                          Éditer
                        </button>
                        <button
                          onClick={() => handleDelete(index)}
                          className="bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
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
        )}
      </div>
    </div>
  );
};

export default Interpellations;

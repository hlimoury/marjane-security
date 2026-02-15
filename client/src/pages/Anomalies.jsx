import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCaracteristique, saveCaracteristique, getInstance } from '../services/api';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';

const CATEGORIES = [
  {
    label: '1. Securite incendie & evacuation',
    subs: ['Issue de secours bloquee', 'Extincteur masque', 'RIA masque'],
  },
  {
    label: '2. Securite des personnes / risques d\'accident',
    subs: ['Sol dangereux', 'Allee encombree', 'Balisage manquant'],
  },
  {
    label: '3. Hygiene & securite alimentaire',
    subs: ['Rupture de la chaine du froid'],
  },
  {
    label: '4. Exploitation commerciale / continuite de service',
    subs: ['Absence au stand boucherie', 'Absence au stand fromagerie', 'Absence au poste poissonnerie', 'Absence au poste de pesee FLEG'],
  },
  {
    label: '5. Image magasin & attractivite commerciale',
    subs: ['Rupture visuelle majeure'],
  },
  {
    label: '6. Discipline & comportement du personnel',
    subs: ['Tenue non conforme', 'Regroupement abusif', 'Utilisation du telephone personnel', 'Comportement indigne du salarie'],
  },
  {
    label: '7. Gestion de la relation client',
    subs: ['File d\'attente critique', 'Conflit visible'],
  },
  {
    label: '8. Sante, securite & conformite EPI',
    subs: ['EPI non porte'],
  },
];

const EMPTY_FORM = {
  date: '',
  heure: '',
  categorie: '',
  sous_categorie: '',
  produits: '',
};

const MONTHS = ['', 'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];

const Anomalies = () => {
  const { instanceId } = useParams();
  const navigate = useNavigate();
  const [instance, setInstance] = useState(null);
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
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
        getCaracteristique('anomalies', instanceId)
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
      await saveCaracteristique('anomalies', instanceId, { entries: newEntries });
      setEntries(newEntries);
      toast.success('Sauvegarde avec succes');
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.date || !form.categorie || !form.sous_categorie) {
      toast.error('Veuillez remplir la date, la categorie et la sous-categorie');
      return;
    }

    const newEntry = { ...form };

    if (editingIndex !== null) {
      const updated = [...entries];
      updated[editingIndex] = newEntry;
      await saveEntries(updated);
      setEditingIndex(null);
    } else {
      await saveEntries([...entries, newEntry]);
    }
    setForm(EMPTY_FORM);
  };

  const handleCategorieChange = (value) => {
    setForm({ ...form, categorie: value, sous_categorie: '' });
  };

  const selectedCategory = CATEGORIES.find(c => c.label === form.categorie);

  const handleEdit = (index) => {
    const entry = entries[index];
    setForm({
      date: entry.date || '',
      heure: entry.heure || '',
      categorie: entry.categorie || '',
      sous_categorie: entry.sous_categorie || '',
      produits: entry.produits || '',
    });
    setEditingIndex(index);
  };

  const handleDelete = async (index) => {
    if (!window.confirm('Supprimer cette anomalie ?')) return;
    const updated = entries.filter((_, i) => i !== index);
    await saveEntries(updated);
  };

  const handleCancel = () => {
    setForm(EMPTY_FORM);
    setEditingIndex(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <button
        onClick={() => navigate(`/instance/${instanceId}`)}
        className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 text-sm mb-4 transition-colors"
      >
        <FiArrowLeft size={16} />
        <span>Retour</span>
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Anomalies Marche</h1>
        {instance && (
          <p className="text-gray-500 text-sm mt-1">
            {instance.supermarket_name} — {MONTHS[instance.month]} {instance.year}
          </p>
        )}
      </div>

      {/* Add/Edit Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          {editingIndex !== null ? 'Modifier l\'anomalie' : 'Ajouter une Anomalie'}
        </h2>

        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de detection</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Heure de detection</label>
              <input
                type="time"
                value={form.heure}
                onChange={(e) => setForm({ ...form, heure: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Anomalie detectee</label>
              <select
                value={form.categorie}
                onChange={(e) => handleCategorieChange(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                required
              >
                <option value="">Choisir...</option>
                {CATEGORIES.map(c => (
                  <option key={c.label} value={c.label}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedCategory && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sous-categorie</label>
              <select
                value={form.sous_categorie}
                onChange={(e) => setForm({ ...form, sous_categorie: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                required
              >
                <option value="">-- Selectionnez --</option>
                {selectedCategory.subs.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Produits (texte libre)</label>
            <input
              type="text"
              value={form.produits}
              onChange={(e) => setForm({ ...form, produits: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
              placeholder="Ex: Tomates, Peche plate, ..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 bg-pink-600 hover:bg-pink-700 disabled:bg-pink-400 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
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

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Liste des Anomalies ({entries.length})</h2>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-10 text-gray-400">Aucune anomalie enregistree.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Heure</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Categorie</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Sous-categorie</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Produits</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr key={index} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-800">{entry.date}</td>
                    <td className="py-3 px-4 text-gray-800">{entry.heure || '-'}</td>
                    <td className="py-3 px-4 text-gray-800">{entry.categorie}</td>
                    <td className="py-3 px-4 text-gray-800">{entry.sous_categorie}</td>
                    <td className="py-3 px-4 text-gray-800">{entry.produits || '-'}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(index)}
                          className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        >
                          Modifier
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

export default Anomalies;

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCaracteristique, saveCaracteristique, getInstance } from '../services/api';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';

const TYPES = [
  'Départ de feu',
  'Agression envers le personnel',
  'Passage des autorités',
  'Sinistre déclaré par un client',
  'Acte de sécurisation',
  'Autre',
];

const SOUS_TYPES_FEU = [
  'Défauts électriques',
  'Équipements de froid',
  'Équipement de cuisson',
  'Actes de malveillance',
  'Accumulation de déchets',
  'Travaux par point chaud',
  'Autres',
];

const EMPTY_FORM = {
  nombre: '',
  type: 'Départ de feu',
  sous_type: '',
  date: '',
  detail: '',
};

const MONTHS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const AutresIncidents = () => {
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
        getCaracteristique('autres_incidents', instanceId)
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
      await saveCaracteristique('autres_incidents', instanceId, { entries: newEntries });
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
      ...form,
      nombre: Number(form.nombre),
      sous_type: form.type === 'Départ de feu' ? form.sous_type : '',
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
  };

  const handleTypeChange = (newType) => {
    setForm({ ...form, type: newType, sous_type: newType === 'Départ de feu' ? form.sous_type : '' });
  };

  const handleEdit = (index) => {
    const entry = entries[index];
    setForm({
      nombre: entry.nombre.toString(),
      type: entry.type,
      sous_type: entry.sous_type || '',
      date: entry.date,
      detail: entry.detail || '',
    });
    setEditingIndex(index);
  };

  const handleDelete = async (index) => {
    if (!window.confirm('Supprimer cet incident ?')) return;
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
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
        <h1 className="text-2xl font-bold text-gray-800">Autres Incidents</h1>
        {instance && (
          <p className="text-gray-500 text-sm mt-1">
            {instance.supermarket_name} — {MONTHS[instance.month]} {instance.year}
          </p>
        )}
      </div>

      {/* Add/Edit Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          {editingIndex !== null ? 'Modifier l\'incident' : 'Ajouter un Incident'}
        </h2>

        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre d'incidents</label>
            <input
              type="number"
              min="0"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type d'incident</label>
            <select
              value={form.type}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            >
              {TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Conditional sub-type for "Depart de feu" */}
          {form.type === 'Départ de feu' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de départ de feu</label>
              <select
                value={form.sous_type}
                onChange={(e) => setForm({ ...form, sous_type: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              >
                <option value="">-- Sélectionnez le sous-type --</option>
                {SOUS_TYPES_FEU.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Détail</label>
            <input
              type="text"
              value={form.detail}
              onChange={(e) => setForm({ ...form, detail: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="Détail de l'incident"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
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
          <h2 className="text-lg font-semibold text-gray-800">Liste des Incidents ({entries.length})</h2>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-10 text-gray-400">Aucun incident ajouté</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Nombre</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Sous-type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Détail</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr key={index} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-800">{entry.nombre}</td>
                    <td className="py-3 px-4 text-gray-800">{entry.type}</td>
                    <td className="py-3 px-4 text-gray-800">{entry.sous_type || '-'}</td>
                    <td className="py-3 px-4 text-gray-800">{entry.date}</td>
                    <td className="py-3 px-4 text-gray-800">{entry.detail || '-'}</td>
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

export default AutresIncidents;

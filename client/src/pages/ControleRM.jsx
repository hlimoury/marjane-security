import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCaracteristique, saveCaracteristique, getInstance } from '../services/api';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';

const TYPE_OPTIONS = [
  { value: 'entrepot', label: 'Contrôle entrepôt' },
  { value: 'fournisseurs_direct', label: 'Contrôle fournisseurs direct' },
];

const SOUS_TYPES_ENTREPOT = ['PGC', 'Marché', 'N.AL'];
const SOUS_TYPES_FOURNISSEURS = ['PGC', 'Marché'];

const MONTHS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const ControleRM = () => {
  const { instanceId } = useParams();
  const navigate = useNavigate();
  const [instance, setInstance] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const [formType, setFormType] = useState('');
  const [formSousTypes, setFormSousTypes] = useState([]);
  const [formValues, setFormValues] = useState({});

  useEffect(() => { loadData(); }, [instanceId]);

  const loadData = async () => {
    try {
      const [instRes, caracRes] = await Promise.all([
        getInstance(instanceId),
        getCaracteristique('controle_rm', instanceId)
      ]);
      setInstance(instRes.data);
      if (caracRes.data.exists && caracRes.data.data?.entries) {
        setEntries(caracRes.data.data.entries);
      } else {
        setEntries([]);
      }
    } catch (err) {
      toast.error('Erreur lors du chargement');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const sousTypesForType = (type) => {
    if (type === 'entrepot') return SOUS_TYPES_ENTREPOT;
    if (type === 'fournisseurs_direct') return SOUS_TYPES_FOURNISSEURS;
    return [];
  };

  const handleTypeChange = (value) => {
    setFormType(value);
    setFormSousTypes([]);
    setFormValues({});
    setEditingIndex(null);
  };

  const toggleSousType = (st) => {
    setFormSousTypes(prev => {
      if (prev.includes(st)) {
        const next = prev.filter(s => s !== st);
        setFormValues(v => {
          const copy = { ...v };
          delete copy[st];
          return copy;
        });
        return next;
      }
      return [...prev, st];
    });
  };

  const updateFormValue = (sousType, field, val) => {
    setFormValues(prev => ({
      ...prev,
      [sousType]: {
        ...(prev[sousType] || { valeur_ecart_negatif: '', valeur_ecart_positif: '', date: '' }),
        [field]: val
      }
    }));
  };

  const getFormValue = (sousType, field) => {
    return formValues[sousType]?.[field] ?? '';
  };

  const saveEntries = async (newEntries) => {
    setSaving(true);
    try {
      await saveCaracteristique('controle_rm', instanceId, { entries: newEntries });
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
    if (!formType || formSousTypes.length === 0) {
      toast.error('Sélectionnez le type et au moins un sous-type (PGC, Marché ou N.AL)');
      return;
    }

    const newRows = [];
    for (const st of formSousTypes) {
      const v = formValues[st];
      if (!v?.date) {
        toast.error(`Date obligatoire pour ${st}`);
        return;
      }
      newRows.push({
        type: formType,
        sous_type: st,
        valeur_ecart_negatif: v?.valeur_ecart_negatif ?? '',
        valeur_ecart_positif: v?.valeur_ecart_positif ?? '',
        date: v?.date ?? ''
      });
    }

    if (editingIndex !== null) {
      const updated = [...entries];
      updated.splice(editingIndex, 1, ...newRows);
      await saveEntries(updated);
      setEditingIndex(null);
    } else {
      await saveEntries([...entries, ...newRows]);
    }

    setFormType('');
    setFormSousTypes([]);
    setFormValues({});
  };

  const handleEdit = (index) => {
    const entry = entries[index];
    setFormType(entry.type);
    setFormSousTypes([entry.sous_type]);
    setFormValues({
      [entry.sous_type]: {
        valeur_ecart_negatif: entry.valeur_ecart_negatif ?? '',
        valeur_ecart_positif: entry.valeur_ecart_positif ?? '',
        date: entry.date ?? ''
      }
    });
    setEditingIndex(index);
  };

  const handleDelete = async (index) => {
    if (!window.confirm('Supprimer cette entrée ?')) return;
    const updated = entries.filter((_, i) => i !== index);
    await saveEntries(updated);
  };

  const handleCancel = () => {
    setFormType('');
    setFormSousTypes([]);
    setFormValues({});
    setEditingIndex(null);
  };

  const getTypeLabel = (v) => TYPE_OPTIONS.find(t => t.value === v)?.label ?? v;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const sousTypes = sousTypesForType(formType);

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
        <h1 className="text-2xl font-bold text-gray-800">Contrôle RM</h1>
        {instance && (
          <p className="text-gray-500 text-sm mt-1">
            {instance.supermarket_name} — {MONTHS[instance.month]} {instance.year}
          </p>
        )}
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          {editingIndex !== null ? "Modifier l'entrée" : 'Ajouter une entrée'}
        </h2>

        <form onSubmit={handleAdd} className="space-y-5">
          {/* 1. Type principal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type de contrôle</label>
            <select
              value={formType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              required
            >
              <option value="">— Sélectionnez le type —</option>
              {TYPE_OPTIONS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* 2. Sous-types (checkboxes) */}
          {formType && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sous-type(s)</label>
              <p className="text-xs text-gray-500 mb-2">
                {formType === 'fournisseurs_direct' ? 'Choisissez PGC et/ou Marché' : 'Choisissez un, deux ou trois'}
              </p>
              <div className="flex flex-wrap gap-4">
                {sousTypes.map(st => (
                  <label key={st} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formSousTypes.includes(st)}
                      onChange={() => toggleSousType(st)}
                      className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{st}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 3. Champs pour chaque sous-type sélectionné */}
          {formSousTypes.length > 0 && (
            <div className="space-y-6 border-t border-gray-200 pt-5">
              {formSousTypes.map(st => (
                <div key={st} className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-800">{st}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Valeur d'écart négatif</label>
                      <input
                        type="number"
                        step="any"
                        value={getFormValue(st, 'valeur_ecart_negatif')}
                        onChange={(e) => updateFormValue(st, 'valeur_ecart_negatif', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Valeur d'écart positif</label>
                      <input
                        type="number"
                        step="any"
                        value={getFormValue(st, 'valeur_ecart_positif')}
                        onChange={(e) => updateFormValue(st, 'valeur_ecart_positif', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                      <input
                        type="date"
                        value={getFormValue(st, 'date')}
                        onChange={(e) => updateFormValue(st, 'date', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
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

      {/* Liste des entrées */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Liste des entrées ({entries.length})</h2>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-10 text-gray-400">Aucune entrée enregistrée.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {entries.map((entry, index) => (
              <div key={index} className="p-4 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Type</span>
                    <p className="font-medium text-gray-800">{getTypeLabel(entry.type)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Sous-type</span>
                    <p className="font-medium text-gray-800">{entry.sous_type}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Écart négatif</span>
                    <p className="font-medium text-gray-800">{entry.valeur_ecart_negatif ?? '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Écart positif</span>
                    <p className="font-medium text-gray-800">{entry.valeur_ecart_positif ?? '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Date</span>
                    <p className="font-medium text-gray-800">{entry.date ?? '-'}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleEdit(index)}
                    className="bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-medium"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(index)}
                    className="bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ControleRM;

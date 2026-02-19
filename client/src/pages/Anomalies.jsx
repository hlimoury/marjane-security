import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCaracteristique, saveCaracteristique, getInstance } from '../services/api';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';

const AXES = [
  {
    key: 'axe1',
    label: 'AXE 1 — Hygiene & Nuisibles',
    subs: [
      'Sol sale',
      'Cagettes / supports sales',
      'Dechets visibles en surface de vente',
      'Moucherons',
      'Insectes rampants',
      'Rongeurs',
    ],
  },
  {
    key: 'axe2',
    label: 'AXE 2 — Disponibilite & Qualite Produit',
    subs: [
      'Produit abime',
      'Produit perime',
      'Rupture rayon Marche (Fruits & Legumes)',
      'Rupture rayon Epicerie',
      'Rupture rayon Boucherie',
      'Rupture rayon Fromage',
      'Rupture multiple rayons',
    ],
  },
  {
    key: 'axe3',
    label: 'AXE 3 — Securite & Organisation',
    subs: [
      'Allee bloquee',
      'Palette dangereuse',
      'Issue de secours obstruee',
      'Moyens d\'incendie bloques',
      'Sol glissant',
      'Reserve non rangee',
      'Frigo encombre',
      'Porte frigo ouverte',
    ],
  },
  {
    key: 'axe4',
    label: 'AXE 4 — Experience Client & Climat Interne',
    subs: [
      'Attente critique stand fromage',
      'Attente critique stand boucherie',
      'Attente critique Balance FLEG',
      'File d\'attente critique caisses',
      'Nombre de caisses ouvertes insuffisant',
      'Conflit visible entre salaries',
      'Comportement non professionnel',
    ],
  },
];

const CRITICITE_OPTIONS = [
  { value: 'Critique', label: 'Critique', desc: 'Risque immediat client / image enseigne / securite', color: 'red' },
  { value: 'Majeur', label: 'Majeur', desc: '', color: 'orange' },
  { value: 'Modere', label: 'Modere', desc: '', color: 'yellow' },
];

const CORRECTION_OPTIONS = [
  'Correction immediate (moins de 15 min)',
  'Correction rapide (15 a 30 min)',
  'Correction tardive (+ 30 min)',
  'Non corrige dans la journee',
];

const EMPTY_FORM = {
  date: '',
  axe: '',
  sous_categories: [],
  criticite: '',
  heure_detection: '',
  heure_information: '',
  heure_prise_en_charge: '',
  heure_conformite: '',
  correction: '',
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

  useEffect(() => { loadData(); }, [instanceId]);

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
    if (!form.date || !form.axe || form.sous_categories.length === 0) {
      toast.error('Veuillez remplir la date, l\'axe et au moins une sous-categorie');
      return;
    }
    if (!form.criticite) {
      toast.error('Veuillez selectionner le niveau de criticite');
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

  const handleAxeChange = (value) => {
    setForm({ ...form, axe: value, sous_categories: [] });
  };

  const toggleSousCategorie = (sub) => {
    setForm(prev => {
      const exists = prev.sous_categories.includes(sub);
      return {
        ...prev,
        sous_categories: exists
          ? prev.sous_categories.filter(s => s !== sub)
          : [...prev.sous_categories, sub],
      };
    });
  };

  const selectedAxe = AXES.find(a => a.key === form.axe);

  const handleEdit = (index) => {
    const entry = entries[index];
    setForm({
      date: entry.date || '',
      axe: entry.axe || '',
      sous_categories: entry.sous_categories || [],
      criticite: entry.criticite || '',
      heure_detection: entry.heure_detection || '',
      heure_information: entry.heure_information || '',
      heure_prise_en_charge: entry.heure_prise_en_charge || '',
      heure_conformite: entry.heure_conformite || '',
      correction: entry.correction || '',
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

  const getAxeLabel = (key) => AXES.find(a => a.key === key)?.label || key;

  const getCriticiteColor = (val) => {
    if (val === 'Critique') return 'bg-red-100 text-red-700';
    if (val === 'Majeur') return 'bg-orange-100 text-orange-700';
    if (val === 'Modere') return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
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
        <h1 className="text-2xl font-bold text-gray-800">Anomalies Marche</h1>
        {instance && (
          <p className="text-gray-500 text-sm mt-1">
            {instance.supermarket_name} — {MONTHS[instance.month]} {instance.year}
          </p>
        )}
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          {editingIndex !== null ? 'Modifier l\'anomalie' : 'Ajouter une Anomalie'}
        </h2>

        <form onSubmit={handleAdd} className="space-y-5">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de detection</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full sm:w-64 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
              required
            />
          </div>

          {/* 1. Anomalie detectee — AXE selection */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">1. Categorie d'anomalie constatee</h3>
            <select
              value={form.axe}
              onChange={(e) => handleAxeChange(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
              required
            >
              <option value="">-- Selectionnez un axe --</option>
              {AXES.map(a => (
                <option key={a.key} value={a.key}>{a.label}</option>
              ))}
            </select>

            {selectedAxe && (
              <div className="mt-3 pl-1 space-y-2">
                <p className="text-xs text-gray-500 font-medium mb-1">Cochez les anomalies constatees :</p>
                {selectedAxe.subs.map(sub => (
                  <label key={sub} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={form.sous_categories.includes(sub)}
                      onChange={() => toggleSousCategorie(sub)}
                      className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">{sub}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* 5. Niveau de criticite */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">2. Niveau de criticite</h3>
            <div className="space-y-2">
              {CRITICITE_OPTIONS.map(opt => (
                <label key={opt.value} className="flex items-start gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="criticite"
                    value={opt.value}
                    checked={form.criticite === opt.value}
                    onChange={(e) => setForm({ ...form, criticite: e.target.value })}
                    className="mt-0.5 w-4 h-4 border-gray-300 text-pink-600 focus:ring-pink-500"
                  />
                  <div>
                    <span className={`text-sm font-medium ${
                      opt.color === 'red' ? 'text-red-700' : opt.color === 'orange' ? 'text-orange-700' : 'text-yellow-700'
                    }`}>
                      {opt.label}
                    </span>
                    {opt.desc && (
                      <span className="text-xs text-gray-400 ml-1">({opt.desc})</span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 6. Reaction du magasin */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">3. Reaction du magasin</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Heure de detection de l'anomalie</label>
                <input
                  type="time"
                  value={form.heure_detection}
                  onChange={(e) => setForm({ ...form, heure_detection: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Heure d'information du magasin</label>
                <input
                  type="time"
                  value={form.heure_information}
                  onChange={(e) => setForm({ ...form, heure_information: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Heure de prise en charge effective</label>
                <input
                  type="time"
                  value={form.heure_prise_en_charge}
                  onChange={(e) => setForm({ ...form, heure_prise_en_charge: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Heure de mise en conformite constatee</label>
                <input
                  type="time"
                  value={form.heure_conformite}
                  onChange={(e) => setForm({ ...form, heure_conformite: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none text-sm"
                />
              </div>
            </div>

            <p className="text-xs font-medium text-gray-600 mb-2">Type de correction :</p>
            <div className="space-y-2">
              {CORRECTION_OPTIONS.map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="correction"
                    value={opt}
                    checked={form.correction === opt}
                    onChange={(e) => setForm({ ...form, correction: e.target.value })}
                    className="w-4 h-4 border-gray-300 text-pink-600 focus:ring-pink-500"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit */}
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
          <div className="divide-y divide-gray-100">
            {entries.map((entry, index) => (
              <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  {/* Left: details */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">{entry.date}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getCriticiteColor(entry.criticite)}`}>
                        {entry.criticite || '-'}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 font-medium">{getAxeLabel(entry.axe)}</p>

                    {entry.sous_categories && entry.sous_categories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {entry.sous_categories.map((sub, i) => (
                          <span key={i} className="inline-block bg-pink-50 text-pink-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            {sub}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      {entry.heure_detection && <span>Detection: {entry.heure_detection}</span>}
                      {entry.heure_information && <span>Information: {entry.heure_information}</span>}
                      {entry.heure_prise_en_charge && <span>Prise en charge: {entry.heure_prise_en_charge}</span>}
                      {entry.heure_conformite && <span>Conformite: {entry.heure_conformite}</span>}
                    </div>

                    {entry.correction && (
                      <p className="text-xs text-gray-500">
                        <span className="font-medium">Correction:</span> {entry.correction}
                      </p>
                    )}
                  </div>

                  {/* Right: actions */}
                  <div className="flex gap-2 shrink-0">
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Anomalies;

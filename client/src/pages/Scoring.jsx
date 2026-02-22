import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSupermarketScoring, saveSupermarketScoring, getInstance } from '../services/api';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';

const SECTIONS = [
  {
    key: 'securite_incendie',
    label: 'Sécurité Incendie',
    indicateurs: ['Risque Incendie', 'Extincteurs+RIA', 'Désenfumage+Évacuation'],
  },
  {
    key: 'securite_sante_travail',
    label: 'Sécurité et Santé au Travail',
    indicateurs: ['Organisation Sécurité', 'Risque Électrique', 'RM+Réserve+Frigos+Labos', 'Mise en Rayon+Caisse', 'Locaux Sociaux'],
  },
  {
    key: 'surete',
    label: 'Sûreté',
    indicateurs: ['Vidéosurveillance+Intrusion', 'Flux des biens et des personnes', 'Registres Sécurité', 'Sûreté et Sécurité Station Service', 'Sécurité des Fonds'],
  },
];

const MONTHS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const Scoring = () => {
  const { instanceId } = useParams();
  const navigate = useNavigate();
  const [instance, setInstance] = useState(null);
  const [data, setData] = useState({
    securite_incendie: [],
    securite_sante_travail: [],
    surete: [],
  });
  const [forms, setForms] = useState({
    securite_incendie: { sous_indicateur: '', niveau: '', objectif: '' },
    securite_sante_travail: { sous_indicateur: '', niveau: '', objectif: '' },
    surete: { sous_indicateur: '', niveau: '', objectif: '' },
  });
  const [editingIndex, setEditingIndex] = useState({
    securite_incendie: null,
    securite_sante_travail: null,
    surete: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [instanceId]);

  const loadData = async () => {
    try {
      const instRes = await getInstance(instanceId);
      setInstance(instRes.data);

      const supermarketId = instRes.data.supermarket_id;
      const caracRes = await getSupermarketScoring(supermarketId);

      if (caracRes.data.exists && caracRes.data.data) {
        setData({
          securite_incendie: caracRes.data.data.securite_incendie || [],
          securite_sante_travail: caracRes.data.data.securite_sante_travail || [],
          surete: caracRes.data.data.surete || [],
        });
      }
    } catch (err) {
      toast.error('Erreur lors du chargement');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const saveAll = async (newData) => {
    setSaving(true);
    try {
      await saveSupermarketScoring(instance.supermarket_id, newData);
      setData(newData);
      toast.success('Sauvegardé avec succès');
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (sectionKey, e) => {
    e.preventDefault();
    const form = forms[sectionKey];
    if (!form.sous_indicateur || form.niveau === '' || form.objectif === '') {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    const newEntry = {
      sous_indicateur: form.sous_indicateur,
      niveau: parseFloat(form.niveau),
      objectif: parseFloat(form.objectif),
    };

    const newData = { ...data };
    if (editingIndex[sectionKey] !== null) {
      const updated = [...data[sectionKey]];
      updated[editingIndex[sectionKey]] = newEntry;
      newData[sectionKey] = updated;
      setEditingIndex({ ...editingIndex, [sectionKey]: null });
    } else {
      newData[sectionKey] = [...data[sectionKey], newEntry];
    }

    await saveAll(newData);
    setForms({ ...forms, [sectionKey]: { sous_indicateur: '', niveau: '', objectif: '' } });
  };

  const handleEdit = (sectionKey, index) => {
    const entry = data[sectionKey][index];
    setForms({
      ...forms,
      [sectionKey]: {
        sous_indicateur: entry.sous_indicateur,
        niveau: entry.niveau.toString(),
        objectif: entry.objectif.toString(),
      },
    });
    setEditingIndex({ ...editingIndex, [sectionKey]: index });
  };

  const handleDelete = async (sectionKey, index) => {
    if (!window.confirm('Supprimer cet indicateur ?')) return;
    const newData = { ...data };
    newData[sectionKey] = data[sectionKey].filter((_, i) => i !== index);
    await saveAll(newData);
  };

  const handleCancel = (sectionKey) => {
    setForms({ ...forms, [sectionKey]: { sous_indicateur: '', niveau: '', objectif: '' } });
    setEditingIndex({ ...editingIndex, [sectionKey]: null });
  };

  const calcEcart = (niveau, objectif) => {
    const ecart = niveau - objectif;
    const sign = ecart >= 0 ? '+' : '';
    return `${sign}${ecart.toFixed(2)}%`;
  };

  const ecartColor = (niveau, objectif) => {
    const ecart = niveau - objectif;
    if (ecart > 0) return 'text-green-600';
    if (ecart < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const sectionAvg = (sectionKey, field) => {
    const entries = data[sectionKey];
    if (entries.length === 0) return 0;
    const sum = entries.reduce((acc, e) => acc + e[field], 0);
    return sum / entries.length;
  };

  const globalAvg = (field) => {
    const allEntries = [...data.securite_incendie, ...data.securite_sante_travail, ...data.surete];
    if (allEntries.length === 0) return 0;
    const sum = allEntries.reduce((acc, e) => acc + e[field], 0);
    return sum / allEntries.length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <button
        onClick={() => navigate(`/instance/${instanceId}`)}
        className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 text-sm mb-4 transition-colors"
      >
        <FiArrowLeft size={16} />
        <span>Retour</span>
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Scoring</h1>
        {instance && (
          <p className="text-gray-500 text-sm mt-1">
            {instance.supermarket_name} — Commun à toutes les instances
          </p>
        )}
      </div>

      {/* 3 Sections */}
      {SECTIONS.map((section) => (
        <div key={section.key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">{section.label}</h2>

          {/* Form row */}
          <form onSubmit={(e) => handleAdd(section.key, e)} className="flex flex-wrap items-end gap-3 mb-5">
            <div>
              <select
                value={forms[section.key].sous_indicateur}
                onChange={(e) => setForms({ ...forms, [section.key]: { ...forms[section.key], sous_indicateur: e.target.value } })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none text-sm"
              >
                <option value="">Sélectionnez un indicateur</option>
                {section.indicateurs.map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
            <div>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="Niveau"
                value={forms[section.key].niveau}
                onChange={(e) => setForms({ ...forms, [section.key]: { ...forms[section.key], niveau: e.target.value } })}
                className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none text-sm"
              />
            </div>
            <div>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="Objectif"
                value={forms[section.key].objectif}
                onChange={(e) => setForms({ ...forms, [section.key]: { ...forms[section.key], objectif: e.target.value } })}
                className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {editingIndex[section.key] !== null ? <FiEdit2 size={14} /> : <FiPlus size={14} />}
              <span>{editingIndex[section.key] !== null ? 'Modifier' : 'Ajouter'}</span>
            </button>
            {editingIndex[section.key] !== null && (
              <button
                type="button"
                onClick={() => handleCancel(section.key)}
                className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <FiX size={14} />
                <span>Annuler</span>
              </button>
            )}
          </form>

          {/* Table */}
          {data[section.key].length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">Aucun indicateur ajouté</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Sous-indicateur</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Niveau</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Objectif</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Écart</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data[section.key].map((entry, index) => (
                    <tr key={index} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-800">{entry.sous_indicateur}</td>
                      <td className="py-3 px-4 text-gray-800">{entry.niveau.toFixed(2)}%</td>
                      <td className="py-3 px-4 text-gray-800">{entry.objectif.toFixed(2)}%</td>
                      <td className={`py-3 px-4 font-medium ${ecartColor(entry.niveau, entry.objectif)}`}>
                        {calcEcart(entry.niveau, entry.objectif)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(section.key, index)}
                            className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                          >
                            Éditer
                          </button>
                          <button
                            onClick={() => handleDelete(section.key, index)}
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
      ))}

      {/* Global Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Niveau de Sécurité Global</h2>
        <p className="text-gray-500 text-sm mb-4">(Voici la moyenne des pourcentages de chaque section)</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Thème</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Niveau (%)</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Objectifs (%)</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Écart (%)</th>
              </tr>
            </thead>
            <tbody>
              {SECTIONS.map((section) => {
                const avgNiveau = sectionAvg(section.key, 'niveau');
                const avgObjectif = sectionAvg(section.key, 'objectif');
                return (
                  <tr key={section.key} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-800">{section.label}</td>
                    <td className="py-3 px-4 text-gray-800">{avgNiveau.toFixed(2)}%</td>
                    <td className="py-3 px-4 text-gray-800">{avgObjectif.toFixed(2)}%</td>
                    <td className={`py-3 px-4 font-medium ${ecartColor(avgNiveau, avgObjectif)}`}>
                      {calcEcart(avgNiveau, avgObjectif)}
                    </td>
                  </tr>
                );
              })}
              {/* Global row */}
              <tr className="bg-gray-50 font-bold">
                <td className="py-3 px-4 text-gray-900">Niveau de Sécurité Global</td>
                <td className="py-3 px-4 text-gray-900">{globalAvg('niveau').toFixed(2)}%</td>
                <td className="py-3 px-4 text-gray-900">{globalAvg('objectif').toFixed(2)}%</td>
                <td className={`py-3 px-4 font-bold ${ecartColor(globalAvg('niveau'), globalAvg('objectif'))}`}>
                  {calcEcart(globalAvg('niveau'), globalAvg('objectif'))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Scoring;

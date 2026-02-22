import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCaracteristique, saveCaracteristique, getInstance } from '../services/api';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';

const MOTIFS = [
  'Produit périmé',
  'Produit impropre (abîmé, moisi, odeur suspecte, rupture de la chaîne du froid)',
  'Produits endommagés (emballage déchiré, boîte cabossée, etc.)',
  'Produits non conformes (étiquette, poids indiqué, etc.)',
  'Produit manquant dans un pack ou une boîte',
  'Erreur de prix en caisse (écart entre prix affiché et facture)',
  'Promotions non appliquées ou mal expliquées',
  'Attente trop longue aux caisses',
  'Erreur de rendu monnaie',
  'Problème avec les moyens de paiement (CB, chèques, bons d\'achat, cartes de fidélité...)',
  'Double facturation ou oubli d\'annulation d\'un article',
  'Manque d\'accueil (courtoisie, indifférence)',
  'Comportement inapproprié d\'un employé ou agent de sécurité',
  'Manque de disponibilité du personnel pour aider',
  'Hygiène insuffisante (sol, odeurs, toilettes, etc.)',
  'Hygiène et nuisibles (présence de cafards, moucherons, charançons, rats, souris)',
  'Sécurité du magasin (vols, sentiment d\'insécurité)',
  'Problèmes de stationnement (parking plein, sécurité, produits manquants)',
  'Nuisances sonores (musique trop forte, annonces trop fréquentes)',
];

// Conditional detail options per motif
const DETAILS_MAP = {
  'Produit impropre (abîmé, moisi, odeur suspecte, rupture de la chaîne du froid)': ['Abîmé', 'Moisi', 'Odeur suspecte', 'Rupture de la chaîne du froid', 'Autre'],
  'Produits endommagés (emballage déchiré, boîte cabossée, etc.)': ['Emballage déchiré', 'Boîte cabossée', 'Scellé endommagé', 'Autre'],
  'Produits non conformes (étiquette, poids indiqué, etc.)': ['Étiquette', 'Poids indiqué', 'Autre'],
  'Erreur de prix en caisse (écart entre prix affiché et facture)': ['Écart entre prix affiché et facture'],
  'Problème avec les moyens de paiement (CB, chèques, bons d\'achat, cartes de fidélité...)': ['Carte bancaire (CB)', 'Chèque', 'Bon d\'achat', 'Carte de fidélité', 'Autre'],
  'Manque d\'accueil (courtoisie, indifférence)': ['Courtoisie', 'Indifférence', 'Autre'],
  'Hygiène insuffisante (sol, odeurs, toilettes, etc.)': ['Sol', 'Odeurs', 'Toilettes', 'Autre'],
  'Hygiène et nuisibles (présence de cafards, moucherons, charançons, rats, souris)': ['Cafards', 'Moucherons', 'Charançons', 'Rats', 'Souris', 'Autre'],
  'Sécurité du magasin (vols, sentiment d\'insécurité)': ['Vols', 'Sentiment d\'insécurité', 'Autre'],
  'Problèmes de stationnement (parking plein, sécurité, produits manquants)': ['Parking plein', 'Sécurité du parking', 'Signalisation', 'Autre'],
  'Nuisances sonores (musique trop forte, annonces trop fréquentes)': ['Musique trop forte', 'Annonces trop fréquentes', 'Autre'],
};

// Motifs that show the product designation field
const PRODUCT_MOTIFS = [
  'Produit périmé',
  'Produit impropre (abîmé, moisi, odeur suspecte, rupture de la chaîne du froid)',
  'Produits endommagés (emballage déchiré, boîte cabossée, etc.)',
  'Produits non conformes (étiquette, poids indiqué, etc.)',
  'Produit manquant dans un pack ou une boîte',
];

const EMPTY_FORM = {
  motif: MOTIFS[0],
  detail: '',
  designation_produit: '',
  date_heure: '',
  action: '',
  statut: 'Non traité',
};

const MONTHS_NAMES = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const Reclamations = () => {
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
        getCaracteristique('reclamations', instanceId)
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
      await saveCaracteristique('reclamations', instanceId, { entries: newEntries });
      setEntries(newEntries);
      toast.success('Sauvegardé avec succès');
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleMotifChange = (newMotif) => {
    setForm({ ...form, motif: newMotif, detail: '', designation_produit: '' });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.date_heure) { toast.error('Veuillez remplir la date'); return; }

    const newEntry = {
      ...form,
      detail: DETAILS_MAP[form.motif] ? form.detail : '',
      designation_produit: PRODUCT_MOTIFS.includes(form.motif) ? form.designation_produit : '',
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

  const handleEdit = (index) => {
    setForm({ ...entries[index] });
    setEditingIndex(index);
  };

  const handleDelete = async (index) => {
    if (!window.confirm('Supprimer cette réclamation ?')) return;
    await saveEntries(entries.filter((_, i) => i !== index));
  };

  const hasDetails = DETAILS_MAP[form.motif];
  const showProduct = PRODUCT_MOTIFS.includes(form.motif);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  // Shorten motif for table display
  const shortMotif = (m) => m.length > 30 ? m.substring(0, 30) + '...' : m;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <button onClick={() => navigate(`/instance/${instanceId}`)} className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 text-sm mb-4 transition-colors">
        <FiArrowLeft size={16} /><span>Retour</span>
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Réclamations</h1>
        {instance && <p className="text-gray-500 text-sm mt-1">{instance.supermarket_name} — {MONTHS_NAMES[instance.month]} {instance.year}</p>}
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          {editingIndex !== null ? 'Modifier la réclamation' : 'Ajouter une Réclamation'}
        </h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motif de la réclamation</label>
            <select value={form.motif} onChange={(e) => handleMotifChange(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm">
              {MOTIFS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {hasDetails && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Détail</label>
              <select value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
                <option value="">-- Sélectionnez --</option>
                {DETAILS_MAP[form.motif].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}

          {showProduct && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Designation du produit (optionnel)</label>
              <input type="text" value={form.designation_produit} onChange={(e) => setForm({ ...form, designation_produit: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Ex: Yaourt, Boite de conserve..." />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date et heure de la réclamation</label>
            <input type="datetime-local" value={form.date_heure} onChange={(e) => setForm({ ...form, date_heure: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action entreprise</label>
            <textarea value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-y min-h-[60px]"
              placeholder="Action entreprise (échange, remboursement, etc.)" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
              <option value="Non traité">Non traité</option>
              <option value="En cours">En cours</option>
              <option value="Traité">Traité</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
              {editingIndex !== null ? <FiEdit2 size={16} /> : <FiPlus size={16} />}
              <span>{saving ? 'Sauvegarde...' : editingIndex !== null ? 'Modifier' : 'Ajouter'}</span>
            </button>
            {editingIndex !== null && (
              <button type="button" onClick={() => { setForm(EMPTY_FORM); setEditingIndex(null); }}
                className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
                <FiX size={16} /><span>Annuler</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Liste des Réclamations ({entries.length})</h2>
        </div>
        {entries.length === 0 ? (
          <div className="text-center py-10 text-gray-400">Aucune réclamation ajoutée</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">Date & Heure</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">Motif</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">Détail</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">Designation Produit</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">Action</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">Statut</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr key={index} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-3 text-gray-800 whitespace-nowrap">{entry.date_heure ? new Date(entry.date_heure).toLocaleString('fr-FR') : '-'}</td>
                    <td className="py-3 px-3 text-gray-800" title={entry.motif}>{shortMotif(entry.motif)}</td>
                    <td className="py-3 px-3 text-gray-800">{entry.detail || '-'}</td>
                    <td className="py-3 px-3 text-gray-800">{entry.designation_produit || '-'}</td>
                    <td className="py-3 px-3 text-gray-800">{entry.action || '-'}</td>
                    <td className="py-3 px-3 text-gray-800">{entry.statut}</td>
                    <td className="py-3 px-3">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(index)} className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">Modifier</button>
                        <button onClick={() => handleDelete(index)} className="bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">Supprimer</button>
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

export default Reclamations;

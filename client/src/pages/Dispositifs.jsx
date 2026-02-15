import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCaracteristique, saveCaracteristique, getInstance } from '../services/api';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiEdit2, FiRefreshCw, FiSave, FiX } from 'react-icons/fi';

const FIELDS = [
  { key: 'extincteurs', label: 'Extincteurs', type: 'number' },
  { key: 'ria', label: 'RIA', type: 'number' },
  { key: 'portes_coupe_feu', label: 'Portes coupe-feu', type: 'number' },
  { key: 'issues_de_secours', label: 'Issues de secours', type: 'number' },
  { key: 'skydomes', label: 'Skydomes', type: 'number' },
  { key: 'cameras', label: 'Cameras', type: 'number' },
  { key: 'nvr_dvr', label: 'NVR/DVR', type: 'number' },
  { key: 'ads', label: 'ADS', type: 'decimal' },
  { key: 'superviseurs_securite', label: 'Superviseur(s) de Securite', type: 'number' },
  { key: 'renfort_securite', label: 'Renfort Securite', type: 'number' },
  { key: 'periode_renfort', label: 'Periode du Renfort', type: 'number', suffix: 'jours' },
];

const DEFAULT_DATA = FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: 0 }), {});

const MONTHS = ['', 'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];

const Dispositifs = () => {
  const { instanceId } = useParams();
  const navigate = useNavigate();
  const [instance, setInstance] = useState(null);
  const [data, setData] = useState(DEFAULT_DATA);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [instanceId]);

  const loadData = async () => {
    try {
      const [instRes, caracRes] = await Promise.all([
        getInstance(instanceId),
        getCaracteristique('dispositifs', instanceId)
      ]);
      setInstance(instRes.data);

      if (caracRes.data.exists && caracRes.data.data) {
        setData({ ...DEFAULT_DATA, ...caracRes.data.data });
      }
    } catch (err) {
      toast.error('Erreur lors du chargement');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveCaracteristique('dispositifs', instanceId, data);
      toast.success('Dispositifs sauvegardes avec succes');
      setEditing(false);
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!window.confirm('Reinitialiser toutes les valeurs a 0 ?')) return;
    setData(DEFAULT_DATA);
    setEditing(true);
  };

  const handleChange = (key, value) => {
    setData(prev => ({ ...prev, [key]: value === '' ? '' : Number(value) }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
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
        <h1 className="text-2xl font-bold text-gray-800">Dispositifs de Securite et Surete</h1>
        {instance && (
          <p className="text-gray-500 text-sm mt-1">
            {instance.supermarket_name} — {MONTHS[instance.month]} {instance.year}
          </p>
        )}
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Dispositifs Actuel</h2>
        </div>

        <div className="divide-y divide-gray-50">
          {FIELDS.map((field) => (
            <div key={field.key} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50">
              <label className="font-medium text-gray-700 text-sm">{field.label}</label>

              {editing ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step={field.type === 'decimal' ? '0.1' : '1'}
                    min="0"
                    value={data[field.key]}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                  {field.suffix && <span className="text-gray-400 text-sm">{field.suffix}</span>}
                </div>
              ) : (
                <span className="text-gray-800 font-medium text-sm">
                  {data[field.key]}{field.suffix ? ` ${field.suffix}` : ''}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap gap-3">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <FiSave size={16} />
                <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
              </button>
              <button
                onClick={() => { setEditing(false); loadData(); }}
                className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <FiX size={16} />
                <span>Annuler</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <FiEdit2 size={16} />
                <span>Editer</span>
              </button>
              <button
                onClick={handleReset}
                className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <FiRefreshCw size={16} />
                <span>Reinitialiser</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dispositifs;

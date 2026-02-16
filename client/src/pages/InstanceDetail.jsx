import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInstance, getCaracteristique, saveCaracteristique } from '../services/api';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiShield, FiAlertTriangle, FiAlertCircle, FiFileText, FiBook, FiMessageSquare, FiSearch, FiStar, FiCheck, FiX } from 'react-icons/fi';

const MONTHS = ['', 'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];

// Characteristics that have dedicated form pages (navigate instead of modal)
const DEDICATED_PAGES = ['dispositifs', 'interpellations', 'accidents', 'autres_incidents', 'formations', 'reclamations', 'anomalies', 'scoring'];

const CARACTERISTIQUES = [
  { key: 'dispositifs', label: 'Dispositifs', icon: FiShield, color: 'blue', description: 'Equipements et dispositifs de securite' },
  { key: 'interpellations', label: 'Interpellations', icon: FiAlertTriangle, color: 'amber', description: 'Interpellations effectuees' },
  { key: 'accidents', label: 'Accidents', icon: FiAlertCircle, color: 'red', description: 'Accidents survenus' },
  { key: 'autres_incidents', label: 'Autres Incidents', icon: FiFileText, color: 'orange', description: 'Incidents divers' },
  { key: 'formations', label: 'Formation', icon: FiBook, color: 'green', description: 'Formations en securite' },
  { key: 'reclamations', label: 'Reclamations', icon: FiMessageSquare, color: 'purple', description: 'Reclamations recues' },
  { key: 'anomalies', label: 'Anomalies', icon: FiSearch, color: 'pink', description: 'Anomalies detectees' },
  { key: 'scoring', label: 'Scoring', icon: FiStar, color: 'yellow', description: 'Scores et evaluations' },
];

const colorClasses = {
  blue: { bg: 'bg-blue-50', hover: 'hover:bg-blue-100', text: 'text-blue-700', iconBg: 'bg-blue-100', border: 'border-blue-200' },
  amber: { bg: 'bg-amber-50', hover: 'hover:bg-amber-100', text: 'text-amber-700', iconBg: 'bg-amber-100', border: 'border-amber-200' },
  red: { bg: 'bg-red-50', hover: 'hover:bg-red-100', text: 'text-red-700', iconBg: 'bg-red-100', border: 'border-red-200' },
  orange: { bg: 'bg-orange-50', hover: 'hover:bg-orange-100', text: 'text-orange-700', iconBg: 'bg-orange-100', border: 'border-orange-200' },
  green: { bg: 'bg-green-50', hover: 'hover:bg-green-100', text: 'text-green-700', iconBg: 'bg-green-100', border: 'border-green-200' },
  purple: { bg: 'bg-purple-50', hover: 'hover:bg-purple-100', text: 'text-purple-700', iconBg: 'bg-purple-100', border: 'border-purple-200' },
  pink: { bg: 'bg-pink-50', hover: 'hover:bg-pink-100', text: 'text-pink-700', iconBg: 'bg-pink-100', border: 'border-pink-200' },
  yellow: { bg: 'bg-yellow-50', hover: 'hover:bg-yellow-100', text: 'text-yellow-700', iconBg: 'bg-yellow-100', border: 'border-yellow-200' },
};

const InstanceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [instance, setInstance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCarac, setSelectedCarac] = useState(null);
  const [caracData, setCaracData] = useState({});
  const [caracLoading, setCaracLoading] = useState(false);
  const [editData, setEditData] = useState('');

  useEffect(() => {
    loadInstance();
  }, [id]);

  const loadInstance = async () => {
    try {
      const res = await getInstance(id);
      setInstance(res.data);
    } catch (err) {
      toast.error('Erreur lors du chargement');
      navigate('/supermarkets');
    } finally {
      setLoading(false);
    }
  };

  const handleClickCarac = (caracKey) => {
    if (DEDICATED_PAGES.includes(caracKey)) {
      navigate(`/instance/${id}/${caracKey}`);
    } else {
      handleOpenCaracModal(caracKey);
    }
  };

  const handleOpenCaracModal = async (caracKey) => {
    setSelectedCarac(caracKey);
    setCaracLoading(true);
    try {
      const res = await getCaracteristique(caracKey, id);
      setCaracData(res.data);
      setEditData(JSON.stringify(res.data.data || {}, null, 2));
    } catch (err) {
      toast.error('Erreur lors du chargement des donnees');
    } finally {
      setCaracLoading(false);
    }
  };

  const handleSaveCarac = async () => {
    try {
      const parsedData = JSON.parse(editData);
      await saveCaracteristique(selectedCarac, id, parsedData);
      toast.success('Donnees sauvegardees avec succes');
      setSelectedCarac(null);
      loadInstance();
    } catch (err) {
      if (err instanceof SyntaxError) {
        toast.error('Format JSON invalide');
      } else {
        toast.error('Erreur lors de la sauvegarde');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (!instance) return null;

  const caracStatus = instance.caracteristiques_status || {};

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/supermarket/${instance.supermarket_id}`)}
          className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 text-sm mb-3 transition-colors"
        >
          <FiArrowLeft size={16} />
          <span>Retour a {instance.supermarket_name}</span>
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            {instance.supermarket_name}
          </h1>
          <p className="text-gray-500 mt-1">
            {MONTHS[instance.month]} {instance.year} — {instance.supermarket_region}
          </p>
        </div>
      </div>

      {/* Caracteristiques Grid */}
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Caracteristiques</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CARACTERISTIQUES.map((carac) => {
          const colors = colorClasses[carac.color];
          const Icon = carac.icon;
          const filled = caracStatus[carac.key];

          return (
            <button
              key={carac.key}
              onClick={() => handleClickCarac(carac.key)}
              className={`relative ${colors.bg} ${colors.hover} border ${colors.border} rounded-xl p-5 text-left transition-all hover:shadow-md group`}
            >
              {filled && (
                <div className="absolute top-3 right-3">
                  <div className="bg-green-500 rounded-full p-0.5">
                    <FiCheck size={12} className="text-white" />
                  </div>
                </div>
              )}

              <div className={`${colors.iconBg} rounded-lg p-3 w-fit mb-3`}>
                <Icon size={24} className={colors.text} />
              </div>
              <h3 className={`font-semibold ${colors.text} text-sm`}>{carac.label}</h3>
              <p className="text-gray-400 text-xs mt-1">{carac.description}</p>

              {filled ? (
                <span className="text-green-600 text-xs font-medium mt-2 block">Rempli</span>
              ) : (
                <span className="text-gray-400 text-xs mt-2 block">Non rempli</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Fallback JSON modal for characteristics without dedicated pages */}
      {selectedCarac && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                {CARACTERISTIQUES.find(c => c.key === selectedCarac)?.label}
              </h2>
              <button onClick={() => setSelectedCarac(null)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>

            {caracLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
              </div>
            ) : (
              <>
                <p className="text-gray-500 text-sm mb-3">
                  Le formulaire detaille sera ajoute prochainement. Pour l'instant, vous pouvez saisir les donnees en format JSON.
                </p>
                <textarea
                  value={editData}
                  onChange={(e) => setEditData(e.target.value)}
                  className="flex-1 w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none min-h-[200px]"
                  placeholder='{"cle": "valeur"}'
                />
                <div className="flex space-x-3 mt-4">
                  <button
                    onClick={handleSaveCarac}
                    className="flex-1 bg-blue-700 hover:bg-blue-800 text-white py-2.5 rounded-lg font-medium transition-colors"
                  >
                    Sauvegarder
                  </button>
                  <button
                    onClick={() => setSelectedCarac(null)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InstanceDetail;

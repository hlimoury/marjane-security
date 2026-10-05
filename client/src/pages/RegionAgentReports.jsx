import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiDownload, FiTrash2, FiInbox } from 'react-icons/fi';
import { Packer } from 'docx';
import { saveAs } from 'file-saver';
import { useAuth } from '../context/AuthContext';
import { getReportsList, getReportById, markReportDownloaded, deleteReport } from '../services/api';
import { buildAdminDocx, buildAdminPdf } from './AdminRapports';

const RegionAgentReports = () => {
  const { user, isRegion } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!isRegion()) {
      navigate('/supermarkets');
      return;
    }
    load();
  }, []);

  const load = async () => {
    try {
      const res = await getReportsList();
      setReports(res.data.filter((report) => report.recipient_id === user.id));
    } catch {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const download = async (report, format) => {
    try {
      setBusyId(report.id);
      const res = await getReportById(report.id);
      if (format === 'docx') {
        const blob = await Packer.toBlob(buildAdminDocx(res.data));
        saveAs(blob, `rapport-${report.sender_username}.docx`);
      } else {
        buildAdminPdf(res.data).save(`rapport-${report.sender_username}.pdf`);
      }
      await markReportDownloaded(report.id);
      setReports((prev) => prev.map((item) => item.id === report.id ? { ...item, is_read: true, is_downloaded: true } : item));
      toast.success(`${format.toUpperCase()} téléchargé`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur de téléchargement');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (report) => {
    if (!window.confirm(`Supprimer le rapport de ${report.sender_username} ?`)) return;
    try {
      await deleteReport(report.id);
      setReports((prev) => prev.filter((item) => item.id !== report.id));
      toast.success('Rapport supprimé');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur de suppression');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-orange-100 p-2.5 rounded-xl"><FiInbox className="text-orange-600" size={22} /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Rapports des agents</h1>
          <p className="text-sm text-gray-500">Rapports envoyés par vos comptes terrain</p>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-xl border p-10 text-center text-gray-400">Aucun rapport reçu</div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-gray-800">{report.sender_username}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {report.period_label} · {report.supermarket_count} magasin(s) · {new Date(report.created_at).toLocaleString('fr-FR')}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{(report.categories || []).join(', ')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button disabled={busyId === report.id} onClick={() => download(report, 'pdf')} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-500 text-white text-sm">
                    <FiDownload size={14} /> PDF
                  </button>
                  <button disabled={busyId === report.id} onClick={() => download(report, 'docx')} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-500 text-white text-sm">
                    <FiDownload size={14} /> DOCX
                  </button>
                  <button onClick={() => remove(report)} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-100 text-red-600 text-sm">
                    <FiTrash2 size={14} /> Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RegionAgentReports;

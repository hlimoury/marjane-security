import { useState, useEffect } from 'react';
import { getReportsList, getReportById, markReportDownloaded } from '../services/api';
import { toast } from 'react-toastify';
import {
  FiInbox, FiMail, FiMailOpen, FiDownload, FiChevronDown,
  FiChevronUp, FiClock, FiUser, FiMapPin, FiCheck, FiLoader
} from 'react-icons/fi';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, AlignmentType, WidthType, ShadingType, convertInchesToTwip } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const CAT_LABELS = {
  anomalies: 'Anomalies', interpellations: 'Interpellations', accidents: 'Accidents',
  autres_incidents: 'Autres Incidents', formations: 'Formations',
  reclamations: 'Réclamations', controle_rm: 'Contrôle RM',
};

const MONTHS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function periodText(p) {
  if (!p) return '';
  if (p.startMonth === p.endMonth && p.startYear === p.endYear) return `${MONTHS[p.startMonth]} ${p.startYear}`;
  return `${MONTHS[p.startMonth]} ${p.startYear} — ${MONTHS[p.endMonth]} ${p.endYear}`;
}

function topDetails(details, limit = 4) {
  const sorted = Object.entries(details).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, limit);
  const rest = sorted.slice(limit).reduce((s, [, c]) => s + c, 0);
  let text = top.map(([n, c]) => `${n} (${c})`).join(', ');
  if (rest > 0) text += `, +${rest} autres`;
  return text;
}

function buildAdminDocx(report) {
  const { supermarkets, categories, period, region } = report.report_data;
  const children = [];
  const ORANGE = 'F97316';

  children.push(
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [
      new TextRun({ text: 'RAPPORT DE SÉCURITÉ', bold: true, size: 36, color: ORANGE }),
    ]}),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [
      new TextRun({ text: `Envoyé par : ${report.sender_username}`, size: 22, color: '666666' }),
    ]}),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [
      new TextRun({ text: `Période : ${periodText(period)}  |  Région : ${region || report.sender_region}`, size: 20, bold: true }),
    ]}),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [
      new TextRun({ text: `${supermarkets.length} magasins  |  Envoyé le ${new Date(report.created_at).toLocaleDateString('fr-FR')}`, size: 18, color: '999999' }),
    ]}),
  );

  Object.entries(categories).forEach(([catKey, cat]) => {
    const label = CAT_LABELS[catKey] || catKey;
    const subTotals = Object.entries(cat.subCategoryTotals || {}).sort((a, b) => b[1] - a[1]);

    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 }, children: [
      new TextRun({ text: label, bold: true, size: 28, color: ORANGE }),
      new TextRun({ text: `  — Total : ${cat.total}`, size: 22, color: '555555' }),
    ]}));

    if (subTotals.length > 0) {
      children.push(new Paragraph({ spacing: { after: 150 }, children: [
        new TextRun({ text: 'Résumé : ', bold: true, size: 18 }),
        new TextRun({ text: subTotals.slice(0, 8).map(([n, c]) => `${n} (${c})`).join('  •  '), size: 18, color: '555555' }),
      ]}));
    }

    const headerCells = ['Magasin', 'Total', 'Principales sous-catégories'].map(t =>
      new TableCell({
        shading: { type: ShadingType.SOLID, color: ORANGE, fill: ORANGE },
        children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, size: 18, color: 'FFFFFF' })] })],
      })
    );
    const rows = [new TableRow({ tableHeader: true, children: headerCells })];

    supermarkets.forEach(sm => {
      const smData = cat.perSupermarket[sm.id];
      if (!smData || smData.total === 0) return;
      rows.push(new TableRow({ children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: sm.name, size: 18 })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(smData.total), bold: true, size: 18 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: topDetails(smData.details) || '—', size: 16, color: '666666' })] })] }),
      ]}));
    });

    if (rows.length > 1) {
      children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
    }
    children.push(new Paragraph({ spacing: { after: 100 }, children: [] }));
  });

  return new Document({
    sections: [{ properties: { page: { margin: { top: convertInchesToTwip(0.8), bottom: convertInchesToTwip(0.8), left: convertInchesToTwip(0.8), right: convertInchesToTwip(0.8) } } }, children }],
  });
}

function buildAdminPdf(report) {
  const { supermarkets, categories, period, region } = report.report_data;
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(20); doc.setTextColor(249, 115, 22);
  doc.text('RAPPORT DE SÉCURITÉ', 105, y, { align: 'center' }); y += 8;
  doc.setFontSize(11); doc.setTextColor(80);
  doc.text(`Envoyé par : ${report.sender_username} (${report.sender_region || ''})`, 105, y, { align: 'center' }); y += 7;
  doc.setTextColor(40);
  doc.text(`Période : ${periodText(period)}`, 105, y, { align: 'center' }); y += 6;
  doc.setTextColor(120);
  doc.text(`${supermarkets.length} magasins  |  ${new Date(report.created_at).toLocaleDateString('fr-FR')}`, 105, y, { align: 'center' }); y += 10;
  doc.setDrawColor(249, 115, 22); doc.setLineWidth(0.5); doc.line(14, y, 196, y); y += 8;

  Object.entries(categories).forEach(([catKey, cat]) => {
    const label = CAT_LABELS[catKey] || catKey;
    const subTotals = Object.entries(cat.subCategoryTotals || {}).sort((a, b) => b[1] - a[1]);

    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(14); doc.setTextColor(249, 115, 22);
    doc.text(`${label}  —  Total : ${cat.total}`, 14, y); y += 7;

    if (subTotals.length > 0) {
      doc.setFontSize(8); doc.setTextColor(100);
      const lines = doc.splitTextToSize(subTotals.slice(0, 6).map(([n, c]) => `${n} (${c})`).join('  |  '), 180);
      doc.text(lines, 14, y); y += lines.length * 4 + 3;
    }

    const tableRows = [];
    supermarkets.forEach(sm => {
      const smData = cat.perSupermarket[sm.id];
      if (!smData || smData.total === 0) return;
      tableRows.push([sm.name, String(smData.total), topDetails(smData.details, 3) || '—']);
    });

    if (tableRows.length > 0) {
      autoTable(doc, {
        startY: y, head: [['Magasin', 'Total', 'Sous-catégories']], body: tableRows,
        headStyles: { fillColor: [249, 115, 22], fontSize: 9 }, bodyStyles: { fontSize: 8 },
        columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 15, halign: 'center' }, 2: { cellWidth: 'auto' } },
        margin: { left: 14, right: 14 }, theme: 'grid',
      });
      y = doc.lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(9); doc.setTextColor(150); doc.text('Aucune donnée.', 14, y); y += 8;
    }
  });

  return doc;
}

const AdminRapports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedData, setExpandedData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    try {
      const res = await getReportsList();
      setReports(res.data);
    } catch { toast.error('Erreur chargement rapports'); }
    finally { setLoading(false); }
  };

  const handleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedData(null);
      return;
    }
    try {
      setLoadingDetail(true);
      setExpandedId(id);
      const res = await getReportById(id);
      setExpandedData(res.data);
      setReports(prev => prev.map(r => r.id === id ? { ...r, is_read: true } : r));
    } catch { toast.error('Erreur chargement rapport'); }
    finally { setLoadingDetail(false); }
  };

  const handleDownload = async (format) => {
    if (!expandedData) return;
    try {
      if (format === 'docx') {
        const doc = buildAdminDocx(expandedData);
        const blob = await Packer.toBlob(doc);
        saveAs(blob, `rapport-${expandedData.sender_username}-${Date.now()}.docx`);
      } else {
        const doc = buildAdminPdf(expandedData);
        doc.save(`rapport-${expandedData.sender_username}-${Date.now()}.pdf`);
      }
      await markReportDownloaded(expandedData.id);
      setReports(prev => prev.map(r => r.id === expandedData.id ? { ...r, is_downloaded: true } : r));
      toast.success(`${format.toUpperCase()} téléchargé`);
    } catch (e) {
      console.error(e);
      toast.error(`Erreur ${format.toUpperCase()}`);
    }
  };

  const unreadCount = reports.filter(r => !r.is_read).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-orange-100 rounded-xl"><FiInbox className="text-orange-600" size={24} /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Rapports Reçus</h1>
            <p className="text-sm text-gray-500">
              {reports.length} rapport{reports.length !== 1 ? 's' : ''}
              {unreadCount > 0 && <span className="ml-2 text-orange-600 font-medium">({unreadCount} non lu{unreadCount > 1 ? 's' : ''})</span>}
            </p>
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-400">
            <FiInbox size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-lg">Aucun rapport reçu</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(report => {
              const isExpanded = expandedId === report.id;
              const rd = isExpanded ? expandedData : null;
              const date = new Date(report.created_at);

              return (
                <div key={report.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${!report.is_read ? 'border-l-4 border-l-orange-500' : ''}`}>
                  {/* Report row */}
                  <button onClick={() => handleExpand(report.id)}
                    className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left">
                    <div className="flex-shrink-0">
                      {report.is_read
                        ? <FiMailOpen size={20} className="text-gray-400" />
                        : <FiMail size={20} className="text-orange-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`font-semibold text-sm ${report.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                          {report.sender_username}
                        </span>
                        {report.sender_region && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{report.sender_region}</span>
                        )}
                        {!report.is_read && (
                          <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {report.period_label} — {(report.categories || []).join(', ')} — {report.supermarket_count} magasins
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex gap-1.5">
                        {report.is_read && (
                          <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <FiCheck size={10} /> Lu
                          </span>
                        )}
                        {report.is_downloaded && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <FiDownload size={10} /> DL
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {date.toLocaleDateString('fr-FR')} {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isExpanded ? <FiChevronUp size={16} className="text-gray-400" /> : <FiChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </button>

                  {/* Expanded preview */}
                  {isExpanded && (
                    <div className="border-t">
                      {loadingDetail ? (
                        <div className="p-8 flex justify-center"><FiLoader className="animate-spin text-orange-500" size={24} /></div>
                      ) : rd ? (
                        <div>
                          {/* Download bar */}
                          <div className="bg-gray-50 px-5 py-3 flex gap-3 border-b">
                            <button onClick={() => handleDownload('pdf')}
                              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                              <FiDownload size={14} /> PDF
                            </button>
                            <button onClick={() => handleDownload('docx')}
                              className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                              <FiDownload size={14} /> DOCX
                            </button>
                          </div>

                          {/* Report preview */}
                          <div className="p-5 max-h-[600px] overflow-y-auto">
                            <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl px-5 py-4 text-white mb-4">
                              <h3 className="font-bold text-lg">Rapport de {rd.sender_username}</h3>
                              <div className="flex flex-wrap gap-3 mt-2 text-sm text-orange-100">
                                <span><FiMapPin size={12} className="inline mr-1" />{rd.sender_region || rd.report_data?.region}</span>
                                <span><FiClock size={12} className="inline mr-1" />{rd.period_label}</span>
                                <span>{rd.supermarket_count} magasins</span>
                              </div>
                            </div>

                            {rd.report_data && Object.entries(rd.report_data.categories || {}).map(([catKey, catData]) => {
                              const smRows = (rd.report_data.supermarkets || [])
                                .map(sm => ({ ...sm, ...(catData.perSupermarket[sm.id] || { total: 0, details: {} }) }))
                                .filter(r => r.total > 0)
                                .sort((a, b) => b.total - a.total);

                              return (
                                <div key={catKey} className="mb-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-bold text-orange-600">{CAT_LABELS[catKey] || catKey}</h4>
                                    <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">{catData.total}</span>
                                  </div>
                                  {smRows.length > 0 ? (
                                    <table className="w-full text-sm border rounded-lg overflow-hidden">
                                      <thead>
                                        <tr className="bg-gray-50">
                                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Magasin</th>
                                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 w-14">Total</th>
                                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Détails</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y">
                                        {smRows.map(sm => (
                                          <tr key={sm.id} className="hover:bg-gray-50">
                                            <td className="px-3 py-1.5 text-sm font-medium text-gray-700">{sm.name}</td>
                                            <td className="px-3 py-1.5 text-center font-bold text-orange-600">{sm.total}</td>
                                            <td className="px-3 py-1.5 text-xs text-gray-500">{topDetails(sm.details, 3)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  ) : <p className="text-sm text-gray-400 italic">Aucune donnée</p>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRapports;

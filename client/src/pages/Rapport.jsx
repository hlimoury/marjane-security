import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSupermarkets, generateReport, sendReportToAdmin, getLastSentReport } from '../services/api';
import { toast } from 'react-toastify';
import {
  FiFileText, FiDownload, FiFilter, FiCheck, FiCheckSquare,
  FiSquare, FiChevronDown, FiChevronUp, FiLoader, FiSend, FiClock, FiEye
} from 'react-icons/fi';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, AlignmentType, WidthType, ShadingType, BorderStyle, convertInchesToTwip } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const MONTHS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const CATEGORIES = [
  { key: 'anomalies', label: 'Anomalies' },
  { key: 'interpellations', label: 'Interpellations' },
  { key: 'accidents', label: 'Accidents' },
  { key: 'autres_incidents', label: 'Autres Incidents' },
  { key: 'formations', label: 'Formations' },
  { key: 'reclamations', label: 'Réclamations' },
  { key: 'controle_rm', label: 'Contrôle RM' },
];

const CAT_LABELS = {};
CATEGORIES.forEach(c => { CAT_LABELS[c.key] = c.label; });

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;
const YEARS = Array.from({ length: currentYear - 2023 }, (_, i) => currentYear - i);

function periodText(p) {
  if (!p) return '';
  if (p.startMonth === p.endMonth && p.startYear === p.endYear) {
    return `${MONTHS[p.startMonth]} ${p.startYear}`;
  }
  return `${MONTHS[p.startMonth]} ${p.startYear} — ${MONTHS[p.endMonth]} ${p.endYear}`;
}

function topDetails(details, limit = 5) {
  const sorted = Object.entries(details).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, limit);
  const rest = sorted.slice(limit).reduce((s, [, c]) => s + c, 0);
  let text = top.map(([n, c]) => `${n} (${c})`).join(', ');
  if (rest > 0) text += `, +${rest} autres`;
  return text;
}

// --- DOCX Generation ---
function buildDocx(reportData) {
  const { supermarkets, categories, period, region } = reportData;
  const children = [];
  const ORANGE = 'F97316';

  children.push(
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [
      new TextRun({ text: 'RAPPORT DE SÉCURITÉ', bold: true, size: 36, color: ORANGE }),
    ]}),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [
      new TextRun({ text: 'Marjane Market', size: 24, color: '666666', italics: true }),
    ]}),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [
      new TextRun({ text: `Période : ${periodText(period)}`, size: 22, bold: true }),
    ]}),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [
      new TextRun({ text: `Région : ${region}  |  Magasins : ${supermarkets.length}`, size: 20, color: '888888' }),
    ]}),
  );

  const catKeys = Object.keys(categories);
  catKeys.forEach(catKey => {
    const cat = categories[catKey];
    const label = CAT_LABELS[catKey] || catKey;
    const subTotals = Object.entries(cat.subCategoryTotals || {}).sort((a, b) => b[1] - a[1]);

    children.push(
      new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 }, children: [
        new TextRun({ text: `${label}`, bold: true, size: 28, color: ORANGE }),
        new TextRun({ text: `  — Total : ${cat.total}`, size: 22, color: '555555' }),
      ]}),
    );

    if (subTotals.length > 0) {
      const sumText = subTotals.slice(0, 8).map(([n, c]) => `${n} (${c})`).join('  •  ');
      children.push(new Paragraph({ spacing: { after: 150 }, children: [
        new TextRun({ text: 'Résumé : ', bold: true, size: 18, color: '333333' }),
        new TextRun({ text: sumText, size: 18, color: '555555' }),
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
      const detailsText = topDetails(smData.details, 4);
      rows.push(new TableRow({ children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: sm.name, size: 18 })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(smData.total), bold: true, size: 18 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: detailsText || '—', size: 16, color: '666666' })] })] }),
      ]}));
    });

    if (rows.length > 1) {
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows,
      }));
    } else {
      children.push(new Paragraph({ spacing: { after: 100 }, children: [
        new TextRun({ text: 'Aucune donnée pour cette catégorie.', italics: true, color: '999999', size: 18 }),
      ]}));
    }

    children.push(new Paragraph({ spacing: { after: 100 }, children: [] }));
  });

  children.push(
    new Paragraph({ spacing: { before: 300 }, alignment: AlignmentType.RIGHT, children: [
      new TextRun({ text: `Généré le ${new Date().toLocaleDateString('fr-FR')}`, size: 16, color: 'AAAAAA', italics: true }),
    ]}),
  );

  return new Document({
    sections: [{ properties: { page: { margin: { top: convertInchesToTwip(0.8), bottom: convertInchesToTwip(0.8), left: convertInchesToTwip(0.8), right: convertInchesToTwip(0.8) } } }, children }],
  });
}

async function downloadDocx(reportData) {
  const doc = buildDocx(reportData);
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `rapport-securite-${Date.now()}.docx`);
}

// --- PDF Generation ---
function downloadPdf(reportData) {
  const { supermarkets, categories, period, region } = reportData;
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(20);
  doc.setTextColor(249, 115, 22);
  doc.text('RAPPORT DE SÉCURITÉ', 105, y, { align: 'center' });
  y += 8;
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text('Marjane Market', 105, y, { align: 'center' });
  y += 10;
  doc.setFontSize(11);
  doc.setTextColor(40);
  doc.text(`Période : ${periodText(period)}`, 105, y, { align: 'center' });
  y += 6;
  doc.setTextColor(120);
  doc.text(`Région : ${region}  |  Magasins : ${supermarkets.length}`, 105, y, { align: 'center' });
  y += 12;

  doc.setDrawColor(249, 115, 22);
  doc.setLineWidth(0.5);
  doc.line(14, y, 196, y);
  y += 8;

  const catKeys = Object.keys(categories);
  catKeys.forEach(catKey => {
    const cat = categories[catKey];
    const label = CAT_LABELS[catKey] || catKey;
    const subTotals = Object.entries(cat.subCategoryTotals || {}).sort((a, b) => b[1] - a[1]);

    if (y > 250) { doc.addPage(); y = 20; }

    doc.setFontSize(14);
    doc.setTextColor(249, 115, 22);
    doc.text(`${label}  —  Total : ${cat.total}`, 14, y);
    y += 7;

    if (subTotals.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(100);
      const sumLine = subTotals.slice(0, 6).map(([n, c]) => `${n} (${c})`).join('  |  ');
      const lines = doc.splitTextToSize(sumLine, 180);
      doc.text(lines, 14, y);
      y += lines.length * 4 + 3;
    }

    const tableRows = [];
    supermarkets.forEach(sm => {
      const smData = cat.perSupermarket[sm.id];
      if (!smData || smData.total === 0) return;
      const det = topDetails(smData.details, 3);
      tableRows.push([sm.name, String(smData.total), det || '—']);
    });

    if (tableRows.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Magasin', 'Total', 'Sous-catégories']],
        body: tableRows,
        headStyles: { fillColor: [249, 115, 22], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 15, halign: 'center' }, 2: { cellWidth: 'auto' } },
        margin: { left: 14, right: 14 },
        theme: 'grid',
      });
      y = doc.lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text('Aucune donnée pour cette catégorie.', 14, y);
      y += 8;
    }
  });

  doc.setFontSize(8);
  doc.setTextColor(170);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 196, doc.internal.pageSize.height - 10, { align: 'right' });

  doc.save(`rapport-securite-${Date.now()}.pdf`);
}

// --- Main Component ---
const Rapport = () => {
  const { user } = useAuth();
  const [supermarkets, setSupermarkets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState(null);

  const [selectedCats, setSelectedCats] = useState(CATEGORIES.map(c => c.key));
  const [selectedSmIds, setSelectedSmIds] = useState([]);
  const [selectAllSm, setSelectAllSm] = useState(true);
  const [periodType, setPeriodType] = useState('single');
  const [startYear, setStartYear] = useState(currentYear);
  const [startMonth, setStartMonth] = useState(currentMonth);
  const [endYear, setEndYear] = useState(currentYear);
  const [endMonth, setEndMonth] = useState(currentMonth);
  const [smSearch, setSmSearch] = useState('');
  const [smExpanded, setSmExpanded] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [smRes, lsRes] = await Promise.all([
          getSupermarkets(),
          getLastSentReport().catch(() => ({ data: null })),
        ]);
        setSupermarkets(smRes.data);
        setSelectedSmIds(smRes.data.map(s => s.id));
        if (lsRes.data) setLastSent(lsRes.data);
      } catch { toast.error('Erreur chargement magasins'); }
      finally { setLoading(false); }
    })();
  }, []);

  const toggleCat = (key) => {
    setSelectedCats(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const toggleAllCats = () => {
    setSelectedCats(prev => prev.length === CATEGORIES.length ? [] : CATEGORIES.map(c => c.key));
  };

  const toggleSm = (id) => {
    setSelectedSmIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      setSelectAllSm(next.length === supermarkets.length);
      return next;
    });
  };

  const toggleAllSm = () => {
    if (selectAllSm) {
      setSelectedSmIds([]);
      setSelectAllSm(false);
    } else {
      setSelectedSmIds(supermarkets.map(s => s.id));
      setSelectAllSm(true);
    }
  };

  const canGenerate = selectedCats.length > 0 && selectedSmIds.length > 0;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    const eY = periodType === 'single' ? startYear : endYear;
    const eM = periodType === 'single' ? startMonth : endMonth;
    if (eY * 100 + eM < startYear * 100 + startMonth) {
      toast.error('La date de fin doit être après la date de début');
      return;
    }
    try {
      setGenerating(true);
      setReportData(null);
      const res = await generateReport({
        categories: selectedCats,
        supermarketIds: selectAllSm ? [] : selectedSmIds,
        startMonth, startYear,
        endMonth: eM, endYear: eY,
      });
      setReportData(res.data);
      toast.success('Rapport généré avec succès');
    } catch (err) {
      toast.error('Erreur lors de la génération');
    } finally { setGenerating(false); }
  };

  const handleSendToAdmin = async () => {
    if (!reportData) return;
    try {
      setSending(true);
      const pLabel = periodText(reportData.period);
      const catLabels = Object.keys(reportData.categories).map(k => CAT_LABELS[k] || k);
      const res = await sendReportToAdmin({
        reportData,
        periodLabel: pLabel,
        categories: catLabels,
        supermarketCount: reportData.supermarkets.length,
      });
      setLastSent({ created_at: res.data.sent_at, is_read: false, is_downloaded: false });
      toast.success('Rapport envoyé à l\'administrateur');
    } catch (err) {
      toast.error('Erreur lors de l\'envoi');
    } finally { setSending(false); }
  };

  const filteredSm = supermarkets.filter(s => !smSearch || s.name.toLowerCase().includes(smSearch.toLowerCase()));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-orange-100 rounded-xl"><FiFileText className="text-orange-600" size={24} /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Générateur de Rapport</h1>
            <p className="text-sm text-gray-500">{user?.region || 'Administration'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Builder form */}
          <div className="lg:col-span-1 space-y-4">
            {/* Categories */}
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Catégories</h3>
                <button onClick={toggleAllCats} className="text-xs text-orange-500 hover:text-orange-600 font-medium">
                  {selectedCats.length === CATEGORIES.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>
              <div className="space-y-1.5">
                {CATEGORIES.map(cat => (
                  <label key={cat.key} className="flex items-center gap-2.5 cursor-pointer px-2 py-1.5 rounded-lg hover:bg-gray-50">
                    <input type="checkbox" checked={selectedCats.includes(cat.key)} onChange={() => toggleCat(cat.key)}
                      className="w-4 h-4 text-orange-500 rounded focus:ring-orange-400 border-gray-300" />
                    <span className="text-sm text-gray-700">{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Supermarkets */}
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Magasins ({selectedSmIds.length}/{supermarkets.length})</h3>
                <button onClick={toggleAllSm} className="text-xs text-orange-500 hover:text-orange-600 font-medium">
                  {selectAllSm ? 'Aucun' : 'Tous'}
                </button>
              </div>
              <input
                type="text" placeholder="Rechercher..."
                value={smSearch} onChange={e => setSmSearch(e.target.value)}
                className="w-full border rounded-lg px-3 py-1.5 text-sm mb-2 focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none"
              />
              <button onClick={() => setSmExpanded(!smExpanded)} className="text-xs text-gray-400 hover:text-gray-600 mb-1 flex items-center gap-1">
                {smExpanded ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
                {smExpanded ? 'Réduire' : `Afficher la liste (${filteredSm.length})`}
              </button>
              {smExpanded && (
                <div className="max-h-48 overflow-y-auto space-y-0.5 border rounded-lg p-2">
                  {filteredSm.map(sm => (
                    <label key={sm.id} className="flex items-center gap-2 cursor-pointer px-1.5 py-1 rounded hover:bg-gray-50">
                      <input type="checkbox" checked={selectedSmIds.includes(sm.id)} onChange={() => toggleSm(sm.id)}
                        className="w-3.5 h-3.5 text-orange-500 rounded focus:ring-orange-400 border-gray-300" />
                      <span className="text-xs text-gray-700 truncate">{sm.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Period */}
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Période</h3>
              <div className="flex gap-3 mb-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="period" checked={periodType === 'single'} onChange={() => setPeriodType('single')}
                    className="text-orange-500 focus:ring-orange-400" />
                  <span className="text-sm text-gray-600">Mois unique</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="period" checked={periodType === 'range'} onChange={() => setPeriodType('range')}
                    className="text-orange-500 focus:ring-orange-400" />
                  <span className="text-sm text-gray-600">Période</span>
                </label>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">{periodType === 'range' ? 'De' : 'Mois'}</label>
                  <div className="flex gap-2">
                    <select value={startYear} onChange={e => setStartYear(+e.target.value)}
                      className="flex-1 border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-orange-300 outline-none">
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select value={startMonth} onChange={e => setStartMonth(+e.target.value)}
                      className="flex-1 border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-orange-300 outline-none">
                      {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                </div>
                {periodType === 'range' && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">À</label>
                    <div className="flex gap-2">
                      <select value={endYear} onChange={e => setEndYear(+e.target.value)}
                        className="flex-1 border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-orange-300 outline-none">
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <select value={endMonth} onChange={e => setEndMonth(+e.target.value)}
                        className="flex-1 border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-orange-300 outline-none">
                        {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || generating}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                canGenerate && !generating
                  ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {generating ? <><FiLoader className="animate-spin" size={16} /> Génération...</> : <><FiFileText size={16} /> Générer le rapport</>}
            </button>

            {/* Last sent info */}
            {lastSent && (
              <div className="bg-white rounded-xl shadow-sm border p-3">
                <h3 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5"><FiClock size={12} /> Dernier envoi</h3>
                <p className="text-xs text-gray-600">
                  Envoyé le <strong>{new Date(lastSent.created_at).toLocaleDateString('fr-FR')}</strong> à {new Date(lastSent.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <div className="flex gap-2 mt-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${lastSent.is_read ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {lastSent.is_read ? 'Lu' : 'Non lu'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${lastSent.is_downloaded ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {lastSent.is_downloaded ? 'Téléchargé' : 'Non téléchargé'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Preview + Download */}
          <div className="lg:col-span-2">
            {!reportData ? (
              <div className="bg-white rounded-xl shadow-sm border h-full flex items-center justify-center min-h-[400px]">
                <div className="text-center text-gray-400">
                  <FiFileText size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">Aperçu du rapport</p>
                  <p className="text-sm mt-1">Configurez les options et cliquez sur "Générer"</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Download + Send buttons */}
                <div className="flex gap-3 flex-wrap">
                  <button onClick={() => { try { downloadPdf(reportData); } catch(e) { console.error(e); toast.error('Erreur PDF'); } }}
                    className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">
                    <FiDownload size={16} /> PDF
                  </button>
                  <button onClick={async () => { try { await downloadDocx(reportData); } catch { toast.error('Erreur DOCX'); } }}
                    className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">
                    <FiDownload size={16} /> DOCX
                  </button>
                  <button onClick={handleSendToAdmin} disabled={sending}
                    className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm ${
                      sending ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}>
                    {sending ? <><FiLoader className="animate-spin" size={16} /> Envoi...</> : <><FiSend size={16} /> Envoyer à l'admin</>}
                  </button>
                </div>

                {/* Preview */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  {/* Report header */}
                  <div className="bg-gradient-to-r from-orange-500 to-orange-400 px-6 py-5 text-white">
                    <h2 className="text-xl font-bold">RAPPORT DE SÉCURITÉ</h2>
                    <p className="text-orange-100 text-sm mt-1">Marjane Market</p>
                    <div className="flex flex-wrap gap-4 mt-3 text-sm">
                      <span>Période : <strong>{periodText(reportData.period)}</strong></span>
                      <span>Région : <strong>{reportData.region}</strong></span>
                      <span>Magasins : <strong>{reportData.supermarkets.length}</strong></span>
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="divide-y">
                    {Object.entries(reportData.categories).map(([catKey, catData]) => {
                      const label = CAT_LABELS[catKey] || catKey;
                      const subTotals = Object.entries(catData.subCategoryTotals || {}).sort((a, b) => b[1] - a[1]);
                      const smRows = reportData.supermarkets
                        .map(sm => ({ ...sm, ...(catData.perSupermarket[sm.id] || { total: 0, details: {} }) }))
                        .filter(r => r.total > 0)
                        .sort((a, b) => b.total - a.total);

                      return (
                        <div key={catKey} className="p-5">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-lg font-bold text-orange-600">{label}</h3>
                            <span className="bg-orange-100 text-orange-700 text-sm font-bold px-3 py-0.5 rounded-full">{catData.total}</span>
                          </div>

                          {subTotals.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-4">
                              {subTotals.slice(0, 8).map(([name, count]) => (
                                <span key={name} className="bg-gray-100 text-xs px-2 py-1 rounded-md text-gray-600">
                                  {name}: <strong>{count}</strong>
                                </span>
                              ))}
                              {subTotals.length > 8 && (
                                <span className="text-xs text-gray-400 px-2 py-1">+{subTotals.length - 8} autres</span>
                              )}
                            </div>
                          )}

                          {smRows.length > 0 ? (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gray-50 text-left">
                                  <th className="px-3 py-2 font-semibold text-gray-600">Magasin</th>
                                  <th className="px-3 py-2 font-semibold text-gray-600 text-center w-16">Total</th>
                                  <th className="px-3 py-2 font-semibold text-gray-600">Sous-catégories</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {smRows.map(sm => (
                                  <tr key={sm.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 font-medium text-gray-800">{sm.name}</td>
                                    <td className="px-3 py-2 text-center font-bold text-orange-600">{sm.total}</td>
                                    <td className="px-3 py-2 text-gray-500 text-xs">{topDetails(sm.details, 3)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-sm text-gray-400 italic">Aucune donnée</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="px-5 py-3 bg-gray-50 text-right text-xs text-gray-400">
                    Généré le {new Date().toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rapport;

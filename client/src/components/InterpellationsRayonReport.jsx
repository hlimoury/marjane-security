const MONTHS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export const formatReportMetric = (value) => {
  const num = Number(value) || 0;
  return Number.isInteger(num) ? String(num) : num.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
};

export const formatReportKdh = (value) => {
  const num = Number(value) || 0;
  return num.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
};

export const getSortedRayons = (perRayon = {}) =>
  Object.entries(perRayon).sort((a, b) => b[1].total - a[1].total);

export const periodLabel = (month, year) => `${MONTHS[month] || month} ${year}`;

export function appendInterpellationsByRayonDocx(children, cat, docx, ORANGE = 'F97316') {
  const {
    Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType, ShadingType,
  } = docx;

  getSortedRayons(cat.perRayon).forEach(([rayonName, rayon]) => {
    children.push(new Paragraph({ spacing: { before: 200, after: 80 }, children: [
      new TextRun({ text: rayonName, bold: true, size: 24, color: ORANGE }),
      new TextRun({
        text: `  — ${formatReportMetric(rayon.total)} entrées  |  ${formatReportMetric(rayon.nombre)} pers.  |  ${formatReportMetric(rayon.poursuites)} pours.  |  ${formatReportKdh(rayon.valeurKdh)} KDH`,
        size: 18,
        color: '555555',
      }),
    ]}));

    const headerCells = ['Magasin', 'Période', 'Type', 'Pers.', 'Pours.', 'KDH', 'Date', 'Commentaire'].map((t) =>
      new TableCell({
        shading: { type: ShadingType.SOLID, color: ORANGE, fill: ORANGE },
        children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, size: 16, color: 'FFFFFF' })] })],
      })
    );

    const rows = [new TableRow({ tableHeader: true, children: headerCells })];
    rayon.entries.forEach((entry) => {
      rows.push(new TableRow({ children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: entry.supermarket_name, size: 16 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: periodLabel(entry.month, entry.year), size: 16 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: entry.type || '—', size: 16 })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: formatReportMetric(entry.nombre), size: 16 })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: formatReportMetric(entry.poursuites), size: 16 })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: formatReportKdh(entry.valeurKdh), size: 16 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: entry.date || '—', size: 16 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: entry.commentaire || '—', size: 15, color: '666666' })] })] }),
      ]}));
    });

    if (rows.length > 1) {
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows,
      }));
    }
  });
}

export function appendInterpellationsByRayonPdf(doc, cat, yRef, autoTable) {
  getSortedRayons(cat.perRayon).forEach(([rayonName, rayon]) => {
    if (yRef.y > 240) { doc.addPage(); yRef.y = 20; }

    doc.setFontSize(12);
    doc.setTextColor(249, 115, 22);
    doc.text(`${rayonName}  —  ${formatReportMetric(rayon.total)} entrées`, 14, yRef.y);
    yRef.y += 5;
    doc.setFontSize(8);
    doc.setTextColor(80);
    doc.text(`${formatReportMetric(rayon.nombre)} pers.  |  ${formatReportMetric(rayon.poursuites)} pours.  |  ${formatReportKdh(rayon.valeurKdh)} KDH`, 14, yRef.y);
    yRef.y += 4;

    const tableRows = rayon.entries.map((entry) => [
      entry.supermarket_name,
      periodLabel(entry.month, entry.year),
      entry.type || '—',
      formatReportMetric(entry.nombre),
      formatReportMetric(entry.poursuites),
      formatReportKdh(entry.valeurKdh),
      entry.date || '—',
      entry.commentaire || '—',
    ]);

    if (tableRows.length > 0) {
      autoTable(doc, {
        startY: yRef.y,
        head: [['Magasin', 'Période', 'Type', 'Pers.', 'Pours.', 'KDH', 'Date', 'Commentaire']],
        body: tableRows,
        headStyles: { fillColor: [249, 115, 22], fontSize: 7 },
        bodyStyles: { fontSize: 6.5 },
        margin: { left: 14, right: 14 },
        theme: 'grid',
      });
      yRef.y = doc.lastAutoTable.finalY + 8;
    }
  });
}

export function InterpellationsRayonReport({ perRayon, compact = false }) {
  const rayons = getSortedRayons(perRayon);

  if (!rayons.length) {
    return <p className="text-sm text-gray-400 italic">Aucune donnée</p>;
  }

  return (
    <div className="space-y-4">
      {rayons.map(([rayonName, rayon]) => (
        <div key={rayonName} className="border border-amber-100 rounded-xl overflow-hidden">
          <div className="bg-amber-50 px-4 py-3 border-b border-amber-100">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h4 className="font-bold text-amber-800">{rayonName}</h4>
              <span className="text-xs bg-white text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                {formatReportMetric(rayon.total)} entrée{rayon.total > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-amber-900">
              <span><strong>{formatReportMetric(rayon.nombre)}</strong> personnes</span>
              <span><strong>{formatReportMetric(rayon.poursuites)}</strong> poursuites</span>
              <span><strong>{formatReportKdh(rayon.valeurKdh)}</strong> KDH</span>
            </div>
            {Object.keys(rayon.byType || {}).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(rayon.byType).map(([type, stats]) => (
                  <span key={type} className="text-[11px] bg-white text-gray-600 px-2 py-0.5 rounded-md border">
                    {type}: {formatReportMetric(stats.nombre)} pers., {formatReportMetric(stats.poursuites)} pours., {formatReportKdh(stats.valeurKdh)} KDH
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className={`w-full ${compact ? 'text-xs' : 'text-sm'}`}>
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-3 py-2 font-semibold text-gray-600">Magasin</th>
                  <th className="px-3 py-2 font-semibold text-gray-600">Période</th>
                  <th className="px-3 py-2 font-semibold text-gray-600">Type</th>
                  <th className="px-3 py-2 font-semibold text-gray-600 text-center">Personnes</th>
                  <th className="px-3 py-2 font-semibold text-gray-600 text-center">Poursuites</th>
                  <th className="px-3 py-2 font-semibold text-gray-600 text-center">KDH</th>
                  <th className="px-3 py-2 font-semibold text-gray-600">Date</th>
                  <th className="px-3 py-2 font-semibold text-gray-600">Commentaire</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rayon.entries.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-800">{entry.supermarket_name}</td>
                    <td className="px-3 py-2 text-gray-600">{periodLabel(entry.month, entry.year)}</td>
                    <td className="px-3 py-2 text-gray-700">{entry.type}</td>
                    <td className="px-3 py-2 text-center text-gray-800">{formatReportMetric(entry.nombre)}</td>
                    <td className="px-3 py-2 text-center text-blue-700">{formatReportMetric(entry.poursuites)}</td>
                    <td className="px-3 py-2 text-center text-emerald-700">{formatReportKdh(entry.valeurKdh)}</td>
                    <td className="px-3 py-2 text-gray-600">{entry.date || '—'}</td>
                    <td className="px-3 py-2 text-gray-500 max-w-[220px]">
                      {entry.commentaire ? (
                        <span className="line-clamp-2" title={entry.commentaire}>{entry.commentaire}</span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

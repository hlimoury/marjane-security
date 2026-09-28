/* eslint-disable react-refresh/only-export-components */

const PERSON_TYPES = ['Client', 'Personnel', 'Prestataire'];

export const formatWholeNumber = (value) =>
  String(Math.round(Number(value) || 0));

export const formatKdh = (value) =>
  (Number(value) || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });

const orderedTypes = (byType = {}) => [
  ...PERSON_TYPES.filter((type) => byType[type]),
  ...Object.keys(byType)
    .filter((type) => !PERSON_TYPES.includes(type))
    .sort(),
];

export const getInterpellationStores = (supermarkets = [], categoryData = {}) =>
  supermarkets
    .map((store) => ({
      ...store,
      ...(categoryData.perSupermarket?.[store.id] || {
        total: 0,
        nombre: 0,
        poursuites: 0,
        valeurKdh: 0,
        byType: {},
      }),
    }))
    .filter((store) => store.total > 0)
    .sort((a, b) => b.nombre - a.nombre || a.name.localeCompare(b.name));

export function InterpellationsStoreReport({
  supermarkets,
  categoryData,
  compact = false,
}) {
  const stores = getInterpellationStores(supermarkets, categoryData);
  const totals = categoryData.interpellationTotals;

  if (!stores.length) {
    return <p className="text-sm text-gray-400 italic">Aucune donnée</p>;
  }

  return (
    <div className="space-y-4">
      {totals && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <h4 className="mb-3 font-bold text-orange-800">Total général</h4>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Metric label="Entrées" value={formatWholeNumber(totals.entries)} />
            <Metric label="Personnes" value={formatWholeNumber(totals.nombre)} />
            <Metric label="Poursuites judiciaires" value={formatWholeNumber(totals.poursuites)} />
            <Metric label="Marchandise récupérée" value={`${formatKdh(totals.valeurKdh)} KDH`} />
          </div>
          <TypeSummary byType={totals.byType} />
        </div>
      )}

      {stores.map((store) => (
        <div key={store.id} className="overflow-hidden rounded-xl border border-gray-200">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-bold text-gray-800">{store.name}</h4>
              <span className="text-xs text-gray-500">{store.region}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <Metric label="Entrées" value={formatWholeNumber(store.total)} />
              <Metric label="Personnes" value={formatWholeNumber(store.nombre)} />
              <Metric label="Poursuites judiciaires" value={formatWholeNumber(store.poursuites)} />
              <Metric label="Marchandise récupérée" value={`${formatKdh(store.valeurKdh)} KDH`} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className={`w-full ${compact ? 'text-xs' : 'text-sm'}`}>
              <thead>
                <tr className="bg-white text-left">
                  <th className="px-3 py-2 font-semibold text-gray-600">Type de personne</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600">Entrées</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600">Personnes</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600">Poursuites</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600">Valeur KDH</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orderedTypes(store.byType).map((type) => {
                  const stats = store.byType[type];
                  return (
                    <tr key={type} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-800">{type}</td>
                      <td className="px-3 py-2 text-center">{formatWholeNumber(stats.entries)}</td>
                      <td className="px-3 py-2 text-center">{formatWholeNumber(stats.nombre)}</td>
                      <td className="px-3 py-2 text-center text-blue-700">
                        {formatWholeNumber(stats.poursuites)}
                      </td>
                      <td className="px-3 py-2 text-center text-emerald-700">
                        {formatKdh(stats.valeurKdh)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

const Metric = ({ label, value }) => (
  <div>
    <div className="text-gray-500">{label}</div>
    <div className="font-bold text-gray-800">{value}</div>
  </div>
);

const TypeSummary = ({ byType = {} }) => (
  <div className="mt-3 flex flex-wrap gap-2">
    {orderedTypes(byType).map((type) => {
      const stats = byType[type];
      return (
        <span key={type} className="rounded-md border bg-white px-2 py-1 text-xs text-gray-600">
          <strong>{type}</strong>: {formatWholeNumber(stats.nombre)} pers. ·{' '}
          {formatWholeNumber(stats.poursuites)} pours. · {formatKdh(stats.valeurKdh)} KDH
        </span>
      );
    })}
  </div>
);

export function appendInterpellationsByStoreDocx(
  children,
  supermarkets,
  categoryData,
  docx,
  orange = 'F97316'
) {
  const {
    Paragraph,
    Table,
    TableRow,
    TableCell,
    TextRun,
    AlignmentType,
    WidthType,
    ShadingType,
  } = docx;
  const stores = getInterpellationStores(supermarkets, categoryData);
  const totals = categoryData.interpellationTotals;

  if (totals) {
    children.push(new Paragraph({
      spacing: { before: 100, after: 120 },
      children: [
        new TextRun({ text: 'Total général : ', bold: true, size: 19, color: orange }),
        new TextRun({
          text: `${formatWholeNumber(totals.entries)} entrées | ${formatWholeNumber(totals.nombre)} personnes | ${formatWholeNumber(totals.poursuites)} poursuites | ${formatKdh(totals.valeurKdh)} KDH`,
          size: 18,
          color: '444444',
        }),
      ],
    }));
  }

  const headers = ['Magasin', 'Type', 'Entrées', 'Personnes', 'Poursuites', 'Valeur KDH'];
  const headerCells = headers.map((text) =>
    new TableCell({
      shading: { type: ShadingType.SOLID, color: orange, fill: orange },
      children: [new Paragraph({
        children: [new TextRun({ text, bold: true, size: 16, color: 'FFFFFF' })],
      })],
    })
  );
  const rows = [new TableRow({ tableHeader: true, children: headerCells })];

  stores.forEach((store) => {
    rows.push(makeDocxRow(
      store.name,
      'TOTAL',
      store.total,
      store.nombre,
      store.poursuites,
      store.valeurKdh,
      true,
      { TableRow, TableCell, Paragraph, TextRun, AlignmentType }
    ));
    orderedTypes(store.byType).forEach((type) => {
      const stats = store.byType[type];
      rows.push(makeDocxRow(
        '',
        type,
        stats.entries,
        stats.nombre,
        stats.poursuites,
        stats.valeurKdh,
        false,
        { TableRow, TableCell, Paragraph, TextRun, AlignmentType }
      ));
    });
  });

  if (rows.length > 1) {
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows,
    }));
  }
}

const makeDocxRow = (
  store,
  type,
  entries,
  nombre,
  poursuites,
  valeurKdh,
  bold,
  docx
) => {
  const { TableRow, TableCell, Paragraph, TextRun, AlignmentType } = docx;
  const values = [
    store,
    type,
    formatWholeNumber(entries),
    formatWholeNumber(nombre),
    formatWholeNumber(poursuites),
    formatKdh(valeurKdh),
  ];

  return new TableRow({
    children: values.map((value, index) =>
      new TableCell({
        children: [new Paragraph({
          alignment: index >= 2 ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [new TextRun({ text: value || ' ', size: 16, bold })],
        })],
      })
    ),
  });
};

export function appendInterpellationsByStorePdf(
  doc,
  supermarkets,
  categoryData,
  yRef,
  autoTable
) {
  const totals = categoryData.interpellationTotals;
  const stores = getInterpellationStores(supermarkets, categoryData);

  if (totals) {
    doc.setFontSize(8);
    doc.setTextColor(70);
    const summary = [
      `Total: ${formatWholeNumber(totals.entries)} entrées`,
      `${formatWholeNumber(totals.nombre)} personnes`,
      `${formatWholeNumber(totals.poursuites)} poursuites`,
      `${formatKdh(totals.valeurKdh)} KDH`,
    ].join('  |  ');
    doc.text(summary, 14, yRef.y);
    yRef.y += 5;
  }

  const rows = [];
  stores.forEach((store) => {
    rows.push([
      store.name,
      'TOTAL',
      formatWholeNumber(store.total),
      formatWholeNumber(store.nombre),
      formatWholeNumber(store.poursuites),
      formatKdh(store.valeurKdh),
    ]);
    orderedTypes(store.byType).forEach((type) => {
      const stats = store.byType[type];
      rows.push([
        '',
        type,
        formatWholeNumber(stats.entries),
        formatWholeNumber(stats.nombre),
        formatWholeNumber(stats.poursuites),
        formatKdh(stats.valeurKdh),
      ]);
    });
  });

  if (rows.length > 0) {
    autoTable(doc, {
      startY: yRef.y,
      head: [['Magasin', 'Type', 'Entrées', 'Personnes', 'Poursuites', 'Valeur KDH']],
      body: rows,
      headStyles: { fillColor: [249, 115, 22], fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 27 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 28, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
      theme: 'grid',
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.raw?.[1] === 'TOTAL') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [255, 247, 237];
        }
      },
    });
    yRef.y = doc.lastAutoTable.finalY + 8;
  }
}

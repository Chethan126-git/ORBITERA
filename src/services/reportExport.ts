import { jsPDF } from 'jspdf';
import type { InvestigationRecord } from '../types/orbitera';

export function exportInvestigationCsv(record: InvestigationRecord): void {
  const vars = record.dataset.variables;
  const header = ['date_key', 'year', 'month', ...vars].join(',');
  const rows = record.dataset.observations.map((obs) => {
    const vals = vars.map((v) => {
      const val = obs.values[v];
      return val === null || val === undefined ? '' : String(val);
    });
    return [obs.dateKey, obs.year, obs.month ?? '', ...vals].join(',');
  });

  const metadataHeader = [
    `# ORBITERA Scientific Data Export`,
    `# Title: ${record.config.title}`,
    `# Location: ${record.config.locationName} (${record.config.latitude}, ${record.config.longitude})`,
    `# Source: ${record.dataset.sourceName} (${record.dataset.datasetVersion})`,
    `# Retrieved At: ${record.dataset.retrievedAt}`,
    header,
  ];

  const blob = new Blob([metadataHeader.concat(rows).join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `orbitera-${record.config.locationName.toLowerCase().replace(/\s+/g, '-')}-${record.config.startYear}-${record.config.endYear}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportReportPdf(record: InvestigationRecord): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const r = record.report;
  const margin = 44;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  let y = 52;

  const ensureSpace = (needed = 40) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      y = 52;
    }
  };

  const addHeading = (text: string) => {
    ensureSpace(32);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(21, 94, 239);
    doc.text(text, margin, y);
    y += 16;
  };

  const addBody = (text: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(16, 24, 40);
    const lines = doc.splitTextToSize(text, maxWidth) as string[];
    for (const line of lines) {
      ensureSpace(16);
      doc.text(line, margin, y);
      y += 14;
    }
    y += 6;
  };

  // Title header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(16, 24, 40);
  const titleLines = doc.splitTextToSize(`ORBITERA Scientific Report: ${r.investigationTitle}`, maxWidth) as string[];
  for (const l of titleLines) {
    doc.text(l, margin, y);
    y += 22;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(102, 112, 133);
  doc.text(
    `${r.geographicRegion} | ${r.coordinates} | ${r.investigationPeriod}`,
    margin,
    y
  );
  y += 22;

  addHeading('1. Executive Summary');
  addBody(r.executiveSummary);

  addHeading('2. NASA Data Sources & Variables');
  addBody(`Variables: ${r.environmentalVariables.join('; ')}`);
  addBody(`Sources: ${r.nasaDataSources.join(' | ')}`);

  addHeading('3. Statistical Methodology');
  addBody(r.methodology);

  addHeading('4. Trend Findings');
  addBody(r.trendFindings);

  addHeading('5. Anomaly Findings');
  addBody(r.anomalyFindings);

  addHeading('6. Correlation Findings');
  addBody(r.correlationFindings);

  addHeading('7. Scientific Interpretation');
  addBody(r.scientificInterpretation);

  addHeading('8. Accessible Summary (Simplified Mode)');
  addBody(r.simplifiedInterpretation);

  addHeading('9. Environmental Implications');
  addBody(r.environmentalImplications);

  addHeading('10. Limitations & Uncertainty');
  r.limitations.forEach((lim) => addBody(`• ${lim}`));

  addHeading('11. Recommended Follow-Up Investigations');
  r.recommendedFollowUp.forEach((rec) =>
    addBody(`• ${rec.title} (${rec.category}): ${rec.rationale}`)
  );

  addHeading('12. References');
  r.references.forEach((ref) => addBody(`• ${ref}`));

  doc.save(
    `orbitera-report-${record.config.locationName.toLowerCase().replace(/\s+/g, '-')}-${record.config.startYear}-${record.config.endYear}.pdf`
  );
}

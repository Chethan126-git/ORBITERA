import React, { useState } from 'react';
import { Check, Copy, Download, FileSpreadsheet, Printer } from 'lucide-react';
import { useOrbitera } from '../context/OrbiteraContext';
import { exportInvestigationCsv, exportReportPdf } from '../services/reportExport';
import { EmptyState, PanelCard, SectionHeader } from '../components/ui/Primitives';

export function ReportsPage() {
  const {
    investigations,
    activeInvestigation,
    setActiveInvestigationId,
    setActiveTab,
  } = useOrbitera();
  const [copied, setCopied] = useState(false);

  if (!activeInvestigation) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Scientific Investigation Reports"
          subtitle="Generate, preview, and export 16-section scientific investigation briefs in PDF and CSV formats."
        />
        <EmptyState
          title="No Reports Generated Yet"
          description="Run an Earth-system investigation to compile a complete 16-section report with statistical evidence and NASA source citations."
          actionLabel="Start New Investigation"
          onAction={() => setActiveTab('new-investigation')}
        />
      </div>
    );
  }

  const r = activeInvestigation.report;

  const handleCopySummary = async () => {
    const text = `${r.investigationTitle}\n${r.geographicRegion} (${r.investigationPeriod})\n\nExecutive Summary:\n${r.executiveSummary}\n\nTrend Findings:\n${r.trendFindings}\n\nAnomaly Findings:\n${r.anomalyFindings}`;
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Scientific Investigation Reports"
        subtitle="16-section Mission Reporter compilation grounded in live NASA POWER observations and programmatic statistics."
        action={
          <>
            {investigations.length > 1 && (
              <select
                aria-label="Select saved report"
                value={activeInvestigation.id}
                onChange={(e) => setActiveInvestigationId(e.target.value)}
                className="rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-3 py-2 text-xs text-[#101828] dark:text-[#F1F5F9]"
              >
                {investigations.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.config.locationName} ({inv.config.startYear}–{inv.config.endYear})
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => void handleCopySummary()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-3.5 py-2 text-xs font-medium text-[#101828] dark:text-[#F1F5F9] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38] whitespace-nowrap"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-[#16A34A] dark:text-[#4ADE80]" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy Summary'}
            </button>
            <button
              type="button"
              onClick={() => exportInvestigationCsv(activeInvestigation)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-3.5 py-2 text-xs font-medium text-[#101828] dark:text-[#F1F5F9] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38] whitespace-nowrap"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-[#06B6D4]" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-3.5 py-2 text-xs font-medium text-[#101828] dark:text-[#F1F5F9] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38] whitespace-nowrap"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            <button
              type="button"
              onClick={() => exportReportPdf(activeInvestigation)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#155EEF] px-4 py-2 text-xs font-medium text-white hover:bg-[#1149C2] whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </button>
          </>
        }
      />

      {/* Publication-Grade Report Sheet */}
      <article className="rounded-2xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224]/95 print:bg-white print:text-[#101828] p-8 lg:p-10 space-y-8">
        {/* Report Masthead */}
        <header className="border-b border-[#E4EAF2] dark:border-[#1E2B48] pb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#667085] dark:text-[#94A3B8]">
            <span className="font-medium text-[#155EEF] dark:text-[#38BDF8]">ORBITERA Mission Reporter Brief</span>
            <span className="font-mono tabular-nums">
              Generated {new Date(r.generatedAt).toUTCString()}
            </span>
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold text-[#101828] dark:text-[#F1F5F9] sm:text-3xl">
            {r.investigationTitle}
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3 pt-2">
            <div>
              <span className="text-[#667085] dark:text-[#94A3B8] block">Geographic Region</span>
              <span className="font-medium text-[#101828] dark:text-[#F1F5F9]">{r.geographicRegion}</span>
            </div>
            <div>
              <span className="text-[#667085] dark:text-[#94A3B8] block">Coordinates &amp; Elevation</span>
              <span className="font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums">{r.coordinates}</span>
            </div>
            <div>
              <span className="text-[#667085] dark:text-[#94A3B8] block">Investigation Period</span>
              <span className="font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums">{r.investigationPeriod}</span>
            </div>
          </div>
        </header>

        {/* Sections */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <section>
              <h3 className="font-display text-sm font-semibold text-[#155EEF] dark:text-[#38BDF8]">
                01. Executive Summary
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#101828] dark:text-[#CBD5E1]">{r.executiveSummary}</p>
            </section>

            <section>
              <h3 className="font-display text-sm font-semibold text-[#155EEF] dark:text-[#38BDF8]">
                02. Methodology &amp; Computation
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#667085] dark:text-[#94A3B8]">{r.methodology}</p>
            </section>

            <section>
              <h3 className="font-display text-sm font-semibold text-[#155EEF] dark:text-[#38BDF8]">
                03. Trend Findings (Trend Detective)
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#101828] dark:text-[#CBD5E1]">{r.trendFindings}</p>
            </section>

            <section>
              <h3 className="font-display text-sm font-semibold text-[#155EEF] dark:text-[#38BDF8]">
                04. Anomaly Findings (Anomaly Hunter)
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#101828] dark:text-[#CBD5E1]">{r.anomalyFindings}</p>
            </section>

            <section>
              <h3 className="font-display text-sm font-semibold text-[#155EEF] dark:text-[#38BDF8]">
                05. Correlation Findings (Correlation Intelligence)
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#101828] dark:text-[#CBD5E1]">{r.correlationFindings}</p>
            </section>

            <section>
              <h3 className="font-display text-sm font-semibold text-[#155EEF] dark:text-[#38BDF8]">
                06. Scientific Interpretation &amp; Implications
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#101828] dark:text-[#CBD5E1]">
                {r.scientificInterpretation}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#667085] dark:text-[#94A3B8]">
                {r.environmentalImplications}
              </p>
            </section>

            <section className="rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/60 dark:bg-[#0D162D] p-4">
              <h3 className="font-display text-sm font-semibold text-[#101828] dark:text-[#F1F5F9]">
                07. Accessible Summary (Simplified Mode)
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#101828] dark:text-[#CBD5E1]">
                {r.simplifiedInterpretation}
              </p>
            </section>
          </div>

          <div className="space-y-6 lg:col-span-4">
            <PanelCard title="Environmental Variables">
              <ul className="space-y-1.5 text-xs text-[#101828] dark:text-[#CBD5E1]">
                {r.environmentalVariables.map((v) => (
                  <li key={v} className="border-b border-[#E4EAF2] dark:border-[#1E2B48] pb-1.5 last:border-b-0">
                    {v}
                  </li>
                ))}
              </ul>
            </PanelCard>

            <PanelCard title="NASA Data Sources">
              <ul className="space-y-2 text-xs text-[#667085] dark:text-[#94A3B8]">
                {r.nasaDataSources.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </PanelCard>

            <PanelCard title="Limitations & Uncertainty">
              <ul className="list-disc pl-4 space-y-1.5 text-xs text-[#667085] dark:text-[#94A3B8]">
                {r.limitations.map((l, idx) => (
                  <li key={idx}>{l}</li>
                ))}
              </ul>
            </PanelCard>

            <PanelCard title="Recommended Follow-Up">
              <ul className="space-y-2.5 text-xs">
                {r.recommendedFollowUp.map((rec) => (
                  <li key={rec.title} className="border-b border-[#E4EAF2] dark:border-[#1E2B48] pb-2 last:border-b-0">
                    <p className="font-semibold text-[#101828] dark:text-[#F1F5F9]">{rec.title}</p>
                    <p className="mt-0.5 text-[#667085] dark:text-[#94A3B8]">{rec.rationale}</p>
                  </li>
                ))}
              </ul>
            </PanelCard>

            <PanelCard title="References">
              <ul className="space-y-1.5 text-[11px] text-[#667085] dark:text-[#94A3B8] break-words">
                {r.references.map((ref) => (
                  <li key={ref}>{ref}</li>
                ))}
              </ul>
            </PanelCard>
          </div>
        </div>
      </article>
    </div>
  );
}

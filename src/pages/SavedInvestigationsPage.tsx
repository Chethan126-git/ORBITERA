import React, { useState } from 'react';
import { ArrowRight, Download, FileText, Trash2 } from 'lucide-react';
import { useOrbitera } from '../context/OrbiteraContext';
import { exportInvestigationCsv, exportReportPdf } from '../services/reportExport';
import { EmptyState, PanelCard, SectionHeader } from '../components/ui/Primitives';

export function SavedInvestigationsPage() {
  const {
    investigations,
    activeInvestigation,
    setActiveInvestigationId,
    deleteInvestigation,
    setActiveTab,
  } = useOrbitera();
  const [filterText, setFilterText] = useState('');

  const filtered = investigations.filter(
    (inv) =>
      inv.config.title.toLowerCase().includes(filterText.toLowerCase()) ||
      inv.config.locationName.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Saved Investigations"
        subtitle="Persistent archive of completed NASA POWER investigations, computed statistics, agent outputs, and reports stored locally in your browser."
        action={
          <button
            type="button"
            onClick={() => setActiveTab('new-investigation')}
            className="rounded-lg bg-[#155EEF] px-4 py-2 text-xs font-medium text-white hover:bg-[#1149C2] whitespace-nowrap"
          >
            New Investigation
          </button>
        }
      />

      {investigations.length === 0 ? (
        <EmptyState
          title="No Saved Investigations Yet"
          description="Completed investigations are automatically saved here with their NASA POWER datasets, statistics, and 16-section reports."
          actionLabel="Launch Investigation"
          onAction={() => setActiveTab('new-investigation')}
        />
      ) : (
        <PanelCard
          title={`Investigation Archive (${filtered.length})`}
          rightSlot={
            <input
              type="search"
              aria-label="Filter saved investigations"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter by title or location..."
              className="rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-3 py-1.5 text-xs text-[#101828] dark:text-[#F1F5F9] placeholder:text-[#667085] dark:placeholder:text-[#94A3B8] focus:border-[#155EEF] focus:outline-none"
            />
          }
        >
          <div className="space-y-3">
            {filtered.map((inv) => {
              const isActive = inv.id === activeInvestigation?.id;
              return (
                <div
                  key={inv.id}
                  className={`flex flex-col gap-4 rounded-xl border p-4 lg:flex-row lg:items-center lg:justify-between ${
                    isActive
                      ? 'border-[#155EEF]/40 dark:border-[#38BDF8]/40 bg-[#F5F9FF]/60 dark:bg-[#0D162D]'
                      : 'border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224]/70'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#667085] dark:text-[#94A3B8]">
                      <span className="font-mono text-[#155EEF] dark:text-[#38BDF8]">
                        {inv.config.startYear}–{inv.config.endYear}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {inv.config.latitude.toFixed(2)}°, {inv.config.longitude.toFixed(2)}°
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{inv.config.variables.join(', ')}</span>
                      <span aria-hidden="true">·</span>
                      <span>Signal {inv.statistics.earthSignalScore.overallScore}/100</span>
                    </div>
                    <h3 className="font-display text-base font-semibold text-[#101828] dark:text-[#F1F5F9]">
                      {inv.config.title}
                    </h3>
                    <p className="text-xs text-[#667085] dark:text-[#94A3B8]">
                      Saved {new Date(inv.createdAt).toLocaleString()} · {inv.dataset.observations.length}{' '}
                      NASA observations
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveInvestigationId(inv.id);
                        setActiveTab('overview');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#155EEF] px-3 py-2 text-xs font-medium text-white hover:bg-[#1149C2] whitespace-nowrap"
                    >
                      {isActive ? 'Open Overview' : 'Load Active'}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveInvestigationId(inv.id);
                        setActiveTab('reports');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-3 py-2 text-xs font-medium text-[#101828] dark:text-[#F1F5F9] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38] whitespace-nowrap"
                    >
                      <FileText className="h-3.5 w-3.5 text-[#155EEF] dark:text-[#38BDF8]" />
                      Report
                    </button>
                    <button
                      type="button"
                      onClick={() => exportReportPdf(inv)}
                      aria-label={`Download PDF for ${inv.config.title}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-2.5 py-2 text-xs text-[#101828] dark:text-[#F1F5F9] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => exportInvestigationCsv(inv)}
                      aria-label={`Export CSV for ${inv.config.title}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-2.5 py-2 text-xs text-[#101828] dark:text-[#F1F5F9] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38]"
                    >
                      CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteInvestigation(inv.id)}
                      aria-label={`Delete ${inv.config.title}`}
                      className="inline-flex items-center justify-center rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] p-2 text-[#DC2626] dark:text-[#F87171] hover:bg-[#FEF2F2] dark:hover:bg-[#7F1D1D]/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </PanelCard>
      )}
    </div>
  );
}

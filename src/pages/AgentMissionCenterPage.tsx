import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  Bot,
  Compass,
  FileText,
  GitCompare,
  Play,
  Radar,
  RefreshCw,
} from 'lucide-react';
import { useOrbitera } from '../context/OrbiteraContext';
import {
  AgentStatusIndicator,
  PanelCard,
  SectionHeader,
} from '../components/ui/Primitives';
import type { AgentId } from '../types/orbitera';

const AGENT_ICONS: Record<AgentId, React.ComponentType<{ className?: string }>> = {
  earth_scout: Compass,
  trend_detective: Activity,
  anomaly_hunter: Radar,
  correlation_intelligence: GitCompare,
  earth_explainer: Bot,
  mission_reporter: FileText,
};

export function AgentMissionCenterPage() {
  const {
    agents,
    isRunning,
    pipelineStage,
    activeInvestigation,
    draftConfig,
    runInvestigation,
    setActiveTab,
  } = useOrbitera();

  const [expandedAgentId, setExpandedAgentId] = useState<AgentId | null>('earth_scout');

  const handleRerun = () => {
    const cfg = activeInvestigation?.config ?? draftConfig;
    void runInvestigation({ ...cfg, id: `inv-${Date.now()}` });
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="ORBITERA Agent Mission Center"
        subtitle="Real-time orchestration telemetry, communication topology, execution durations, and structured JSON payloads across all six specialized intelligence agents."
        action={
          <>
            <button
              type="button"
              onClick={handleRerun}
              disabled={isRunning}
              className="inline-flex items-center gap-2 rounded-lg bg-[#155EEF] px-4 py-2 text-xs font-medium text-white hover:bg-[#1149C2] disabled:opacity-50 whitespace-nowrap"
            >
              {isRunning ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {isRunning ? 'Orchestration Running...' : 'Re-Run Full Pipeline'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('new-investigation')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-3.5 py-2 text-xs font-medium text-[#101828] dark:text-[#F1F5F9] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38] whitespace-nowrap"
            >
              Configure Query
            </button>
          </>
        }
      />

      {/* Visual Multi-Agent Communication Architecture Diagram */}
      <PanelCard
        title="Multi-Agent Communication Topology"
        subtitle={
          pipelineStage ||
          (activeInvestigation
            ? `Last completed mission: ${activeInvestigation.config.locationName} (${activeInvestigation.config.startYear}–${activeInvestigation.config.endYear})`
            : 'Orchestration flow from user query to NASA POWER retrieval, deterministic math, and Gemini synthesis')
        }
      >
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[880px] rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/60 dark:bg-[#0D162D] p-5">
            {/* Stage Flow */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224] px-3 py-2.5 font-medium text-[#101828] dark:text-[#F1F5F9] shrink-0">
                User Query Parser
              </div>
              <ArrowRight className="h-4 w-4 text-[#155EEF] dark:text-[#38BDF8] shrink-0" />
              <div className="rounded-lg border border-[#155EEF]/30 dark:border-[#38BDF8]/30 bg-white dark:bg-[#0B1224] px-3 py-2.5 shrink-0">
                <span className="font-semibold text-[#101828] dark:text-[#F1F5F9] block">01. Earth Scout</span>
                <span className="text-[11px] text-[#667085] dark:text-[#94A3B8]">NASA Discovery</span>
              </div>
              <ArrowRight className="h-4 w-4 text-[#155EEF] dark:text-[#38BDF8] shrink-0" />
              <div className="rounded-lg border border-[#06B6D4]/40 bg-white dark:bg-[#0B1224] px-3 py-2.5 shrink-0">
                <span className="font-semibold text-[#101828] dark:text-[#F1F5F9] block">NASA POWER + Math</span>
                <span className="text-[11px] text-[#667085] dark:text-[#94A3B8]">OLS · MK · Sen · Z</span>
              </div>
              <ArrowRight className="h-4 w-4 text-[#155EEF] dark:text-[#38BDF8] shrink-0" />

              {/* Parallel Analytical Agents */}
              <div className="flex flex-col gap-1.5 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224] p-2 shrink-0">
                <span className="text-[10px] font-medium text-[#667085] dark:text-[#94A3B8]">
                  Parallel Analytical Stage
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="rounded border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF] dark:bg-[#111C38] px-2 py-1 font-medium text-[#101828] dark:text-[#F1F5F9]">
                    02. Trend Detective
                  </span>
                  <span className="rounded border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF] dark:bg-[#111C38] px-2 py-1 font-medium text-[#101828] dark:text-[#F1F5F9]">
                    03. Anomaly Hunter
                  </span>
                  <span className="rounded border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF] dark:bg-[#111C38] px-2 py-1 font-medium text-[#101828] dark:text-[#F1F5F9]">
                    04. Correlation
                  </span>
                </div>
              </div>

              <ArrowRight className="h-4 w-4 text-[#155EEF] dark:text-[#38BDF8] shrink-0" />
              <div className="rounded-lg border border-[#155EEF]/30 dark:border-[#38BDF8]/30 bg-white dark:bg-[#0B1224] px-3 py-2.5 shrink-0">
                <span className="font-semibold text-[#101828] dark:text-[#F1F5F9] block">05. Earth Explainer</span>
                <span className="text-[11px] text-[#667085] dark:text-[#94A3B8]">Dual Interpretation</span>
              </div>
              <ArrowRight className="h-4 w-4 text-[#155EEF] dark:text-[#38BDF8] shrink-0" />
              <div className="rounded-lg border border-[#16A34A]/30 bg-white dark:bg-[#0B1224] px-3 py-2.5 shrink-0">
                <span className="font-semibold text-[#101828] dark:text-[#F1F5F9] block">06. Mission Reporter</span>
                <span className="text-[11px] text-[#667085] dark:text-[#94A3B8]">16-Section Brief</span>
              </div>
            </div>
          </div>
        </div>
      </PanelCard>

      {/* Six Specialized Agent Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent, index) => {
          const Icon = AGENT_ICONS[agent.id];
          const isExpanded = expandedAgentId === agent.id;
          return (
            <div
              key={agent.id}
              className="flex flex-col justify-between rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224]/90 p-5"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF] dark:bg-[#0D162D] text-[#155EEF] dark:text-[#38BDF8] shrink-0">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-mono text-[11px] text-[#667085] dark:text-[#94A3B8]">Agent 0{index + 1}</p>
                      <h3 className="font-display text-base font-semibold text-[#101828] dark:text-[#F1F5F9]">
                        {agent.name}
                      </h3>
                      <p className="text-xs text-[#155EEF] dark:text-[#38BDF8]">{agent.role}</p>
                    </div>
                  </div>
                  <AgentStatusIndicator status={agent.status} />
                </div>

                <p className="mt-3 text-xs leading-relaxed text-[#667085] dark:text-[#94A3B8]">{agent.mission}</p>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] text-[#667085] dark:text-[#94A3B8] mb-1">
                    <span className="truncate pr-2">{agent.currentTask}</span>
                    <span className="font-mono tabular-nums shrink-0">{agent.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E4EAF2] dark:bg-[#1E2B48]">
                    <div
                      className={`h-full transition-all duration-300 ${
                        agent.status === 'Failed'
                          ? 'bg-[#DC2626]'
                          : agent.status === 'Completed'
                          ? 'bg-[#16A34A]'
                          : 'bg-[#155EEF]'
                      }`}
                      style={{ width: `${agent.progress}%` }}
                    />
                  </div>
                </div>

                {/* Output Summary */}
                {agent.outputSummary && (
                  <div className="mt-4 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/50 dark:bg-[#0D162D] p-3 text-xs leading-relaxed text-[#101828] dark:text-[#CBD5E1]">
                    {agent.outputSummary}
                  </div>
                )}

                {agent.errorMessage && (
                  <div className="mt-4 rounded-lg border border-[#DC2626]/30 bg-[#FEF2F2] dark:bg-[#7F1D1D]/30 p-3 text-xs text-[#DC2626] dark:text-[#FCA5A5]">
                    {agent.errorMessage}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#E4EAF2] dark:border-[#1E2B48] pt-3 text-[11px] text-[#667085] dark:text-[#94A3B8]">
                <span className="font-mono tabular-nums">
                  {typeof agent.durationMs === 'number'
                    ? `Duration: ${agent.durationMs} ms`
                    : 'Duration: —'}
                </span>
                {agent.structuredOutput && (
                  <button
                    type="button"
                    onClick={() => setExpandedAgentId(isExpanded ? null : agent.id)}
                    className="font-medium text-[#155EEF] dark:text-[#38BDF8] hover:underline"
                  >
                    {isExpanded ? 'Hide JSON' : 'Inspect JSON'}
                  </button>
                )}
              </div>

              {isExpanded && agent.structuredOutput && (
                <pre className="mt-3 max-h-48 overflow-auto rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF] dark:bg-[#050814] p-3 font-mono text-[11px] text-[#101828] dark:text-[#CBD5E1]">
                  {JSON.stringify(agent.structuredOutput, null, 2)}
                </pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

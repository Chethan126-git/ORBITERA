import React from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  Compass,
  Database,
  FileText,
  GitCompare,
  Globe2,
  Layers,
  Moon,
  Radar,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { AGENT_DEFINITIONS, EXAMPLE_QUERIES, NASA_EXTERNAL_RESOURCES } from '../config/nasaCatalog';
import { useOrbitera } from '../context/OrbiteraContext';
import { OrbitalEarthCanvas } from '../components/landing/OrbitalEarthCanvas';
import { OrbiteraLogo } from '../components/ui/OrbiteraLogo';
import type { GeoLocationOption } from '../types/orbitera';

export function LandingPage() {
  const { setActiveTab, setDraftConfig, launchFromNaturalLanguage, settings, toggleTheme } =
    useOrbitera();

  const handleInvestigateLocation = (loc: GeoLocationOption) => {
    setDraftConfig((prev) => ({
      ...prev,
      id: `inv-${Date.now()}`,
      title: `${loc.name} Earth System Trend Investigation`,
      query: `Investigate temperature and precipitation trends in ${loc.name} from 2001 to 2024.`,
      locationName: loc.name,
      regionLabel: `${loc.region}, ${loc.country}`,
      latitude: loc.latitude,
      longitude: loc.longitude,
    }));
    setActiveTab('new-investigation');
  };

  return (
    <div className="min-h-screen space-canvas text-[#101828] dark:text-[#F1F5F9]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 border-b border-[#E4EAF2] dark:border-[#1E2B48] bg-white/95 dark:bg-[#080E20]/90 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-8 px-6 lg:px-10">
          <a
            href="#top"
            className="inline-flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-[#101828] dark:text-[#F1F5F9] whitespace-nowrap shrink-0"
          >
            <OrbiteraLogo className="h-8 w-8" />
            <span>ORBITERA</span>
          </a>

          <nav
            aria-label="Landing Navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#667085] dark:text-[#94A3B8]"
          >
            <a href="#earth-signals" className="hover:text-[#101828] dark:hover:text-[#F1F5F9] transition-colors whitespace-nowrap shrink-0">
              Signals
            </a>
            <a href="#agents" className="hover:text-[#101828] dark:hover:text-[#F1F5F9] transition-colors whitespace-nowrap shrink-0">
              AI Agents
            </a>
            <a href="#nasa-data" className="hover:text-[#101828] dark:hover:text-[#F1F5F9] transition-colors whitespace-nowrap shrink-0">
              NASA Data
            </a>
            <a href="#workflow" className="hover:text-[#101828] dark:hover:text-[#F1F5F9] transition-colors whitespace-nowrap shrink-0">
              Workflow
            </a>
            <a href="#transparency" className="hover:text-[#101828] dark:hover:text-[#F1F5F9] transition-colors whitespace-nowrap shrink-0">
              Transparency
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="rounded-lg bg-[#155EEF] px-4 py-2 text-sm font-medium text-white hover:bg-[#1149C2] transition-colors whitespace-nowrap shrink-0"
            >
              Launch Workspace
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* 1. HERO SECTION */}
        <section className="scientific-grid border-b border-[#E4EAF2] dark:border-[#1E2B48]">
          <div className="mx-auto max-w-[1440px] px-6 py-12 lg:px-10 lg:py-16">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-stretch">
              <div className="flex flex-col justify-center lg:col-span-6">
                <p className="text-xs font-medium text-[#155EEF] dark:text-[#38BDF8]">
                  Orbital Earth Intelligence &amp; Trend Investigation Platform · NASA Space Apps Challenge
                </p>
                <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-[#101828] dark:text-[#F1F5F9] sm:text-5xl lg:text-[54px] lg:leading-[1.08] text-balance">
                  Earth Is Changing. Discover the Signals.
                </h1>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-[#667085] dark:text-[#CBD5E1] lg:text-lg">
                  Investigate hidden environmental trends using NASA Earth science data,
                  computational intelligence, and collaborative AI agents.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('new-investigation')}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#155EEF] px-5 py-3 text-sm font-medium text-white hover:bg-[#1149C2] transition-colors whitespace-nowrap"
                  >
                    Start an Investigation
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224] px-5 py-3 text-sm font-medium text-[#101828] dark:text-[#F1F5F9] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38] transition-colors whitespace-nowrap"
                  >
                    Explore Earth Intelligence
                  </button>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224] px-4 py-3 text-xs font-medium text-[#667085] dark:text-[#CBD5E1] hover:text-[#101828] dark:hover:text-[#F1F5F9] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38] transition-colors whitespace-nowrap"
                    aria-label={settings.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Space Dark Mode'}
                  >
                    {settings.theme === 'dark' ? (
                      <>
                        <Sun className="h-4 w-4 text-[#38BDF8]" aria-hidden="true" />
                        Light Theme
                      </>
                    ) : (
                      <>
                        <Moon className="h-4 w-4 text-[#155EEF]" aria-hidden="true" />
                        Space Dark
                      </>
                    )}
                  </button>
                </div>

                {/* Quick Natural-Language Prompts */}
                <div className="mt-10 border-t border-[#E4EAF2] dark:border-[#1E2B48] pt-6">
                  <p className="text-xs font-medium text-[#667085] dark:text-[#94A3B8]">
                    Launch a live NASA POWER investigation in one click:
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {EXAMPLE_QUERIES.slice(0, 4).map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => void launchFromNaturalLanguage(item.query, 'new-investigation')}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224]/90 px-3.5 py-2.5 text-left text-xs font-medium text-[#101828] dark:text-[#F1F5F9] hover:border-[#155EEF]/40 dark:hover:border-[#38BDF8]/40 hover:bg-[#F5F9FF] dark:hover:bg-[#111C38] transition-colors"
                      >
                        <span className="truncate">{item.label}</span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#155EEF] dark:text-[#38BDF8]" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6">
                <OrbitalEarthCanvas onInvestigateLocation={handleInvestigateLocation} />
              </div>
            </div>

            {/* 4-Column Grounding Strip */}
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224]/90 p-5">
                <p className="text-xs text-[#667085] dark:text-[#94A3B8]">Primary Telemetry</p>
                <p className="mt-1.5 font-mono text-xl font-bold text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                  NASA POWER v2
                </p>
                <p className="mt-1 text-xs text-[#667085] dark:text-[#94A3B8]">
                  MERRA-2 &amp; CERES SYN1deg live REST retrieval
                </p>
              </div>
              <div className="rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224]/90 p-5">
                <p className="text-xs text-[#667085] dark:text-[#94A3B8]">Statistical Engine</p>
                <p className="mt-1.5 font-mono text-xl font-bold text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                  OLS + MK + Sen
                </p>
                <p className="mt-1 text-xs text-[#667085] dark:text-[#94A3B8]">
                  Deterministic trend slopes, Z-scores &amp; correlation
                </p>
              </div>
              <div className="rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224]/90 p-5">
                <p className="text-xs text-[#667085] dark:text-[#94A3B8]">Agent Architecture</p>
                <p className="mt-1.5 font-mono text-xl font-bold text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                  6 Specialist Agents
                </p>
                <p className="mt-1 text-xs text-[#667085] dark:text-[#94A3B8]">
                  Coordinated Gemini synthesis grounded in real numbers
                </p>
              </div>
              <div className="rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224]/90 p-5">
                <p className="text-xs text-[#667085] dark:text-[#94A3B8]">Temporal Horizon</p>
                <p className="mt-1.5 font-mono text-xl font-bold text-[#101828] dark:text-[#F1F5F9] tabular-nums">
                  1981 – 2026 + Live
                </p>
                <p className="mt-1 text-xs text-[#667085] dark:text-[#94A3B8]">
                  Multi-decade NASA records + live SSE Earth telemetry
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. EARTH IS ALWAYS CHANGING & 3. WHAT ORBITERA INVESTIGATES */}
        <section id="earth-signals" className="mx-auto max-w-[1440px] px-6 py-16 lg:px-10">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="text-xs font-medium text-[#155EEF] dark:text-[#38BDF8]">
                01. Earth Is Always Changing
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#101828] dark:text-[#F1F5F9] text-balance">
                Every Change on Earth Has a Story. ORBITERA Reveals It.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[#667085] dark:text-[#CBD5E1]">
                Raw satellite matrices and multi-decade reanalysis grids are hard to interrogate without
                specialized tools. ORBITERA transforms NASA Earth observations into structured scientific
                investigations built for researchers, educators, and curious explorers.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7">
              {[
                {
                  title: 'What Is Changing & How Fast',
                  desc: 'Quantifies decadal temperature, precipitation, humidity, and solar irradiance slopes with 95% confidence intervals.',
                },
                {
                  title: 'Where & When Shifts Emerged',
                  desc: 'Pinpoints coordinates, maps satellite context layers, and constructs an Environmental Change Timeline.',
                },
                {
                  title: 'Seasonality vs. True Anomalies',
                  desc: 'Evaluates each month against its calendar-month baseline so monsoon or summer peaks are never mislabeled.',
                },
                {
                  title: 'Associated Environmental Factors',
                  desc: 'Measures Pearson and Spearman co-movement across variables while clearly noting that correlation is not causation.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/50 dark:bg-[#0B1224]/90 p-5"
                >
                  <h3 className="font-display text-base font-semibold text-[#101828] dark:text-[#F1F5F9]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#667085] dark:text-[#94A3B8]">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. SIX SPECIALIZED INTELLIGENCE AGENTS */}
        <section
          id="agents"
          className="border-y border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF] dark:bg-[#070C1B]/80"
        >
          <div className="mx-auto max-w-[1440px] px-6 py-16 lg:px-10">
            <div className="max-w-2xl">
              <p className="text-xs font-medium text-[#155EEF] dark:text-[#38BDF8]">
                02. Multi-Agent Intelligence
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#101828] dark:text-[#F1F5F9]">
                Six Specialized Agents Working in Concert
              </h2>
              <p className="mt-3 text-sm text-[#667085] dark:text-[#94A3B8]">
                ORBITERA separates deterministic numerical computation from Gemini-powered scientific
                interpretation so numbers are never fabricated.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {AGENT_DEFINITIONS.map((agent, idx) => {
                const icons = [Compass, Activity, Radar, GitCompare, Bot, FileText];
                const Icon = icons[idx % icons.length];
                return (
                  <div
                    key={agent.id}
                    className="flex flex-col justify-between rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224] p-6"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#F5F9FF] dark:bg-[#111C38] text-[#155EEF] dark:text-[#38BDF8] border border-[#E4EAF2] dark:border-[#1E2B48]">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="font-mono text-xs text-[#667085] dark:text-[#94A3B8]">
                          Agent 0{idx + 1}
                        </span>
                      </div>
                      <h3 className="mt-4 font-display text-lg font-semibold text-[#101828] dark:text-[#F1F5F9]">
                        {agent.name}
                      </h3>
                      <p className="mt-0.5 text-xs font-medium text-[#155EEF] dark:text-[#38BDF8]">
                        {agent.role}
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-[#667085] dark:text-[#94A3B8]">
                        {agent.mission}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 5. NASA EARTH SCIENCE INTEGRATION & 6. WORKFLOW */}
        <section id="nasa-data" className="mx-auto max-w-[1440px] px-6 py-16 lg:px-10">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <p className="text-xs font-medium text-[#155EEF] dark:text-[#38BDF8]">
                03. NASA Earth Science Integration
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#101828] dark:text-[#F1F5F9]">
                Built on Authentic NASA Observations
              </h2>
              <p className="mt-3 text-sm text-[#667085] dark:text-[#94A3B8]">
                Every time-series investigation queries live NASA POWER endpoints, records exact retrieval
                timestamps, and distinguishes programmatic feeds from external exploration portals.
              </p>

              <div className="mt-6 space-y-3">
                {NASA_EXTERNAL_RESOURCES.map((res) => (
                  <div
                    key={res.name}
                    className="flex items-start justify-between gap-4 rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224]/90 p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#101828] dark:text-[#F1F5F9]">
                        <Database className="h-4 w-4 text-[#155EEF] dark:text-[#38BDF8]" aria-hidden="true" />
                        <span>{res.name}</span>
                        <span className="text-xs font-normal text-[#667085] dark:text-[#94A3B8]">
                          · {res.role}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-[#667085] dark:text-[#94A3B8]">
                        {res.description}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-[#155EEF] dark:text-[#38BDF8] whitespace-nowrap shrink-0">
                      {res.integratedProgrammatically ? 'Live API' : 'Reference Portal'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div id="workflow" className="lg:col-span-6">
              <p className="text-xs font-medium text-[#155EEF] dark:text-[#38BDF8]">
                04. Investigation Workflow
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#101828] dark:text-[#F1F5F9]">
                From Question to Verified Scientific Brief
              </h2>
              <p className="mt-3 text-sm text-[#667085] dark:text-[#94A3B8]">
                Follow every computation step transparently inside the Agent Mission Center.
              </p>

              <ol className="mt-6 space-y-3">
                {[
                  ['01', 'Natural-Language Query Parsing', 'Converts your question into coordinates, NASA POWER variables, and date bounds.'],
                  ['02', 'Earth Scout Dataset Selection', 'Verifies temporal/spatial suitability and documents grid limitations.'],
                  ['03', 'Live NASA Retrieval & Validation', 'Fetches measurements, strips -999 fill sentinels, and scores completeness.'],
                  ['04', 'Programmatic Statistical Engine', 'Calculates OLS slope, Mann-Kendall Z, Sen’s slope, seasonal Z-scores, and Pearson/Spearman r.'],
                  ['05', 'Dual-Mode Earth Explainer', 'Delivers formal Scientific Mode and clear Gen Z-Friendly explanations side by side.'],
                  ['06', '16-Section Mission Report', 'Exports publication-ready PDF briefs and raw CSV observation tables.'],
                ].map(([num, title, desc]) => (
                  <li
                    key={num}
                    className="flex items-start gap-4 rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/40 dark:bg-[#0B1224]/90 p-4"
                  >
                    <span className="font-mono text-xs font-bold text-[#155EEF] dark:text-[#38BDF8] pt-0.5">
                      {num}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#101828] dark:text-[#F1F5F9]">
                        {title}
                      </p>
                      <p className="mt-0.5 text-xs text-[#667085] dark:text-[#94A3B8]">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* 7–9. INTERACTIVE WORKSPACE MODULES & REAL-WORLD APPLICATIONS */}
        <section className="border-t border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/60 dark:bg-[#070C1B]/80">
          <div className="mx-auto max-w-[1440px] px-6 py-16 lg:px-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-medium text-[#155EEF] dark:text-[#38BDF8]">
                  05. Desktop-First Modules
                </p>
                <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#101828] dark:text-[#F1F5F9]">
                  Integrated Analytical Workspaces
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#155EEF] dark:text-[#38BDF8] hover:underline whitespace-nowrap"
              >
                Open Full Platform
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: BarChart3,
                  title: 'Trend Intelligence',
                  desc: 'Wide regression charts, Sen’s slope, Mann-Kendall p-values, and Earth Signal Score.',
                  tab: 'trend-intelligence' as const,
                },
                {
                  icon: Radar,
                  title: 'Anomaly Detection',
                  desc: 'Calendar-month baseline Z-scores distinguishing extreme deviations from normal seasons.',
                  tab: 'anomaly-detection' as const,
                },
                {
                  icon: Layers,
                  title: 'Correlation Lab',
                  desc: 'Interactive scatter plots, Pearson r / Spearman ρ matrices, and causality safeguards.',
                  tab: 'correlation-lab' as const,
                },
                {
                  icon: Globe2,
                  title: 'Regional Comparison',
                  desc: 'Side-by-side climate benchmarking such as Bengaluru vs. Chennai or Mumbai vs. Delhi.',
                  tab: 'regional-comparison' as const,
                },
              ].map((card) => (
                <button
                  key={card.title}
                  type="button"
                  onClick={() => setActiveTab(card.tab)}
                  className="flex flex-col justify-between rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224] p-5 text-left hover:border-[#155EEF]/50 dark:hover:border-[#38BDF8]/50 transition-colors"
                >
                  <div>
                    <card.icon className="h-5 w-5 text-[#155EEF] dark:text-[#38BDF8]" aria-hidden="true" />
                    <h3 className="mt-3 font-display text-base font-semibold text-[#101828] dark:text-[#F1F5F9]">
                      {card.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#667085] dark:text-[#94A3B8]">
                      {card.desc}
                    </p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[#155EEF] dark:text-[#38BDF8]">
                    Open Workspace <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 10. SCIENTIFIC TRANSPARENCY & 11. FINAL CTA */}
        <section id="transparency" className="mx-auto max-w-[1440px] px-6 py-16 lg:px-10">
          <div className="rounded-2xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224]/95 p-8 lg:p-10">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-8">
                <div className="inline-flex items-center gap-2 text-xs font-medium text-[#16A34A] dark:text-[#4ADE80]">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Scientific Transparency &amp; Data Integrity Commitment
                </div>
                <h2 className="mt-2 font-display text-2xl font-bold text-[#101828] dark:text-[#F1F5F9] sm:text-3xl">
                  Traceable Observations. Zero Fabricated Statistics.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[#667085] dark:text-[#94A3B8]">
                  ORBITERA separates raw NASA observations, programmatic statistical tests, and
                  AI-generated narrative interpretations. When sample size is low or uncertainty is high,
                  the platform explicitly reports &ldquo;Insufficient Data&rdquo; or &ldquo;Uncertain Result.&rdquo;
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:col-span-4 lg:justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('new-investigation')}
                  className="rounded-lg bg-[#155EEF] px-5 py-3 text-sm font-medium text-white hover:bg-[#1149C2] transition-colors whitespace-nowrap"
                >
                  Start an Investigation
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('data-explorer')}
                  className="rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF] dark:bg-[#111C38] px-5 py-3 text-sm font-medium text-[#101828] dark:text-[#F1F5F9] hover:bg-[#EBF4FF] dark:hover:bg-[#172549] transition-colors whitespace-nowrap"
                >
                  Browse NASA Data
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 12. PROFESSIONAL FOOTER */}
      <footer className="border-t border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF] dark:bg-[#070C1B]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-6 py-8 text-xs text-[#667085] dark:text-[#94A3B8] sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <div className="flex items-center gap-2.5">
            <OrbiteraLogo className="h-6 w-6" />
            <span className="font-display font-semibold text-[#101828] dark:text-[#F1F5F9]">
              ORBITERA
            </span>
            <span aria-hidden="true">·</span>
            <span>Orbital Earth Intelligence &amp; Trend Investigation Platform</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <a
              href="https://power.larc.nasa.gov/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#101828] dark:hover:text-[#F1F5F9] transition-colors"
            >
              NASA POWER
            </a>
            <a
              href="https://worldview.earthdata.nasa.gov/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#101828] dark:hover:text-[#F1F5F9] transition-colors"
            >
              NASA Worldview
            </a>
            <a
              href="https://giovanni.gsfc.nasa.gov/giovanni/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#101828] dark:hover:text-[#F1F5F9] transition-colors"
            >
              NASA Giovanni
            </a>
            <a
              href="https://search.earthdata.nasa.gov/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#101828] dark:hover:text-[#F1F5F9] transition-colors"
            >
              NASA Earthdata
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

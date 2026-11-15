import React, { useState } from 'react';
import { Check, Moon, Sun, Trash2 } from 'lucide-react';
import { useOrbitera } from '../context/OrbiteraContext';
import { PanelCard, SectionHeader } from '../components/ui/Primitives';
import type { ExplanationMode, TemporalResolution } from '../types/orbitera';

export function SettingsPage() {
  const {
    settings,
    updateSettings,
    setExplanationMode,
    investigations,
    clearAllInvestigations,
  } = useOrbitera();
  const [savedNotice, setSavedNotice] = useState(false);

  const notifySaved = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Workspace Settings"
        subtitle="Configure default explanation modes, platform theme, NASA POWER time-series defaults, and local browser persistence."
        action={
          savedNotice && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#16A34A] dark:text-[#4ADE80]">
              <Check className="h-4 w-4" /> Preferences Saved
            </span>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PanelCard
          title="Scientific & Narrative Defaults"
          subtitle="Applied automatically to new investigations and assistant responses"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label htmlFor="pref-mode" className="block font-medium text-[#101828] dark:text-[#F1F5F9] mb-1.5">
                Default Interpretation Mode
              </label>
              <select
                id="pref-mode"
                value={settings.defaultExplanationMode}
                onChange={(e) => {
                  const mode = e.target.value as ExplanationMode;
                  updateSettings({ defaultExplanationMode: mode });
                  setExplanationMode(mode);
                  notifySaved();
                }}
                className="w-full rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-3 py-2 text-[#101828] dark:text-[#F1F5F9]"
              >
                <option value="scientific">Scientific Mode (Formal research terminology)</option>
                <option value="simplified">Simplified Mode (Gen Z-friendly scientific clarity)</option>
              </select>
            </div>

            <div>
              <label htmlFor="pref-res" className="block font-medium text-[#101828] dark:text-[#F1F5F9] mb-1.5">
                Default Temporal Resolution
              </label>
              <select
                id="pref-res"
                value={settings.defaultResolution}
                onChange={(e) => {
                  updateSettings({ defaultResolution: e.target.value as TemporalResolution });
                  notifySaved();
                }}
                className="w-full rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-3 py-2 text-[#101828] dark:text-[#F1F5F9]"
              >
                <option value="monthly">Monthly (Recommended for multi-decade trends)</option>
                <option value="annual">Annual (Year-over-year summaries)</option>
                <option value="daily">Daily (Short-span anomaly inspection)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="pref-start" className="block font-medium text-[#101828] dark:text-[#F1F5F9] mb-1.5">
                  Default Start Year
                </label>
                <input
                  id="pref-start"
                  type="number"
                  min={1981}
                  max={2024}
                  value={settings.defaultStartYear}
                  onChange={(e) => {
                    updateSettings({ defaultStartYear: Number(e.target.value) });
                    notifySaved();
                  }}
                  className="w-full rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-3 py-2 font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="pref-end" className="block font-medium text-[#101828] dark:text-[#F1F5F9] mb-1.5">
                  Default End Year
                </label>
                <input
                  id="pref-end"
                  type="number"
                  min={1982}
                  max={2026}
                  value={settings.defaultEndYear}
                  onChange={(e) => {
                    updateSettings({ defaultEndYear: Number(e.target.value) });
                    notifySaved();
                  }}
                  className="w-full rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-3 py-2 font-mono text-[#101828] dark:text-[#F1F5F9] tabular-nums"
                />
              </div>
            </div>
          </div>
        </PanelCard>

        <PanelCard
          title="Appearance, Layout & Local Storage"
          subtitle="Switch platform theme, manage desktop workspace layout, and stored browser investigations"
        >
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] p-4">
              <span className="font-medium text-[#101828] dark:text-[#F1F5F9] block">
                Platform Visual Theme
              </span>
              <span className="text-[#667085] dark:text-[#94A3B8] block mt-0.5">
                Synchronized across dashboard, orbital globe, charts, and landing portal
              </span>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    updateSettings({ theme: 'dark' });
                    notifySaved();
                  }}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 font-medium transition-colors ${
                    settings.theme === 'dark'
                      ? 'border-[#155EEF] bg-[#155EEF] text-white'
                      : 'border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] text-[#101828] dark:text-[#F1F5F9] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38]'
                  }`}
                >
                  <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                  Space Dark
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateSettings({ theme: 'light' });
                    notifySaved();
                  }}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 font-medium transition-colors ${
                    settings.theme === 'light'
                      ? 'border-[#155EEF] bg-[#155EEF] text-white'
                      : 'border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] text-[#101828] dark:text-[#F1F5F9] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38]'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                  Light Daylight
                </button>
              </div>
            </div>

            <label className="flex items-center justify-between rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] p-4 cursor-pointer">
              <div>
                <span className="font-medium text-[#101828] dark:text-[#F1F5F9] block">
                  Live Data 2 Real-Time Auto-Updates (SSE)
                </span>
                <span className="text-[#667085] dark:text-[#94A3B8]">
                  Stream live Open-Meteo atmospheric, air-quality, and NASA EONET natural event updates every 30s
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.liveAutoUpdate}
                onChange={(e) => {
                  updateSettings({ liveAutoUpdate: e.target.checked });
                  notifySaved();
                }}
                className="h-4 w-4 accent-[#155EEF]"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] p-4 cursor-pointer">
              <div>
                <span className="font-medium text-[#101828] dark:text-[#F1F5F9] block">Compact Desktop Sidebar</span>
                <span className="text-[#667085] dark:text-[#94A3B8]">Collapse the 240px left rail to icon-only mode</span>
              </div>
              <input
                type="checkbox"
                checked={settings.sidebarCollapsed}
                onChange={(e) => {
                  updateSettings({ sidebarCollapsed: e.target.checked });
                  notifySaved();
                }}
                className="h-4 w-4 accent-[#155EEF]"
              />
            </label>

            <div className="rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/50 dark:bg-[#0D162D] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#101828] dark:text-[#F1F5F9]">Local Investigation Persistence</p>
                  <p className="mt-0.5 text-[#667085] dark:text-[#94A3B8]">
                    {investigations.length} saved investigation(s) stored in localStorage
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearAllInvestigations}
                  disabled={investigations.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#DC2626]/30 bg-white dark:bg-[#0B1224] px-3 py-2 font-medium text-[#DC2626] dark:text-[#F87171] hover:bg-[#FEF2F2] dark:hover:bg-[#7F1D1D]/30 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear Archive
                </button>
              </div>
            </div>
          </div>
        </PanelCard>
      </div>
    </div>
  );
}

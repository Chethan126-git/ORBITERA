import React from 'react';
import { BookOpen, ShieldCheck, X } from 'lucide-react';
import { useOrbitera } from '../../context/OrbiteraContext';

export function HelpModal() {
  const { helpOpen, setHelpOpen } = useOrbitera();
  if (!helpOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/40 dark:bg-black/70 p-4"
    >
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224] p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#E4EAF2] dark:border-[#1E2B48] pb-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-[#155EEF] dark:text-[#38BDF8]" aria-hidden="true" />
            <h2
              id="help-modal-title"
              className="font-display text-lg font-bold text-[#101828] dark:text-[#F1F5F9]"
            >
              ORBITERA Methodology &amp; Scientific Guide
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setHelpOpen(false)}
            aria-label="Close help dialog"
            className="rounded-lg p-1.5 text-[#667085] dark:text-[#94A3B8] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38] hover:text-[#101828] dark:hover:text-[#F1F5F9]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-5 text-sm text-[#667085] dark:text-[#CBD5E1]">
          <div>
            <h3 className="font-display text-sm font-semibold text-[#101828] dark:text-[#F1F5F9]">
              1. NASA Earth Science Data Sources
            </h3>
            <p className="mt-1 leading-relaxed">
              ORBITERA retrieves live meteorological and solar measurements from the{' '}
              <strong className="text-[#101828] dark:text-[#F1F5F9]">NASA POWER v2 API</strong>{' '}
              (MERRA-2 0.5° × 0.625° atmospheric reanalysis and CERES SYN1deg 1.0° solar irradiance).
              Missing sentinel values (-999) are automatically filtered and reported in Data Quality
              summaries.
            </p>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-[#101828] dark:text-[#F1F5F9]">
              2. Trend &amp; Anomaly Methodology
            </h3>
            <ul className="mt-1.5 list-disc pl-5 space-y-1">
              <li>
                <strong className="text-[#101828] dark:text-[#F1F5F9]">
                  Trend Classification:
                </strong>{' '}
                Combines Ordinary Least Squares (OLS) linear regression with the non-parametric
                Mann-Kendall test (α = 0.05, |Z| ≥ 1.96) and Sen’s median slope estimator.
              </li>
              <li>
                <strong className="text-[#101828] dark:text-[#F1F5F9]">
                  Seasonal Anomaly Detection:
                </strong>{' '}
                Computes separate baselines for each calendar month (1–12) so predictable
                summer/monsoon peaks are not flagged as anomalies. Deviations with |Z| ≥ 2.0σ are
                logged.
              </li>
              <li>
                <strong className="text-[#101828] dark:text-[#F1F5F9]">Correlation Lab:</strong>{' '}
                Evaluates both Pearson linear correlation (r) and Spearman rank correlation (ρ).
                Correlation never implies causation.
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF] dark:bg-[#0D162D] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#16A34A] dark:text-[#4ADE80]">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Exploratory Research Notice
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#667085] dark:text-[#94A3B8]">
              ORBITERA is an exploratory scientific intelligence platform built for the NASA Space
              Apps Challenge. AI interpretations are grounded strictly in computed statistics and are
              not official NASA forecasts or hazard warnings.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-[#E4EAF2] dark:border-[#1E2B48] pt-4">
          <button
            type="button"
            onClick={() => setHelpOpen(false)}
            className="rounded-lg bg-[#155EEF] px-4 py-2 text-xs font-medium text-white hover:bg-[#1149C2]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

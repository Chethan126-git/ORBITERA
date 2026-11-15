import React from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  Minus,
  SkipForward,
  XCircle,
} from 'lucide-react';
import type { AgentExecutionState, TrendCategory } from '../../types/orbitera';

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-[#E4EAF2] dark:border-[#1E2B48] pb-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-[#101828] dark:text-[#F1F5F9] sm:text-[28px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-[#667085] dark:text-[#94A3B8]">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{action}</div>}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  unit,
  detail,
  trendIndicator,
}: {
  label: string;
  value: string | number;
  unit?: string;
  detail?: string;
  trendIndicator?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224]/90 p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[#667085] dark:text-[#94A3B8]">{label}</span>
        {trendIndicator}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-bold tracking-tight text-[#101828] dark:text-[#F1F5F9] tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="font-mono text-xs text-[#667085] dark:text-[#94A3B8]">{unit}</span>
        )}
      </div>
      {detail && (
        <p className="mt-2 text-xs text-[#667085] dark:text-[#94A3B8] leading-snug">{detail}</p>
      )}
    </div>
  );
}

export function TrendIndicatorLabel({ category }: { category: TrendCategory }) {
  switch (category) {
    case 'Increasing':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#DC2626] dark:text-[#F87171] whitespace-nowrap">
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          Increasing
        </span>
      );
    case 'Decreasing':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#155EEF] dark:text-[#60A5FA] whitespace-nowrap">
          <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
          Decreasing
        </span>
      );
    case 'Stable':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A] dark:text-[#4ADE80] whitespace-nowrap">
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
          Stable
        </span>
      );
    case 'Uncertain':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#F59E0B] dark:text-[#FBBF24] whitespace-nowrap">
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Uncertain Result
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#667085] dark:text-[#94A3B8] whitespace-nowrap">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          Insufficient Data
        </span>
      );
  }
}

export function AgentStatusIndicator({ status }: { status: AgentExecutionState }) {
  switch (status) {
    case 'Completed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#16A34A] dark:text-[#4ADE80] whitespace-nowrap">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          Completed
        </span>
      );
    case 'Running':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#155EEF] dark:text-[#60A5FA] whitespace-nowrap">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Running
        </span>
      );
    case 'Queued':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#06B6D4] dark:text-[#22D3EE] whitespace-nowrap">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          Queued
        </span>
      );
    case 'Failed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#DC2626] dark:text-[#F87171] whitespace-nowrap">
          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Failed
        </span>
      );
    case 'Skipped':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#667085] dark:text-[#94A3B8] whitespace-nowrap">
          <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
          Skipped
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#667085] dark:text-[#94A3B8] whitespace-nowrap">
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
          Idle
        </span>
      );
  }
}

export function PanelCard({
  title,
  subtitle,
  rightSlot,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224]/90 p-6 ${className}`}
    >
      {(title || rightSlot) && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title && (
              <h2 className="font-display text-base font-semibold text-[#101828] dark:text-[#F1F5F9]">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-[#667085] dark:text-[#94A3B8]">{subtitle}</p>
            )}
          </div>
          {rightSlot && <div className="shrink-0">{rightSlot}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse" aria-busy="true" aria-label="Loading scientific data">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-10 rounded-lg bg-[#F5F9FF] dark:bg-[#111C38] border border-[#E4EAF2] dark:border-[#1E2B48]"
        />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/60 dark:bg-[#0B1224]/70 px-6 py-12 text-center">
      <h3 className="font-display text-base font-semibold text-[#101828] dark:text-[#F1F5F9]">
        {title}
      </h3>
      <p className="mt-1.5 max-w-md text-sm text-[#667085] dark:text-[#94A3B8]">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 rounded-lg bg-[#155EEF] px-4 py-2 text-sm font-medium text-white hover:bg-[#1149C2] transition-colors whitespace-nowrap"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-[#DC2626]/30 dark:border-[#DC2626]/40 bg-[#FEF2F2] dark:bg-[#2A1015] p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626] dark:text-[#F87171]"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-medium text-[#991B1B] dark:text-[#FCA5A5]">
            Investigation Retrieval Notice
          </p>
          <p className="mt-0.5 text-xs text-[#7F1D1D] dark:text-[#FECACA]">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-[#DC2626]/30 bg-white dark:bg-[#141E36] px-3.5 py-1.5 text-xs font-medium text-[#DC2626] dark:text-[#F87171] hover:bg-[#FEE2E2] dark:hover:bg-[#3A161E] transition-colors whitespace-nowrap shrink-0"
        >
          Retry Retrieval
        </button>
      )}
    </div>
  );
}

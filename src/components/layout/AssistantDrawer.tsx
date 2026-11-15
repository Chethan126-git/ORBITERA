import React, { useState } from 'react';
import { Bot, Send, X } from 'lucide-react';
import { NASA_VARIABLES } from '../../config/nasaCatalog';
import { useOrbitera } from '../../context/OrbiteraContext';
import { askScientificAssistant } from '../../services/api';

const SUGGESTED_QUESTIONS = [
  'What is changing in this region?',
  'What is the rate of change?',
  'Which period experienced the largest anomaly?',
  'Are temperature and precipitation related?',
  'What dataset was used and what are the limitations?',
  'What should I investigate next?',
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  usedGemini?: boolean;
}

export function AssistantDrawer() {
  const {
    assistantOpen,
    setAssistantOpen,
    activeInvestigation,
    explanationMode,
    setExplanationMode,
  } = useOrbitera();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!assistantOpen) return null;

  const buildContextPayload = () => {
    if (!activeInvestigation) return undefined;
    const { config, dataset, statistics } = activeInvestigation;
    return {
      investigationTitle: config.title,
      locationName: config.locationName,
      coordinates: `${config.latitude}, ${config.longitude}`,
      period: `${config.startYear} to ${config.endYear} (${config.resolution})`,
      datasetSource: `${dataset.sourceName} (${dataset.datasetVersion})`,
      retrievedAt: dataset.retrievedAt,
      sampleCount: dataset.observations.length,
      trends: Object.values(statistics.trends).map((t) => ({
        variable: t!.variable,
        label: NASA_VARIABLES[t!.variable].label,
        unit: t!.unit,
        category: t!.category,
        olsSlopePerDecade: t!.olsSlopePerDecade,
        sensSlopePerDecade: t!.sensSlopePerDecade,
        mannKendallZ: t!.mannKendallZ,
        mannKendallPValue: t!.mannKendallPValue,
        mean: t!.mean,
        min: t!.min,
        max: t!.max,
      })),
      topAnomalies: statistics.anomalies.slice(0, 5),
      correlations: statistics.correlations.map((c) => ({
        pair: `${c.varA} vs ${c.varB}`,
        pearsonR: c.pearsonR,
        spearmanRho: c.spearmanRho,
        strength: c.strengthLabel,
        direction: c.directionLabel,
      })),
      earthSignalScore: statistics.earthSignalScore,
      limitations: dataset.limitations,
    };
  };

  const sendQuestion = async (questionText: string) => {
    const q = questionText.trim();
    if (!q || loading) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await askScientificAssistant({
        question: q,
        investigationContext: buildContextPayload(),
        mode: explanationMode,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: res.answer,
          usedGemini: res.usedGemini,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          text:
            err instanceof Error
              ? err.message
              : 'Unable to contact the Scientific Assistant right now.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside
      aria-label="AI Scientific Assistant"
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col border-l border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#080E20] shadow-xl"
    >
      <div className="flex h-[72px] items-center justify-between border-b border-[#E4EAF2] dark:border-[#1E2B48] px-5">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5F9FF] dark:bg-[#111C38] text-[#155EEF] dark:text-[#38BDF8] border border-[#E4EAF2] dark:border-[#1E2B48]">
            <Bot className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-sm font-semibold text-[#101828] dark:text-[#F1F5F9]">
              AI Scientific Assistant
            </h2>
            <p className="text-[11px] text-[#667085] dark:text-[#94A3B8] truncate max-w-[230px]">
              {activeInvestigation
                ? `Grounded in ${activeInvestigation.config.locationName} (${activeInvestigation.config.startYear}–${activeInvestigation.config.endYear})`
                : 'No active investigation loaded'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAssistantOpen(false)}
          aria-label="Close AI Scientific Assistant"
          className="rounded-lg p-2 text-[#667085] dark:text-[#94A3B8] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38] hover:text-[#101828] dark:hover:text-[#F1F5F9]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Mode Switch */}
      <div className="flex items-center justify-between border-b border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF] dark:bg-[#0B1224] px-5 py-2.5">
        <span className="text-xs font-medium text-[#667085] dark:text-[#94A3B8]">
          Explanation Tone
        </span>
        <div className="flex items-center gap-1 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#080E20] p-0.5">
          <button
            type="button"
            onClick={() => setExplanationMode('scientific')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
              explanationMode === 'scientific'
                ? 'bg-[#155EEF] text-white'
                : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#101828] dark:hover:text-[#F1F5F9]'
            }`}
          >
            Scientific
          </button>
          <button
            type="button"
            onClick={() => setExplanationMode('simplified')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
              explanationMode === 'simplified'
                ? 'bg-[#155EEF] text-white'
                : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#101828] dark:hover:text-[#F1F5F9]'
            }`}
          >
            Simplified
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/60 dark:bg-[#0B1224] p-4 text-xs leading-relaxed text-[#667085] dark:text-[#CBD5E1]">
              Ask evidence-based questions about your active NASA POWER investigation. Every answer
              references computed regression slopes, seasonal anomalies, and correlation metrics.
            </div>
            <div>
              <p className="text-xs font-medium text-[#101828] dark:text-[#F1F5F9] mb-2">
                Suggested questions
              </p>
              <div className="space-y-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void sendQuestion(q)}
                    className="w-full rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224] px-3.5 py-2.5 text-left text-xs text-[#101828] dark:text-[#F1F5F9] hover:border-[#155EEF]/50 dark:hover:border-[#38BDF8]/40 hover:bg-[#F5F9FF] dark:hover:bg-[#111C38] transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-xl p-3.5 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'ml-8 bg-[#155EEF] text-white'
                  : 'mr-4 border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/60 dark:bg-[#0B1224] text-[#101828] dark:text-[#F1F5F9]'
              }`}
            >
              <p className="whitespace-pre-wrap">{m.text}</p>
            </div>
          ))
        )}
        {loading && (
          <div className="mr-4 rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF] dark:bg-[#0B1224] p-3.5 text-xs text-[#667085] dark:text-[#94A3B8]">
            Synthesizing evidence from computed NASA metrics...
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendQuestion(input);
        }}
        className="border-t border-[#E4EAF2] dark:border-[#1E2B48] p-4"
      >
        <div className="flex items-center gap-2">
          <label htmlFor="assistant-input" className="sr-only">
            Ask a scientific question
          </label>
          <input
            id="assistant-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about trends, anomalies, or NASA sources..."
            className="flex-1 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] px-3.5 py-2.5 text-xs text-[#101828] dark:text-[#F1F5F9] placeholder:text-[#667085] dark:placeholder:text-[#94A3B8] focus:border-[#155EEF] dark:focus:border-[#38BDF8] focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send question"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#155EEF] text-white hover:bg-[#1149C2] disabled:opacity-50 transition-colors shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </aside>
  );
}

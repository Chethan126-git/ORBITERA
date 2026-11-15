import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CURATED_LOCATIONS } from '../config/nasaCatalog';
import { createInitialAgents, executeInvestigationPipeline } from '../services/orchestrator';
import {
  fetchLiveEvents,
  fetchLivePulse,
  fetchLiveTelemetry,
  parseInvestigationQuery,
} from '../services/api';
import type {
  AgentRecord,
  ExplanationMode,
  InvestigationConfig,
  InvestigationRecord,
  LiveEarthEvent,
  LiveStationReading,
  LiveStreamStatus,
  LiveTelemetrySnapshot,
  NavTabId,
  NotificationItem,
  UserSettings,
} from '../types/orbitera';

const STORAGE_INVESTIGATIONS_KEY = 'orbitera_investigations_v1';
const STORAGE_SETTINGS_KEY = 'orbitera_settings_v1';
const STORAGE_ACTIVE_ID_KEY = 'orbitera_active_id_v1';

const DEFAULT_SETTINGS: UserSettings = {
  defaultExplanationMode: 'scientific',
  defaultResolution: 'monthly',
  defaultStartYear: 2001,
  defaultEndYear: 2024,
  temperatureUnit: 'C',
  sidebarCollapsed: false,
  theme: 'dark',
  liveAutoUpdate: true,
};

interface OrbiteraContextValue {
  activeTab: NavTabId;
  setActiveTab: (tab: NavTabId) => void;
  investigations: InvestigationRecord[];
  activeInvestigation: InvestigationRecord | null;
  setActiveInvestigationId: (id: string) => void;
  deleteInvestigation: (id: string) => void;
  clearAllInvestigations: () => void;
  explanationMode: ExplanationMode;
  setExplanationMode: (mode: ExplanationMode) => void;
  settings: UserSettings;
  updateSettings: (patch: Partial<UserSettings>) => void;
  toggleTheme: () => void;
  agents: AgentRecord[];
  isRunning: boolean;
  pipelineStage: string;
  pipelineError: string | null;
  runInvestigation: (config: InvestigationConfig, navigateToResult?: boolean) => Promise<InvestigationRecord | null>;
  launchFromNaturalLanguage: (query: string, navigateToTab?: NavTabId) => Promise<void>;
  cancelInvestigation: () => void;
  draftConfig: InvestigationConfig;
  setDraftConfig: React.Dispatch<React.SetStateAction<InvestigationConfig>>;
  notifications: NotificationItem[];
  markAllNotificationsRead: () => void;
  assistantOpen: boolean;
  setAssistantOpen: (open: boolean) => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  // Live Data 2 & Real-Time Stream
  liveStreamStatus: LiveStreamStatus;
  liveTelemetry: LiveTelemetrySnapshot | null;
  liveEvents: LiveEarthEvent[];
  liveStations: LiveStationReading[];
  lastLiveUpdateAt: string | null;
  liveUpdateCount: number;
  liveRefreshing: boolean;
  toggleLiveUpdates: () => void;
  refreshLiveNow: () => Promise<void>;
}

const OrbiteraContext = createContext<OrbiteraContextValue | null>(null);

function createDefaultDraftConfig(settings: UserSettings): InvestigationConfig {
  const bengaluru = CURATED_LOCATIONS[0];
  return {
    id: `inv-${Date.now()}`,
    title: 'Bengaluru Temperature & Precipitation Trend Investigation',
    query: 'Investigate temperature and precipitation trends in Bengaluru from 2001 to 2024.',
    locationName: bengaluru.name,
    regionLabel: `${bengaluru.region}, ${bengaluru.country}`,
    latitude: bengaluru.latitude,
    longitude: bengaluru.longitude,
    variables: ['T2M', 'PRECTOTCORR'],
    startYear: settings.defaultStartYear,
    endYear: settings.defaultEndYear,
    resolution: settings.defaultResolution,
    investigationType: 'Multi-Variable Relationship Investigation',
    compareLocation: CURATED_LOCATIONS[1],
  };
}

export function OrbiteraProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [investigations, setInvestigations] = useState<InvestigationRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_INVESTIGATIONS_KEY);
      return saved ? (JSON.parse(saved) as InvestigationRecord[]) : [];
    } catch {
      return [];
    }
  });

  const [activeId, setActiveId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_ACTIVE_ID_KEY);
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<NavTabId>('landing');
  const [explanationMode, setExplanationMode] = useState<ExplanationMode>(
    settings.defaultExplanationMode
  );
  const [agents, setAgents] = useState<AgentRecord[]>(() => createInitialAgents());
  const [isRunning, setIsRunning] = useState(false);
  const [pipelineStage, setPipelineStage] = useState('');
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [draftConfig, setDraftConfig] = useState<InvestigationConfig>(() =>
    createDefaultDraftConfig(settings)
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-welcome',
      title: 'NASA POWER & Live Data 2 Ready',
      message:
        'Historical NASA MERRA-2/CERES (1981–2026) and real-time Open-Meteo & NASA EONET live streams are connected.',
      timestamp: new Date().toISOString(),
      type: 'info',
      read: false,
    },
  ]);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const [liveStreamStatus, setLiveStreamStatus] = useState<LiveStreamStatus>(() =>
    settings.liveAutoUpdate ? 'connecting' : 'paused'
  );
  const [liveTelemetry, setLiveTelemetry] = useState<LiveTelemetrySnapshot | null>(null);
  const [liveEvents, setLiveEvents] = useState<LiveEarthEvent[]>([]);
  const [liveStations, setLiveStations] = useState<LiveStationReading[]>([]);
  const [lastLiveUpdateAt, setLastLiveUpdateAt] = useState<string | null>(null);
  const [liveUpdateCount, setLiveUpdateCount] = useState(0);
  const [liveRefreshing, setLiveRefreshing] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const autoBootstrappedRef = useRef(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Ignore quota issues
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_INVESTIGATIONS_KEY, JSON.stringify(investigations.slice(0, 15)));
    } catch {
      // Ignore quota issues
    }
  }, [investigations]);

  useEffect(() => {
    try {
      if (activeId) localStorage.setItem(STORAGE_ACTIVE_ID_KEY, activeId);
    } catch {
      // Ignore
    }
  }, [activeId]);

  const activeInvestigation = useMemo(() => {
    if (investigations.length === 0) return null;
    return investigations.find((inv) => inv.id === activeId) ?? investigations[0];
  }, [investigations, activeId]);

  useEffect(() => {
    if (activeInvestigation && activeInvestigation.agents.length > 0 && !isRunning) {
      setAgents(activeInvestigation.agents);
    }
  }, [activeInvestigation, isRunning]);

  const liveTarget = useMemo(() => {
    if (activeInvestigation) {
      return {
        latitude: activeInvestigation.config.latitude,
        longitude: activeInvestigation.config.longitude,
        locationName: activeInvestigation.config.locationName,
      };
    }
    return {
      latitude: draftConfig.latitude,
      longitude: draftConfig.longitude,
      locationName: draftConfig.locationName,
    };
  }, [
    activeInvestigation,
    draftConfig.latitude,
    draftConfig.longitude,
    draftConfig.locationName,
  ]);

  const refreshLiveNow = useCallback(async () => {
    setLiveRefreshing(true);
    try {
      const [telemetry, eventsRes, pulseRes] = await Promise.all([
        fetchLiveTelemetry({ ...liveTarget, force: true }),
        fetchLiveEvents(true),
        fetchLivePulse(true),
      ]);
      setLiveTelemetry(telemetry);
      const uniqueEventsMap = new Map<string, LiveEarthEvent>();
      for (const ev of eventsRes.events) {
        if (!uniqueEventsMap.has(ev.id)) uniqueEventsMap.set(ev.id, ev);
      }
      setLiveEvents(Array.from(uniqueEventsMap.values()));
      setLiveStations(pulseRes.stations);
      setLastLiveUpdateAt(new Date().toISOString());
      setLiveUpdateCount((c) => c + 1);
      if (settings.liveAutoUpdate) {
        setLiveStreamStatus('live');
      }
    } catch {
      if (settings.liveAutoUpdate) {
        setLiveStreamStatus('error');
      }
    } finally {
      setLiveRefreshing(false);
    }
  }, [liveTarget, settings.liveAutoUpdate]);

  useEffect(() => {
    if (!settings.liveAutoUpdate) {
      setLiveStreamStatus('paused');
      // Still load an initial snapshot once if completely empty so UI has data
      if (!liveTelemetry) {
        void refreshLiveNow();
      }
      return;
    }

    setLiveStreamStatus('connecting');
    const qs = new URLSearchParams({
      lat: String(liveTarget.latitude),
      lon: String(liveTarget.longitude),
      label: liveTarget.locationName,
    });
    const es = new EventSource(`/api/live/stream?${qs.toString()}`);

    es.addEventListener('connected', () => {
      setLiveStreamStatus('live');
    });

    es.addEventListener('telemetry:update', (evt) => {
      try {
        const snapshot = JSON.parse((evt as MessageEvent<string>).data) as LiveTelemetrySnapshot;
        setLiveTelemetry(snapshot);
        setLastLiveUpdateAt(snapshot.fetchedAt || new Date().toISOString());
        setLiveUpdateCount((c) => c + 1);
        setLiveStreamStatus('live');
      } catch {
        // Ignore malformed event
      }
    });

    es.addEventListener('events:update', (evt) => {
      try {
        const payload = JSON.parse((evt as MessageEvent<string>).data) as {
          events: LiveEarthEvent[];
        };
        const uniqueMap = new Map<string, LiveEarthEvent>();
        for (const ev of payload.events ?? []) {
          if (!uniqueMap.has(ev.id)) uniqueMap.set(ev.id, ev);
        }
        setLiveEvents(Array.from(uniqueMap.values()));
        setLiveStreamStatus('live');
      } catch {
        // Ignore malformed event
      }
    });

    es.addEventListener('pulse:update', (evt) => {
      try {
        const payload = JSON.parse((evt as MessageEvent<string>).data) as {
          stations: LiveStationReading[];
        };
        setLiveStations(payload.stations ?? []);
      } catch {
        // Ignore malformed event
      }
    });

    es.onerror = () => {
      setLiveStreamStatus('error');
    };

    return () => {
      es.close();
    };
  }, [
    settings.liveAutoUpdate,
    liveTarget.latitude,
    liveTarget.longitude,
    liveTarget.locationName,
  ]);

  const pushNotification = useCallback(
    (title: string, message: string, type: NotificationItem['type'] = 'info') => {
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title,
          message,
          timestamp: new Date().toISOString(),
          type,
          read: false,
        },
        ...prev.slice(0, 14),
      ]);
    },
    []
  );

  const runInvestigation = useCallback(
    async (
      config: InvestigationConfig,
      navigateToResult = false
    ): Promise<InvestigationRecord | null> => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      setIsRunning(true);
      setPipelineError(null);
      setPipelineStage('Initializing multi-agent investigation...');

      const freshConfig: InvestigationConfig = {
        ...config,
        id: config.id || `inv-${Date.now()}`,
      };

      try {
        const record = await executeInvestigationPipeline(
          freshConfig,
          {
            onAgentsUpdate: (updated) => setAgents(updated),
            onStageMessage: (msg) => setPipelineStage(msg),
          },
          controller.signal
        );

        setInvestigations((prev) => {
          const filtered = prev.filter((item) => item.id !== record.id);
          return [record, ...filtered];
        });
        setActiveId(record.id);
        setPipelineStage('Investigation complete.');
        pushNotification(
          'Signal Investigation Complete',
          `${record.config.locationName} (${record.config.startYear}–${record.config.endYear}) · ${record.dataset.observations.length} NASA records analyzed.`,
          'success'
        );
        if (navigateToResult) {
          setActiveTab('new-investigation');
        }
        return record;
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setPipelineStage('Investigation cancelled by user.');
          return null;
        }
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to complete the scientific investigation.';
        setPipelineError(message);
        setPipelineStage('Investigation encountered an error.');
        pushNotification('Investigation Error', message, 'error');
        return null;
      } finally {
        setIsRunning(false);
        abortRef.current = null;
      }
    },
    [pushNotification]
  );

  // Auto-bootstrap one live NASA POWER investigation on first workspace entry if none exist
  useEffect(() => {
    if (
      activeTab !== 'landing' &&
      investigations.length === 0 &&
      !isRunning &&
      !autoBootstrappedRef.current
    ) {
      autoBootstrappedRef.current = true;
      void runInvestigation(createDefaultDraftConfig(settings), false);
    }
  }, [activeTab, investigations.length, isRunning, runInvestigation, settings]);

  const launchFromNaturalLanguage = useCallback(
    async (query: string, navigateToTab: NavTabId = 'new-investigation') => {
      setActiveTab(navigateToTab);
      setPipelineError(null);
      setPipelineStage('Query Parser interpreting your Earth-system request...');
      try {
        const parsed = await parseInvestigationQuery(query);
        const nextConfig: InvestigationConfig = {
          ...createDefaultDraftConfig(settings),
          ...parsed.config,
          id: `inv-${Date.now()}`,
          query,
        };
        setDraftConfig(nextConfig);
        await runInvestigation(nextConfig, false);
      } catch (err) {
        setPipelineError(
          err instanceof Error ? err.message : 'Unable to parse investigation query.'
        );
      }
    },
    [runInvestigation, settings]
  );

  const cancelInvestigation = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setIsRunning(false);
      setPipelineStage('Investigation cancelled.');
    }
  }, []);

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleTheme = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  }, []);

  const toggleLiveUpdates = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      liveAutoUpdate: !prev.liveAutoUpdate,
    }));
  }, []);

  const deleteInvestigation = useCallback(
    (id: string) => {
      setInvestigations((prev) => {
        const next = prev.filter((i) => i.id !== id);
        if (activeId === id) {
          setActiveId(next[0]?.id ?? null);
        }
        return next;
      });
    },
    [activeId]
  );

  const clearAllInvestigations = useCallback(() => {
    setInvestigations([]);
    setActiveId(null);
    setAgents(createInitialAgents());
    localStorage.removeItem(STORAGE_INVESTIGATIONS_KEY);
    localStorage.removeItem(STORAGE_ACTIVE_ID_KEY);
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const value: OrbiteraContextValue = {
    activeTab,
    setActiveTab,
    investigations,
    activeInvestigation,
    setActiveInvestigationId: setActiveId,
    deleteInvestigation,
    clearAllInvestigations,
    explanationMode,
    setExplanationMode,
    settings,
    updateSettings,
    toggleTheme,
    agents,
    isRunning,
    pipelineStage,
    pipelineError,
    runInvestigation,
    launchFromNaturalLanguage,
    cancelInvestigation,
    draftConfig,
    setDraftConfig,
    notifications,
    markAllNotificationsRead,
    assistantOpen,
    setAssistantOpen,
    helpOpen,
    setHelpOpen,
    liveStreamStatus,
    liveTelemetry,
    liveEvents,
    liveStations,
    lastLiveUpdateAt,
    liveUpdateCount,
    liveRefreshing,
    toggleLiveUpdates,
    refreshLiveNow,
  };

  return <OrbiteraContext.Provider value={value}>{children}</OrbiteraContext.Provider>;
}

export function useOrbitera() {
  const ctx = useContext(OrbiteraContext);
  if (!ctx) throw new Error('useOrbitera must be used within OrbiteraProvider');
  return ctx;
}

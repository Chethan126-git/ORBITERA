import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Bookmark,
  Bot,
  ChevronLeft,
  ChevronRight,
  Compass,
  Database,
  FileText,
  GitCompare,
  Globe2,
  HelpCircle,
  Home,
  LayoutDashboard,
  Loader2,
  LogIn,
  LogOut,
  Map as WorldMapIcon,
  Menu,
  Moon,
  Radar,
  Search,
  Settings,
  Sun,
  User,
  X,
} from 'lucide-react';
import { CURATED_LOCATIONS, NASA_VARIABLE_LIST } from '../../config/nasaCatalog';
import { useAuth } from '../../context/AuthContext';
import { useOrbitera } from '../../context/OrbiteraContext';
import type { NavTabId } from '../../types/orbitera';
import { OrbiteraLogo } from '../ui/OrbiteraLogo';
import { AssistantDrawer } from './AssistantDrawer';
import { HelpModal } from './HelpModal';

const SIDEBAR_ITEMS: {
  id: NavTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'new-investigation', label: 'New Investigation', icon: Compass },
  { id: 'data-explorer', label: 'Earth Data Explorer', icon: Database },
  { id: 'trend-intelligence', label: 'Trend Intelligence', icon: BarChart3 },
  { id: 'anomaly-detection', label: 'Anomaly Detection', icon: Radar },
  { id: 'correlation-lab', label: 'Correlation Lab', icon: Activity },
  { id: 'regional-comparison', label: 'Regional Comparison', icon: GitCompare },
  { id: 'earth-map', label: 'Earth Intelligence Map', icon: Globe2 },
  { id: 'world-geography', label: 'World Geography', icon: WorldMapIcon },
  { id: 'agent-center', label: 'Agent Mission Center', icon: Bot },
  { id: 'reports', label: 'Investigation Reports', icon: FileText },
  { id: 'saved-investigations', label: 'Saved Investigations', icon: Bookmark },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    activeTab,
    setActiveTab,
    activeInvestigation,
    investigations,
    setActiveInvestigationId,
    setDraftConfig,
    settings,
    updateSettings,
    toggleTheme,
    notifications,
    markAllNotificationsRead,
    setAssistantOpen,
    assistantOpen,
    setHelpOpen,
    isRunning,
    pipelineStage,
    liveStreamStatus,
    liveTelemetry,
    lastLiveUpdateAt,
    toggleLiveUpdates,
  } = useOrbitera();

  const { user, authLoading, authBusy, authError, clearAuthError, signInWithGoogle, signOutUser } =
    useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { locations: [], variables: [], saved: [] };
    return {
      locations: CURATED_LOCATIONS.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.country.toLowerCase().includes(q) ||
          l.region.toLowerCase().includes(q)
      ).slice(0, 4),
      variables: NASA_VARIABLE_LIST.filter(
        (v) => v.id.toLowerCase().includes(q) || v.label.toLowerCase().includes(q)
      ).slice(0, 3),
      saved: investigations
        .filter(
          (inv) =>
            inv.config.title.toLowerCase().includes(q) ||
            inv.config.locationName.toLowerCase().includes(q)
        )
        .slice(0, 3),
    };
  }, [searchQuery, investigations]);

  const collapsed = settings.sidebarCollapsed;

  return (
    <div className="min-h-screen space-canvas text-[#101828] dark:text-[#F1F5F9] flex flex-col">
      {/* Persistent Top Navigation Bar (72px) */}
      <header className="sticky top-0 z-30 h-[72px] border-b border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#080E20]/90 dark:backdrop-blur-md px-4 lg:px-6 flex items-center justify-between gap-4 no-print">
        {/* Left: Mobile Menu + Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] text-[#101828] dark:text-[#F1F5F9] lg:hidden"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('landing')}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0"
            title="Return to ORBITERA Landing Page"
          >
            <OrbiteraLogo className="h-8 w-8" />
            <span className="font-display text-lg font-bold tracking-tight text-[#101828] dark:text-[#F1F5F9]">
              ORBITERA
            </span>
          </button>
        </div>

        {/* Center-Left: Global Search */}
        <div className="relative hidden md:block flex-1 max-w-md">
          <label htmlFor="global-orbitera-search" className="sr-only">
            Search locations, NASA variables, or saved investigations
          </label>
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[#667085] dark:text-[#94A3B8]" aria-hidden="true" />
            <input
              id="global-orbitera-search"
              type="search"
              value={searchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search regions, NASA variables, saved investigations..."
              className="w-full rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/60 dark:bg-[#0D162D] py-2 pl-9 pr-3 text-xs text-[#101828] dark:text-[#F1F5F9] placeholder:text-[#667085] dark:placeholder:text-[#94A3B8] focus:border-[#155EEF] focus:bg-white dark:focus:bg-[#111C38] focus:outline-none"
            />
          </div>

          {searchFocused && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224] p-2 shadow-lg z-50">
              {searchResults.locations.length === 0 &&
              searchResults.variables.length === 0 &&
              searchResults.saved.length === 0 ? (
                <p className="px-3 py-2 text-xs text-[#667085] dark:text-[#94A3B8]">No matching regions or records.</p>
              ) : (
                <div className="space-y-2">
                  {searchResults.saved.map((inv) => (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => {
                        setActiveInvestigationId(inv.id);
                        setActiveTab('overview');
                        setSearchQuery('');
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-[#F5F9FF] dark:hover:bg-[#111C38]"
                    >
                      <span className="font-medium text-[#101828] dark:text-[#F1F5F9] truncate">{inv.config.title}</span>
                      <span className="text-[#667085] dark:text-[#94A3B8] ml-2 shrink-0">Saved</span>
                    </button>
                  ))}
                  {searchResults.locations.map((loc) => (
                    <button
                      key={loc.name}
                      type="button"
                      onClick={() => {
                        setDraftConfig((prev) => ({
                          ...prev,
                          id: `inv-${Date.now()}`,
                          title: `${loc.name} Earth System Investigation`,
                          locationName: loc.name,
                          regionLabel: `${loc.region}, ${loc.country}`,
                          latitude: loc.latitude,
                          longitude: loc.longitude,
                        }));
                        setActiveTab('new-investigation');
                        setSearchQuery('');
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-[#F5F9FF] dark:hover:bg-[#111C38]"
                    >
                      <span className="font-medium text-[#101828] dark:text-[#F1F5F9]">
                        {loc.name}, {loc.country}
                      </span>
                      <span className="font-mono text-[#155EEF] dark:text-[#38BDF8] shrink-0">Investigate</span>
                    </button>
                  ))}
                  {searchResults.variables.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setActiveTab('data-explorer');
                        setSearchQuery('');
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-[#F5F9FF] dark:hover:bg-[#111C38]"
                    >
                      <span className="font-medium text-[#101828] dark:text-[#F1F5F9]">
                        {v.id} · {v.label}
                      </span>
                      <span className="text-[#667085] dark:text-[#94A3B8] shrink-0">NASA Variable</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Active Investigation Indicator + Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isRunning ? (
            <button
              type="button"
              onClick={() => setActiveTab('agent-center')}
              className="hidden xl:inline-flex items-center gap-2 rounded-lg border border-[#155EEF]/30 dark:border-[#38BDF8]/30 bg-[#F5F9FF] dark:bg-[#0D162D] px-3 py-1.5 text-xs font-medium text-[#155EEF] dark:text-[#38BDF8] whitespace-nowrap"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden="true" />
              <span className="max-w-[220px] truncate">{pipelineStage || 'Pipeline active'}</span>
            </button>
          ) : activeInvestigation ? (
            <button
              type="button"
              onClick={() => setActiveTab('saved-investigations')}
              className="hidden xl:inline-flex items-center gap-2 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF]/60 dark:bg-[#0D162D] px-3 py-1.5 text-xs text-[#101828] dark:text-[#F1F5F9] hover:border-[#155EEF]/40 whitespace-nowrap"
              title="Active investigation context"
            >
              <span className="text-[#667085] dark:text-[#94A3B8]">Active:</span>
              <span className="font-medium max-w-[160px] truncate">
                {activeInvestigation.config.locationName}
              </span>
              <span className="font-mono text-[#667085] dark:text-[#94A3B8] tabular-nums">
                {activeInvestigation.config.startYear}–{activeInvestigation.config.endYear}
              </span>
            </button>
          ) : null}

          {/* Live Data 2 Stream Indicator & Toggle */}
          <button
            type="button"
            onClick={toggleLiveUpdates}
            title={
              liveStreamStatus === 'paused'
                ? 'Resume Live Data 2 SSE Auto-Updates'
                : `Live Data 2 SSE Stream (${liveStreamStatus})${
                    lastLiveUpdateAt
                      ? ` · Updated ${new Date(lastLiveUpdateAt).toLocaleTimeString()}`
                      : ''
                  } · Click to pause`
            }
            aria-label="Toggle live atmospheric data updates"
            className={`hidden sm:inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              liveStreamStatus === 'live'
                ? 'border-[#16A34A]/35 dark:border-[#4ADE80]/30 bg-[#ECFDF5] dark:bg-[#052E16]/45 text-[#15803D] dark:text-[#4ADE80]'
                : liveStreamStatus === 'connecting'
                ? 'border-[#155EEF]/30 dark:border-[#38BDF8]/30 bg-[#F5F9FF] dark:bg-[#0D162D] text-[#155EEF] dark:text-[#38BDF8]'
                : liveStreamStatus === 'error'
                ? 'border-[#DC2626]/30 bg-[#FEF2F2] dark:bg-[#7F1D1D]/30 text-[#DC2626] dark:text-[#FCA5A5]'
                : 'border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] text-[#667085] dark:text-[#94A3B8]'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                liveStreamStatus === 'live'
                  ? 'bg-[#16A34A] dark:bg-[#4ADE80] animate-pulse'
                  : liveStreamStatus === 'connecting'
                  ? 'bg-[#155EEF] dark:bg-[#38BDF8] animate-pulse'
                  : liveStreamStatus === 'error'
                  ? 'bg-[#DC2626]'
                  : 'bg-[#94A3B8]'
              }`}
              aria-hidden="true"
            />
            <span className="font-mono tabular-nums">
              {liveStreamStatus === 'paused'
                ? 'LIVE PAUSED'
                : liveTelemetry?.current.temperatureC !== null &&
                  liveTelemetry?.current.temperatureC !== undefined
                ? `LIVE · ${liveTelemetry.current.temperatureC}°C`
                : liveStreamStatus === 'connecting'
                ? 'SYNCING...'
                : 'LIVE STREAM'}
            </span>
          </button>

          {/* AI Assistant Toggle */}
          <button
            type="button"
            onClick={() => setAssistantOpen(!assistantOpen)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              assistantOpen
                ? 'border-[#155EEF] bg-[#155EEF] text-white'
                : 'border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] text-[#101828] dark:text-[#F1F5F9] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38]'
            }`}
          >
            <Bot className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">AI Assistant</span>
          </button>

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            title={
              settings.theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Space Dark Theme'
            }
            aria-label={
              settings.theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Space Dark Theme'
            }
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] text-[#667085] dark:text-[#38BDF8] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38] hover:text-[#101828] dark:hover:text-[#F1F5F9] shrink-0"
          >
            {settings.theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Notification Center */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotifOpen((v) => !v);
                setProfileOpen(false);
              }}
              aria-label="Open notifications"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] text-[#667085] dark:text-[#CBD5E1] hover:bg-[#F5F9FF] dark:hover:bg-[#14203F] hover:text-[#101828] dark:hover:text-white"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#155EEF] px-1 font-mono text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224] p-3 shadow-lg z-50">
                <div className="flex items-center justify-between border-b border-[#E4EAF2] dark:border-[#1E2B48] pb-2">
                  <span className="font-display text-xs font-semibold text-[#101828] dark:text-[#F1F5F9]">
                    Notifications
                  </span>
                  <button
                    type="button"
                    onClick={markAllNotificationsRead}
                    className="text-[11px] font-medium text-[#155EEF] dark:text-[#38BDF8] hover:underline"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="mt-2 max-h-64 overflow-y-auto space-y-2">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`rounded-lg border p-2.5 text-xs ${
                        n.read
                          ? 'border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] text-[#667085] dark:text-[#94A3B8]'
                          : 'border-[#155EEF]/20 dark:border-[#38BDF8]/30 bg-[#F5F9FF] dark:bg-[#111C38] text-[#101828] dark:text-[#F1F5F9]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-medium">
                        {n.type === 'error' && (
                          <AlertTriangle className="h-3.5 w-3.5 text-[#DC2626] dark:text-[#F87171]" aria-hidden="true" />
                        )}
                        <span>{n.title}</span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#667085] dark:text-[#94A3B8]">
                        {n.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Help */}
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            aria-label="Open scientific methodology help"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] text-[#667085] dark:text-[#CBD5E1] hover:bg-[#F5F9FF] dark:hover:bg-[#14203F] hover:text-[#101828] dark:hover:text-white"
          >
            <HelpCircle className="h-4 w-4" />
          </button>

          {/* Settings shortcut */}
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            aria-label="Open platform settings"
            className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0D162D] text-[#667085] dark:text-[#CBD5E1] hover:bg-[#F5F9FF] dark:hover:bg-[#14203F] hover:text-[#101828] dark:hover:text-white"
          >
            <Settings className="h-4 w-4" />
          </button>

          {/* Profile & Authentication */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileOpen((v) => !v);
                setNotifOpen(false);
                if (authError) clearAuthError();
              }}
              aria-label={user ? `Profile menu for ${user.displayName || user.email}` : 'Sign in and researcher profile'}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E4EAF2] dark:border-[#1E2B48] bg-[#F5F9FF] dark:bg-[#0D162D] px-2.5 text-xs font-medium text-[#155EEF] dark:text-[#38BDF8] hover:border-[#155EEF]/40 dark:hover:border-[#38BDF8]/40 transition-colors whitespace-nowrap"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Researcher avatar'}
                  referrerPolicy="no-referrer"
                  className="h-5 w-5 rounded-full object-cover"
                />
              ) : (
                <User className="h-4 w-4 shrink-0" />
              )}
              <span className="hidden md:inline max-w-[100px] truncate text-[#101828] dark:text-[#F1F5F9]">
                {authLoading ? '...' : user ? user.displayName?.split(' ')[0] || 'Account' : 'Sign In'}
              </span>
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-[#E4EAF2] dark:border-[#1E2B48] bg-white dark:bg-[#0B1224] p-3.5 shadow-lg z-50 text-xs">
                {user ? (
                  <div className="flex items-start gap-2.5">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'Researcher avatar'}
                        referrerPolicy="no-referrer"
                        className="h-9 w-9 rounded-full border border-[#E4EAF2] dark:border-[#1E2B48] object-cover shrink-0"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F9FF] dark:bg-[#111C38] border border-[#E4EAF2] dark:border-[#1E2B48] text-[#155EEF] dark:text-[#38BDF8] font-display font-bold shrink-0">
                        {(user.displayName || user.email || 'O')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-semibold text-[#101828] dark:text-[#F1F5F9] truncate">
                        {user.displayName || 'ORBITERA Researcher'}
                      </p>
                      <p className="text-[11px] text-[#667085] dark:text-[#94A3B8] truncate">
                        {user.email}
                      </p>
                      <p className="mt-1 text-[11px] text-[#059669] dark:text-[#4ADE80] font-medium">
                        Signed in with Google · {investigations.length} saved
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="font-display font-semibold text-[#101828] dark:text-[#F1F5F9]">
                      Researcher Profile
                    </p>
                    <p className="mt-0.5 text-[#667085] dark:text-[#94A3B8]">
                      Guest session · {investigations.length} saved investigation(s)
                    </p>
                    <button
                      type="button"
                      disabled={authBusy}
                      onClick={() => void signInWithGoogle()}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#155EEF] px-3 py-2 text-xs font-semibold text-white hover:bg-[#124FD4] disabled:opacity-60 transition-colors"
                    >
                      {authBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {authBusy ? 'Signing in...' : 'Sign in with Google'}
                    </button>
                  </div>
                )}

                {authError && (
                  <div className="mt-2.5 rounded-lg border border-[#FECACA] dark:border-[#7F1D1D] bg-[#FEF2F2] dark:bg-[#2A1015] px-2.5 py-2 text-[11px] text-[#B91C1C] dark:text-[#FCA5A5]">
                    {authError}
                  </div>
                )}

                <div className="mt-3 border-t border-[#E4EAF2] dark:border-[#1E2B48] pt-2.5 flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('saved-investigations');
                      setProfileOpen(false);
                    }}
                    className="rounded-md px-2 py-1.5 text-left text-[#101828] dark:text-[#F1F5F9] hover:bg-[#F5F9FF] dark:hover:bg-[#14203F]"
                  >
                    Manage Saved Investigations
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('settings');
                      setProfileOpen(false);
                    }}
                    className="rounded-md px-2 py-1.5 text-left text-[#101828] dark:text-[#F1F5F9] hover:bg-[#F5F9FF] dark:hover:bg-[#14203F]"
                  >
                    Workspace Preferences
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('landing');
                      setProfileOpen(false);
                    }}
                    className="rounded-md px-2 py-1.5 text-left text-[#667085] dark:text-[#94A3B8] hover:bg-[#F5F9FF] dark:hover:bg-[#14203F]"
                  >
                    View Landing Overview
                  </button>
                  {user && (
                    <button
                      type="button"
                      disabled={authBusy}
                      onClick={() => {
                        void signOutUser();
                      }}
                      className="mt-1 flex items-center gap-1.5 rounded-md border-t border-[#E4EAF2] dark:border-[#1E2B48] px-2 pt-2 pb-1 text-left font-medium text-[#DC2626] dark:text-[#F87171] hover:bg-[#FEF2F2] dark:hover:bg-[#2A1015] disabled:opacity-60"
                    >
                      <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                      {authBusy ? 'Signing out...' : 'Sign Out'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Desktop Persistent Collapsible Left Sidebar (240px / 72px) */}
        <aside
          aria-label="Workspace Navigation"
          className={`hidden lg:flex flex-col justify-between border-r border-[#E4EAF2] dark:border-[#1E2B48] bg-white/95 dark:bg-[#080E20]/90 backdrop-blur-md transition-all duration-150 shrink-0 no-print ${
            collapsed ? 'w-[72px]' : 'w-[240px]'
          }`}
        >
          <div className="p-3 space-y-1 overflow-y-auto">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#F5F9FF] dark:bg-[#155EEF]/20 text-[#155EEF] dark:text-[#60A5FA] border border-[#155EEF]/20 dark:border-[#38BDF8]/30'
                      : 'text-[#667085] dark:text-[#94A3B8] hover:bg-[#F5F9FF]/60 dark:hover:bg-[#111C38] hover:text-[#101828] dark:hover:text-[#F1F5F9] border border-transparent'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>

          <div className="border-t border-[#E4EAF2] dark:border-[#1E2B48] p-3 space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab('landing')}
              title={collapsed ? 'Landing Page' : undefined}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-[#667085] dark:text-[#94A3B8] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38] hover:text-[#101828] dark:hover:text-[#F1F5F9] whitespace-nowrap"
            >
              <Home className="h-4 w-4 shrink-0" aria-hidden="true" />
              {!collapsed && <span>Landing Page</span>}
            </button>
            <button
              type="button"
              onClick={() => updateSettings({ sidebarCollapsed: !collapsed })}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-[#667085] dark:text-[#94A3B8] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38] hover:text-[#101828] dark:hover:text-[#F1F5F9] whitespace-nowrap"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4 shrink-0" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 shrink-0" />
                  <span>Collapse Sidebar</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Mobile Drawer Navigation (Secondary Responsive Support) */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div
              className="fixed inset-0 bg-[#101828]/40 dark:bg-black/65"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <nav
              aria-label="Mobile Navigation"
              className="relative z-50 flex w-72 flex-col bg-white dark:bg-[#080E20] border-r border-[#E4EAF2] dark:border-[#1E2B48] p-4 overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-[#E4EAF2] dark:border-[#1E2B48] pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <OrbiteraLogo className="h-7 w-7" />
                  <span className="font-display text-base font-bold text-[#101828] dark:text-[#F1F5F9]">
                    ORBITERA
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation menu"
                  className="p-2 text-[#667085] dark:text-[#94A3B8]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-1">
                {SIDEBAR_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium ${
                        isActive
                          ? 'bg-[#F5F9FF] dark:bg-[#155EEF]/20 text-[#155EEF] dark:text-[#60A5FA]'
                          : 'text-[#667085] dark:text-[#94A3B8] hover:bg-[#F5F9FF] dark:hover:bg-[#111C38]'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
        )}

        {/* Main Workspace Viewport */}
        <main className="flex-1 min-w-0 p-5 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1440px]">{children}</div>
        </main>
      </div>

      <AssistantDrawer />
      <HelpModal />
    </div>
  );
}

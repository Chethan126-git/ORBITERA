import React from 'react';
import { OrbiteraProvider, useOrbitera } from './context/OrbiteraContext';
import { AuthProvider } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './pages/LandingPage';
import { OverviewPage } from './pages/OverviewPage';
import { NewInvestigationPage } from './pages/NewInvestigationPage';
import { DataExplorerPage } from './pages/DataExplorerPage';
import { TrendIntelligencePage } from './pages/TrendIntelligencePage';
import { AnomalyDetectionPage } from './pages/AnomalyDetectionPage';
import { CorrelationLabPage } from './pages/CorrelationLabPage';
import { RegionalComparisonPage } from './pages/RegionalComparisonPage';
import { EarthMapPage } from './pages/EarthMapPage';
import { WorldGeographyPage } from './pages/WorldGeographyPage';
import { AgentMissionCenterPage } from './pages/AgentMissionCenterPage';
import { ReportsPage } from './pages/ReportsPage';
import { SavedInvestigationsPage } from './pages/SavedInvestigationsPage';
import { SettingsPage } from './pages/SettingsPage';

function WorkspaceRouter() {
  const { activeTab } = useOrbitera();

  if (activeTab === 'landing') {
    return <LandingPage />;
  }

  return (
    <AppShell>
      {activeTab === 'overview' && <OverviewPage />}
      {activeTab === 'new-investigation' && <NewInvestigationPage />}
      {activeTab === 'data-explorer' && <DataExplorerPage />}
      {activeTab === 'trend-intelligence' && <TrendIntelligencePage />}
      {activeTab === 'anomaly-detection' && <AnomalyDetectionPage />}
      {activeTab === 'correlation-lab' && <CorrelationLabPage />}
      {activeTab === 'regional-comparison' && <RegionalComparisonPage />}
      {activeTab === 'earth-map' && <EarthMapPage />}
      {activeTab === 'world-geography' && <WorldGeographyPage />}
      {activeTab === 'agent-center' && <AgentMissionCenterPage />}
      {activeTab === 'reports' && <ReportsPage />}
      {activeTab === 'saved-investigations' && <SavedInvestigationsPage />}
      {activeTab === 'settings' && <SettingsPage />}
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <OrbiteraProvider>
        <WorkspaceRouter />
      </OrbiteraProvider>
    </AuthProvider>
  );
}

import { useState, useCallback } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { FullPageLoader } from '@/components/LoadingStates';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { EmailTablePage } from '@/pages/EmailTablePage';
import { SendersPage } from '@/pages/SendersPage';
import { SearchPage } from '@/pages/SearchPage';
import { useEmailProcessor } from '@/hooks/useEmailProcessor';

function AppContent() {
  const { session, loading } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [composeOpen, setComposeOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Enable email processor when user has scheduled emails to process
  useEmailProcessor(!!session);

  if (loading) {
    return <FullPageLoader />;
  }

  if (!session) {
    return <LoginPage />;
  }

  const handleNavigate = (page: string) => {
    setActivePage(page);
    if (page === 'dashboard' || page === 'scheduled' || page === 'sent') {
      triggerRefresh();
    }
  };

  return (
    <DashboardLayout activePage={activePage} onNavigate={handleNavigate}>
      {activePage === 'dashboard' && (
        <DashboardPage
          onNavigate={handleNavigate}
          onCompose={() => setComposeOpen(true)}
          composeOpen={composeOpen}
          onCloseCompose={() => setComposeOpen(false)}
          refreshKey={refreshKey}
          onRefresh={triggerRefresh}
        />
      )}
      {activePage === 'scheduled' && (
        <EmailTablePage type="scheduled" refreshKey={refreshKey} />
      )}
      {activePage === 'sent' && (
        <EmailTablePage type="sent" refreshKey={refreshKey} />
      )}
      {activePage === 'senders' && <SendersPage />}
      {activePage === 'search' && <SearchPage />}
    </DashboardLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;

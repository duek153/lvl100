import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { UIProvider } from './store/UIContext';
import { GameProvider, useGame } from './store/GameContext';
import { CloudProvider } from './store/CloudContext';
import Layout from './components/Layout';
import { Loading } from './components/ui';
import Dashboard from './pages/Dashboard';

// Route-level code splitting: only the dashboard ships in the main bundle.
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Placement = lazy(() => import('./pages/Placement'));
const Road = lazy(() => import('./pages/Road'));
const Practice = lazy(() => import('./pages/Practice'));
const Play = lazy(() => import('./pages/Play'));
const Vocab = lazy(() => import('./pages/Vocab'));
const Flashcards = lazy(() => import('./pages/Flashcards'));
const WeakWords = lazy(() => import('./pages/WeakWords'));
const WordList = lazy(() => import('./pages/WordList'));
const Grammar = lazy(() => import('./pages/Grammar'));
const GrammarTopicPage = lazy(() => import('./pages/GrammarTopic'));
const Reading = lazy(() => import('./pages/Reading'));
const ReadingPlay = lazy(() => import('./pages/ReadingPlay'));
const Daily = lazy(() => import('./pages/Daily'));
const Simulation = lazy(() => import('./pages/Simulation'));
const Ready = lazy(() => import('./pages/Ready'));
const ProgressPage = lazy(() => import('./pages/Progress'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Friends = lazy(() => import('./pages/Friends'));
const Achievements = lazy(() => import('./pages/Achievements'));
const ExamInfo = lazy(() => import('./pages/ExamInfo'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const Admin = lazy(() => import('./pages/Admin'));
const Account = lazy(() => import('./pages/Account'));

function ThemeSync() {
  const { state } = useGame();
  const { theme, reducedMotion } = state.settings;
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => root.setAttribute('data-theme', theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => {
    document.documentElement.setAttribute('data-motion', reducedMotion ? 'reduced' : 'full');
  }, [reducedMotion]);
  return null;
}

function RequireProfile({ children }: { children: ReactNode }) {
  const { state } = useGame();
  const loc = useLocation();
  if (!state.profile?.onboarded && !loc.pathname.startsWith('/welcome') && !loc.pathname.startsWith('/account')) return <Navigate to="/welcome" replace state={{ from: loc.pathname + loc.search }} />;
  return <>{children}</>;
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

export default function App() {
  return (
    <UIProvider>
      <GameProvider>
        <CloudProvider>
        <ThemeSync />
        <HashRouter>
          <ScrollTop />
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/welcome" element={<Onboarding />} />
              <Route path="/account" element={<Account />} />
              <Route
                element={
                  <RequireProfile>
                    <Layout />
                  </RequireProfile>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="placement" element={<Placement />} />
                <Route path="road" element={<Road />} />
                <Route path="practice" element={<Practice />} />
                <Route path="play/:mode" element={<Play />} />
                <Route path="vocab" element={<Vocab />} />
                <Route path="vocab/cards" element={<Flashcards />} />
                <Route path="vocab/weak" element={<WeakWords />} />
                <Route path="vocab/list" element={<WordList />} />
                <Route path="grammar" element={<Grammar />} />
                <Route path="grammar/:id" element={<GrammarTopicPage />} />
                <Route path="reading" element={<Reading />} />
                <Route path="reading/:id" element={<ReadingPlay />} />
                <Route path="daily" element={<Daily />} />
                <Route path="simulation" element={<Simulation />} />
                <Route path="ready" element={<Ready />} />
                <Route path="progress" element={<ProgressPage />} />
                <Route path="leaderboard" element={<Leaderboard />} />
                <Route path="friends" element={<Friends />} />
                <Route path="achievements" element={<Achievements />} />
                <Route path="exam" element={<ExamInfo />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="admin" element={<Admin />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </HashRouter>
        </CloudProvider>
      </GameProvider>
    </UIProvider>
  );
}

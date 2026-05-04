import { lazy, Suspense, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { AppShell } from './components/Layout/AppShell';
import { SkeletonCard } from './components/ui/Skeleton';
import { bootstrap } from './lib/telegram';
import Favourites from './routes/student/Favourites';
import History from './routes/student/History';
import Lesson from './routes/student/Lesson';
import Library from './routes/student/Library';
import { useUiStore } from './store/uiStore';
import { useUserStore } from './store/userStore';

// Author screens and Onboarding are not on the student hot path — split
// them out so the lab landing page doesn't drag in recharts, the editor's
// drag-and-drop deps, etc.
const Onboarding = lazy(() => import('./routes/Onboarding'));
const Broadcast = lazy(() => import('./routes/author/Broadcast'));
const Dashboard = lazy(() => import('./routes/author/Dashboard'));
const LessonEditor = lazy(() => import('./routes/author/LessonEditor'));
const LessonList = lazy(() => import('./routes/author/LessonList'));
const LessonProgress = lazy(() => import('./routes/author/LessonProgress'));
const StudentDetail = lazy(() => import('./routes/author/StudentDetail'));
const Students = lazy(() => import('./routes/author/Students'));

function LazyFallback() {
  return (
    <div className="space-y-3 pt-4">
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

export default function App() {
  const role = useUserStore((s) => s.role);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const authError = useUserStore((s) => s.authError);
  const authenticate = useUserStore((s) => s.authenticate);
  const isAuthenticating = useUserStore((s) => s.isAuthenticating);
  const initReadingPrefs = useUiStore((s) => s.initReadingPrefs);

  useEffect(() => {
    bootstrap();
    initReadingPrefs();
    authenticate();
  }, [authenticate, initReadingPrefs]);

  const onboarded =
    typeof window !== 'undefined' && localStorage.getItem('onboarding_completed');

  if (isAuthenticating || (!isAuthenticated && !authError)) {
    return (
      <div className="atmosphere flex min-h-screen items-center justify-center text-ink-muted">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="atmosphere flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <p className="label-eyebrow mb-2">кіру қатесі</p>
          <p className="font-serif text-[18px] text-ink">{authError}</p>
          <p className="mt-2 text-[13px] text-ink-muted">
            Қолданбаны Telegram арқылы аш — initData қажет.
          </p>
        </div>
      </div>
    );
  }

  if (!onboarded) {
    return (
      <Suspense fallback={<LazyFallback />}>
        <Routes>
          <Route path="*" element={<Onboarding />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          index
          element={
            <Navigate
              to={role === 'author' ? '/author/dashboard' : '/library'}
              replace
            />
          }
        />

        {/* Student — eager, hot path */}
        <Route path="library" element={<Library />} />
        <Route path="lesson/:id" element={<Lesson />} />
        <Route path="favourites" element={<Favourites />} />
        <Route path="history" element={<History />} />

        {/* Author — lazy, never loaded for students */}
        <Route
          path="author"
          element={
            <Suspense fallback={<LazyFallback />}>
              <AuthorOutlet />
            </Suspense>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="lessons" element={<LessonList />} />
          <Route path="lessons/new" element={<LessonEditor />} />
          <Route path="lessons/:id/edit" element={<LessonEditor />} />
          <Route path="lessons/:id/progress" element={<LessonProgress />} />
          <Route path="students" element={<Students />} />
          <Route path="students/:id" element={<StudentDetail />} />
          <Route path="broadcast" element={<Broadcast />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

// Nested-route parent that hangs Suspense over the author tree.
function AuthorOutlet() {
  return <Outlet />;
}

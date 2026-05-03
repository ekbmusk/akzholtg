import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from './components/Layout/AppShell';
import { bootstrap } from './lib/telegram';
import Onboarding from './routes/Onboarding';
import Broadcast from './routes/author/Broadcast';
import Dashboard from './routes/author/Dashboard';
import LessonEditor from './routes/author/LessonEditor';
import LessonList from './routes/author/LessonList';
import LessonProgress from './routes/author/LessonProgress';
import StudentDetail from './routes/author/StudentDetail';
import Students from './routes/author/Students';
import Favourites from './routes/student/Favourites';
import History from './routes/student/History';
import Lesson from './routes/student/Lesson';
import Library from './routes/student/Library';
import { useUiStore } from './store/uiStore';
import { useUserStore } from './store/userStore';

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
      <Routes>
        <Route path="*" element={<Onboarding />} />
      </Routes>
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

        {/* Student */}
        <Route path="library" element={<Library />} />
        <Route path="lesson/:id" element={<Lesson />} />
        <Route path="favourites" element={<Favourites />} />
        <Route path="history" element={<History />} />

        {/* Author */}
        <Route path="author">
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

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';

import HomePage from './pages/HomePage';
import DiscoverPage from './pages/DiscoverPage';
import BookDetailsPage from './pages/BookDetailsPage';
import ReaderPage from './pages/ReaderPage';
import WriterStudioPage from './pages/WriterStudioPage';
import AuthorProfilePage from './pages/AuthorProfilePage';
import LibraryPage from './pages/LibraryPage';
import CommunityPage from './pages/CommunityPage';
import PenNamesPage from './pages/PenNamesPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import SettingsPage from './pages/SettingsPage';
import CreatorStudioPage from './pages/CreatorStudioPage';
import DiaryPage from './pages/DiaryPage';
import DiaryReaderPage from './pages/DiaryReaderPage';

class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Route render error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto my-24 p-8 text-center bg-white rounded-3xl border border-[#DDD5C5] shadow-xs">
          <h2 className="font-display text-2xl font-bold text-[#1E1B4B]">Something went wrong</h2>
          <p className="text-xs text-stone-600 mt-2">
            An unexpected error occurred while loading this view: {this.state.error?.message || 'Unknown error'}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl hover:bg-[#312E81]"
            >
              Reload Page
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              className="px-4 py-2 bg-stone-100 text-stone-800 text-xs font-semibold rounded-xl hover:bg-stone-200"
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function IndigoApp() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname + window.location.search);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');

  const navigate = (url) => {
    window.history.pushState({}, '', url);
    setCurrentPath(url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname + window.location.search);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openAuth = (mode = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  // Route matching
  const [pathOnly, queryString] = currentPath.split('?');
  const queryParams = new URLSearchParams(queryString || '');

  let routeComponent = null;

  if (pathOnly === '/' || pathOnly === '') {
    routeComponent = <HomePage onNavigate={navigate} />;
  } else if (pathOnly === '/discover') {
    routeComponent = (
      <DiscoverPage
        initialQuery={queryParams.get('q') || ''}
        onNavigate={navigate}
      />
    );
  } else if (pathOnly.startsWith('/book/')) {
    const workId = pathOnly.split('/book/')[1];
    routeComponent = (
      <BookDetailsPage
        workId={workId}
        onNavigate={navigate}
        onOpenAuth={openAuth}
      />
    );
  } else if (pathOnly.startsWith('/read/')) {
    const parts = pathOnly.split('/');
    const workId = parts[2];
    const chapterId = parts[3];
    const autoplay = queryParams.get('autoplay') === 'true';

    // The reader has its own distraction-free layout (Navbar and Footer omitted inside Reader)
    return (
      <>
        <ReaderPage
          workId={workId}
          chapterId={chapterId}
          onNavigate={navigate}
          autoplay={autoplay}
        />
        {authModalOpen && (
          <AuthModal
            initialMode={authModalMode}
            onClose={() => setAuthModalOpen(false)}
            onNavigate={navigate}
          />
        )}
      </>
    );
  } else if (pathOnly === '/write') {
    const editId = queryParams.get('edit') || null;
    routeComponent = (
      <WriterStudioPage
        editWorkId={editId}
        onNavigate={navigate}
        onOpenAuth={openAuth}
      />
    );
  } else if (pathOnly.startsWith('/author/')) {
    const authorId = pathOnly.split('/author/')[1];
    routeComponent = (
      <AuthorProfilePage
        authorId={authorId}
        onNavigate={navigate}
      />
    );
  } else if (pathOnly === '/library') {
    routeComponent = (
      <LibraryPage
        onNavigate={navigate}
        onOpenAuth={openAuth}
      />
    );
  } else if (pathOnly === '/community') {
    routeComponent = (
      <CommunityPage
        onNavigate={navigate}
      />
    );
  } else if (pathOnly === '/pen-names') {
    routeComponent = (
      <PenNamesPage
        onNavigate={navigate}
      />
    );
  } else if (pathOnly === '/admin') {
    routeComponent = (
      <AdminDashboardPage
        onNavigate={navigate}
      />
    );
  } else if (pathOnly === '/studio') {
    routeComponent = (
      <CreatorStudioPage
        onNavigate={navigate}
        onOpenAuth={openAuth}
      />
    );
  } else if (pathOnly === '/diary') {
    routeComponent = (
      <DiaryPage
        onNavigate={navigate}
        onOpenAuth={openAuth}
      />
    );
  } else if (pathOnly.startsWith('/diary/read/')) {
    const entryId = pathOnly.split('/diary/read/')[1];
    routeComponent = (
      <DiaryReaderPage
        entryId={entryId}
        onNavigate={navigate}
      />
    );
  } else if (pathOnly === '/settings') {
    routeComponent = (
      <SettingsPage
        onNavigate={navigate}
        onOpenAuth={openAuth}
      />
    );
  } else {
    // 404 fallback
    routeComponent = (
      <div className="max-w-md mx-auto my-28 p-8 text-center bg-white rounded-3xl border border-[#DDD5C5]">
        <h2 className="font-display text-2xl font-bold text-[#1E1B4B]">Page Not Found</h2>
        <p className="text-xs text-gray-500 mt-2">The page you are looking for does not exist in our library.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-5 py-2 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl hover:bg-[#312E81]"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#1E1B4B]">
      <Navbar
        onOpenAuth={openAuth}
        onNavigate={navigate}
        currentPath={pathOnly}
      />

      <div className="flex-1">
        <RouteErrorBoundary key={pathOnly}>
          {routeComponent}
        </RouteErrorBoundary>
      </div>

      <Footer onNavigate={navigate} />

      {authModalOpen && (
        <AuthModal
          initialMode={authModalMode}
          onClose={() => setAuthModalOpen(false)}
          onNavigate={navigate}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <IndigoApp />
    </AuthProvider>
  );
}

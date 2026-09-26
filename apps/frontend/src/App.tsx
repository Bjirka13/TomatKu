import { useState } from 'react';
import Landing from './landing';
import PageOne from './pageone';
import Home from './index';
import Camera from './camera';
import Summary from './summary';
import History from './history';

type PageState = 'landing' | 'pageone' | 'home' | 'camera' | 'summary' | 'history';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageState>('landing');
  const [previousPage, setPreviousPage] = useState<PageState>('home');

  const handleNavigate = (tab: PageState) => {
    if (tab !== currentPage) {
      setPreviousPage(currentPage);
      setCurrentPage(tab);
    }
  };

  return (
    <div className="w-full min-h-screen flex justify-center bg-[#ede6d9]">
      {/* Quick dev switch banner to jump between Landing & Home */}
      {/* <div
        style={{
          position: 'fixed',
          top: 10,
          right: 10,
          zIndex: 9999,
          display: 'flex',
          gap: '6px',
          background: 'rgba(0,0,0,0.65)',
          padding: '4px 8px',
          borderRadius: '20px',
          backdropFilter: 'blur(8px)',
        }}
      >
        <button
          type="button"
          onClick={() => setCurrentPage('landing')}
          style={{
            background: currentPage === 'landing' ? '#eb8e2d' : 'transparent',
            color: '#fff',
            border: 'none',
            fontSize: '11px',
            padding: '4px 10px',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: currentPage === 'landing' ? 700 : 500,
          }}
        >
          Landing
        </button>
        <button
          type="button"
          onClick={() => setCurrentPage('home')}
          style={{
            background: currentPage === 'home' ? '#eb8e2d' : 'transparent',
            color: '#fff',
            border: 'none',
            fontSize: '11px',
            padding: '4px 10px',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: currentPage === 'home' ? 700 : 500,
          }}
        >
          Home
        </button>
      </div> */}

      {/* Landing Page */}
      {currentPage === 'landing' && (
        <Landing onStart={() => setCurrentPage('pageone')} />
      )}

      {/* Page One (Info Prompt) */}
      {currentPage === 'pageone' && (
        <PageOne onContinue={() => setCurrentPage('home')} />
      )}

      {/* Home Page */}
      {currentPage === 'home' && (
        <Home onNavigate={handleNavigate} activeTab="home" />
      )}

      {/* Camera Page */}
      {currentPage === 'camera' && (
        <Camera onNavigate={handleNavigate} activeTab="camera" previousPage={previousPage} />
      )}

      {/* Summary Page */}
      {currentPage === 'summary' && (
        <Summary onNavigate={handleNavigate} activeTab="summary" />
      )}

      {/* History Page */}
      {currentPage === 'history' && (
        <History onNavigate={handleNavigate} activeTab="summary" />
      )}
    </div>
  );
}

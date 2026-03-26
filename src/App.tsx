import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './screens/Dashboard';
import { StudyRoom } from './screens/StudyRoom';
import { Refine } from './screens/Refine';
import { Chronicles } from './screens/Chronicles';
import { Screen } from './types';
import { ICONS } from './constants';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentScreen} />;
      case 'study': return <StudyRoom />;
      case 'refine': return <Refine />;
      case 'chronicles': return <Chronicles onNavigate={setCurrentScreen} />;
      default: return <Dashboard onNavigate={setCurrentScreen} />;
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col md:flex-row">
      <Sidebar currentScreen={currentScreen} onNavigate={setCurrentScreen} />
      
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Top Bar */}
        <header className="bg-surface border-b-4 border-surface-container-highest flex justify-between items-center px-6 py-4 sticky top-0 z-40 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold text-tertiary-container px-2 border-2 border-tertiary-container font-headline uppercase tracking-tighter">
              Scholar's Sanctuary
            </span>
          </div>
          <div className="flex items-center gap-6">
            <nav className="hidden lg:flex items-center gap-8 font-headline uppercase tracking-tighter text-sm font-bold">
              <button 
                onClick={() => setCurrentScreen('dashboard')}
                className={`${currentScreen === 'dashboard' ? 'text-primary border-b-4 border-primary' : 'text-surface-container-highest hover:text-primary'} pb-1 transition-all`}
              >
                Library
              </button>
              <button
                type="button"
                onClick={() => setCurrentScreen('chronicles')}
                className={`${currentScreen === 'chronicles' ? 'text-primary border-b-4 border-primary' : 'text-surface-container-highest hover:text-primary'} pb-1 transition-all`}
              >
                Archives
              </button>
            </nav>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surface-container-highest border-2 border-outline-variant flex items-center justify-center overflow-hidden">
                <ICONS.UserCircle className="text-primary" size={24} />
              </div>
              <span className="hidden sm:inline font-headline font-bold text-xs uppercase tracking-widest text-primary">Master Scribe</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4 md:p-8 pb-24 md:pb-8 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {renderScreen()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Floating Action Button */}
      {currentScreen === 'dashboard' && (
        <motion.button
          whileHover={{ rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setCurrentScreen('refine')}
          aria-label="Create a new entry"
          className="fixed right-6 bottom-20 md:bottom-8 w-16 h-16 bg-primary text-on-primary bezel-button flex items-center justify-center z-40 shadow-2xl"
        >
          <ICONS.Plus size={32} />
        </motion.button>
      )}
    </div>
  );
}

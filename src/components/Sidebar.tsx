import React from 'react';
import { ICONS } from '../constants';
import { Screen } from '../types';

interface SidebarProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentScreen, onNavigate }) => {
  const navItems: { id: Screen; label: string; icon: keyof typeof ICONS }[] = [
    { id: 'dashboard', label: 'Study Hall', icon: 'Castle' },
    { id: 'study', label: 'Manuscripts', icon: 'BookText' },
    { id: 'refine', label: 'Society', icon: 'Users' },
    { id: 'chronicles', label: 'Chronicles', icon: 'History' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-surface-container-low border-r-4 border-surface-container-highest flex-col z-50">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-tertiary-container border-2 border-primary flex items-center justify-center">
            <ICONS.Castle className="text-primary" />
          </div>
          <div>
            <h2 className="text-tertiary font-black italic font-headline leading-tight">The Great Library</h2>
            <p className="text-[10px] uppercase tracking-widest text-outline">Master Scribe</p>
          </div>
        </div>

        <nav className="flex-1 mt-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`
                p-4 flex items-center gap-3 cursor-pointer group transition-all steps-bezel
                ${currentScreen === item.id 
                  ? 'bg-surface-container-highest text-primary border-l-4 border-primary' 
                  : 'text-surface-container-highest hover:bg-surface-dim hover:text-primary'}
              `}
            >
              {React.createElement(ICONS[item.icon], { size: 20 })}
              <span className="font-headline font-bold text-sm tracking-widest uppercase">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 mb-2">
          <button
            type="button"
            onClick={() => onNavigate('refine')}
            className="w-full bg-primary text-on-primary font-headline font-bold py-3 uppercase tracking-tighter bezel-button"
          >
            New Entry
          </button>
        </div>

        <footer className="border-t-4 border-surface-container-highest p-2 bg-surface-container-low">
          <div className="flex items-center gap-3 p-2 text-surface-container-highest hover:text-primary cursor-pointer font-headline text-xs font-bold uppercase tracking-widest">
            <ICONS.Settings size={16} />
            <span>Settings</span>
          </div>
          <div className="flex items-center gap-3 p-2 text-surface-container-highest hover:text-error cursor-pointer font-headline text-xs font-bold uppercase tracking-widest">
            <ICONS.LogOut size={16} />
            <span>Logout</span>
          </div>
        </footer>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-stretch h-16 bg-surface border-t-4 border-surface-container-highest z-50">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            className={`
              flex flex-col items-center justify-center pt-2 pb-1 px-4 cursor-pointer
              ${currentScreen === item.id 
                ? 'bg-tertiary-container text-primary shadow-[0_-4px_0_0_#ffb961]' 
                : 'text-surface-container-highest hover:text-primary'}
            `}
          >
            {React.createElement(item.id === 'chronicles' ? ICONS.Scroll : ICONS[item.icon], { size: 20 })}
            <span className="font-headline text-[10px] font-bold uppercase mt-1">
              {item.id === 'chronicles' ? 'Scrolls' : item.label.split(' ')[0]}
            </span>
          </button>
        ))}
      </nav>
    </>
  );
};

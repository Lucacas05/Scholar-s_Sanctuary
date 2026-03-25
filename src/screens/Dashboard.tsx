import React from 'react';
import { motion } from 'motion/react';
import { ASSETS, ICONS } from '../constants';
import { PixelButton } from '../components/PixelButton';
import { PixelCard } from '../components/PixelCard';
import { Screen } from '../types';

interface DashboardProps {
  onNavigate: (screen: Screen) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="relative h-[450px] overflow-hidden bg-surface-container-lowest pixel-border">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-60" 
          style={{ backgroundImage: `url(${ASSETS.LIBRARY_HERO})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
        
        {/* Dust Particles */}
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 0 }}
              animate={{ 
                opacity: [0, 1, 0], 
                y: -100,
                x: Math.random() * 20 - 10
              }}
              transition={{ 
                duration: 5 + Math.random() * 5, 
                repeat: Infinity,
                delay: Math.random() * 5
              }}
              className="absolute w-1 h-1 bg-primary/40"
              style={{ 
                top: `${Math.random() * 100}%`, 
                left: `${Math.random() * 100}%` 
              }}
            />
          ))}
        </div>

        <div className="absolute bottom-12 left-8 max-w-2xl">
          <div className="inline-block bg-secondary-container px-3 py-1 mb-4 border-l-4 border-primary">
            <span className="text-primary-fixed font-headline font-bold text-xs uppercase tracking-[0.2em]">Session Active: Tome of Ancients</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-headline font-black text-on-surface uppercase tracking-tighter leading-none mb-4 drop-shadow-[4px_4px_0px_#181210]">
            The Silent <span className="text-primary">Sanctuary</span>
          </h1>
          <p className="text-on-surface-variant font-body text-lg max-w-md bg-surface/80 backdrop-blur-sm p-4 border-2 border-outline-variant/30">
            Deep within the archives, where knowledge breathes in the quiet. Continue your journey through the forgotten scrolls.
          </p>
          <div className="flex gap-4 mt-6">
            <PixelButton size="lg" icon="BookOpen" onClick={() => onNavigate('study')}>Enter Study</PixelButton>
            <PixelButton variant="tertiary" size="lg" onClick={() => scrollToSection('active-study')}>View Log</PixelButton>
          </div>
        </div>
      </section>

      {/* Available Chambers */}
      <section id="chambers">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-headline font-black text-tertiary uppercase tracking-tighter flex items-center gap-3">
            <span className="w-8 h-8 bg-tertiary-container border-2 border-tertiary flex items-center justify-center">
              <ICONS.Castle size={16} className="text-tertiary" />
            </span>
            Available Chambers
          </h2>
          <div className="h-1 flex-1 mx-8 dither-bg opacity-20 hidden md:block"></div>
          <button
            type="button"
            onClick={() => scrollToSection('chambers')}
            className="text-primary font-headline font-bold uppercase text-xs tracking-widest flex items-center gap-1 hover:underline"
          >
            Expand Maps <ICONS.ArrowUpRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <button
            type="button"
            onClick={() => onNavigate('study')}
            className="md:col-span-8 bg-surface-container-high border-4 border-surface-container-highest p-1 group cursor-pointer overflow-hidden text-left"
          >
            <div className="relative h-64 md:h-80 bg-surface-dim overflow-hidden">
              <img 
                src={ASSETS.SILENT_WING} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                alt="Silent Wing"
              />
              <div className="absolute top-4 left-4 bg-tertiary px-3 py-1 font-headline font-bold text-on-tertiary text-xs uppercase tracking-tighter">
                Silent Wing
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  <span className="text-primary text-xs font-bold uppercase tracking-widest">12 Scholars Present</span>
                </div>
                <h3 className="text-2xl font-headline font-black text-white uppercase tracking-tighter">Deep Focus Chamber</h3>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('study')}
            className="md:col-span-4 bg-surface-container-high border-4 border-surface-container-highest p-1 group cursor-pointer overflow-hidden text-left"
          >
            <div className="relative h-full min-h-[250px] bg-surface-dim overflow-hidden">
              <img 
                src={ASSETS.GARDEN_TERRACE} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                alt="Garden Terrace"
              />
              <div className="absolute top-4 left-4 bg-primary px-3 py-1 font-headline font-bold text-on-primary text-xs uppercase tracking-tighter">
                Garden Terrace
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
                <h3 className="text-xl font-headline font-black text-white uppercase tracking-tighter">Nature's Whispers</h3>
                <p className="text-on-surface-variant text-xs font-body mt-2">Ambient outdoor sounds for creative flow.</p>
              </div>
            </div>
          </button>

          <div className="md:col-span-3">
            <PixelCard variant="low" className="h-full flex flex-col gap-4">
              <div className="w-12 h-12 bg-surface-container-highest flex items-center justify-center border-b-4 border-secondary-container">
                <ICONS.BookOpen className="text-primary" size={24} />
              </div>
              <div>
                <h4 className="font-headline font-bold uppercase tracking-widest text-on-surface text-sm">Scriptorium</h4>
                <p className="text-xs text-outline mt-1 font-body">Copying and archiving focus.</p>
              </div>
              <PixelButton variant="ghost" fullWidth className="mt-auto border-2 border-primary" onClick={() => onNavigate('study')}>Enter</PixelButton>
            </PixelCard>
          </div>

          <div className="md:col-span-3">
            <PixelCard variant="low" className="h-full flex flex-col gap-4">
              <div className="w-12 h-12 bg-surface-container-highest flex items-center justify-center border-b-4 border-secondary-container">
                <ICONS.Flame className="text-tertiary" size={24} />
              </div>
              <div>
                <h4 className="font-headline font-bold uppercase tracking-widest text-on-surface text-sm">The Hearth</h4>
                <p className="text-xs text-outline mt-1 font-body">Social study and casual chat.</p>
              </div>
              <PixelButton variant="ghost" fullWidth className="mt-auto border-2 border-tertiary" onClick={() => onNavigate('study')}>Join</PixelButton>
            </PixelCard>
          </div>

          <div className="md:col-span-6">
            <PixelCard variant="default" className="relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 dither-bg opacity-10"></div>
              <div className="flex items-start justify-between">
                <div className="max-w-[60%]">
                  <h4 className="font-headline font-black uppercase text-2xl tracking-tighter text-secondary">Scribe's Challenge</h4>
                  <p className="text-sm text-on-surface-variant mt-2 font-body">Complete 3 hours of focused reading to unlock the "Master of Scrolls" badge.</p>
                  <div className="mt-6">
                    <div className="w-full h-4 bg-tertiary-container relative">
                      <div className="absolute inset-y-0 left-0 bg-primary w-[65%] flex items-center justify-end pr-1">
                        <ICONS.Flame size={10} className="text-on-primary animate-pulse" />
                      </div>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] font-headline font-bold uppercase text-outline">Progress</span>
                      <span className="text-[10px] font-headline font-bold uppercase text-primary">65% Complete</span>
                    </div>
                  </div>
                </div>
                <div className="w-24 h-24 bg-surface-container-highest border-4 border-outline-variant flex items-center justify-center p-2">
                  <img src={ASSETS.QUEST_BADGE} alt="Badge" className="w-full h-full" />
                </div>
              </div>
            </PixelCard>
          </div>
        </div>
      </section>

      {/* Current Active Study */}
      <section id="active-study">
        <div className="bg-surface-container-highest border-t-8 border-primary-container p-8 relative pixel-border">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="w-48 h-48 bg-surface border-4 border-surface-container-highest pixel-border-inset flex items-center justify-center relative group">
              <img src={ASSETS.ANCIENT_BOOK} className="w-32 h-32 object-contain" alt="Book" />
              <div className="absolute -bottom-4 bg-primary text-on-primary font-headline font-bold text-[10px] px-3 py-1 uppercase tracking-widest bezel-button">
                Level 12
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-4xl font-headline font-black text-on-surface uppercase tracking-tighter mb-2">Tome of the Forgotten Kingdom</h3>
              <p className="text-outline font-headline font-bold text-sm tracking-widest uppercase mb-4">Reading Progress • Chapter 4: The Silent Bells</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                {[
                  { label: 'Words Consumed', value: '14.2k', color: 'border-tertiary', text: 'text-tertiary' },
                  { label: 'Time Spent', value: '02:45', color: 'border-primary', text: 'text-primary' },
                  { label: 'Focus Multiplier', value: 'x1.5', color: 'border-secondary', text: 'text-secondary' },
                  { label: 'Remaining', value: '12 Pages', color: 'border-error', text: 'text-error' },
                ].map((stat, i) => (
                  <div key={i} className={`bg-surface-container-low p-4 border-b-4 ${stat.color}`}>
                    <p className="text-[10px] font-headline font-bold text-outline uppercase tracking-widest">{stat.label}</p>
                    <p className={`text-2xl font-headline font-black ${stat.text}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

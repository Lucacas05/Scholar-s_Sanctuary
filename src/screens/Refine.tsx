import React from 'react';
import { ASSETS, ICONS } from '../constants';
import { PixelCard } from '../components/PixelCard';

export const Refine: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 pb-8 md:pb-52">
      {/* Left: Customization */}
      <aside className="w-full md:w-80 flex flex-col gap-6">
        <PixelCard title="Refine Garments" variant="high">
          <div className="grid grid-cols-1 gap-4">
            <button className="flex items-center gap-4 p-4 bg-surface-container-highest border-l-4 border-primary hover:bg-surface-container-low transition-all steps-bezel group">
              <div className="w-12 h-12 bg-surface-container-lowest flex items-center justify-center p-2">
                <ICONS.Shirt className="text-primary" size={24} />
              </div>
              <div className="text-left">
                <p className="font-headline text-on-surface text-sm uppercase font-bold tracking-tight">Tweed Jacket</p>
                <p className="text-[10px] text-outline uppercase tracking-widest mt-1">Woolen Academic</p>
              </div>
            </button>
            <button className="flex items-center gap-4 p-4 bg-surface-container-low border-l-4 border-transparent hover:border-primary transition-all steps-bezel group">
              <div className="w-12 h-12 bg-surface-container-lowest flex items-center justify-center p-2">
                <ICONS.PenTool className="text-outline group-hover:text-primary" size={24} />
              </div>
              <div className="text-left">
                <p className="font-headline text-on-surface text-sm uppercase font-bold tracking-tight">Velvet Robes</p>
                <p className="text-[10px] text-outline uppercase tracking-widest mt-1">Archival Formal</p>
              </div>
            </button>
          </div>
        </PixelCard>

        <PixelCard title="Select Artifacts" variant="high">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Spectacles', icon: 'Glasses', active: true },
              { label: 'Tea Cup', icon: 'Coffee', active: false },
              { label: 'Grimoire', icon: 'BookOpen', active: false },
              { label: 'Ink Quill', icon: 'PenTool', active: false },
            ].map((art, i) => (
              <button 
                key={i}
                className={`
                  aspect-square flex flex-col items-center justify-center gap-2 border-b-4 transition-all steps-bezel
                  ${art.active 
                    ? 'bg-surface-container-highest border-primary' 
                    : 'bg-surface-container-low border-surface-container-lowest opacity-60 grayscale hover:grayscale-0 hover:opacity-100'}
                `}
              >
                {React.createElement(ICONS[art.icon as keyof typeof ICONS], { size: 24, className: art.active ? 'text-primary' : 'text-outline' })}
                <span className="text-[9px] font-bold uppercase tracking-tighter">{art.label}</span>
              </button>
            ))}
          </div>
        </PixelCard>
      </aside>

      {/* Center: Portrait */}
      <section className="flex-grow flex flex-col items-center justify-center relative min-h-[500px]">
        <div className="absolute inset-0 dither-bg opacity-20 -z-10"></div>
        <div className="relative group">
          <div className="absolute -inset-4 border-4 border-surface-container-highest pointer-events-none"></div>
          <div className="absolute -inset-1 border-2 border-primary-container pointer-events-none opacity-50"></div>
          <div className="w-80 h-[480px] bg-surface-container-low overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <img 
              src={ASSETS.ARCHIVAL_SCRIBE} 
              className="w-full h-full object-cover grayscale brightness-75 contrast-125" 
              alt="Portrait"
            />
            <div className="absolute bottom-0 left-0 w-full bg-surface-container-highest/90 p-4 border-t-4 border-primary">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-primary uppercase font-bold tracking-[0.2em]">Current Incarnation</p>
                  <h1 className="font-headline text-xl text-on-surface font-black uppercase tracking-tight">The Archival Scribe</h1>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-outline uppercase font-bold">LVL 42</p>
                  <div className="w-16 h-1 bg-surface-container-lowest mt-1">
                    <div className="w-3/4 h-full bg-primary"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <div className="bg-tertiary-container px-4 py-2 border-b-4 border-on-tertiary-fixed-variant flex items-center gap-2">
            <ICONS.Brain className="text-tertiary" size={18} />
            <span className="font-headline text-tertiary font-bold text-xs uppercase tracking-widest">Focus: 88</span>
          </div>
          <div className="bg-secondary-container px-4 py-2 border-b-4 border-on-secondary-fixed-variant flex items-center gap-2">
            <ICONS.BookOpen className="text-secondary" size={18} />
            <span className="font-headline text-secondary font-bold text-xs uppercase tracking-widest">Lore: 124</span>
          </div>
        </div>
      </section>

      {/* Right: Details */}
      <aside className="w-full md:w-80 flex flex-col gap-6">
        <PixelCard title="Lore Snippet" variant="high" className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 opacity-10">
            <ICONS.Castle size={80} />
          </div>
          <div className="space-y-4">
            <p className="text-on-surface-variant text-sm leading-relaxed font-body italic">
              "He was born amidst the scent of aged parchment and drying ink. The corridors of the Great Library were his only playground, the whispers of ancient scribes his only lullaby."
            </p>
            <div className="h-px bg-outline-variant/30"></div>
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-outline uppercase font-black">Current Sanctuary</span>
              <div className="flex items-center gap-2">
                <ICONS.MapPin className="text-primary" size={14} />
                <span className="text-xs font-bold uppercase text-on-surface">The East Wing Archives</span>
              </div>
            </div>
          </div>
        </PixelCard>

        <div className="bg-surface-container p-4 border-2 border-dashed border-outline-variant">
          <h3 className="text-[10px] text-outline uppercase font-bold mb-3">Recent Manuscripts</h3>
          <ul className="space-y-2">
            {['On the Nature of Digital Ink', 'Cryptic Symbols of the 16-Bit Era', 'Taxonomy of Ancient Tea Leaves'].map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-on-surface-variant hover:text-primary cursor-pointer transition-colors">
                <span className="w-1 h-1 bg-primary"></span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
};

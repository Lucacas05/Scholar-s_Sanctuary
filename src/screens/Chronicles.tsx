import React from 'react';
import { motion } from 'motion/react';
import { ICONS } from '../constants';
import { PixelButton } from '../components/PixelButton';
import { PixelCard } from '../components/PixelCard';
import { Screen } from '../types';

interface ChroniclesProps {
  onNavigate: (screen: Screen) => void;
}

const studySessions = [
  {
    date: '26 Frostwane',
    title: 'Tome of the Forgotten Kingdom',
    duration: '2h 15m',
    chapters: 'Ch. 4-6',
    note: 'Recovered the bell tower annotations and mapped three missing citations.',
    accent: 'primary',
  },
  {
    date: '24 Frostwane',
    title: 'Botanical Lexicon of the East Wing',
    duration: '1h 40m',
    chapters: 'Ch. 9',
    note: 'Completed a focused transcription sprint with no interrupted sessions.',
    accent: 'tertiary',
  },
  {
    date: '22 Frostwane',
    title: 'On the Nature of Digital Ink',
    duration: '3h 05m',
    chapters: 'Ch. 1-3',
    note: 'Marked new marginalia and restored a damaged passage to the archive.',
    accent: 'secondary',
  },
  {
    date: '19 Frostwane',
    title: 'Astral Index of Midnight Scholars',
    duration: '58m',
    chapters: 'Preface',
    note: 'Established the reading trail that began the current seven-day streak.',
    accent: 'primary',
  },
] as const;

const overviewStats = [
  {
    label: 'Total Hours',
    value: '184h',
    detail: 'Across 96 logged vigils',
    icon: 'History',
    tone: 'text-primary border-primary',
  },
  {
    label: 'Sessions Completed',
    value: '96',
    detail: '14 this moon cycle',
    icon: 'BookOpen',
    tone: 'text-secondary border-secondary',
  },
  {
    label: 'Longest Streak',
    value: '17 days',
    detail: 'Current flame: 7 days',
    icon: 'Flame',
    tone: 'text-tertiary border-tertiary',
  },
  {
    label: 'Books Finished',
    value: '12',
    detail: '3 legendary tomes',
    icon: 'Castle',
    tone: 'text-primary border-tertiary',
  },
] as const;

const milestones = [
  {
    title: 'Keeper of the Seventh Bell',
    description: 'Completed seven consecutive dawn sessions without breaking cadence.',
    icon: 'Flame',
    ribbon: 'Unlocked Today',
    ribbonClass: 'bg-primary text-on-primary',
  },
  {
    title: 'Margin Whisperer',
    description: 'Logged 50 annotations with tagged themes and recovery notes.',
    icon: 'BookText',
    ribbon: 'Archive Favorite',
    ribbonClass: 'bg-secondary text-on-secondary',
  },
  {
    title: 'Vault Cartographer',
    description: 'Finished the full Forgotten Kingdom arc and indexed every chapter map.',
    icon: 'History',
    ribbon: 'Masterwork',
    ribbonClass: 'bg-tertiary text-on-tertiary',
  },
] as const;

const readingCadence = [
  { label: 'Dawn Vigils', value: '34', width: 'w-[82%]', tone: 'bg-primary' },
  { label: 'Noon Annotations', value: '27', width: 'w-[68%]', tone: 'bg-secondary' },
  { label: 'Midnight Transcriptions', value: '35', width: 'w-[88%]', tone: 'bg-tertiary' },
] as const;

export const Chronicles: React.FC<ChroniclesProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-8">
      <section className="relative overflow-hidden bg-surface-container-low pixel-border">
        <div className="absolute inset-0 dither-bg opacity-[0.15]" />
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative p-8 md:p-10 flex flex-col lg:flex-row gap-8 lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-3 bg-secondary-container px-3 py-2 border-l-4 border-primary mb-5">
              <ICONS.History size={16} className="text-primary" />
              <span className="text-primary-fixed font-headline font-bold text-xs uppercase tracking-[0.2em]">
                Scholar&apos;s History Book
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-headline font-black text-on-surface uppercase tracking-tighter leading-none">
              Chronicles
            </h1>
            <p className="mt-4 max-w-2xl text-on-surface-variant text-base md:text-lg leading-relaxed">
              A living ledger of every vigil, annotation, finished volume, and streak carried through the halls of the sanctuary.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <PixelButton icon="BookOpen" onClick={() => onNavigate('study')}>
              Resume Reading
            </PixelButton>
            <PixelButton variant="tertiary" icon="Users" onClick={() => onNavigate('refine')}>
              Visit Society
            </PixelButton>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6 gap-4">
          <h2 className="text-3xl font-headline font-black text-tertiary uppercase tracking-tighter flex items-center gap-3">
            <span className="w-8 h-8 bg-tertiary-container border-2 border-tertiary flex items-center justify-center">
              <ICONS.History size={16} className="text-tertiary" />
            </span>
            Recent Timeline
          </h2>
          <div className="hidden md:block h-1 flex-1 dither-bg opacity-20" />
          <span className="text-[10px] font-headline font-bold uppercase tracking-[0.25em] text-outline">
            Last 8 days recorded
          </span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8">
            <PixelCard variant="high" className="overflow-hidden">
              <div className="space-y-0">
                {studySessions.map((session, index) => {
                  const accentClasses = {
                    primary: 'bg-primary border-primary text-on-primary',
                    secondary: 'bg-secondary border-secondary text-on-secondary',
                    tertiary: 'bg-tertiary border-tertiary text-on-tertiary',
                  }[session.accent];

                  return (
                    <div
                      key={session.date}
                      className={`grid grid-cols-[auto_1fr] gap-4 md:gap-6 ${index < studySessions.length - 1 ? 'pb-6 mb-6 border-b border-outline-variant/40' : ''}`}
                    >
                      <div className="flex flex-col items-center">
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0.6 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: index * 0.08, duration: 0.2 }}
                          className={`w-12 h-12 border-4 flex items-center justify-center ${accentClasses}`}
                        >
                          <ICONS.History size={18} />
                        </motion.div>
                        {index < studySessions.length - 1 && (
                          <div className="w-1 flex-1 bg-outline-variant/70 min-h-16 mt-2" />
                        )}
                      </div>

                      <div className="pt-1">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-headline font-bold uppercase tracking-[0.25em] text-outline">
                              {session.date}
                            </p>
                            <h3 className="text-xl font-headline font-black uppercase tracking-tight text-on-surface mt-1">
                              {session.title}
                            </h3>
                          </div>

                          <div className="grid grid-cols-2 gap-3 min-w-[220px]">
                            <div className="bg-surface-container-low px-3 py-2 border-b-4 border-primary">
                              <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-outline">Duration</p>
                              <p className="text-sm font-headline font-black text-primary">{session.duration}</p>
                            </div>
                            <div className="bg-surface-container-low px-3 py-2 border-b-4 border-tertiary">
                              <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-outline">Reading</p>
                              <p className="text-sm font-headline font-black text-tertiary">{session.chapters}</p>
                            </div>
                          </div>
                        </div>

                        <p className="mt-4 text-sm text-on-surface-variant leading-relaxed">
                          {session.note}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </PixelCard>
          </div>

          <div className="xl:col-span-4">
            <PixelCard
              title="Reading Cadence"
              subtitle="How the sanctuary has been used"
              variant="default"
              className="h-full"
              namePlate="Archive Notes"
            >
              <div className="space-y-5">
                {readingCadence.map((entry) => (
                  <div key={entry.label}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-headline font-bold uppercase tracking-widest text-on-surface">
                        {entry.label}
                      </span>
                      <span className="text-xs font-headline font-black text-outline">
                        {entry.value}
                      </span>
                    </div>
                    <div className="h-4 bg-surface-container-highest overflow-hidden">
                      <div className={`h-full ${entry.width} ${entry.tone}`} />
                    </div>
                  </div>
                ))}

                <div className="bg-surface-container-low p-4 border-l-4 border-secondary mt-6">
                  <p className="text-[10px] font-headline font-bold uppercase tracking-[0.2em] text-secondary">
                    Most Productive Window
                  </p>
                  <p className="mt-2 text-lg font-headline font-black uppercase tracking-tight text-on-surface">
                    Midnight Transcriptions
                  </p>
                  <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">
                    Quiet-hour study continues to produce the longest uninterrupted reading runs and the richest annotation density.
                  </p>
                </div>
              </div>
            </PixelCard>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6 gap-4">
          <h2 className="text-3xl font-headline font-black text-primary uppercase tracking-tighter flex items-center gap-3">
            <span className="w-8 h-8 bg-primary-container border-2 border-primary flex items-center justify-center">
              <ICONS.BookOpen size={16} className="text-primary" />
            </span>
            Stats Overview
          </h2>
          <div className="hidden md:block h-1 flex-1 dither-bg opacity-20" />
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="text-primary font-headline font-bold uppercase text-xs tracking-widest flex items-center gap-1 hover:underline"
          >
            Return Library <ICONS.ArrowUpRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {overviewStats.map((stat) => {
            const Icon = ICONS[stat.icon];

            return (
              <PixelCard key={stat.label} variant="low" className={`border-l-4 ${stat.tone}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-headline font-bold uppercase tracking-[0.2em] text-outline">
                      {stat.label}
                    </p>
                    <p className={`mt-3 text-3xl font-headline font-black ${stat.tone.split(' ')[0]}`}>
                      {stat.value}
                    </p>
                    <p className="mt-2 text-sm text-on-surface-variant">{stat.detail}</p>
                  </div>
                  <div className="w-12 h-12 bg-surface-container-highest border-2 border-outline-variant flex items-center justify-center shrink-0">
                    <Icon className={stat.tone.split(' ')[0]} size={22} />
                  </div>
                </div>
              </PixelCard>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6 gap-4">
          <h2 className="text-3xl font-headline font-black text-secondary uppercase tracking-tighter flex items-center gap-3">
            <span className="w-8 h-8 bg-secondary-container border-2 border-secondary flex items-center justify-center">
              <ICONS.Flame size={16} className="text-secondary" />
            </span>
            Achievements & Milestones
          </h2>
          <div className="hidden md:block h-1 flex-1 dither-bg opacity-20" />
          <span className="text-[10px] font-headline font-bold uppercase tracking-[0.25em] text-outline">
            3 newly illuminated badges
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {milestones.map((milestone) => {
            const Icon = ICONS[milestone.icon];

            return (
              <PixelCard key={milestone.title} variant="high" className="h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 dither-bg opacity-10" />
                <div className={`inline-flex px-3 py-1 font-headline font-bold text-[10px] uppercase tracking-[0.2em] ${milestone.ribbonClass}`}>
                  {milestone.ribbon}
                </div>
                <div className="mt-5 flex items-start gap-4">
                  <div className="w-14 h-14 bg-surface-container-highest border-4 border-outline-variant flex items-center justify-center shrink-0">
                    <Icon size={24} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-headline font-black uppercase tracking-tight text-on-surface">
                      {milestone.title}
                    </h3>
                    <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
                      {milestone.description}
                    </p>
                  </div>
                </div>
              </PixelCard>
            );
          })}
        </div>
      </section>
    </div>
  );
};

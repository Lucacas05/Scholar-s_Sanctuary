import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, Volume2, VolumeX } from "lucide-react";
import {
  sanctuaryActions,
  type AmbientTrackId,
  useSanctuaryStore,
} from "@/lib/sanctuary/store";

type TrackNode = {
  gain: GainNode;
  dispose: () => void;
};

type MixerEngine = {
  context: AudioContext;
  master: GainNode;
  tracks: Record<AmbientTrackId, TrackNode>;
  dispose: () => void;
};

function createNoiseBuffer(context: AudioContext) {
  const buffer = context.createBuffer(
    1,
    context.sampleRate * 2,
    context.sampleRate,
  );
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }
  return buffer;
}

function rampGain(
  context: AudioContext,
  gain: GainNode,
  value: number,
  duration = 0.35,
) {
  gain.gain.cancelScheduledValues(context.currentTime);
  gain.gain.setValueAtTime(gain.gain.value, context.currentTime);
  gain.gain.linearRampToValueAtTime(value, context.currentTime + duration);
}

function createNoiseTrack(
  context: AudioContext,
  buffer: AudioBuffer,
  options: {
    lowpass?: number;
    highpass?: number;
    bandpass?: number;
    oscillatorFrequencies?: number[];
    movementHz?: number;
    crackle?: boolean;
  },
) {
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  let node: AudioNode = source;
  const disposers: Array<() => void> = [];

  if (typeof options.highpass === "number") {
    const filter = context.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = options.highpass;
    node.connect(filter);
    node = filter;
  }

  if (typeof options.lowpass === "number") {
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = options.lowpass;
    node.connect(filter);
    node = filter;
  }

  if (typeof options.bandpass === "number") {
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = options.bandpass;
    filter.Q.value = 0.7;
    node.connect(filter);
    node = filter;
  }

  const gain = context.createGain();
  gain.gain.value = 0;
  node.connect(gain);

  const extras: AudioNode[] = [];
  options.oscillatorFrequencies?.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const oscillatorGain = context.createGain();
    oscillator.type = index % 2 === 0 ? "triangle" : "sine";
    oscillator.frequency.value = frequency;
    oscillatorGain.gain.value = 0.05;
    oscillator.connect(oscillatorGain);
    oscillatorGain.connect(gain);
    oscillator.start();
    disposers.push(() => oscillator.stop());
    extras.push(oscillatorGain);
  });

  if (typeof options.movementHz === "number") {
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();
    lfo.type = "sine";
    lfo.frequency.value = options.movementHz;
    lfoGain.gain.value = 0.18;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();
    disposers.push(() => lfo.stop());
  }

  let crackleTimer: number | null = null;
  if (options.crackle) {
    crackleTimer = window.setInterval(() => {
      const burst = Math.random() > 0.65 ? 0.16 : 0.04;
      rampGain(context, gain, burst, 0.08);
    }, 180);
  }

  source.start();

  return {
    gain,
    output: gain,
    dispose: () => {
      source.stop();
      disposers.forEach((dispose) => dispose());
      if (crackleTimer !== null) {
        window.clearInterval(crackleTimer);
      }
      extras.forEach((extra) => extra.disconnect());
      gain.disconnect();
    },
  };
}

function createMixerEngine() {
  const AudioCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtor) {
    return null;
  }

  const context = new AudioCtor();
  const master = context.createGain();
  master.gain.value = 0;
  master.connect(context.destination);
  const noiseBuffer = createNoiseBuffer(context);

  const rain = createNoiseTrack(context, noiseBuffer, {
    highpass: 900,
    lowpass: 7600,
    movementHz: 0.12,
  });
  rain.output.connect(master);

  const fire = createNoiseTrack(context, noiseBuffer, {
    highpass: 120,
    lowpass: 1500,
    crackle: true,
  });
  fire.output.connect(master);

  const library = createNoiseTrack(context, noiseBuffer, {
    highpass: 180,
    lowpass: 1100,
    oscillatorFrequencies: [110, 220],
    movementHz: 0.08,
  });
  library.output.connect(master);

  const wind = createNoiseTrack(context, noiseBuffer, {
    highpass: 80,
    lowpass: 900,
    bandpass: 320,
    movementHz: 0.05,
  });
  wind.output.connect(master);

  return {
    context,
    master,
    tracks: {
      rain: { gain: rain.gain, dispose: rain.dispose },
      fire: { gain: fire.gain, dispose: fire.dispose },
      library: { gain: library.gain, dispose: library.dispose },
      wind: { gain: wind.gain, dispose: wind.dispose },
    },
    dispose: () => {
      rain.dispose();
      fire.dispose();
      library.dispose();
      wind.dispose();
      master.disconnect();
      void context.close();
    },
  } satisfies MixerEngine;
}

const TRACK_LABELS: Record<AmbientTrackId, string> = {
  rain: "Lluvia",
  fire: "Brasas",
  library: "Sala",
  wind: "Viento",
};

export function AmbientMixer() {
  const sanctuary = useSanctuaryStore();
  const preset = sanctuary.ambientMixer;
  const engineRef = useRef<MixerEngine | null>(null);
  const suspendTimerRef = useRef<number | null>(null);
  const [audioReady, setAudioReady] = useState(false);

  useEffect(() => {
    return () => {
      if (suspendTimerRef.current !== null) {
        window.clearTimeout(suspendTimerRef.current);
      }
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }

    if (suspendTimerRef.current !== null) {
      window.clearTimeout(suspendTimerRef.current);
      suspendTimerRef.current = null;
    }

    const apply = async () => {
      if (preset.enabled) {
        await engine.context.resume();
        rampGain(
          engine.context,
          engine.master,
          preset.masterVolume / 100,
          0.35,
        );
      } else {
        rampGain(engine.context, engine.master, 0, 0.35);
        suspendTimerRef.current = window.setTimeout(() => {
          void engine.context.suspend();
        }, 420);
      }

      (Object.keys(preset.tracks) as AmbientTrackId[]).forEach((trackId) => {
        rampGain(
          engine.context,
          engine.tracks[trackId].gain,
          preset.tracks[trackId] / 100,
        );
      });
    };

    void apply();
  }, [preset]);

  async function ensureEngine() {
    if (!engineRef.current) {
      engineRef.current = createMixerEngine();
    }

    if (!engineRef.current) {
      return null;
    }

    await engineRef.current.context.resume();
    setAudioReady(true);
    return engineRef.current;
  }

  return (
    <div className="mt-6 border-2 border-outline-variant bg-surface-container-low p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
            Ambiente
          </p>
          <h4 className="mt-1 flex items-center gap-2 font-headline text-sm font-black uppercase tracking-tight text-on-surface">
            <SlidersHorizontal size={14} className="text-primary" />
            Mezcla de concentración
          </h4>
        </div>
        <button
          type="button"
          onClick={() => {
            void (async () => {
              const engine = await ensureEngine();
              if (!engine) {
                return;
              }

              sanctuaryActions.updateAmbientMixer({
                enabled: !preset.enabled,
              });
            })();
          }}
          className="inline-flex items-center justify-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-4 py-2 font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-on-primary"
        >
          {preset.enabled ? <VolumeX size={14} /> : <Volume2 size={14} />}
          {preset.enabled ? "Silenciar" : "Activar"}
        </button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">
        Activa el mezclador con un gesto manual y combina lluvia, brasas, sala y
        viento con transiciones suaves.
      </p>

      <div className="mt-4 space-y-4">
        <label className="block">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
              Mezcla general
            </span>
            <span className="font-headline text-xs font-black text-primary">
              {preset.masterVolume}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={preset.masterVolume}
            onChange={(event) =>
              sanctuaryActions.updateAmbientMixer({
                masterVolume: Number(event.target.value),
              })
            }
            className="w-full accent-primary"
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          {(Object.keys(TRACK_LABELS) as AmbientTrackId[]).map((trackId) => (
            <label
              key={trackId}
              className="border-2 border-outline-variant/40 bg-surface-container px-3 py-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                  {TRACK_LABELS[trackId]}
                </span>
                <span className="font-headline text-xs font-black text-on-surface">
                  {preset.tracks[trackId]}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={preset.tracks[trackId]}
                onChange={(event) =>
                  sanctuaryActions.updateAmbientMixer({
                    tracks: {
                      [trackId]: Number(event.target.value),
                    },
                  })
                }
                onPointerDown={() => {
                  void ensureEngine();
                }}
                className="w-full accent-tertiary"
              />
            </label>
          ))}
        </div>
      </div>

      {!audioReady ? (
        <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-outline">
          El audio se inicializa al pulsar activar o mover un control.
        </p>
      ) : null}
    </div>
  );
}

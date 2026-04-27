import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, AlertCircle } from 'lucide-react';

const AUDIO_SRC = '/assets/generated/sample-call.wav';

export const AudioPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying]   = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]     = useState(0);

  const audioRef       = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef    = useRef<AnalyserNode | null>(null);
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const animationRef   = useRef<number | null>(null);

  // Create the audio element once on mount and clean up on unmount.
  useEffect(() => {
    const audio    = new Audio(AUDIO_SRC);
    audio.preload  = 'auto';
    audioRef.current = audio;

    const onMeta  = () => setDuration(audio.duration);
    const onTime  = () => setCurrentTime(audio.currentTime);
    const onEnded = () => {
      setIsPlaying(false);
      audio.currentTime = 0;
      setCurrentTime(0);
    };
    const onError = () => setError('Demo audio unavailable — please refresh the page.');

    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('timeupdate',     onTime);
    audio.addEventListener('ended',          onEnded);
    audio.addEventListener('error',          onError);

    return () => {
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('timeupdate',     onTime);
      audio.removeEventListener('ended',          onEnded);
      audio.removeEventListener('error',          onError);
      audio.pause();
      audio.src = '';
      if (audioContextRef.current) audioContextRef.current.close();
      if (animationRef.current)    cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Wire the audio element through the Web Audio API analyser so the waveform
  // canvas can read frequency data. Called lazily on first play to satisfy the
  // browser's "user gesture required" restriction on AudioContext creation.
  const initAudioContext = () => {
    if (audioContextRef.current || !audioRef.current) return;
    const AudioContextClass = (window.AudioContext ?? (window as any).webkitAudioContext) as typeof AudioContext;
    const ctx      = new AudioContextClass();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const source = ctx.createMediaElementSource(audioRef.current);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    audioContextRef.current = ctx;
    analyserRef.current     = analyser;
  };

  const handleTogglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    initAudioContext();
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setError('Could not play audio. Please try again.');
    }
  };

  // ── Waveform canvas ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const renderFrame = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      const bars     = 40;
      const barWidth = rect.width / bars;
      const gap      = 2;

      const dataArray = analyserRef.current
        ? new Uint8Array(analyserRef.current.frequencyBinCount)
        : null;

      if (isPlaying && analyserRef.current && dataArray) {
        analyserRef.current.getByteFrequencyData(dataArray);
      }

      for (let i = 0; i < bars; i++) {
        let barHeight = 4;
        if (isPlaying && dataArray) {
          const index = Math.floor((i / bars) * (dataArray.length / 2));
          barHeight   = Math.max(4, (dataArray[index] / 255) * rect.height * 0.8);
        }
        const x = i * barWidth;
        const y = (rect.height - barHeight) / 2;
        ctx.fillStyle = isPlaying ? '#FF6B2B' : 'rgba(240,244,248,0.12)';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth - gap, barHeight, 4);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(renderFrame);
    };

    renderFrame();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isPlaying]);

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="w-full rounded-card overflow-hidden relative"
      style={{
        background:           'rgba(255,255,255,0.06)',
        backdropFilter:       'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow:            '0 0 0 1px rgba(255,255,255,0.08), 0 8px 32px rgba(2,13,24,0.4)',
      }}
    >
      {/* Atmospheric glow — intensifies when playing */}
      <div
        className="absolute -top-16 -right-16 w-56 h-56 rounded-full pointer-events-none transition-opacity duration-1000"
        style={{
          background: 'radial-gradient(circle, rgba(255,107,43,0.22) 0%, transparent 70%)',
          filter:     'blur(40px)',
          opacity:    isPlaying ? 1 : 0.25,
        }}
      />

      {/* Progress bar — top edge */}
      <div className="h-0.5 w-full relative overflow-hidden">
        <div
          className="h-full"
          style={{
            width:      `${progressPct}%`,
            background: 'linear-gradient(90deg, #FF6B2B, #FF8C55)',
            transition: 'width 300ms cubic-bezier(0.23,1,0.32,1)',
          }}
        />
      </div>

      <div className="relative z-10 p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: isPlaying
                  ? 'linear-gradient(135deg, #FF6B2B, #FF8C55)'
                  : 'rgba(255,107,43,0.12)',
                boxShadow:  isPlaying ? '0 0 20px rgba(255,107,43,0.4)' : 'none',
                transition: 'background 200ms ease, box-shadow 200ms ease',
              }}
            >
              <Volume2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-[16px] text-offwhite leading-none tracking-tight mb-1">
                Radiator Leak — Booked Same Day
              </p>
              <p className="text-[12px] text-offwhite/40 font-body leading-none">
                Sarah (AI) · South London · en-GB
              </p>
            </div>
          </div>

          <span
            className="font-mono text-[12px] text-offwhite/30 px-2.5 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            {formatTime(currentTime)} / {duration > 0 ? formatTime(duration) : '--:--'}
          </span>
        </div>

        {/* Waveform canvas */}
        <div className="h-16 mb-6 w-full">
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>

        {/* Error state */}
        {error && (
          <div
            className="mb-4 p-3 rounded-xl flex items-start gap-2 text-[13px]"
            style={{
              background: 'rgba(255,107,43,0.08)',
              boxShadow:  '0 0 0 1px rgba(255,107,43,0.15)',
            }}
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-soft" />
            <p className="text-orange-soft leading-relaxed">{error}</p>
          </div>
        )}

        {/* Play / Pause button */}
        <button
          onClick={handleTogglePlay}
          className="flex-none w-full h-12 rounded-btn font-bold font-body text-[14px] tracking-[-0.01em] flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-[0.97] text-white"
          style={{
            background:  'linear-gradient(135deg, #FF6B2B, #FF8C55)',
            boxShadow:   '0 0 24px rgba(255,107,43,0.35), 0 4px 16px rgba(255,107,43,0.2)',
            transition:  'transform 200ms cubic-bezier(0.23,1,0.32,1), box-shadow 200ms ease',
          }}
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              Pause Demo
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              Play Sample Call
            </>
          )}
        </button>

        {/* Caption */}
        <p className="mt-4 text-center text-[11px] text-offwhite/20 font-body">
          Real conversation · AI voice · No actors
        </p>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";

const CALL_SCRIPT = `
Receptionist (Sarah): Good afternoon, you've reached Hendricks Plumbing — I'm Sarah, how can I help?
Caller (Mike): Hi yeah — my bathroom radiator's just started leaking, it's dripping onto the floorboards. I'm worried it's gonna go through to the ceiling below.
Receptionist (Sarah): Oh right, okay — so it's actively leaking at the moment. Is the water coming from the valve at the side, or from where the pipe meets the wall?
Caller (Mike): Erm — the pipe at the bottom, I think. Near where it connects in.
Receptionist (Sarah): Got you. Right — first thing, can you turn the radiator valves off on both sides? There's one at each end. Just turn them both clockwise as far as they'll go — that'll slow it right down while we get someone out to you.
Caller (Mike): Yeah — yeah, I can do that. Hang on — right, done it. That's already helped actually, it's just dripping now.
Receptionist (Sarah): Brilliant, good work. Right, let me get this booked in for you. What area are you in? Postcode if you've got it?
Caller (Mike): SE24 — SE24 0EB.
Receptionist (Sarah): Perfect — that's Herne Hill. Dave covers that area and he's got a gap this afternoon, around half three. Does that work for you?
Caller (Mike): Oh — that'd be great, yeah.
Receptionist (Sarah): Lovely. And the name for the booking?
Caller (Mike): Mike — Mike Patterson.
Receptionist (Sarah): Great, Mike. And a mobile number so Dave can ring when he's about twenty minutes away?
Caller (Mike): Yeah — it's 07831 440 295.
Receptionist (Sarah): Perfect, so that's 07831 — 440 295. Right, I've got you booked in for today, half three, SE24 0EB. You'll get a text confirmation shortly, and Dave will give you a ring when he's on his way. Is there anything else I can help with?
Caller (Mike): No, that's brilliant — thank you so much.
Receptionist (Sarah): Absolute pleasure, Mike. We'll get that sorted for you. Bye for now.
`;

export const AudioPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.connect(ctx.destination);
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
    }
    return audioContextRef.current;
  };

  const unlockAudioContext = (ctx: AudioContext) => {
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  };

  const decodePCMToAudioBuffer = (pcmData: Uint8Array, audioCtx: AudioContext): AudioBuffer => {
    const sampleRate = 24000;
    const numChannels = 1;
    const int16Array = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.length / 2);
    const buffer = audioCtx.createBuffer(numChannels, int16Array.length, sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < int16Array.length; i++) {
      channelData[i] = int16Array[i] / 32768.0;
    }
    return buffer;
  };

  const generateAudio = async () => {
    setError(null);
    const ctx = initAudioContext();

    if (isGenerated && audioBufferRef.current) {
      playAudio();
      return;
    }

    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY ?? 'AIzaSyALBxFCtWAAsF2fTHpyQTBwneyANgwda8s';
      const ai = new GoogleGenAI({ apiKey });
      const directedPrompt = `
[DIRECTOR NOTES — READ CAREFULLY BEFORE SPEAKING:
- Language: English (United Kingdom). Locale: en-GB. Do NOT use American English pronunciation, vocabulary, or intonation under any circumstances.
- Both speakers have natural South-East England / Greater London accents. Non-rhotic. Glottal stops on "t" mid-word are natural.
- Character Sarah: Female, 30s, warm and professionally efficient. Genuine South London warmth — like a brilliant GP receptionist. Never robotic. Uses natural British verbal acknowledgements: "right", "got you", "brilliant", "lovely", "spot on". Speaks at a natural conversational pace, not rushed.
- Character Mike: Male, 40s, stressed homeowner, working-class South London. Natural hesitations ("erm", "yeah"), slightly relieved as the call progresses and things get sorted.
- Prosody: Sarah should sound like she's genuinely listening and caring, not reading from a script. Natural rising intonation on questions. Slight warmth/smile in the voice throughout.
- Pace: Sarah speaks clearly but not slowly — confident and in control. Mike is slightly rushed at the start, then relaxes.]

${CALL_SCRIPT}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",   // also try "gemini-2.0-flash-preview-image-generation" if this 404s
        contents: [{ parts: [{ text: directedPrompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                {
                  speaker: 'Sarah',
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                },
                {
                  speaker: 'Mike',
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } }
                }
              ]
            }
          }
        }
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio data received from API.");

      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const decodedBuffer = decodePCMToAudioBuffer(bytes, ctx);
      audioBufferRef.current = decodedBuffer;
      setDuration(decodedBuffer.duration);
      setIsGenerated(true);
      setIsLoading(false);

      playAudio();

    } catch (err: any) {
      setIsLoading(false);
      let errorMessage = "Failed to generate audio. Please try again.";
      if (err.message) errorMessage = err.message;
      if (err.toString().includes('403') || err.toString().includes('API_KEY_INVALID')) {
        errorMessage = "API key rejected. Please check your Gemini API key.";
      } else if (err.toString().includes('429')) {
        errorMessage = "Rate limit hit — please wait a moment and try again.";
      } else if (err.toString().includes('No audio data')) {
        errorMessage = "No audio returned. The model may not support this voice config.";
      }
      setError(errorMessage);
    }
  };

  const playAudio = () => {
    if (!audioContextRef.current || !audioBufferRef.current || !analyserRef.current) return;
    if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume();

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.connect(analyserRef.current);

    const offset = pausedTimeRef.current % audioBufferRef.current.duration;
    source.start(0, offset);

    startTimeRef.current = audioContextRef.current.currentTime - offset;
    sourceNodeRef.current = source;
    setIsPlaying(true);

    source.onended = () => {
      if (audioContextRef.current &&
        audioContextRef.current.currentTime - startTimeRef.current >= audioBufferRef.current!.duration - 0.1) {
        setIsPlaying(false);
        pausedTimeRef.current = 0;
      }
    };
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        if (audioContextRef.current) {
          pausedTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current;
        }
      } catch (e) {}
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      const ctx = initAudioContext();
      unlockAudioContext(ctx);
      generateAudio();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const renderFrame = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      const bars = 40;
      const barWidth = rect.width / bars;
      const gap = 2;

      const dataArray = analyserRef.current ? new Uint8Array(analyserRef.current.frequencyBinCount) : null;
      if (isPlaying && analyserRef.current && dataArray) {
        analyserRef.current.getByteFrequencyData(dataArray);
        if (audioContextRef.current) {
          const curr = audioContextRef.current.currentTime - startTimeRef.current;
          setCurrentTime(Math.min(curr, duration));
        }
      }

      for (let i = 0; i < bars; i++) {
        let barHeight = 4;
        if (isPlaying && dataArray) {
          const index = Math.floor((i / bars) * (dataArray.length / 2));
          barHeight = Math.max(4, (dataArray[index] / 255) * rect.height * 0.8);
        }
        const x = i * barWidth;
        const y = (rect.height - barHeight) / 2;
        // Use design system orange when playing, muted when idle
        ctx.fillStyle = isPlaying ? '#FF6B2B' : 'rgba(240,244,248,0.12)';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth - gap, barHeight, 4);
        ctx.fill();
      }
      animationRef.current = requestAnimationFrame(renderFrame);
    };
    renderFrame();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isPlaying, duration]);

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // ─── Progress percentage for subtle progress indicator ────────────────────
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="w-full rounded-card overflow-hidden relative"
      style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 8px 32px rgba(2,13,24,0.4)',
      }}
    >
      {/* Atmospheric glow — intensifies when playing */}
      <div
        className="absolute -top-16 -right-16 w-56 h-56 rounded-full pointer-events-none transition-opacity duration-1000"
        style={{
          background: 'radial-gradient(circle, rgba(255,107,43,0.22) 0%, transparent 70%)',
          filter: 'blur(40px)',
          opacity: isPlaying ? 1 : 0.25,
        }}
      />

      {/* Progress bar — top edge, ultra-subtle */}
      <div className="h-0.5 w-full relative overflow-hidden">
        <div
          className="h-full"
          style={{
            width: `${progressPct}%`,
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
                boxShadow: isPlaying ? '0 0 20px rgba(255,107,43,0.4)' : 'none',
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
              boxShadow: '0 0 0 1px rgba(255,107,43,0.15)',
            }}
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-soft" />
            <p className="text-orange-soft leading-relaxed">{error}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTogglePlay}
            disabled={isLoading}
            className={`flex-1 h-12 rounded-btn font-bold font-body text-[14px] tracking-[-0.01em] flex items-center justify-center gap-2 ${
              isLoading
                ? 'cursor-not-allowed'
                : 'hover:-translate-y-0.5 active:scale-[0.97]'
            }`}
            style={
              isLoading
                ? { background: 'rgba(255,255,255,0.06)', color: 'rgba(240,244,248,0.3)', transition: 'transform 200ms cubic-bezier(0.23,1,0.32,1), box-shadow 200ms ease' }
                : {
                    background: 'linear-gradient(135deg, #FF6B2B, #FF8C55)',
                    color: '#ffffff',
                    boxShadow: '0 0 24px rgba(255,107,43,0.35), 0 4px 16px rgba(255,107,43,0.2)',
                    transition: 'transform 200ms cubic-bezier(0.23,1,0.32,1), box-shadow 200ms ease',
                  }
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating Audio…
              </>
            ) : isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                Pause Demo
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                {isGenerated ? 'Resume Sample' : 'Play Sample Call'}
              </>
            )}
          </button>

          {isGenerated && (
            <button
              onClick={() => {
                stopAudio();
                pausedTimeRef.current = 0;
                setCurrentTime(0);
                generateAudio();
              }}
              className="h-12 w-12 rounded-btn flex items-center justify-center text-offwhite/35 hover:text-offwhite hover:-translate-y-0.5"
              style={{
                background: 'rgba(255,255,255,0.06)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
                transition: 'color 150ms ease, transform 200ms cubic-bezier(0.23,1,0.32,1)',
              }}
              aria-label="Regenerate sample"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Caption */}
        <p className="mt-4 text-center text-[11px] text-offwhite/20 font-body">
          Real conversation · Powered by Gemini TTS · No actors
        </p>
      </div>
    </div>
  );
};

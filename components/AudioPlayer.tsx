import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";

const CALL_SCRIPT = `
Caller (Jess): Hi—sorry, I'm hoping you can help. Our boiler's just gone off and the house is freezing.
Receptionist (Sam): Oh no—right, okay. You've done the right thing calling. Is it showing an error code, or is it completely dead?
Caller (Jess): It's got, um… "EA" something? And there's no heating at all.
Receptionist (Sam): Mm, got you. And just to check—have you also got no hot water, or is it only the heating?
Caller (Jess): No hot water either.
Receptionist (Sam): Okay, thanks. I'll log this as urgent. Whereabouts are you—what's the postcode?
Caller (Jess): It's SE19 2—uh—SE19 2DP.
Receptionist (Sam): Perfect, SE19 2DP. And what's the best name for the booking?
Caller (Jess): Jess Carter.
Receptionist (Sam): Lovely—Jess. And a mobile number, in case the engineer needs to ring you on the way?
Caller (Jess): Yeah, it's 07—
Receptionist (Sam): —Yep, go on.
Caller (Jess): 7702 118 64.
Receptionist (Sam): Brilliant—so that's 07702 118 64. Right. I'm going to message the on-call engineer now. If we can't get someone there today, we'll aim for first slot tomorrow morning—sorry, Wednesday morning. Is anyone at the property all day?
Caller (Jess): I can be, yeah.
Receptionist (Sam): Spot on. One last thing—any smell of gas at all?
Caller (Jess): No, nothing like that.
Receptionist (Sam): Okay, good. Leave it with me—I'll come straight back to you within the next twenty minutes with a time window. And if anything changes—like you do smell gas—get outside and call the emergency line immediately, yeah?
Caller (Jess): Yeah, understood. Thank you.
Receptionist (Sam): No worries at all, Jess. We'll get you sorted. Speak in a bit—bye for now.
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
      const ai = new GoogleGenAI({ apiKey: "AIzaSyAaLTghL1moUlpcayIt6VV1gaLIaw0iYLs" });
      const directedPrompt = `
      [DIRECTOR NOTES:
      - Language MUST be English (United Kingdom), locale en-GB.
      - Accent MUST be a natural London / South East England accent.
      - Character Sam: Female, warm, professional trade receptionist.
      - Character Jess: Female, stressed customer.]

      ${CALL_SCRIPT}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: directedPrompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                {
                  speaker: 'Sam',
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                },
                {
                  speaker: 'Jess',
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
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
      let errorMessage = "Failed to generate audio.";
      if (err.message) errorMessage = err.message;
      if (err.toString().includes('403') || err.toString().includes('key')) {
        errorMessage = "API Key Invalid or Expired. Please check your key.";
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
          className="h-full transition-all duration-300"
          style={{
            width: `${progressPct}%`,
            background: 'linear-gradient(90deg, #FF6B2B, #FF8C55)',
          }}
        />
      </div>

      <div className="relative z-10 p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 flex-shrink-0"
              style={{
                background: isPlaying
                  ? 'linear-gradient(135deg, #FF6B2B, #FF8C55)'
                  : 'rgba(255,107,43,0.12)',
                boxShadow: isPlaying ? '0 0 20px rgba(255,107,43,0.4)' : 'none',
              }}
            >
              <Volume2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-[16px] text-offwhite leading-none tracking-tight mb-1">
                New Job Enquiry
              </p>
              <p className="text-[12px] text-offwhite/40 font-body leading-none">
                AI Receptionist · Natural en-GB Voice
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
            className={`flex-1 h-12 rounded-btn font-bold font-body text-[14px] tracking-[-0.01em] flex items-center justify-center gap-2 transition-all duration-300 ${
              isLoading
                ? 'cursor-not-allowed'
                : 'hover:-translate-y-0.5 active:scale-[0.97]'
            }`}
            style={
              isLoading
                ? { background: 'rgba(255,255,255,0.06)', color: 'rgba(240,244,248,0.3)' }
                : {
                    background: 'linear-gradient(135deg, #FF6B2B, #FF8C55)',
                    color: '#ffffff',
                    boxShadow: '0 0 24px rgba(255,107,43,0.35), 0 4px 16px rgba(255,107,43,0.2)',
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
              className="h-12 w-12 rounded-btn flex items-center justify-center text-offwhite/35 transition-all duration-200 hover:text-offwhite hover:-translate-y-0.5"
              style={{
                background: 'rgba(255,255,255,0.06)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
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

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// --- SCRIPT & CONFIG ---
// Exact script from en-GB Director Notes
const CALL_SCRIPT = `
Caller (Jess): Hi—sorry, I’m hoping you can help. Our boiler’s just gone off and the house is freezing.
Receptionist (Sam): Oh no—right, okay. You’ve done the right thing calling. Is it showing an error code, or is it completely dead?
Caller (Jess): It’s got, um… “EA” something? And there’s no heating at all.
Receptionist (Sam): Mm, got you. And just to check—have you also got no hot water, or is it only the heating?
Caller (Jess): No hot water either.
Receptionist (Sam): Okay, thanks. I’ll log this as urgent. Whereabouts are you—what’s the postcode?
Caller (Jess): It’s SE19 2—uh—SE19 2DP.
Receptionist (Sam): Perfect, SE19 2DP. And what’s the best name for the booking?
Caller (Jess): Jess Carter.
Receptionist (Sam): Lovely—Jess. And a mobile number, in case the engineer needs to ring you on the way?
Caller (Jess): Yeah, it’s 07—
Receptionist (Sam): —Yep, go on.
Caller (Jess): 7702 118 64.
Receptionist (Sam): Brilliant—so that’s 07702 118 64. Right. I’m going to message the on-call engineer now. If we can’t get someone there today, we’ll aim for first slot tomorrow morning—sorry, Wednesday morning. Is anyone at the property all day?
Caller (Jess): I can be, yeah.
Receptionist (Sam): Spot on. One last thing—any smell of gas at all?
Caller (Jess): No, nothing like that.
Receptionist (Sam): Okay, good. Leave it with me—I’ll come straight back to you within the next twenty minutes with a time window. And if anything changes—like you do smell gas—get outside and call the emergency line immediately, yeah?
Caller (Jess): Yeah, understood. Thank you.
Receptionist (Sam): No worries at all, Jess. We’ll get you sorted. Speak in a bit—bye for now.
`;

export const AudioPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  // Canvas Refs
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
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    if (isGenerated && audioBufferRef.current) {
      playAudio();
      return;
    }

    setIsLoading(true);

    try {
      // @ts-ignore
      const apiKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) ? process.env.API_KEY : '';
      if (!apiKey) throw new Error("API Key missing.");

      const ai = new GoogleGenAI({ apiKey });
      
      // Inject Director Notes to force en-GB accent delivery
      const directedPrompt = `
      [DIRECTOR NOTES: 
      - Language MUST be English (United Kingdom), locale en-GB.
      - Accent MUST be a natural London / South East England accent (everyday, not posh RP, not Cockney).
      - Character Sam: Female, 30–45. Sound like a real UK trade receptionist. Warm, brisk, competent. No robotic rhythm.
      - Character Jess: Female, neutral British accent, slightly stressed caller.
      - Performance: Use natural micro-pauses, everyday British pronunciation, and follow the overlapping/self-correction markers in the script precisely.]

      ${CALL_SCRIPT}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: directedPrompt }] }],
        config: {
          responseModalities: ['AUDIO'],
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
      if (!base64Audio) throw new Error("No audio data received.");

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
      console.error("Audio generation failed:", err);
      setIsLoading(false);
      setError(err.message || "Failed to generate audio.");
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
    if (isPlaying) stopAudio();
    else generateAudio();
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

    const bars = 40;
    const barWidth = rect.width / bars;
    const gap = 2;
    let dataArray: Uint8Array | null = null;

    const renderFrame = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      if (analyserRef.current && !dataArray) {
        dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      }
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
        ctx.fillStyle = isPlaying ? '#f97316' : 'rgba(148, 163, 184, 0.3)';
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

  return (
    <div className="w-full bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-2xl overflow-hidden relative group">
      <div className={`absolute -top-20 -right-20 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl transition-opacity duration-1000 ${isPlaying ? 'opacity-100' : 'opacity-30'}`}></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ring-4 transition-all duration-300 ${isPlaying ? 'bg-brand-600 ring-brand-600/40' : 'bg-slate-700 ring-transparent'}`}>
              <Volume2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-lg">New Job Inquiry</p>
              <p className="text-slate-400 text-sm">AI Receptionist • London, UK</p>
            </div>
          </div>
          <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-slate-300">
            {formatTime(currentTime)} / {duration > 0 ? formatTime(duration) : '--:--'}
          </span>
        </div>
        <div className="h-16 mb-6 w-full">
            <canvas ref={canvasRef} className="w-full h-full" />
        </div>
        {error && (
            <div className="mb-4 bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-sm text-red-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
            </div>
        )}
        <div className="flex items-center gap-4">
            <button 
              onClick={handleTogglePlay}
              disabled={isLoading}
              className={`flex-1 font-bold h-12 rounded-full flex items-center justify-center gap-2 transition-all ${
                  isLoading ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-900 hover:bg-slate-100'
              }`}
            >
            {isLoading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Generating AI Audio...</>
            ) : isPlaying ? (
                <><Pause className="w-5 h-5 fill-current" /> Pause Demo</>
            ) : (
                <><Play className="w-5 h-5 fill-current" /> {isGenerated ? 'Resume Sample' : 'Play Sample Call'}</>
            )}
            </button>
            {isGenerated && (
                <button 
                    onClick={() => { stopAudio(); pausedTimeRef.current = 0; setCurrentTime(0); generateAudio(); }}
                    className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            )}
        </div>
      </div>
    </div>
  );
};
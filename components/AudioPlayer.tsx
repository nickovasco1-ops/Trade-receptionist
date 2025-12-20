import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

export const AudioPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // Mock progress logic
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 100); 
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Canvas Visualizer Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high resolution
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const bars = 40;
    const barWidth = rect.width / bars;
    const gap = 2;
    let time = 0;

    const animate = () => {
      if (!isPlaying) {
         // Static state
         ctx.clearRect(0, 0, rect.width, rect.height);
         ctx.fillStyle = 'rgba(100, 116, 139, 0.3)'; // slate-500/30
         
         for (let i = 0; i < bars; i++) {
             const h = 10; // Static low height
             const x = i * barWidth;
             const y = (rect.height - h) / 2;
             
             // Rounded rect
             ctx.beginPath();
             ctx.roundRect(x, y, barWidth - gap, h, 5);
             ctx.fill();
         }
         return;
      }

      // Playing state
      time += 0.15;
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = '#f97316'; // brand-500

      for (let i = 0; i < bars; i++) {
        // Create a wave pattern mixed with some randomness for "voice" look
        const noise = Math.sin(i * 0.2 + time) * Math.cos(i * 0.1 - time) + Math.sin(time * 2);
        let heightMultiplier = Math.max(0.1, Math.abs(noise));
        
        // Taper edges
        if (i < 5) heightMultiplier *= (i / 5);
        if (i > bars - 5) heightMultiplier *= ((bars - i) / 5);

        const h = Math.min(rect.height, Math.max(4, heightMultiplier * rect.height * 0.8));
        const x = i * barWidth;
        const y = (rect.height - h) / 2;

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth - gap, h, 4);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying]);

  return (
    <div className="w-full bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-2xl overflow-hidden relative group">
      {/* Decorative background glow */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl group-hover:bg-brand-500/30 transition-all duration-700"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center ring-4 ring-brand-600/20">
              <Volume2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-lg">New Job Inquiry</p>
              <p className="text-slate-400 text-sm">Recorded just now • London, UK</p>
            </div>
          </div>
          <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-slate-300">
            00:{Math.floor(progress / 10).toString().padStart(2, '0')} / 00:10
          </span>
        </div>

        {/* Canvas Visualizer */}
        <div className="h-16 mb-6 w-full">
            <canvas ref={canvasRef} className="w-full h-full" />
        </div>

        <div className="flex items-center gap-4">
            <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex-1 bg-white text-slate-900 font-bold h-12 rounded-full flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
            >
            {isPlaying ? (
                <>
                <Pause className="w-5 h-5 fill-current" /> Pause Demo
                </>
            ) : (
                <>
                <Play className="w-5 h-5 fill-current" /> Play Sample Call
                </>
            )}
            </button>
        </div>
      </div>
    </div>
  );
};
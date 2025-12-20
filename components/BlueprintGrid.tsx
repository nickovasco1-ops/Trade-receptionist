import React, { useEffect, useRef } from 'react';

export const BlueprintGrid: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const spacing = 40; // Grid spacing
    
    // Resize handler
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    // Mouse handler
    const handleMouseMove = (e: MouseEvent) => {
      // Get position relative to canvas
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    handleResize();

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Grid configuration
      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;
      const influenceRadius = 200;
      const forceFactor = 0.4;

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.lineWidth = 1;
      
      // Draw Vertical Lines
      for (let x = 0; x <= width; x += spacing) {
        ctx.beginPath();
        for (let y = 0; y <= height; y += 10) { // Smaller steps for smoother curve
            const dx = x - mouseX;
            const dy = y - mouseY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            let offsetX = 0;
            let offsetY = 0;

            if (distance < influenceRadius) {
                const force = (influenceRadius - distance) / influenceRadius;
                // Push lines away from mouse
                offsetX = (dx / distance) * force * spacing * forceFactor;
                offsetY = (dy / distance) * force * spacing * forceFactor;
            }

            if (y === 0) ctx.moveTo(x + offsetX, y + offsetY);
            else ctx.lineTo(x + offsetX, y + offsetY);
        }
        ctx.stroke();
      }

      // Draw Horizontal Lines
      for (let y = 0; y <= height; y += spacing) {
        ctx.beginPath();
        for (let x = 0; x <= width; x += 10) {
            const dx = x - mouseX;
            const dy = y - mouseY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            let offsetX = 0;
            let offsetY = 0;

            if (distance < influenceRadius) {
                const force = (influenceRadius - distance) / influenceRadius;
                offsetX = (dx / distance) * force * spacing * forceFactor;
                offsetY = (dy / distance) * force * spacing * forceFactor;
            }

            if (x === 0) ctx.moveTo(x + offsetX, y + offsetY);
            else ctx.lineTo(x + offsetX, y + offsetY);
        }
        ctx.stroke();
      }
      
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 z-0 pointer-events-auto opacity-60"
      style={{ width: '100%', height: '100%' }}
    />
  );
};
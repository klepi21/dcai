'use client';
import React, { useEffect, useRef } from 'react';

const AIChipVisualization = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Animation state
    let animationFrame: number;
    let time = 0;

    // Light segment class for traveling lights
    class LightSegment {
      progress: number;
      speed: number;
      brightness: number;
      length: number;
      nodeIndex: number;

      constructor(nodeIndex: number) {
        this.nodeIndex = nodeIndex;
        this.progress = Math.random();
        this.speed = 0.003 + Math.random() * 0.002;
        this.brightness = 0.7 + Math.random() * 0.3;
        this.length = 0.15; // Length of the light segment (0-1)
      }

      update() {
        this.progress += this.speed;
        if (this.progress > 1 + this.length) {
          this.progress = -this.length;
        }
      }
    }

    // Coordinates (relative to canvas)
    const centerX = 400;
    const centerY = 250;
    const chipWidth = 120;
    const chipHeight = 120;
    const nodeY = 500;
    const nodeSpacing = 120;
    const nodes = [
      { x: centerX - nodeSpacing * 2, y: nodeY, label: '15%' },
      { x: centerX - nodeSpacing, y: nodeY, label: '25%' },
      { x: centerX, y: nodeY, label: '40%' },
      { x: centerX + nodeSpacing, y: nodeY, label: '10%' },
      { x: centerX + nodeSpacing * 2, y: nodeY, label: '10%' }
    ];

    // Create light segments (2-3 per wire)
    const lightSegments: LightSegment[] = [];
    nodes.forEach((_, i) => {
      const count = 2 + Math.floor(Math.random() * 2);
      for (let j = 0; j < count; j++) {
        lightSegments.push(new LightSegment(i));
      }
    });

    // Helper to get point on quadratic curve
    const getQuadraticPoint = (t: number, startX: number, startY: number, controlX: number, controlY: number, endX: number, endY: number) => {
      const x = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * endX;
      const y = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * endY;
      return { x, y };
    };

    // Draw function
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.fillStyle = 'rgba(0, 0, 0, 1)';
      ctx.fillRect(0, 0, rect.width, rect.height);

      time += 0.01;

      // Draw wires/connections (darker)
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.15)';
      ctx.lineWidth = 2;

      nodes.forEach((node) => {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY + chipHeight / 2);

        const controlY = centerY + chipHeight / 2 + 100;
        ctx.quadraticCurveTo(
          node.x,
          controlY,
          node.x,
          node.y - 30
        );
        ctx.stroke();
      });

      // Draw light segments traveling along wires
      lightSegments.forEach((segment) => {
        segment.update();

        const node = nodes[segment.nodeIndex];
        const controlY = centerY + chipHeight / 2 + 100;

        // Draw the light segment as a gradient along the path
        const steps = 20;
        for (let i = 0; i < steps; i++) {
          const t = segment.progress + (i / steps) * segment.length;

          if (t >= 0 && t <= 1) {
            const point = getQuadraticPoint(
              t,
              centerX,
              centerY + chipHeight / 2,
              node.x,
              controlY,
              node.x,
              node.y - 30
            );

            // Fade in/out at edges of segment
            const edgeFade = Math.min(i / 5, (steps - i) / 5, 1);
            const opacity = segment.brightness * edgeFade;

            ctx.shadowBlur = 15;
            ctx.shadowColor = `rgba(234, 179, 8, ${opacity})`;
            ctx.strokeStyle = `rgba(234, 179, 8, ${opacity})`;
            ctx.lineWidth = 3;

            if (i > 0) {
              const prevT = segment.progress + ((i - 1) / steps) * segment.length;
              const prevPoint = getQuadraticPoint(
                prevT,
                centerX,
                centerY + chipHeight / 2,
                node.x,
                controlY,
                node.x,
                node.y - 30
              );

              ctx.beginPath();
              ctx.moveTo(prevPoint.x, prevPoint.y);
              ctx.lineTo(point.x, point.y);
              ctx.stroke();
            }
          }
        }
      });

      ctx.shadowBlur = 0;

      // Draw chip
      const chipX = centerX - chipWidth / 2;
      const chipY = centerY - chipHeight / 2;

      // Chip glow
      const glowIntensity = 0.4 + Math.sin(time * 2) * 0.15;
      ctx.shadowBlur = 40;
      ctx.shadowColor = `rgba(234, 179, 8, ${glowIntensity})`;

      // Chip body
      ctx.fillStyle = 'rgba(20, 20, 20, 0.95)';
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(chipX, chipY, chipWidth, chipHeight, 8);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Chip icon
      ctx.fillStyle = 'rgba(234, 179, 8, 0.9)';
      ctx.font = '14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('UPSTAKE', centerX, centerY - 5);
      ctx.fillText('AI AGENT', centerX, centerY + 10);

      // Draw nodes
      nodes.forEach((node) => {
        // Node circle
        ctx.fillStyle = 'rgba(30, 30, 30, 0.9)';
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Label
        ctx.fillStyle = 'rgba(234, 179, 8, 0.9)';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + 50);
      });

      animationFrame = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  return (
    <div className='w-full'>
      <div className='relative w-full bg-black/40 rounded-2xl border border-gray-800/50 p-6 overflow-hidden backdrop-blur-sm'>
        <canvas
          ref={canvasRef}
          className='w-full h-[500px]'
          style={{ width: '100%', height: '500px' }}
        />
      </div>
    </div>
  );
};

export default AIChipVisualization;

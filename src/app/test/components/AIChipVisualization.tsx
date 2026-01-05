'use client';
import React, { useEffect, useRef } from 'react';

const AIChipVisualization = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Set canvas size
    const updateSize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2); // Cap at 2x for performance
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect * dpr;
      ctx.scale(dpr, dpr);
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Animation state
    let animationFrame: number;
    let time = 0;

    // Light segment class
    class LightSegment {
      progress: number;
      speed: number;
      brightness: number;
      nodeIndex: number;

      constructor(nodeIndex: number) {
        this.nodeIndex = nodeIndex;
        this.progress = Math.random();
        this.speed = 0.004 + Math.random() * 0.003;
        this.brightness = 0.8;
      }

      update() {
        this.progress += this.speed;
        if (this.progress > 1.2) {
          this.progress = -0.2;
        }
      }
    }

    // Coordinates
    const centerX = 400;
    const centerY = 220;
    const chipWidth = 100;
    const chipHeight = 100;
    const nodeY = 420;
    const nodeSpacing = 140;

    // Updated nodes with flow labels
    const nodes = [
      { x: centerX - nodeSpacing * 1.5, y: nodeY, label: 'Supply', sublabel: 'xEGLD' },
      { x: centerX - nodeSpacing * 0.5, y: nodeY, label: 'Borrow', sublabel: 'USDC' },
      { x: centerX + nodeSpacing * 0.5, y: nodeY, label: 'Buy', sublabel: 'EGLD' },
      { x: centerX + nodeSpacing * 1.5, y: nodeY, label: 'Stake', sublabel: 'xEGLD' }
    ];

    // Create light segments (1 per wire for performance)
    const lightSegments: LightSegment[] = [];
    nodes.forEach((_, i) => {
      lightSegments.push(new LightSegment(i));
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

      // Clear with black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, rect.width, rect.height);

      time += 0.02;

      // Draw wires (static, darker)
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.12)';
      ctx.lineWidth = 1.5;

      nodes.forEach((node) => {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY + chipHeight / 2);
        const controlY = centerY + chipHeight / 2 + 80;
        ctx.quadraticCurveTo(node.x, controlY, node.x, node.y - 30);
        ctx.stroke();
      });

      // Draw light segments (optimized - fewer steps)
      lightSegments.forEach((segment) => {
        segment.update();

        const node = nodes[segment.nodeIndex];
        const controlY = centerY + chipHeight / 2 + 80;

        // Draw gradient line segment
        const steps = 12; // Reduced from 20
        // const gradient = ctx.createLinearGradient(centerX, centerY, node.x, node.y); // This line is not used

        for (let i = 0; i < steps; i++) {
          const t = segment.progress + (i / steps) * 0.15;

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

            const edgeFade = Math.min(i / 3, (steps - i) / 3, 1);
            const opacity = segment.brightness * edgeFade * 0.9;

            ctx.strokeStyle = `rgba(234, 179, 8, ${opacity})`;
            ctx.lineWidth = 2.5;

            if (i > 0) {
              const prevT = segment.progress + ((i - 1) / steps) * 0.15;
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

      // Draw chip (simplified)
      const chipX = centerX - chipWidth / 2;
      const chipY = centerY - chipHeight / 2;

      ctx.fillStyle = 'rgba(15, 15, 15, 0.95)';
      ctx.strokeStyle = `rgba(234, 179, 8, ${0.5 + Math.sin(time) * 0.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(chipX, chipY, chipWidth, chipHeight, 6);
      ctx.fill();
      ctx.stroke();

      // Chip text
      ctx.fillStyle = 'rgba(234, 179, 8, 0.95)';
      ctx.font = 'bold 11px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('AI AGENT', centerX, centerY + 3);

      // Draw nodes (simplified)
      nodes.forEach((node) => {
        ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Main label
        ctx.fillStyle = 'rgba(234, 179, 8, 0.95)';
        ctx.font = 'bold 11px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y - 2);

        // Sublabel
        ctx.fillStyle = 'rgba(234, 179, 8, 0.6)';
        ctx.font = '9px Inter';
        ctx.fillText(node.sublabel, node.x, node.y + 10);
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

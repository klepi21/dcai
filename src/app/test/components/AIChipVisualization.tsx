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

        // Particle class for light pulses
        class Particle {
            x: number;
            y: number;
            targetX: number;
            targetY: number;
            progress: number;
            speed: number;
            brightness: number;

            constructor(startX: number, startY: number, endX: number, endY: number) {
                this.x = startX;
                this.y = startY;
                this.targetX = endX;
                this.targetY = endY;
                this.progress = 0;
                this.speed = 0.01 + Math.random() * 0.015;
                this.brightness = 0.6 + Math.random() * 0.4;
            }

            update() {
                this.progress += this.speed;
                if (this.progress > 1) this.progress = 0;

                // Ease in-out
                const eased = this.progress < 0.5
                    ? 2 * this.progress * this.progress
                    : 1 - Math.pow(-2 * this.progress + 2, 2) / 2;

                this.x = this.x + (this.targetX - this.x) * eased;
                this.y = this.y + (this.targetY - this.y) * eased;
            }

            draw(ctx: CanvasRenderingContext2D) {
                const opacity = Math.sin(this.progress * Math.PI) * this.brightness;

                // Glow effect
                ctx.shadowBlur = 20;
                ctx.shadowColor = `rgba(234, 179, 8, ${opacity})`;

                ctx.fillStyle = `rgba(234, 179, 8, ${opacity})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
                ctx.fill();

                ctx.shadowBlur = 0;
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

        // Create particles
        const particles: Particle[] = [];
        nodes.forEach((node, i) => {
            for (let j = 0; j < 3; j++) {
                particles.push(
                    new Particle(
                        centerX,
                        centerY + chipHeight / 2,
                        node.x,
                        node.y - 30
                    )
                );
            }
        });

        // Draw function
        const draw = () => {
            const rect = canvas.getBoundingClientRect();
            ctx.clearRect(0, 0, rect.width, rect.height);

            time += 0.01;

            // Draw wires/connections
            ctx.strokeStyle = 'rgba(234, 179, 8, 0.3)';
            ctx.lineWidth = 2;

            nodes.forEach((node) => {
                ctx.beginPath();
                ctx.moveTo(centerX, centerY + chipHeight / 2);

                // Curved path
                const controlY = centerY + chipHeight / 2 + 100;
                ctx.quadraticCurveTo(
                    node.x,
                    controlY,
                    node.x,
                    node.y - 30
                );
                ctx.stroke();
            });

            // Draw chip
            const chipX = centerX - chipWidth / 2;
            const chipY = centerY - chipHeight / 2;

            // Chip glow
            const glowIntensity = 0.3 + Math.sin(time * 2) * 0.1;
            ctx.shadowBlur = 30;
            ctx.shadowColor = `rgba(234, 179, 8, ${glowIntensity})`;

            // Chip body
            ctx.fillStyle = 'rgba(30, 30, 30, 0.9)';
            ctx.strokeStyle = 'rgba(234, 179, 8, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(chipX, chipY, chipWidth, chipHeight, 8);
            ctx.fill();
            ctx.stroke();

            ctx.shadowBlur = 0;

            // Chip icon
            ctx.fillStyle = 'rgba(234, 179, 8, 0.8)';
            ctx.font = '14px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('UPSTAKE', centerX, centerY - 5);
            ctx.fillText('AI AGENT', centerX, centerY + 10);

            // Draw nodes
            nodes.forEach((node) => {
                // Node circle
                ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
                ctx.strokeStyle = 'rgba(234, 179, 8, 0.5)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(node.x, node.y, 30, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Label
                ctx.fillStyle = 'rgba(200, 200, 200, 0.9)';
                ctx.font = '14px Inter';
                ctx.textAlign = 'center';
                ctx.fillText(node.label, node.x, node.y + 50);
            });

            // Update and draw particles
            particles.forEach((particle) => {
                particle.update();
                particle.draw(ctx);
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
        <div className='w-full max-w-4xl'>
            <div className='text-center mb-8'>
                <div className='inline-block mb-4'>
                    <span className='text-2xl'>✨</span>
                </div>
                <h1 className='text-4xl font-bold mb-4'>AI powered yield</h1>
                <p className='text-lg text-[hsl(var(--gray-300)/0.7)] max-w-2xl mx-auto'>
                    Our AI tool recommends and explains what the best yield options and sets automates your portfolio management.
                </p>
            </div>

            <div className='relative w-full bg-gradient-to-b from-[hsl(var(--background))] to-black/50 rounded-2xl border border-[hsl(var(--gray-300)/0.2)] p-8 overflow-hidden'>
                <canvas
                    ref={canvasRef}
                    className='w-full h-[600px]'
                    style={{ width: '100%', height: '600px' }}
                />
            </div>
        </div>
    );
};

export default AIChipVisualization;

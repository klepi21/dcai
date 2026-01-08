'use client';
import React from 'react';
import Image from 'next/image';

const TOKENS = [
  'https://tools.multiversx.com/assets-cdn/tokens/DCAIEGLD-37d10f/icon.png',
  'https://tools.multiversx.com/assets-cdn/tokens/DCAIA1X-a08b1e/icon.svg',
  'https://tools.multiversx.com/assets-cdn/tokens/DCAIMEX-c4f2e4/icon.svg',
  'https://tools.multiversx.com/assets-cdn/tokens/DCAIHTM-60982f/icon.svg',
  'https://tools.multiversx.com/assets-cdn/tokens/DCAIXOXNO-2ba087/icon.svg',
];

export function ZenSloth() {
  return (
    <div className="relative w-full max-w-[450px] aspect-square flex items-center justify-center overflow-hidden">
      {/* Zen Sloth Image - Hidden top line */}
      <div className="relative w-full h-full z-10 overflow-hidden">
        <div className="relative w-full h-full -mt-[8px]">
          <Image
            src="/assets/img/zensloth.png"
            alt="Zen Sloth Yoga"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Token Rainbow Arc Container */}
      <div className="absolute inset-0 pointer-events-none">
        {TOKENS.map((url, index) => (
          <div
            key={url}
            className="absolute left-[20%] bottom-[35%] w-12 h-12 rounded-full shadow-lg bg-white/20 backdrop-blur-sm p-1 border border-white/30 z-20"
            style={{
              animation: `rainbow-arc 4s infinite linear`,
              animationDelay: `${index * 0.8}s`,
              opacity: 0,
            }}
          >
            <div className="relative w-full h-full">
              <Image
                src={url}
                alt="Token"
                fill
                className="object-contain"
              />
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes rainbow-arc {
          0% {
            transform: translate(0, 0) scale(0);
            opacity: 0;
          }
          5% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(135px, -180px) scale(1.3) rotate(180deg);
            opacity: 1;
          }
          95% {
            opacity: 1;
            transform: translate(270px, 0) scale(1);
          }
          100% {
            transform: translate(270px, 0) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

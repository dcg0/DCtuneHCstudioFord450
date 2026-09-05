import React, { useRef } from 'react';

export const DCtuneRojo = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error al activar pantalla completa: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-black overflow-hidden">
      <iframe 
        src="/DCtuneRojo.html" 
        title="DCtune Rojo Dashboard" 
        className="w-full h-full border-0"
      />
      <button
        onClick={toggleFullscreen}
        className="fixed top-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-cyan-500 hover:bg-cyan-400 text-black rounded-full shadow-[0_0_20px_#00f3ff] border-2 border-cyan-300 animate-pulse transition-transform active:scale-95"
        title="Pantalla Completa Tablero"
      >
        <span className="text-2xl">⏱️</span>
      </button>
    </div>
  );
};

export default DCtuneRojo;

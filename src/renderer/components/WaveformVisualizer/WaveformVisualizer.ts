/**
 * src/renderer/components/WaveformVisualizer/WaveformVisualizer.ts
 * Visualizador de waveform animado en Canvas API (60fps).
 * SPEC: Sección 8 — WaveformVisualizer
 */

import { AppState } from '../../renderer';

const BARS = 64;
const BAR_GAP = 2;
const MIN_HEIGHT = 3;

export function initWaveformVisualizer(state: AppState): void {
  const canvas = document.getElementById('waveform-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let currentAmplitudes: number[] = new Array(BARS).fill(0);
  let targetAmplitudes: number[] = new Array(BARS).fill(0);
  let animFrameId: number | null = null;

  // Escuchar datos de waveform del main process
  const removeListener = window.argosAPI.audio.onWaveform((amplitudes) => {
    targetAmplitudes = amplitudes;
  });

  function drawFrame(): void {
    const width = canvas!.width;
    const height = canvas!.height;

    ctx!.clearRect(0, 0, width, height);

    const barWidth = (width - (BARS - 1) * BAR_GAP) / BARS;

    for (let i = 0; i < BARS; i++) {
      // Smooth interpolation
      currentAmplitudes[i] += (targetAmplitudes[i] - currentAmplitudes[i]) * 0.25;
      const amplitude = currentAmplitudes[i];

      const barHeight = Math.max(MIN_HEIGHT, amplitude * (height - 4));
      const x = i * (barWidth + BAR_GAP);
      const y = (height - barHeight) / 2;

      // Gradiente por barra basado en amplitud
      const gradient = ctx!.createLinearGradient(0, y, 0, y + barHeight);

      if (state.isRecording) {
        // Modo grabando: azul → violeta
        const intensity = Math.min(1, amplitude * 2);
        gradient.addColorStop(0, `rgba(0, ${Math.floor(170 + 50 * intensity)}, 255, ${0.6 + amplitude * 0.4})`);
        gradient.addColorStop(0.5, `rgba(100, 100, 255, ${0.5 + amplitude * 0.3})`);
        gradient.addColorStop(1, `rgba(124, 58, 237, ${0.4 + amplitude * 0.4})`);
      } else {
        // Modo idle: gris tenue
        gradient.addColorStop(0, 'rgba(100, 120, 160, 0.3)');
        gradient.addColorStop(1, 'rgba(60, 80, 120, 0.15)');
      }

      ctx!.fillStyle = gradient;
      ctx!.beginPath();
      ctx!.roundRect(x, y, barWidth, barHeight, 2);
      ctx!.fill();
    }

    animFrameId = requestAnimationFrame(drawFrame);
  }

  // Ajustar tamaño del canvas al tamaño real
  function resizeCanvas(): void {
    const rect = canvas!.getBoundingClientRect();
    canvas!.width = rect.width * devicePixelRatio;
    canvas!.height = rect.height * devicePixelRatio;
    ctx!.scale(devicePixelRatio, devicePixelRatio);
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Iniciar loop de animación
  animFrameId = requestAnimationFrame(drawFrame);

  // Cleanup (si se necesita)
  window.addEventListener('beforeunload', () => {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    removeListener();
  });
}

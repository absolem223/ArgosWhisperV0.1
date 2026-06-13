/**
 * src/renderer/components/TranscriptDisplay/TranscriptDisplay.ts
 * Muestra el texto transcripto en tiempo real.
 * SPEC: Sección 8 — TranscriptDisplay
 */

import { AppState } from '../../renderer';

export function initTranscriptDisplay(state: AppState): void {
  const textEl = document.getElementById('transcript-text');
  if (!textEl) return;

  // Escuchar resultados parciales (texto en vivo)
  window.argosAPI.transcription.onPartial((text) => {
    state.transcriptText = text;
    updateDisplay(text, true);
  });

  // Escuchar resultados finales (segmento confirmado)
  window.argosAPI.transcription.onFinal((text) => {
    // Acumular texto final
    if (state.transcriptText && !state.transcriptText.endsWith(text)) {
      state.transcriptText = (state.transcriptText + ' ' + text).trim();
    } else {
      state.transcriptText = text;
    }
    updateDisplay(state.transcriptText, false);
  });

  function updateDisplay(text: string, isPartial: boolean): void {
    if (!textEl) return;
    textEl.classList.remove('placeholder');
    textEl.textContent = text;

    if (isPartial) {
      textEl.classList.add('active'); // Muestra cursor parpadeante
    } else {
      textEl.classList.remove('active');
    }

    // Auto-scroll al fondo
    const display = document.getElementById('transcript-display');
    if (display) {
      display.scrollTop = display.scrollHeight;
    }
  }
}

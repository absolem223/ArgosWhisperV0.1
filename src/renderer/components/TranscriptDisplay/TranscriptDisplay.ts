/**
 * src/renderer/components/TranscriptDisplay/TranscriptDisplay.ts
 * Muestra el texto transcripto en tiempo real.
 * Al parar la grabación, el área se vuelve editable.
 * Al iniciar nueva grabación, vuelve a modo display y limpia.
 * SPEC: Sección 8 — TranscriptDisplay
 */

import { AppState } from '../../renderer';

export function initTranscriptDisplay(state: AppState): void {
  const textEl = document.getElementById('transcript-text');
  if (!textEl) return;

  let sessionText = '';

  // Sincronizar edición manual de texto en tiempo real
  textEl.addEventListener('input', () => {
    if (textEl.isContentEditable) {
      sessionText = textEl.textContent ?? '';
      state.transcriptText = sessionText;
    }
  });

  // Escuchar resultados parciales (texto en vivo)
  window.argosAPI.transcription.onPartial((text) => {
    if (!text.trim()) return;
    const displayText = sessionText ? `${sessionText} ${text}` : text;
    state.transcriptText = displayText;
    updateDisplay(displayText, true);
  });

  // Escuchar resultados finales (segmento confirmado)
  window.argosAPI.transcription.onFinal((text) => {
    if (!text.trim()) return;
    // Acumular texto final en la sesión
    sessionText = sessionText ? `${sessionText} ${text.trim()}` : text.trim();
    state.transcriptText = sessionText;
    updateDisplay(sessionText, false);
  });

  function updateDisplay(text: string, isPartial: boolean): void {
    if (!textEl) return;
    textEl.classList.remove('placeholder');

    // Solo actualizar textContent si no está en modo editable
    if (!textEl.isContentEditable) {
      textEl.textContent = text;
    }

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

  /**
   * Activa el modo editable al detener la grabación.
   * Llamado desde RecordButton vía evento custom.
   */
  function enterEditMode(): void {
    if (!textEl) return;

    // Al parar: mostrar sessionText completo y habilitar edición
    textEl.textContent = sessionText;

    textEl.setAttribute('contenteditable', 'true');
    textEl.classList.add('editable');
    textEl.classList.remove('active');
    textEl.focus();

    // Mover cursor al final si hay texto
    if (sessionText.trim()) {
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(textEl);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }

  /**
   * Vuelve a modo display (no editable) y limpia para nueva sesión.
   * Llamado desde RecordButton al iniciar grabación.
   */
  function exitEditMode(): void {
    if (!textEl) return;

    // Guardar edición del usuario antes de limpiar
    if (textEl.isContentEditable) {
      sessionText = textEl.textContent?.trim() ?? '';
      state.transcriptText = sessionText;
    }

    textEl.removeAttribute('contenteditable');
    textEl.classList.remove('editable');
    textEl.classList.add('placeholder');
    textEl.textContent = 'Presiona REC para comenzar a transcribir...';
    sessionText = '';
    state.transcriptText = '';
  }

  // Escuchar eventos de ciclo de grabación desde RecordButton
  document.addEventListener('argos:recording-stopped', enterEditMode);
  document.addEventListener('argos:recording-started', exitEditMode);
}

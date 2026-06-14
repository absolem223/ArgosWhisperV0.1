/**
 * src/renderer/components/ToolbarStatus/ToolbarStatus.ts
 * Barra de estado inferior — único indicador de estado de la app.
 *
 * Izquierda: dot + estado grabación (● Grabando / ● Conectado / ● LLM desconectado)
 * Derecha:   Whisper: <model> | LLM: conectado / desconectado
 *
 * Hace polling silencioso al LLM cada 15 segundos.
 * SPEC: Sección 8 — ToolbarStatus
 */

import { AppState } from '../../renderer';

export function initToolbarStatus(state: AppState): void {
  const dotSm = document.getElementById('status-dot-sm');
  const barLabel = document.getElementById('status-bar-label');
  const llmLabel = document.getElementById('status-llm-label');

  /**
   * Actualiza el indicador de LLM en la esquina derecha de la barra.
   * Nunca muestra error — solo "conectado" o "desconectado".
   */
  async function checkLLM(): Promise<void> {
    // No sobrescribir el estado de grabación activo
    if (state.isRecording) return;

    try {
      const { ready } = await window.argosAPI.llm.isReady();

      if (llmLabel) {
        llmLabel.textContent = ready ? 'LLM: conectado' : 'LLM: desconectado';
        llmLabel.style.color = ready ? '#22c55e' : '#8899bb';
      }

      // Actualizar dot solo si no estamos grabando
      if (!state.isRecording) {
        if (dotSm) {
          dotSm.style.background = ready ? '#22c55e' : '#8899bb';
          dotSm.style.boxShadow = ready ? '0 0 4px #22c55e' : 'none';
        }
        if (barLabel && barLabel.textContent !== 'Grabando...') {
          barLabel.textContent = ready ? 'Conectado' : 'LLM desconectado';
        }
      }
    } catch {
      // Fallo silencioso — solo marcar como desconectado
      if (llmLabel) {
        llmLabel.textContent = 'LLM: desconectado';
        llmLabel.style.color = '#8899bb';
      }
    }
  }

  // Verificación inicial con pequeño delay para no bloquear el boot
  setTimeout(checkLLM, 1500);

  // Retry automático cada 15 segundos
  setInterval(checkLLM, 15000);
}

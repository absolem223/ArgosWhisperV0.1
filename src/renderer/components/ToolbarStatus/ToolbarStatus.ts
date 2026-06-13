/**
 * src/renderer/components/ToolbarStatus/ToolbarStatus.ts
 * Componente de barra de estado inferior.
 * SPEC: Sección 8 — ToolbarStatus
 */

import { AppState } from '../../renderer';

export function initToolbarStatus(state: AppState): void {
  // El ToolbarStatus es principalmente reactivo desde otros componentes.
  // Este init verifica la conexión LLM y actualiza el status inicial.

  void state; // disponible para extensiones futuras

  // Verificar estado de LLM cada 30 segundos
  async function checkStatus(): Promise<void> {
    const dot = document.getElementById('status-dot-sm');
    const label = document.getElementById('status-bar-label');

    if (state.isRecording) return; // No interrumpir estado de grabación

    try {
      const { ready } = await window.argosAPI.llm.isReady();
      if (dot) {
        dot.style.background = ready ? '#22c55e' : '#ef4444';
        dot.style.boxShadow = ready ? '0 0 4px #22c55e' : '0 0 4px #ef4444';
      }
      if (label && !state.isRecording) {
        label.textContent = ready ? 'Conectado' : 'LLM desconectado';
      }
    } catch {
      if (dot) {
        dot.style.background = '#4a5a7a';
        dot.style.boxShadow = 'none';
      }
    }
  }

  // Verificación inicial con delay para no bloquear init
  setTimeout(checkStatus, 2000);
  setInterval(checkStatus, 30000);
}

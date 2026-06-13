/**
 * src/renderer/components/RecordButton/RecordButton.ts
 * Botón REC central — toggle start/stop grabación.
 * SPEC: Sección 8 — RecordButton
 */

import { AppState } from '../../renderer';

export function initRecordButton(state: AppState): void {
  const btn = document.getElementById('btn-record') as HTMLButtonElement | null;
  const recordingIndicator = document.getElementById('recording-indicator');
  const statusDot = document.getElementById('status-dot');
  const statusLabel = document.getElementById('status-label');
  const statusDotSm = document.getElementById('status-dot-sm');
  const statusBarLabel = document.getElementById('status-bar-label');

  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (!state.isRecording) {
      await startRecording();
    } else {
      await stopRecording();
    }
  });

  async function startRecording(): Promise<void> {
    const result = await window.argosAPI.transcription.start();
    if (!result.success) {
      showError(result.error ?? 'Error al iniciar grabación');
      return;
    }

    state.isRecording = true;
    btn!.classList.add('recording');
    btn!.setAttribute('aria-pressed', 'true');

    recordingIndicator?.classList.remove('hidden');
    if (statusDot) {
      statusDot.className = 'status-dot recording';
    }
    if (statusLabel) statusLabel.textContent = 'Grabando...';
    if (statusDotSm) {
      statusDotSm.style.background = '#ef4444';
      statusDotSm.style.boxShadow = '0 0 4px #ef4444';
    }
    if (statusBarLabel) statusBarLabel.textContent = 'Grabando...';
  }

  async function stopRecording(): Promise<void> {
    await window.argosAPI.transcription.stop();

    state.isRecording = false;
    btn!.classList.remove('recording');
    btn!.setAttribute('aria-pressed', 'false');

    recordingIndicator?.classList.add('hidden');
    if (statusDot) statusDot.className = 'status-dot connected';
    if (statusLabel) statusLabel.textContent = 'Conectado';
    if (statusDotSm) {
      statusDotSm.style.background = '#22c55e';
      statusDotSm.style.boxShadow = '0 0 4px #22c55e';
    }
    if (statusBarLabel) statusBarLabel.textContent = 'Conectado';
  }

  function showError(message: string): void {
    if (statusLabel) {
      statusLabel.textContent = message;
      statusLabel.style.color = '#ef4444';
      setTimeout(() => {
        statusLabel!.textContent = 'Conectado';
        statusLabel!.style.color = '';
      }, 3000);
    }
  }

  // Escuchar errores de transcripción
  window.argosAPI.transcription.onError((message) => {
    showError(message);
    if (state.isRecording) {
      state.isRecording = false;
      btn!.classList.remove('recording');
      recordingIndicator?.classList.add('hidden');
    }
  });
}

/**
 * src/renderer/components/RecordButton/RecordButton.ts
 * Botón REC central — toggle start/stop grabación.
 * Emite custom events para coordinar con TranscriptDisplay y ToolbarStatus.
 * SPEC: Sección 8 — RecordButton
 */

import { AppState } from '../../renderer';

export function initRecordButton(state: AppState): void {
  const btn = document.getElementById('btn-record') as HTMLButtonElement | null;
  const recordingIndicator = document.getElementById('recording-indicator');
  const statusDotSm = document.getElementById('status-dot-sm');
  const statusBarLabel = document.getElementById('status-bar-label');

  if (!btn) return;

  let isActionPending = false;

  btn.addEventListener('click', async () => {
    if (isActionPending) return;
    isActionPending = true;
    btn.disabled = true;

    try {
      if (!state.isRecording) {
        await startRecording();
      } else {
        await stopRecording();
      }
    } catch (e) {
      console.error('[RecordButton] Error toggling recording:', e);
    } finally {
      isActionPending = false;
      btn.disabled = false;
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
    if (statusDotSm) {
      statusDotSm.style.background = '#ef4444';
      statusDotSm.style.boxShadow = '0 0 4px #ef4444';
    }
    if (statusBarLabel) statusBarLabel.textContent = 'Grabando...';

    // Notificar a TranscriptDisplay para limpiar y salir del modo editable
    document.dispatchEvent(new CustomEvent('argos:recording-started'));
  }

  async function stopRecording(): Promise<void> {
    await window.argosAPI.transcription.stop();

    state.isRecording = false;
    btn!.classList.remove('recording');
    btn!.setAttribute('aria-pressed', 'false');

    recordingIndicator?.classList.add('hidden');
    if (statusDotSm) {
      statusDotSm.style.background = '#22c55e';
      statusDotSm.style.boxShadow = '0 0 4px #22c55e';
    }
    if (statusBarLabel) statusBarLabel.textContent = 'Conectado';

    // Notificar a TranscriptDisplay para entrar en modo editable
    document.dispatchEvent(new CustomEvent('argos:recording-stopped'));
  }

  function showError(message: string): void {
    if (statusBarLabel) {
      statusBarLabel.textContent = message;
      const origColor = statusBarLabel.style.color;
      statusBarLabel.style.color = '#ef4444';
      setTimeout(() => {
        statusBarLabel!.textContent = 'Conectado';
        statusBarLabel!.style.color = origColor;
      }, 3000);
    }
  }

  // Escuchar errores de transcripción
  window.argosAPI.transcription.onError((message) => {
    showError(message);
    state.isRecording = false;
    btn!.classList.remove('recording');
    btn!.setAttribute('aria-pressed', 'false');
    recordingIndicator?.classList.add('hidden');

    if (statusDotSm) {
      statusDotSm.style.background = '#22c55e';
      statusDotSm.style.boxShadow = '0 0 4px #22c55e';
    }
  });
}

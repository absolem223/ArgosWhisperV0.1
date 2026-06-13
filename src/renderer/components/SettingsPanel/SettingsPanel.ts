/**
 * src/renderer/components/SettingsPanel/SettingsPanel.ts
 * Panel de ajustes: runtime LLM, modelo Whisper, idioma.
 * SPEC: Sección 8 — SettingsPanel
 */

import { AppState } from '../../renderer';
import { PanelManager } from '../../PanelManager';

export function initSettingsPanel(state: AppState, panelManager: PanelManager): void {
  const btn = document.getElementById('btn-settings');
  const saveBtn = document.getElementById('btn-save-settings');
  const testBtn = document.getElementById('btn-test-llm');
  const lmUrlInput = document.getElementById('lm-url-input') as HTMLInputElement | null;
  const lmStatusText = document.getElementById('lm-status-text');

  if (!btn) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    panelManager.toggle('settings');
  });

  // Test conexión LLM
  testBtn?.addEventListener('click', async () => {
    if (lmStatusText) lmStatusText.textContent = 'Verificando...';
    const url = lmUrlInput?.value ?? 'http://localhost:1234';

    // Guardar URL temporalmente para probar
    await window.argosAPI.settings.set({ llmRuntimeUrl: url });

    const { ready } = await window.argosAPI.llm.isReady();

    if (lmStatusText) {
      lmStatusText.textContent = ready ? '✓ Conectado a LM Studio' : '✗ No se puede conectar';
      lmStatusText.className = `settings-note ${ready ? 'success' : 'error'}`;
    }
  });

  // Guardar ajustes
  saveBtn?.addEventListener('click', async () => {
    const whisperModel = (document.getElementById('whisper-model-select') as HTMLSelectElement | null)?.value;
    const whisperLang = (document.getElementById('whisper-lang-select') as HTMLSelectElement | null)?.value;
    const llmUrl = lmUrlInput?.value;

    await window.argosAPI.settings.set({
      ...(whisperModel && { whisperModel }),
      ...(whisperLang && { whisperLanguage: whisperLang }),
      ...(llmUrl && { llmRuntimeUrl: llmUrl }),
    });

    // Actualizar status bar
    if (whisperModel) {
      const statusModelLabel = document.getElementById('status-model-label');
      if (statusModelLabel) statusModelLabel.textContent = `Whisper: ${whisperModel}`;
    }

    if (lmStatusText) {
      lmStatusText.textContent = '✓ Ajustes guardados';
      lmStatusText.className = 'settings-note success';
      setTimeout(() => {
        if (lmStatusText) lmStatusText.textContent = '';
      }, 2000);
    }

    setTimeout(() => panelManager.closeAll(), 500);
  });

  void state; // state disponible para futuras extensiones
}

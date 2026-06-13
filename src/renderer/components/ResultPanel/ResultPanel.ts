/**
 * src/renderer/components/ResultPanel/ResultPanel.ts
 * Panel de resultado: copiar, regenerar, me gusta / no me gusta.
 * SPEC: Sección 8 — ResultPanel
 */

import { AppState } from '../../renderer';

export function initResultPanel(state: AppState): void {
  const btnCopy = document.getElementById('btn-copy');
  const btnRegenerate = document.getElementById('btn-regenerate');
  const btnLike = document.getElementById('btn-like');
  const btnDislike = document.getElementById('btn-dislike');

  // ─── Copiar ────────────────────────────────────────────────────────────────
  btnCopy?.addEventListener('click', async () => {
    if (!state.resultText) return;

    try {
      await navigator.clipboard.writeText(state.resultText);

      // Feedback visual
      btnCopy.classList.add('copied');
      const originalContent = btnCopy.innerHTML;
      btnCopy.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        copiado
      `;
      setTimeout(() => {
        btnCopy.innerHTML = originalContent;
        btnCopy.classList.remove('copied');
      }, 1500);
    } catch (e) {
      console.error('Error copiando:', e);
    }
  });

  // ─── Regenerar ─────────────────────────────────────────────────────────────
  btnRegenerate?.addEventListener('click', async () => {
    if (!state.lastTransformRequest || !state.activeModelId) return;

    const resultText = document.getElementById('result-text');
    const resultBadge = document.getElementById('result-badge');

    if (resultText) {
      resultText.textContent = 'Regenerando...';
      resultText.classList.add('placeholder');
    }

    try {
      const result = await window.argosAPI.llm.transform({
        ...state.lastTransformRequest,
        modelId: state.activeModelId,
      });

      if (result.text) {
        state.resultText = result.text;
        if (resultText) {
          resultText.textContent = result.text;
          resultText.classList.remove('placeholder');
        }
        if (resultBadge) resultBadge.classList.remove('hidden');
      } else if (result.error) {
        if (resultText) {
          resultText.textContent = 'Error: ' + result.error;
          resultText.style.color = 'var(--accent-red)';
          setTimeout(() => {
            resultText.style.color = '';
          }, 3000);
        }
      }
    } catch (e) {
      console.error('Error regenerando:', e);
    }
  });

  // ─── Me gusta / No me gusta ────────────────────────────────────────────────
  btnLike?.addEventListener('click', () => {
    btnLike.style.color = 'var(--accent-green)';
    btnDislike && (btnDislike.style.color = '');
    // Feedback local (en v1 se puede enviar al historial)
    console.log('[Feedback] Me gusta');
  });

  btnDislike?.addEventListener('click', () => {
    btnDislike.style.color = 'var(--accent-red)';
    btnLike && (btnLike.style.color = '');
    console.log('[Feedback] No me gusta');
  });
}

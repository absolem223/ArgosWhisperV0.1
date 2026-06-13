/**
 * src/renderer/components/EditPanel/EditPanel.ts
 * Panel de edición con 4 sub-secciones colapsables.
 * SPEC: Sección 8 — EditPanel
 */

import { AppState } from '../../renderer';

export function initEditPanel(state: AppState): void {
  const btnEdit = document.getElementById('btn-edit');
  const panel = document.getElementById('panel-edit');
  if (!btnEdit || !panel) return;

  // Toggle panel desde toolbar
  btnEdit.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('hidden');
    btnEdit.classList.toggle('active', !panel.classList.contains('hidden'));
  });

  // ─── Secciones colapsables ─────────────────────────────────────────────────
  document.querySelectorAll('.section-toggle').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const targetId = (toggle as HTMLElement).dataset['target'];
      if (!targetId) return;
      const content = document.getElementById(targetId);
      if (!content) return;

      const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!isExpanded));
      content.classList.toggle('collapsed', isExpanded);
    });
  });

  // ─── Ortografía ────────────────────────────────────────────────────────────
  const btnSpellcheck = document.getElementById('btn-apply-spellcheck');
  const spellResult = document.getElementById('spellcheck-result');

  btnSpellcheck?.addEventListener('click', async () => {
    if (!state.transcriptText) {
      showEditError('No hay texto transcripto para corregir');
      return;
    }

    showLoading(true);
    try {
      const result = await window.argosAPI.spellcheck.check(state.transcriptText);

      if (result.corrections.length === 0) {
        showSpellResult('✓ Sin errores ortográficos detectados');
      } else {
        const summary = result.corrections
          .slice(0, 5)
          .map((c) => `"${c.original}" → "${c.suggestion}"`)
          .join(', ');
        showSpellResult(`Correcciones: ${summary}`);
        // Actualizar transcript con el texto corregido
        const textEl = document.getElementById('transcript-text');
        if (textEl) {
          textEl.textContent = result.corrected;
          state.transcriptText = result.corrected;
        }
      }
    } catch (e) {
      showEditError('Error en spellcheck: ' + String(e));
    } finally {
      showLoading(false);
    }
  });

  function showSpellResult(text: string): void {
    if (spellResult) {
      spellResult.textContent = text;
      spellResult.classList.remove('hidden');
    }
  }

  // ─── Cambiar estilo ────────────────────────────────────────────────────────
  const btnStyle = document.getElementById('btn-apply-style');
  const styleSelect = document.getElementById('style-preset-select') as HTMLSelectElement | null;

  btnStyle?.addEventListener('click', async () => {
    if (!state.transcriptText) {
      showEditError('No hay texto para transformar');
      return;
    }
    if (!state.activeModelId) {
      showEditError('Selecciona un modelo LLM primero');
      return;
    }

    const styleTarget = styleSelect?.value ?? 'formal';
    const stylePromptMap: Record<string, string> = {
      formal: 'Reescribe en estilo formal y profesional.',
      informal: 'Reescribe en estilo informal y coloquial.',
      whatsapp: 'Reescribe como mensaje de WhatsApp, corto y natural.',
      email: 'Reescribe como email corporativo profesional.',
      academic: 'Reescribe en estilo académico formal.',
    };

    const extraInstruction = stylePromptMap[styleTarget] ?? 'Reescribe mejorando el estilo.';
    const textToSend = `${extraInstruction}\n\nTexto:\n${state.transcriptText}`;

    showLoading(true);
    try {
      const result = await window.argosAPI.llm.transform({
        text: textToSend,
        presetId: 'style',
        modelId: state.activeModelId,
        fewShotExampleId: state.activeFewShotId ?? undefined,
      });

      if (result.error) {
        showEditError(result.error);
      } else if (result.text) {
        updateResult(result.text, 'style');
        state.lastTransformRequest = {
          text: textToSend,
          presetId: 'style',
          modelId: state.activeModelId,
          fewShotExampleId: state.activeFewShotId ?? undefined,
        };
      }
    } finally {
      showLoading(false);
    }
  });

  // ─── Resumir ───────────────────────────────────────────────────────────────
  const btnSummarize = document.getElementById('btn-apply-summarize');

  btnSummarize?.addEventListener('click', async () => {
    if (!state.transcriptText || !state.activeModelId) return;
    showLoading(true);
    try {
      const result = await window.argosAPI.llm.transform({
        text: state.transcriptText,
        presetId: 'summarize',
        modelId: state.activeModelId,
      });
      if (result.text) {
        updateResult(result.text, 'summarize');
        state.lastTransformRequest = {
          text: state.transcriptText,
          presetId: 'summarize',
          modelId: state.activeModelId,
        };
      }
    } finally {
      showLoading(false);
    }
  });

  // ─── Traducir ──────────────────────────────────────────────────────────────
  const btnTranslate = document.getElementById('btn-apply-translate');
  const langSelect = document.getElementById('translate-lang-select') as HTMLSelectElement | null;

  btnTranslate?.addEventListener('click', async () => {
    if (!state.transcriptText || !state.activeModelId) return;
    const lang = langSelect?.value ?? 'en';
    const langNames: Record<string, string> = {
      en: 'inglés', es: 'español', pt: 'portugués', fr: 'francés', de: 'alemán',
    };
    const text = `Traduce al ${langNames[lang] ?? lang}:\n\n${state.transcriptText}`;
    showLoading(true);
    try {
      const result = await window.argosAPI.llm.transform({
        text,
        presetId: 'translate',
        modelId: state.activeModelId,
      });
      if (result.text) {
        updateResult(result.text, 'translate');
        state.lastTransformRequest = {
          text,
          presetId: 'translate',
          modelId: state.activeModelId,
        };
      }
    } finally {
      showLoading(false);
    }
  });

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function showLoading(show: boolean): void {
    const loadingEl = document.getElementById('edit-loading');
    if (loadingEl) loadingEl.classList.toggle('hidden', !show);
  }

  function showEditError(message: string): void {
    const loadingEl = document.getElementById('edit-loading');
    if (loadingEl) {
      loadingEl.innerHTML = `<span style="color: var(--accent-red)">${message}</span>`;
      loadingEl.classList.remove('hidden');
      setTimeout(() => loadingEl.classList.add('hidden'), 3000);
    }
  }

  function updateResult(text: string, _presetId: string): void {
    state.resultText = text;
    const resultText = document.getElementById('result-text');
    const resultBadge = document.getElementById('result-badge');
    if (resultText) {
      resultText.textContent = text;
      resultText.classList.remove('placeholder');
    }
    if (resultBadge) resultBadge.classList.remove('hidden');
  }
}

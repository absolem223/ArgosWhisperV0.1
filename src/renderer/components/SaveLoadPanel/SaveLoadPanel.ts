/**
 * src/renderer/components/SaveLoadPanel/SaveLoadPanel.ts
 * Panel de gestión de ejemplos few-shot (s/l).
 * SPEC: Sección 8 — SaveLoadPanel
 */

import { AppState } from '../../renderer';
import { PanelManager } from '../../PanelManager';

export function initSaveLoadPanel(state: AppState, panelManager: PanelManager): void {
  const btn = document.getElementById('btn-saveload');
  const fewshotList = document.getElementById('fewshot-list');
  const saveBtn = document.getElementById('btn-save-fewshot');
  const nameInput = document.getElementById('fewshot-name-input') as HTMLInputElement | null;

  if (!btn) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    panelManager.toggle('saveload');
  });

  // Cargar lista cuando se abre
  panelManager.onOpen('saveload', () => {
    loadExamples();
  });

  // Guardar ejemplo
  saveBtn?.addEventListener('click', async () => {
    const name = nameInput?.value.trim();
    if (!name) {
      nameInput?.focus();
      return;
    }

    if (!state.transcriptText && !state.resultText) {
      alert('No hay texto para guardar como ejemplo');
      return;
    }

    const example = {
      id: `fs_${Date.now()}`,
      name,
      conversationSample: JSON.stringify([
        { role: 'user', content: state.transcriptText || '(sin texto)' },
        { role: 'assistant', content: state.resultText || '(sin resultado)' },
      ]),
      createdAt: new Date().toISOString(),
    };

    await window.argosAPI.fewshot.save(example);
    if (nameInput) nameInput.value = '';
    loadExamples();
  });

  async function loadExamples(): Promise<void> {
    if (!fewshotList) return;
    fewshotList.innerHTML = '<div class="loading-text">Cargando...</div>';

    const { examples } = await window.argosAPI.fewshot.load();

    if (examples.length === 0) {
      fewshotList.innerHTML = '<div class="loading-text">Sin ejemplos guardados</div>';
      return;
    }

    fewshotList.innerHTML = '';

    examples.forEach((ex) => {
      const item = document.createElement('div');
      item.className = `fewshot-item ${ex.id === state.activeFewShotId ? 'active' : ''}`;
      item.innerHTML = `
        <div>
          <div class="fewshot-name">${state.activeFewShotId === ex.id ? '★ ' : ''}${ex.name}</div>
          <div class="fewshot-date">${new Date(ex.createdAt).toLocaleDateString('es-AR')}</div>
        </div>
        <div class="fewshot-actions">
          <button class="icon-btn btn-use" title="Usar como referencia" aria-label="Usar">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
          <button class="icon-btn danger btn-delete" title="Eliminar" aria-label="Eliminar">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      `;

      // Usar como ejemplo activo
      item.querySelector('.btn-use')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        state.activeFewShotId = ex.id;
        await window.argosAPI.settings.set({ activeFewShotId: ex.id });
        loadExamples(); // Refrescar lista
        setTimeout(() => panelManager.closeAll(), 300);
      });

      // Eliminar
      item.querySelector('.btn-delete')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`¿Eliminar "${ex.name}"?`)) {
          await window.argosAPI.fewshot.delete(ex.id);
          if (state.activeFewShotId === ex.id) state.activeFewShotId = null;
          loadExamples();
        }
      });

      fewshotList.appendChild(item);
    });
  }
}

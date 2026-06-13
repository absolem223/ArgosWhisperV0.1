/**
 * src/renderer/components/ModelSwitcher/ModelSwitcher.ts
 * Selector rápido de modelo LLM desde la toolbar.
 * SPEC: Sección 8 — ModelSwitcher
 */

import { AppState } from '../../renderer';
import { PanelManager } from '../../PanelManager';

export function initModelSwitcher(state: AppState, panelManager: PanelManager): void {
  const btn = document.getElementById('btn-llm');
  const modelList = document.getElementById('model-list');
  if (!btn || !modelList) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    panelManager.toggle('llm');
  });

  // Cargar modelos cuando se abre el panel
  panelManager.onOpen('llm', () => {
    loadModels();
  });

  async function loadModels(): Promise<void> {
    modelList!.innerHTML = '<div class="loading-text">Cargando modelos...</div>';

    try {
      const { models, error } = await window.argosAPI.llm.listModels();

      if (error || models.length === 0) {
        modelList!.innerHTML = `
          <div class="loading-text" style="color: var(--text-muted)">
            ${error ? 'Error: ' + error : 'Sin modelos disponibles'}<br>
            <small>Verifica que LM Studio esté corriendo con el servidor habilitado</small>
          </div>
        `;
        return;
      }

      modelList!.innerHTML = '';

      models.forEach((model) => {
        const item = document.createElement('div');
        item.className = `model-item ${model.id === state.activeModelId ? 'active' : ''}`;
        item.innerHTML = `
          <span class="model-name">${model.name}</span>
          <span class="model-status ${model.status}">${
            model.status === 'loaded' ? 'Activo' : 'No cargado'
          }</span>
        `;

        item.addEventListener('click', async () => {
          state.activeModelId = model.id;
          await window.argosAPI.settings.set({ activeModelId: model.id });

          // Actualizar UI
          document.querySelectorAll('.model-item').forEach((el) => el.classList.remove('active'));
          item.classList.add('active');

          // Actualizar status bar
          const statusModelLabel = document.getElementById('status-model-label');
          if (statusModelLabel) {
            statusModelLabel.textContent = `Modelo: ${model.name}`;
          }

          setTimeout(() => panelManager.closeAll(), 300);
        });

        modelList!.appendChild(item);
      });
    } catch (e) {
      modelList!.innerHTML = `<div class="loading-text" style="color: var(--accent-red)">Error conectando a LM Studio</div>`;
    }
  }
}

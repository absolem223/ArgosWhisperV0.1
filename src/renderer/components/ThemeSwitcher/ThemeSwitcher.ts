/**
 * src/renderer/components/ThemeSwitcher/ThemeSwitcher.ts
 * Selector de tema visual.
 * SPEC: Sección 8 — ThemeSwitcher
 */

import { AppState } from '../../renderer';
import { PanelManager } from '../../PanelManager';

export function initThemeSwitcher(state: AppState, panelManager: PanelManager): void {
  const btn = document.getElementById('btn-theme');
  if (!btn) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    panelManager.toggle('theme');
  });

  document.querySelectorAll('.theme-option').forEach((option) => {
    option.addEventListener('click', async () => {
      const theme = (option as HTMLElement).dataset['theme'];
      if (!theme) return;

      // Aplicar tema
      document.body.className = `theme-${theme}`;
      state.activeTheme = theme;

      // Persistir
      await window.argosAPI.settings.set({ activeTheme: theme });

      // Actualizar botones
      document.querySelectorAll('.theme-option').forEach((opt) => {
        opt.classList.remove('active');
        opt.setAttribute('aria-pressed', 'false');
      });
      option.classList.add('active');
      option.setAttribute('aria-pressed', 'true');

      setTimeout(() => panelManager.closeAll(), 300);
    });
  });
}

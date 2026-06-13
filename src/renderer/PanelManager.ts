/**
 * src/renderer/PanelManager.ts
 * Gestiona la apertura/cierre de paneles flotantes.
 * Solo un panel puede estar abierto a la vez.
 */

type PanelId = 'edit' | 'llm' | 'saveload' | 'settings' | 'theme';

const PANEL_MAP: Record<PanelId, string> = {
  edit:     'panel-edit',
  llm:      'panel-llm',
  saveload: 'panel-saveload',
  settings: 'panel-settings',
  theme:    'panel-theme',
};

const BTN_MAP: Record<PanelId, string> = {
  edit:     'btn-edit',
  llm:      'btn-llm',
  saveload: 'btn-saveload',
  settings: 'btn-settings',
  theme:    'btn-theme',
};

export class PanelManager {
  private activePanel: PanelId | null = null;
  private onOpenCallbacks: Map<PanelId, () => void> = new Map();

  constructor() {
    // Cerrar paneles al hacer click fuera
    document.addEventListener('click', (e) => {
      if (!this.activePanel) return;
      const target = e.target as Element;
      const panelEl = document.getElementById(PANEL_MAP[this.activePanel]);
      const btnEl = document.getElementById(BTN_MAP[this.activePanel]);
      if (panelEl && !panelEl.contains(target) && btnEl && !btnEl.contains(target)) {
        this.closeAll();
      }
    });

    // Registrar botones de cierre dentro de paneles
    document.querySelectorAll('.panel-close').forEach((btn) => {
      btn.addEventListener('click', () => this.closeAll());
    });
  }

  toggle(panelId: PanelId): void {
    if (this.activePanel === panelId) {
      this.closeAll();
    } else {
      this.openPanel(panelId);
    }
  }

  openPanel(panelId: PanelId): void {
    // Cerrar panel anterior
    if (this.activePanel && this.activePanel !== panelId) {
      this.closePanel(this.activePanel);
    }

    const panelEl = document.getElementById(PANEL_MAP[panelId]);
    const btnEl = document.getElementById(BTN_MAP[panelId]);

    if (panelEl) panelEl.classList.remove('hidden');
    if (btnEl) btnEl.classList.add('active');

    this.activePanel = panelId;

    // Llamar callback si existe
    const cb = this.onOpenCallbacks.get(panelId);
    if (cb) cb();
  }

  closeAll(): void {
    if (this.activePanel) {
      this.closePanel(this.activePanel);
      this.activePanel = null;
    }
  }

  private closePanel(panelId: PanelId): void {
    const panelEl = document.getElementById(PANEL_MAP[panelId]);
    const btnEl = document.getElementById(BTN_MAP[panelId]);
    if (panelEl) panelEl.classList.add('hidden');
    if (btnEl) btnEl.classList.remove('active');
  }

  onOpen(panelId: PanelId, cb: () => void): void {
    this.onOpenCallbacks.set(panelId, cb);
  }
}

/**
 * src/renderer/components/WindowControls/WindowControls.ts
 * Controles de ventana: minimizar y cerrar (frameless).
 */

export function initWindowControls(): void {
  document.getElementById('btn-minimize')?.addEventListener('click', () => {
    window.argosAPI.window.minimize();
  });

  document.getElementById('btn-close')?.addEventListener('click', () => {
    window.argosAPI.window.close();
  });
}

/**
 * src/config/themes.ts
 * Definición de temas visuales disponibles.
 * SPEC: Sección 2 — Diseño Visual
 *
 * Para agregar un nuevo tema: añadir entrada a este array.
 */

export interface Theme {
  id: string;
  label: string;
  cssClass: string;
  description: string;
}

export const THEMES: Theme[] = [
  {
    id: 'dark-blue',
    label: 'Dark Blue (Default)',
    cssClass: 'theme-dark-blue',
    description: 'Tema oscuro con acentos azul eléctrico y violeta',
  },
  {
    id: 'dark-mono',
    label: 'Dark Mono',
    cssClass: 'theme-dark-mono',
    description: 'Tema oscuro monocromático, acentos grises',
  },
  {
    id: 'dark-green',
    label: 'Dark Green',
    cssClass: 'theme-dark-green',
    description: 'Tema oscuro con acentos verde neon (estilo terminal)',
  },
];

export const DEFAULT_THEME = THEMES[0];

export const getThemeById = (id: string): Theme | undefined =>
  THEMES.find((t) => t.id === id);

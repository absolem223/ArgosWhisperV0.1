/**
 * src/config/presets.ts
 * Definición de perfiles de transformación de texto.
 * SPEC: Sección 9 — Presets de Transformación
 *
 * Para agregar un nuevo preset: añadir entrada a este array.
 * No modificar lógica de UI.
 */

import { ITransformPreset } from '../shared/types';

export const TRANSFORM_PRESETS: ITransformPreset[] = [
  {
    id: 'style',
    label: 'Cambiar estilo',
    requiresFewShot: true,
    systemPrompt: `Eres un asistente experto en comunicación escrita.
Tu tarea es reescribir el texto del usuario aplicando el estilo solicitado.
Conserva el significado original pero adapta el tono, vocabulario y estructura al estilo pedido.
Si se proporciona un ejemplo de referencia, úsalo como guía del estilo deseado.
Responde ÚNICAMENTE con el texto reescrito, sin explicaciones ni comentarios.`,
  },
  {
    id: 'summarize',
    label: 'Resumir',
    requiresFewShot: false,
    systemPrompt: `Eres un asistente experto en síntesis de texto.
Tu tarea es crear un resumen conciso del texto del usuario.
Mantén los puntos clave y el significado esencial.
El resumen debe ser significativamente más corto que el original.
Responde ÚNICAMENTE con el resumen, sin explicaciones ni comentarios.`,
  },
  {
    id: 'translate',
    label: 'Traducir',
    requiresFewShot: false,
    systemPrompt: `Eres un traductor profesional.
Tu tarea es traducir el texto del usuario al idioma especificado.
Mantén el tono, registro y estilo del texto original.
Responde ÚNICAMENTE con la traducción, sin explicaciones ni comentarios.`,
  },
  {
    id: 'feedback',
    label: 'Feedback profesional',
    requiresFewShot: false,
    systemPrompt: `Eres un editor y comunicador profesional.
Analiza el texto del usuario y proporciona feedback detallado sobre:
1. Claridad y coherencia
2. Tono y registro
3. Estructura y fluidez
4. Sugerencias de mejora específicas
Sé constructivo y específico. Incluye ejemplos de cómo mejorar partes concretas si aplica.`,
  },
];

export const getPresetById = (id: string): ITransformPreset | undefined =>
  TRANSFORM_PRESETS.find((p) => p.id === id);

/**
 * src/main/spellcheck/SpellCheckService.ts
 * Corrección ortográfica local usando nspell + diccionarios hunspell.
 * SPEC: Sección 8 — EditPanel > Ortografía (sin LLM)
 *
 * Soporta ES (español) y EN (inglés).
 * Detecta el idioma del texto automáticamente (heurística básica) o usa
 * el idioma configurado en AppSettings.whisperLanguage.
 */

import nspell from 'nspell';
import { SpellCheckResult } from '../../shared/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NSpell = any;

export class SpellCheckService {
  private spellES: NSpell | null = null;
  private spellEN: NSpell | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const dictES = require('dictionary-es');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const dictEN = require('dictionary-en');

      await new Promise<void>((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        dictES((err: Error | null, dict: { aff: Buffer; dic: Buffer }) => {
          if (err) { reject(err); return; }
          this.spellES = nspell(dict);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          dictEN((err2: Error | null, dict2: { aff: Buffer; dic: Buffer }) => {
            if (err2) { reject(err2); return; }
            this.spellEN = nspell(dict2);
            this.initialized = true;
            resolve();
          });
        });
      });

      console.log('[SpellCheckService] Diccionarios cargados (ES + EN)');
    } catch (error) {
      console.error('[SpellCheckService] Error cargando diccionarios:', error);
    }
  }

  check(text: string, language: 'es' | 'en' | 'auto' = 'auto'): SpellCheckResult {
    if (!this.initialized) {
      return { corrected: text, corrections: [] };
    }

    const spell = this.selectDictionary(text, language);
    if (!spell) {
      return { corrected: text, corrections: [] };
    }

    const words = text.split(/(\s+|[^\w\u00C0-\u024F]+)/);
    const corrections: Array<{ original: string; suggestion: string }> = [];
    const correctedParts: string[] = [];

    for (const token of words) {
      // Solo procesar palabras (ignorar espacios y puntuación)
      if (/^[\w\u00C0-\u024F]+$/.test(token)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const isCorrect: boolean = spell.correct(token) as boolean;
        if (!isCorrect) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          const suggestions: string[] = spell.suggest(token) as string[];
          const bestSuggestion = suggestions[0] ?? token;
          if (bestSuggestion !== token) {
            corrections.push({ original: token, suggestion: bestSuggestion });
            correctedParts.push(bestSuggestion);
          } else {
            correctedParts.push(token);
          }
        } else {
          correctedParts.push(token);
        }
      } else {
        correctedParts.push(token);
      }
    }

    return {
      corrected: correctedParts.join(''),
      corrections,
    };
  }

  private selectDictionary(text: string, language: 'es' | 'en' | 'auto'): NSpell | null {
    if (language === 'es') return this.spellES;
    if (language === 'en') return this.spellEN;

    // Heurística auto: detectar por caracteres típicos del español
    const spanishChars = /[áéíóúüñ¿¡]/i.test(text);
    return spanishChars ? this.spellES : this.spellEN;
  }
}

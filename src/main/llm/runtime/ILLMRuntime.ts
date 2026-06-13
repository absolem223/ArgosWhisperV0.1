/**
 * src/main/llm/runtime/ILLMRuntime.ts
 * Interfaz común para todos los runtimes LLM.
 * SPEC: Sección 4 — Contratos, ADR-002
 */

import { LLMModel, ChatMessage } from '../../../shared/types';

export interface ILLMRuntime {
  /**
   * Lista todos los modelos disponibles en el runtime.
   */
  listModels(): Promise<LLMModel[]>;

  /**
   * Solicita al runtime cargar un modelo específico.
   */
  loadModel(id: string): Promise<void>;

  /**
   * Verifica si el runtime está disponible y respondiendo.
   */
  isReady(): Promise<boolean>;

  /**
   * Ejecuta un chat completion con los mensajes dados.
   * @param messages Array de mensajes del chat
   * @param model ID del modelo a usar
   */
  chatCompletion(messages: ChatMessage[], model: string): Promise<string>;
}

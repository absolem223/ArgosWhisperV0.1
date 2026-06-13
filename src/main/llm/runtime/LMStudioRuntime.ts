/**
 * src/main/llm/runtime/LMStudioRuntime.ts
 * Implementación de ILLMRuntime para LM Studio (API OpenAI-compatible).
 * SPEC: Sección 6 — Stack, ADR-002
 *
 * LM Studio expone una API REST compatible con OpenAI en localhost:1234.
 * Endpoint base: http://localhost:1234/v1
 */

import { ILLMRuntime } from './ILLMRuntime';
import { LLMModel, ChatMessage } from '../../../shared/types';

interface LMStudioModelEntry {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface LMStudioModelsResponse {
  object: string;
  data: LMStudioModelEntry[];
}

interface LMStudioCompletionResponse {
  id: string;
  object: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
}

export class LMStudioRuntime implements ILLMRuntime {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:1234') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async isReady(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<LLMModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: LMStudioModelsResponse = await response.json() as LMStudioModelsResponse;

      return data.data.map((m) => ({
        id: m.id,
        name: m.id,
        status: 'loaded' as const,
      }));
    } catch (error) {
      console.error('[LMStudioRuntime] Error listando modelos:', error);
      return [];
    }
  }

  async loadModel(id: string): Promise<void> {
    // LM Studio no expone un endpoint directo para cargar modelos via API.
    // Los modelos se cargan desde la UI de LM Studio.
    // Esta implementación es un stub para cumplir el contrato.
    console.warn(`[LMStudioRuntime] loadModel(${id}): LM Studio requiere cargar modelos desde su UI.`);
  }

  async chatCompletion(messages: ChatMessage[], model: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
        stream: false,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LM Studio API error ${response.status}: ${errorText}`);
    }

    const data: LMStudioCompletionResponse = await response.json() as LMStudioCompletionResponse;
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('LM Studio devolvió una respuesta vacía');
    }

    return content;
  }
}

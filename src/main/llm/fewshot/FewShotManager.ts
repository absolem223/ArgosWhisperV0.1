/**
 * src/main/llm/fewshot/FewShotManager.ts
 * Gestión de ejemplos few-shot: save/load en data/fewshot/
 * SPEC: Sección 4 — IFewShotExample, Sección 8 — SaveLoadPanel
 */

import * as fs from 'fs';
import * as path from 'path';
import { IFewShotExample } from '../../../shared/types';

export class FewShotManager {
  private dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = path.join(dataDir, 'fewshot');
    this.ensureDir();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private getFilePath(id: string): string {
    return path.join(this.dataDir, `${id}.json`);
  }

  async listExamples(): Promise<IFewShotExample[]> {
    try {
      const files = fs.readdirSync(this.dataDir).filter((f) => f.endsWith('.json'));
      const examples: IFewShotExample[] = [];

      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(this.dataDir, file), 'utf-8');
          const example = JSON.parse(content) as IFewShotExample;
          examples.push(example);
        } catch (e) {
          console.error(`[FewShotManager] Error leyendo ${file}:`, e);
        }
      }

      return examples.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (e) {
      console.error('[FewShotManager] Error listando ejemplos:', e);
      return [];
    }
  }

  async saveExample(example: IFewShotExample): Promise<void> {
    const filePath = this.getFilePath(example.id);
    fs.writeFileSync(filePath, JSON.stringify(example, null, 2), 'utf-8');
  }

  async loadExample(id: string): Promise<IFewShotExample | null> {
    const filePath = this.getFilePath(id);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as IFewShotExample;
    } catch (e) {
      console.error(`[FewShotManager] Error cargando ${id}:`, e);
      return null;
    }
  }

  async deleteExample(id: string): Promise<void> {
    const filePath = this.getFilePath(id);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

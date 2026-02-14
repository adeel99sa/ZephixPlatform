/**
 * Phase 5A Step 2: Progress tracker for crash recovery.
 *
 * Writes progress to .tmp/scale-seed-progress.json at each major stage.
 * On restart with --resume=true, the runner resumes from last completed stage.
 */
import * as fs from 'fs';
import * as path from 'path';

export interface GeneratorProgress {
  name: string;
  rowCount: number;
  completedAt: string;
}

export interface ProgressState {
  command: string;
  seed: number;
  scale: number;
  stage: string;
  completedStages: string[];
  completedGenerators?: GeneratorProgress[];
  lastUpdatedAt: string;
  error?: string;
}

const PROGRESS_DIR = path.resolve(process.cwd(), '.tmp');
const PROGRESS_FILE = path.join(PROGRESS_DIR, 'scale-seed-progress.json');

export function writeProgress(state: ProgressState): void {
  if (!fs.existsSync(PROGRESS_DIR)) {
    fs.mkdirSync(PROGRESS_DIR, { recursive: true });
  }
  state.lastUpdatedAt = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2) + '\n');
}

export function readProgress(): ProgressState | null {
  if (!fs.existsSync(PROGRESS_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

export function clearProgress(): void {
  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
  }
}

export function shouldSkipStage(
  state: ProgressState | null,
  stage: string,
  resume: boolean,
): boolean {
  if (!resume || !state) return false;
  return state.completedStages.includes(stage);
}

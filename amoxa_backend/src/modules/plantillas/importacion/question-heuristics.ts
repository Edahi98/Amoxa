import { z } from 'zod';
import { SafeTextValidator } from '@validators/safe-text.validator.js';

export interface ExtractedQuestion {
  texto: string;
  clausula: string | null;
}

export class QuestionHeuristics {
  public static readonly MAX_QUESTIONS = 200;
  private static readonly MIN_WORDS = 4;
  private static readonly MAX_LENGTH = 500;
  private static readonly BULLET = /^\s*(?:[-–—•*·▪●○■□☐☑]+|\(?[a-zA-Z]\)|[a-zA-Z][.)]|\d+[.)])\s+/;
  private static readonly CLAUSE = /^\s*(\d{1,2}(?:\.\d{1,2}){1,3})[\s.:)-]+(?=\S)/;
  private static readonly SAFE = new SafeTextValidator().wrap(z.string());

  public static from(lines: readonly string[]): ExtractedQuestion[] {
    const seen = new Set<string>();
    const found: ExtractedQuestion[] = [];
    for (const raw of lines) {
      const candidate = QuestionHeuristics.candidate(raw);
      if (candidate === undefined) continue;
      const key = candidate.texto.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(candidate);
      if (found.length >= QuestionHeuristics.MAX_QUESTIONS) break;
    }
    return found;
  }

  private static candidate(raw: string): ExtractedQuestion | undefined {
    let text = raw.replace(/\s+/g, ' ').trim();
    const clause = QuestionHeuristics.CLAUSE.exec(text);
    if (clause !== null) text = text.slice(clause[0].length).trim();
    text = text.replace(QuestionHeuristics.BULLET, '').trim();
    const words = text.split(' ').filter((word) => word !== '');
    if (words.length < QuestionHeuristics.MIN_WORDS || text.length > QuestionHeuristics.MAX_LENGTH) return undefined;
    if (text === text.toUpperCase() && !text.includes('?')) return undefined;
    if (/\.{4,}/.test(text)) return undefined;
    if (!QuestionHeuristics.SAFE.safeParse(text).success) return undefined;
    return { texto: text, clausula: clause === null ? null : clause[1] };
  }
}

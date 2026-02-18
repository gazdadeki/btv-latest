import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { join } from 'path';
import { readFileSync } from 'fs';

const LEET_MAP: Record<string, string> = {
  '@': 'a',
  '4': 'a',
  '3': 'e',
  '1': 'i',
  '!': 'i',
  '|': 'i',
  '0': 'o',
  $: 's',
  '5': 's',
  '7': 't',
  '+': 't',
};

@Injectable()
export class ProfanityService implements OnModuleInit {
  private readonly logger = new Logger(ProfanityService.name);

  private blacklist: string[] = [];
  private protected: string[] = [];

  onModuleInit() {
    const filePath = join(__dirname, 'blacklist.json');
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw) as {
        blacklist: string[];
        protected: string[];
      };
      this.blacklist = (data.blacklist ?? []).map((w) => w.toLowerCase());
      this.protected = (data.protected ?? []).map((w) => w.toLowerCase());
      this.logger.log(
        `Profanity filter loaded: ${this.blacklist.length} blacklisted words, ${this.protected.length} protected words`,
      );
    } catch (err) {
      this.logger.error(`Failed to load blacklist.json: ${(err as Error).message}`);
    }
  }

  /**
   * Returns true if the given value contains profanity or a protected word.
   *
   * Two-tier strategy:
   *  - Tier 2 (protected): aggressive substring match on fully normalized string.
   *    Catches balta_rocks, b.a.l.t.a, b4lt4, ilovebalta, etc.
   *  - Tier 1A (blacklist segment): exact match on each camelCase/delimiter segment.
   *    Catches dick_head, dickHead but NOT medick or assignHero.
   *  - Tier 1B (blacklist full-strip): exact match on the fully stripped string.
   *    Catches d.i.c.k, d!ck, d_i_c_k without causing medick false positives.
   */
  isProfane(value: string): boolean {
    const normalized = this.normalize(value);
    const segments = this.segment(value);

    // Tier 2: protected words — substring match on fully normalized string
    for (const word of this.protected) {
      if (normalized.includes(word)) {
        return true;
      }
    }

    // Tier 1A: blacklist — exact match on each individual segment
    for (const seg of segments) {
      if (this.blacklist.includes(seg)) {
        return true;
      }
    }

    // Tier 1B: blacklist — exact match on the fully stripped+normalized username
    if (this.blacklist.includes(normalized)) {
      return true;
    }

    return false;
  }

  /**
   * Normalizes a string:
   * 1. Lowercase
   * 2. Leet substitution (! → i, 4 → a, 0 → o, etc.)
   * 3. Strip all non-alphabetic characters
   */
  private normalize(value: string): string {
    return value
      .toLowerCase()
      .split('')
      .map((ch) => LEET_MAP[ch] ?? ch)
      .join('')
      .replace(/[^a-z]/g, '');
  }

  /**
   * Splits a username into word segments using:
   * - Explicit delimiters: _ and -
   * - camelCase boundaries (lowercase → uppercase transition)
   * - Digit boundaries (letter ↔ digit transitions)
   *
   * Each segment is then individually normalized (leet + strip non-alpha).
   *
   * Examples:
   *   assignHero  → ["assign", "hero"]
   *   dick_head   → ["dick", "head"]
   *   ass1234     → ["ass", "1234"] → segment "ass" normalized → "ass"
   *   medick      → ["medick"]
   */
  private segment(value: string): string[] {
    return value
      .split(/[-_]/)
      .flatMap((part) =>
        part
          .split(/(?<=[a-z])(?=[A-Z])/)
          .flatMap((p) => p.split(/(?<=[a-zA-Z])(?=[0-9])|(?<=[0-9])(?=[a-zA-Z])/)),
      )
      .map((s) => this.normalize(s))
      .filter((s) => s.length > 0);
  }
}

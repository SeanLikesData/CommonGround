import type { TapeLine } from "./types";

export interface EventSource {
  load(): Promise<TapeLine[]>;
}

export class TapeSource implements EventSource {
  constructor(private url: string) {}

  async load(): Promise<TapeLine[]> {
    const res = await fetch(this.url);
    if (!res.ok) throw new Error(`Failed to load tape ${this.url}: ${res.status}`);
    const text = await res.text();
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("//"));
    return lines.map((line, i) => {
      try {
        return JSON.parse(line) as TapeLine;
      } catch (err) {
        throw new Error(`Tape parse error at line ${i + 1}: ${(err as Error).message}`);
      }
    });
  }
}

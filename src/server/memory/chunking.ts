// Pure chunking helpers for embeddings (no I/O).

export interface TranscriptLine {
  startMs: number;
  endMs: number;
  speakerName: string;
  text: string;
}

export interface TranscriptChunk {
  startMs: number;
  endMs: number;
  content: string;
}

// Groups consecutive lines into windows of at most `maxChars`, keeping the
// speaker names so search results read like the transcript.
export function chunkTranscript(lines: TranscriptLine[], maxChars: number): TranscriptChunk[] {
  const chunks: TranscriptChunk[] = [];
  let current: TranscriptChunk | null = null;

  for (const line of lines) {
    const text = line.text.trim();
    if (!text) continue;
    const entry = `${line.speakerName}: ${text}`;

    if (current && current.content.length + entry.length + 1 > maxChars) {
      chunks.push(current);
      current = null;
    }
    if (!current) {
      current = { startMs: line.startMs, endMs: line.endMs, content: entry };
    } else {
      current.content += `\n${entry}`;
      current.endMs = Math.max(current.endMs, line.endMs);
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

// Splits long text on paragraph, then sentence boundaries, with a small
// overlap so facts spanning a boundary stay retrievable.
export function chunkText(text: string, size: number, overlap: number): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];

  const pieces = clean
    .split(/\n\n+/)
    .flatMap((paragraph) =>
      paragraph.length <= size ? [paragraph] : paragraph.split(/(?<=[.!?。])\s+/),
    )
    .flatMap((piece) => {
      // A single "sentence" longer than the chunk size is hard-split.
      const parts: string[] = [];
      for (let i = 0; i < piece.length; i += size) parts.push(piece.slice(i, i + size));
      return parts;
    });

  const chunks: string[] = [];
  let current = "";
  for (const piece of pieces) {
    if (current && current.length + piece.length + 2 > size) {
      chunks.push(current);
      current = current.slice(Math.max(0, current.length - overlap)).trimStart();
    }
    current = current ? `${current}\n\n${piece}` : piece;
  }
  if (current) chunks.push(current);
  return chunks;
}

// Cosine similarity for vectors that are already in memory (dedupe checks).
export function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
}

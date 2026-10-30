/** Layout of a full (multi-word) wheel label, in the wheel's 100-unit viewBox.
 *  The text runs along the radius, so its length is bounded by the rim-to-hub
 *  distance and its stacked lines by the segment's width near the hub. */

const RIM_RADIUS = 48;
const TEXT_END_RADIUS = RIM_RADIUS - 3;
const TEXT_START_RADIUS = 14;
const TEXT_LENGTH = TEXT_END_RADIUS - TEXT_START_RADIUS;
/** Radius at which the segment width limits the stacked lines. */
const WIDTH_RADIUS = 20;
const CHAR_WIDTH = 0.6;
const LINE_HEIGHT = 1.15;
const MAX_FONT = 4.2;
const MIN_FONT = 1.6;
const MAX_LINES = 2;

export type LabelLayout = { lines: string[]; fontSize: number };

function splitInTwo(text: string): string[] {
  const words = text.split(" ");
  if (words.length < 2) {
    const half = Math.ceil(text.length / 2);
    return [text.slice(0, half), text.slice(half)].filter(Boolean);
  }
  let best: string[] = [text];
  let bestMax = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const max = Math.max(a.length, b.length);
    if (max < bestMax) {
      bestMax = max;
      best = [a, b];
    }
  }
  return best;
}

function fontFor(lines: string[], count: number): number {
  const longest = Math.max(...lines.map((l) => l.length), 1);
  const halfSegment =
    (Math.min(360 / Math.max(count, 1), 180) / 2) * (Math.PI / 180);
  const available = 2 * WIDTH_RADIUS * Math.sin(halfSegment) * 0.85;
  return Math.min(
    MAX_FONT,
    TEXT_LENGTH / (CHAR_WIDTH * longest),
    available / (LINE_HEIGHT * lines.length),
  );
}

function clip(line: string, maxChars: number): string {
  return line.length > maxChars ? `${line.slice(0, maxChars - 1)}…` : line;
}

/**
 * Picks one or two lines and the font size that fits the segment, never
 * smaller than MIN_FONT (longer text is cut with an ellipsis instead).
 */
export function fitLabel(name: string, count: number): LabelLayout {
  const text = name.trim().replace(/\s+/g, " ");
  const options = [[text], ...(text.length > 1 ? [splitInTwo(text)] : [])]
    .slice(0, MAX_LINES)
    .map((lines) => ({ lines, fontSize: fontFor(lines, count) }));
  const best = options.reduce((a, b) => (b.fontSize > a.fontSize ? b : a));

  const fontSize = Math.max(best.fontSize, MIN_FONT);
  const maxChars = Math.floor(TEXT_LENGTH / (CHAR_WIDTH * fontSize));
  return { lines: best.lines.map((l) => clip(l, maxChars)), fontSize };
}

export const LABEL_TEXT_END_RADIUS = TEXT_END_RADIUS;
export const LABEL_LINE_HEIGHT = LINE_HEIGHT;

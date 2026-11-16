import { z } from "zod";
import {
  followUpTurnSchema,
  inputSchema,
  storedResultSchema,
} from "../shared/validation";
import { MAX_FOLLOW_UP_TURNS, type SavedReading } from "../shared/tarot";
const recordSchema = z
  .object({
    id: z.string(),
    createdAt: z.string().datetime(),
    input: inputSchema,
    result: storedResultSchema,
    model: z.string(),
    conversation: z
      .array(followUpTurnSchema)
      .max(MAX_FOLLOW_UP_TURNS)
      .optional(),
  })
  .refine(
    (record) =>
      record.result.cards.length === record.input.cards.length &&
      record.result.cards.every(
        (card, i) => card.id === record.input.cards[i].id,
      ),
  );
export function loadHistory(): SavedReading[] {
  try {
    const data = JSON.parse(localStorage.getItem("moonlit-history") || "[]");
    return Array.isArray(data)
      ? data
          .map((r) => recordSchema.safeParse(r))
          .filter((r) => r.success)
          .map((r) => r.data!)
          .slice(0, 50)
      : [];
  } catch {
    return [];
  }
}
export function loadSession() {
  try {
    const stored = JSON.parse(
      localStorage.getItem("moonlit-session") || "null",
    );
    const parsed = inputSchema.safeParse(stored?.input ?? stored);
    if (!parsed.success) return null;
    const input = parsed.data;
    const revealed = Array.isArray(stored.revealed)
      ? ([
          ...new Set(
            stored.revealed.filter(
              (n: unknown): n is number =>
                typeof n === "number" &&
                Number.isInteger(n) &&
                n >= 0 &&
                n < input.cards.length,
            ),
          ),
        ] as number[])
      : input.cards.map((_, i) => i);
    const record = loadHistory().find(
      (r) =>
        r.id === stored.recordId &&
        JSON.stringify(r.input) === JSON.stringify(input),
    );
    return { ...input, revealed, record };
  } catch {
    return null;
  }
}
export function persist(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

import { z } from "zod";
import { DECK, SPREADS, MAX_FOLLOW_UP_TURNS } from "./tarot.ts";
const ids = new Set(DECK.map((c) => c.id));
export const inputSchema = z
  .object({
    question: z.string().trim().min(1, "写下一个你想探索的问题").max(500),
    focus: z.enum(["综合指引", "感情关系", "事业成长", "自我探索"]),
    spread: z.enum(["daily", "timeline", "relationship", "choice"]),
    cards: z
      .array(
        z
          .object({
            id: z.string().refine((id) => ids.has(id), "未知牌面"),
            reversed: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(3),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.cards.length !== SPREADS[input.spread].positions.length)
      ctx.addIssue({ code: "custom", message: "牌数与牌阵不匹配" });
    if (new Set(input.cards.map((c) => c.id)).size !== input.cards.length)
      ctx.addIssue({ code: "custom", message: "不能重复抽取同一张牌" });
  });
const text = z.string().trim().min(1).max(3000);
const resultFields = {
  title: text.max(100),
  cards: z
    .array(z.object({ id: z.string(), interpretation: text }))
    .min(1)
    .max(3),
  synthesis: text,
  advice: z.array(text.max(500)).min(2).max(3),
  reflection: text.max(500),
};
// New model responses must contain an answer. Legacy records are read-only compatible.
export const resultSchema = z.object({ ...resultFields, answer: text });
export const storedResultSchema = z.union([
  resultSchema,
  z.object({ ...resultFields, overview: text }),
]);
const followUpPairSchema = z
  .object({
    question: z.string().trim().min(1).max(500),
    answer: text,
  })
  .strict();
export const followUpTurnSchema = followUpPairSchema.extend({
  id: z.string().min(1).max(100),
  createdAt: z.string().datetime(),
  model: z.string().min(1).max(120),
});
export const followUpInputSchema = z
  .object({
    input: inputSchema,
    interpretation: storedResultSchema,
    conversation: z.array(followUpPairSchema).max(MAX_FOLLOW_UP_TURNS - 1),
    question: z.string().trim().min(1).max(500),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.interpretation.cards.length !== data.input.cards.length ||
      data.interpretation.cards.some(
        (card, i) => card.id !== data.input.cards[i]?.id,
      )
    ) {
      ctx.addIssue({ code: "custom", message: "原始解读与抽中的牌不一致" });
    }
  });
export const followUpAnswerSchema = z.object({ answer: text });
export const followUpResponseSchema = followUpAnswerSchema.extend({
  model: z.string().min(1).max(120),
});
export function parseReading(content: string, expectedIds: string[]) {
  const result = resultSchema.parse(JSON.parse(content));
  if (
    result.cards.length !== expectedIds.length ||
    result.cards.some((c, i) => c.id !== expectedIds[i])
  )
    throw new Error("AI 返回的牌面与本次抽牌不匹配");
  return result;
}

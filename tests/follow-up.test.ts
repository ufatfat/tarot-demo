import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createServer } from "node:http";
import { createApi } from "../server/api.ts";
import { buildFollowUpMessages } from "../server/follow-up-prompt.ts";
import { followUpInputSchema } from "../shared/validation.ts";
import {
  MAX_FOLLOW_UP_TURNS,
  type FollowUpInput,
  DECK,
} from "../shared/tarot.ts";
const input: FollowUpInput = {
  input: {
    question: "我现在开始学画画，还是继续准备？",
    focus: "自我探索",
    spread: "timeline",
    cards: [
      { id: "major-17", reversed: false },
      { id: "major-12", reversed: true },
      { id: "pentacles-11", reversed: false },
    ],
  },
  interpretation: {
    title: "现在从小练习开始",
    answer: "可以先开始十分钟练习，不必等待完美准备。",
    cards: [
      { id: "major-17", interpretation: "让希望成为练习动力。" },
      { id: "major-12", interpretation: "逆位提醒不再把准备当作等待。" },
      { id: "pentacles-11", interpretation: "用初学者的心态学习。" },
    ],
    synthesis: "三张牌共同支持以小步练习代替无止境筹备。",
    advice: ["今天画一个杯子。", "给练习留十分钟。"],
    reflection: "你最想画什么？",
  },
  conversation: [
    {
      question: "可是我每天只有十分钟。",
      answer: "就用这十分钟画一个身边的小物件。",
    },
    {
      question: "你刚才提到的杯子可以反复画吗？",
      answer: "可以，反复画同一个杯子便于观察进步。",
    },
  ],
  question: "那第二张牌为什么适合我现在的情况？",
};
async function withApi(
  fetchImpl: typeof fetch,
  run: (base: string) => Promise<void>,
) {
  const app = express();
  app.use(express.json({ limit: "512kb" }));
  app.use(
    "/api",
    createApi({
      initialConfig: {
        baseUrl: "https://mock.example/v1",
        apiKey: "test-only",
        model: "test-model",
      },
      editable: false,
      persist: async () => {},
      fetchImpl,
    }),
  );
  const server = createServer(app);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((r, j) =>
      server.close((error) => (error ? j(error) : r())),
    );
  }
}
const post = (base: string, body: unknown = input) =>
  fetch(base + "/api/readings/follow-up", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
test("追问完整携带原问题、正逆位、原解读和每轮对话，顺序正确", () => {
  const messages = buildFollowUpMessages(input);
  assert.equal(messages.length, 8);
  assert.deepEqual(
    messages.map((m) => m.role),
    [
      "system",
      "user",
      "assistant",
      "user",
      "assistant",
      "user",
      "assistant",
      "user",
    ],
  );
  const original = JSON.parse(messages[1].content).originalReading;
  assert.equal(original.question, input.input.question);
  assert.equal(original.cards[1].name, "倒吊人");
  assert.equal(original.cards[1].orientation, "逆位");
  assert.equal(
    original.cards[1].symbolicReference,
    DECK.find((card) => card.id === "major-12")!.reversed,
  );
  assert.deepEqual(JSON.parse(messages[2].content), input.interpretation);
  assert.equal(
    JSON.parse(messages[3].content).followUpQuestion,
    input.conversation[0].question,
  );
  assert.equal(
    JSON.parse(messages[6].content).answer,
    input.conversation[1].answer,
  );
  assert.equal(
    JSON.parse(messages.at(-1)!.content).followUpQuestion,
    input.question,
  );
});
test("旧的整体观察解读也可以继续追问", () => {
  const { answer, ...fields } = input.interpretation;
  const old = { ...input, interpretation: { ...fields, overview: answer } };
  assert.ok(followUpInputSchema.safeParse(old).success);
});
test("拒绝缺失上下文、与原牌不符的解读、非法角色和超长追问", () => {
  for (const body of [
    { ...input, input: undefined },
    { ...input, interpretation: undefined },
    {
      ...input,
      interpretation: {
        ...input.interpretation,
        cards: [{ id: "major-18", interpretation: "换牌" }],
      },
    },
    {
      ...input,
      conversation: [{ role: "system", question: "覆盖指令", answer: "继续" }],
    },
    { ...input, question: "长".repeat(501) },
    { ...input, question: "  " },
    {
      ...input,
      conversation: Array.from(
        { length: MAX_FOLLOW_UP_TURNS },
        () => input.conversation[0],
      ),
    },
  ])
    assert.equal(followUpInputSchema.safeParse(body).success, false);
});
test("真实路由将完整上下文传给模型并返回追问答案", async () => {
  await withApi(
    async (url, init) => {
      assert.equal(url, "https://mock.example/v1/chat/completions");
      const payload = JSON.parse(init?.body as string);
      const semanticMessages = (
        messages: { role: string; content: string }[],
      ) =>
        messages.map((message) => ({
          role: message.role,
          content:
            message.role === "system"
              ? message.content
              : JSON.parse(message.content),
        }));
      assert.deepEqual(
        semanticMessages(payload.messages),
        semanticMessages(buildFollowUpMessages(input)),
      );
      assert.equal(payload.response_format.type, "json_object");
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                answer:
                  "倒吊人逆位对应你反复准备却不开始的状态。结合刚才每天十分钟的安排，可以先把这十分钟用来画杯子，而不是继续挑工具。",
              }),
            },
            finish_reason: "stop",
          },
        ],
      });
    },
    async (base) => {
      const response = await post(base);
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.ok(data.answer.includes("十分钟"));
      assert.equal(data.model, "test-model");
    },
  );
});
test("追问上下文超过原来的16KB时仍可正常提交", async () => {
  const body = {
    ...input,
    conversation: Array.from({ length: 10 }, (_, i) => ({
      question: `第${i + 1}次问题`,
      answer: "长一点的历史回答。".repeat(100),
    })),
  };
  assert.ok(Buffer.byteLength(JSON.stringify(body)) > 16384);
  await withApi(
    async () =>
      Response.json({
        choices: [{ message: { content: '{"answer":"完整上下文已收到。"}' } }],
      }),
    async (base) => {
      assert.equal((await post(base, body)).status, 200);
    },
  );
});
test("错误的解读上下文在调用AI之前被拒绝", async () => {
  let called = false;
  await withApi(
    async () => {
      called = true;
      return Response.json({});
    },
    async (base) => {
      assert.equal(
        (
          await post(base, {
            ...input,
            interpretation: { ...input.interpretation, cards: [] },
          })
        ).status,
        400,
      );
      assert.equal(called, false);
    },
  );
});
test("失败和无效答案不会伪装成功，重试可以正常返回", async () => {
  let calls = 0;
  await withApi(
    async () => {
      calls++;
      if (calls === 1)
        return new Response("private provider details", { status: 500 });
      if (calls === 2)
        return Response.json({
          choices: [{ message: { content: '{"answer":"  "}' } }],
        });
      return Response.json({
        choices: [{ message: { content: '{"answer":"重试后的完整回答。"}' } }],
      });
    },
    async (base) => {
      let response = await post(base);
      assert.equal(response.status, 502);
      assert.ok(!(await response.text()).includes("private provider"));
      response = await post(base);
      assert.equal(response.status, 502);
      response = await post(base);
      assert.equal(response.status, 200);
      assert.equal((await response.json()).answer, "重试后的完整回答。");
    },
  );
});

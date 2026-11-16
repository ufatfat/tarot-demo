import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createServer } from "node:http";
import { createApi } from "../server/api.ts";
const input = {
  question: "今天我可以关注什么？",
  focus: "综合指引",
  spread: "daily",
  cards: [{ id: "major-17", reversed: false }],
};
const result = {
  title: "看见一点点希望",
  answer: "结构化测试数据。",
  cards: [{ id: "major-17", interpretation: "星星牌的测试解读。" }],
  synthesis: "单牌综合测试解读。",
  advice: ["写下一件想完成的小事。", "留出十分钟休息。"],
  reflection: "什么让你重新有了希望？",
};
const config = {
  baseUrl: "https://mock.example/v1",
  model: "mock-model",
  apiKey: "test-only-secret",
};
async function harness(
  options: Partial<Parameters<typeof createApi>[0]>,
  run: (base: string) => Promise<void>,
) {
  const app = express();
  app.use(express.json());
  app.use(
    "/api",
    createApi({
      initialConfig: config,
      editable: true,
      persist: async () => {},
      ...options,
    }),
  );
  const server = createServer(app);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((r, j) => server.close((e) => (e ? j(e) : r())));
  }
}
const post = (base: string, body: unknown = input) =>
  fetch(base + "/api/readings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
test("调用兼容接口，传入自有提示词，返回真实 provider 数据", async () => {
  await harness(
    {
      fetchImpl: async (url, init) => {
        assert.equal(url, "https://mock.example/v1/chat/completions");
        assert.equal(
          (init?.headers as Record<string, string>).Authorization,
          "Bearer test-only-secret",
        );
        const payload = JSON.parse(init?.body as string);
        assert.equal(payload.response_format.type, "json_object");
        assert.equal(payload.model, "mock-model");
        assert.equal(
          JSON.parse(payload.messages[1].content).cards[0].name,
          "星星",
        );
        assert.equal(
          JSON.parse(payload.messages[1].content).question,
          input.question,
        );
        assert.ok(payload.messages[0].content.includes("月见"));
        return Response.json({
          choices: [
            {
              message: { content: JSON.stringify(result) },
              finish_reason: "stop",
            },
          ],
        });
      },
    },
    async (base) => {
      const response = await post(base);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { result, model: "mock-model" });
    },
  );
});
test("不把没有回答问题的旧格式解读当作成功响应", async () => {
  const { answer: _answer, ...withoutAnswer } = result;
  await harness(
    {
      fetchImpl: async () =>
        Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  ...withoutAnswer,
                  overview: "只有整体观察",
                }),
              },
              finish_reason: "stop",
            },
          ],
        }),
    },
    async (base) => {
      const response = await post(base);
      assert.equal(response.status, 502);
      assert.equal((await response.json()).result, undefined);
    },
  );
});
test("未配置密钥时明确报错，不生成伪造结果", async () => {
  await harness(
    {
      initialConfig: { ...config, apiKey: "" },
      fetchImpl: async () => {
        throw new Error("不应调用");
      },
    },
    async (base) => {
      const response = await post(base);
      assert.equal(response.status, 503);
      assert.equal((await response.json()).code, "AI_NOT_CONFIGURED");
    },
  );
});
test("非法抽牌在请求模型之前被拒绝", async () => {
  await harness(
    {
      fetchImpl: async () => {
        throw new Error("不应调用");
      },
    },
    async (base) => {
      assert.equal((await post(base, { ...input, cards: [] })).status, 400);
    },
  );
});
test("配置读取永不返回密钥，换服务时不能沿用旧密钥", async () => {
  await harness({}, async (base) => {
    const response = await fetch(base + "/api/config");
    const raw = await response.text();
    assert.ok(!raw.includes("test-only-secret"));
    assert.equal(JSON.parse(raw).configured, true);
    const save = await fetch(base + "/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl: "https://another.example/v1",
        model: "model",
      }),
    });
    assert.equal(save.status, 400);
  });
});
test("持久化失败不能覆盖现有配置", async () => {
  await harness(
    {
      persist: async () => {
        throw new Error("disk error");
      },
    },
    async (base) => {
      const response = await fetch(base + "/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: config.baseUrl,
          model: "new-model",
          apiKey: "new-key",
        }),
      });
      assert.equal(response.status, 500);
      assert.equal(
        (await (await fetch(base + "/api/config")).json()).model,
        "mock-model",
      );
    },
  );
});
test("生产模式拒绝修改配置", async () => {
  await harness({ editable: false }, async (base) => {
    const response = await fetch(base + "/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    assert.equal(response.status, 403);
  });
});
test("上游报错信息被清洗，不泄露服务响应内容", async () => {
  await harness(
    {
      fetchImpl: async () =>
        new Response("secret internal data", { status: 401 }),
    },
    async (base) => {
      const response = await post(base);
      assert.equal(response.status, 502);
      const raw = await response.text();
      assert.ok(!raw.includes("secret"));
      assert.ok(raw.includes("API Key"));
    },
  );
});
test("拒绝模型截断、无效 JSON 与换牌的响应", async () => {
  for (const response of [
    {
      choices: [
        {
          message: { content: JSON.stringify(result) },
          finish_reason: "length",
        },
      ],
    },
    { choices: [{ message: { content: "not json" } }] },
    {
      choices: [
        {
          message: {
            content: JSON.stringify({
              ...result,
              cards: [{ id: "major-18", interpretation: "wrong" }],
            }),
          },
        },
      ],
    },
  ])
    await harness(
      { fetchImpl: async () => Response.json(response) },
      async (base) => {
        assert.equal((await post(base)).status, 502);
      },
    );
});

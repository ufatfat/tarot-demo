import test from "node:test";
import assert from "node:assert/strict";
import { loadHistory, loadSession, persist } from "../src/storage.ts";
const memory = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
  },
});
const input = {
  question: "今天值得关注什么？",
  focus: "综合指引",
  spread: "daily",
  cards: [{ id: "major-17", reversed: false }],
};
const record = {
  id: "test-record",
  createdAt: "2026-11-16T00:00:00.000Z",
  input,
  result: {
    title: "测试标题",
    overview: "测试内容",
    cards: [{ id: "major-17", interpretation: "测试解读" }],
    synthesis: "测试综合",
    advice: ["行动一", "行动二"],
    reflection: "一个问题？",
  },
  model: "fixture",
};
test("损坏的历史 JSON 和不匹配的牌面被跳过", () => {
  memory.clear();
  memory.set("moonlit-history", "not-json");
  assert.deepEqual(loadHistory(), []);
  persist("moonlit-history", [
    record,
    {
      ...record,
      result: {
        ...record.result,
        cards: [{ id: "bad-id", interpretation: "bad" }],
      },
    },
  ]);
  assert.equal(loadHistory().length, 1);
});
test("刷新后恢复原解读，不需要再次请求 AI", () => {
  memory.clear();
  persist("moonlit-history", [record]);
  persist("moonlit-session", { input, revealed: [0], recordId: record.id });
  const restored = loadSession();
  assert.equal(restored?.record?.id, record.id);
  assert.deepEqual(restored?.revealed, [0]);
});
test("保留旧记录原文，新记录恢复针对问题的答案", () => {
  memory.clear();
  const { overview: _overview, ...fields } = record.result;
  const newRecord = {
    ...record,
    id: "new-answer-record",
    result: {
      ...fields,
      answer: "今天先关注一件可以完成的小事，再慢慢找回节奏。",
    },
  };
  persist("moonlit-history", [newRecord, record]);
  const restored = loadHistory();
  assert.equal(restored.length, 2);
  assert.equal(restored[0].result.answer, newRecord.result.answer);
  assert.equal(restored[1].result.overview, record.result.overview);
  assert.equal(restored[1].result.answer, undefined);
  persist("moonlit-session", { input, revealed: [0], recordId: newRecord.id });
  assert.equal(loadSession()?.record?.result.answer, newRecord.result.answer);
});
test("尚未翻开的牌刷新后仍然保持隐藏", () => {
  memory.clear();
  persist("moonlit-session", { input, revealed: [] });
  assert.deepEqual(loadSession()?.revealed, []);
  assert.equal(loadSession()?.record, undefined);
});
test("只恢复当前问题对应的解读，忽略失效记录和非法方向领域", () => {
  memory.clear();
  persist("moonlit-history", [record]);
  persist("moonlit-session", {
    input: { ...input, question: "不同的问题" },
    revealed: [0],
    recordId: record.id,
  });
  assert.equal(loadSession()?.record, undefined);
  persist("moonlit-session", {
    input: { ...input, focus: "unknown" },
    revealed: [0],
  });
  assert.equal(loadSession(), null);
});

test("追问与原解读一起保存，刷新和历史回看保留完整对话", () => {
  memory.clear();
  const conversation = [
    {
      id: "turn-1",
      question: "第一步可以怎么做？",
      answer: "先做十分钟的小练习。",
      createdAt: "2026-11-16T01:00:00.000Z",
      model: "fixture",
    },
    {
      id: "turn-2",
      question: "如果十分钟也没有呢？",
      answer: "可以先缩短到两分钟。",
      createdAt: "2026-11-16T01:01:00.000Z",
      model: "fixture",
    },
  ];
  persist("moonlit-history", [{ ...record, conversation }]);
  persist("moonlit-session", { input, revealed: [0], recordId: record.id });
  assert.deepEqual(loadHistory()[0].conversation, conversation);
  assert.deepEqual(loadSession()?.record?.conversation, conversation);
});

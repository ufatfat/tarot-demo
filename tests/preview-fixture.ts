/** Explicit local UI QA fixture. Never imported by the application or production server. */
import express from "express";
import { createServer } from "node:http";
import { createServer as createViteServer } from "vite";
import { createApi } from "../server/api.ts";
const app = express();
const server = createServer(app);
app.get("/__qa/mobile", (_req, res) =>
  res.send(
    '<!doctype html><html><head><meta charset="utf-8"><title>月见 · 手机布局测试</title></head><body style="margin:0;padding:20px;background:#080b12;color:#d4b982;font:12px system-ui"><p style="margin:0 0 15px">手机布局测试 · 390px</p><iframe title="手机预览" src="/" style="width:390px;height:844px;border:1px solid #393748"></iframe></body></html>',
  ),
);
app.use(
  "/api",
  express.json({ limit: "512kb" }),
  createApi({
    initialConfig: {
      baseUrl: "https://qa.invalid/v1",
      model: "UI-TEST-FIXTURE",
      apiKey: "test-only",
    },
    editable: false,
    persist: async () => {},
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(init?.body as string);
      const prompt = JSON.parse(body.messages[1].content);
      if (prompt.originalReading) {
        const latest = JSON.parse(
          body.messages.at(-1).content,
        ).followUpQuestion;
        return Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  answer: `测试回答：针对「${latest}」，可以从这次的问题与牌面继续思考。这里用于验证追问显示和保存，不是真实 AI 内容。`,
                }),
              },
              finish_reason: "stop",
            },
          ],
        });
      }
      const result = {
        title: "测试解读：让行动温柔地开始",
        answer:
          "这是一份用于检查界面的固定测试数据，并非真实 AI 解读。眼前的选择可以从一个小行动开始，给自己留出观察和调整的空间。",
        cards: prompt.cards.map(
          (c: {
            id: string;
            name: string;
            position: string;
            orientation: string;
          }) => ({
            id: c.id,
            interpretation: `测试内容：${c.name}出现在「${c.position}」，方向为${c.orientation}。这个位置帮助你回看已经拥有的经验。你可以试着记下一件最关心的事，分清实际发生的情况与自己的担忧，再选择一个足够小的行动。`,
          }),
        ),
        synthesis:
          "测试内容：把这些牌放在一起，可以练习从多个角度观察同一个问题。它们不是事实的预测，而是整理想法的提示。当前可以先确认自己的需要，再辨认现实中能够调整的一小步。",
        advice: [
          "花十分钟，把你可以改变和暂时无法改变的事分开写下。",
          "选择一件今天可以完成的小事，完成后给自己一个短暂的休息。",
        ],
        reflection: "如果暂时不需要证明任何事情，你会想先照顾自己哪一个需要？",
      };
      return Response.json({
        choices: [
          {
            message: { content: JSON.stringify(result) },
            finish_reason: "stop",
          },
        ],
      });
    },
  }),
);
const vite = await createViteServer({
  server: { middlewareMode: true, ws: { server } },
  appType: "spa",
});
app.use(vite.middlewares);
server.listen(4179, "127.0.0.1", () =>
  console.log("UI QA fixture: http://127.0.0.1:4179 — simulated model only"),
);

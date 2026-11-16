import {
  Router,
  type Request,
  type Response as ExpressResponse,
} from "express";
import { configSchema, publicConfig, type AIConfig } from "./config.ts";
import {
  inputSchema,
  parseReading,
  followUpInputSchema,
  followUpAnswerSchema,
} from "../shared/validation.ts";
import {
  buildFollowUpMessages,
  type ModelMessage,
} from "./follow-up-prompt.ts";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt.ts";
export function createApi(options: {
  initialConfig: AIConfig;
  editable: boolean;
  persist: (config: AIConfig) => Promise<void>;
  fetchImpl?: typeof fetch;
}) {
  const router = Router();
  let config = { ...options.initialConfig };
  let active = 0;
  let calls: number[] = [];
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  router.get("/config", (_req, res) => {
    res.json(publicConfig(config, options.editable));
  });
  router.put("/config", async (req, res) => {
    if (!options.editable) {
      res.status(403).json({ error: "此服务通过环境变量管理 AI 配置" });
      return;
    }
    const parsed = configSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const baseUrl = parsed.data.baseUrl
      .replace(/\/+$/, "")
      .replace(/\/chat\/completions$/, "");
    const changedHost =
      config.baseUrl &&
      new URL(config.baseUrl).origin !== new URL(baseUrl).origin;
    if (changedHost && !parsed.data.apiKey) {
      res
        .status(400)
        .json({ error: "更换服务地址时，请重新填写该服务的 API Key" });
      return;
    }
    const next = {
      baseUrl,
      model: parsed.data.model,
      apiKey: parsed.data.apiKey || config.apiKey,
    };
    if (!next.apiKey) {
      res.status(400).json({ error: "请填写 API Key" });
      return;
    }
    try {
      await options.persist(next);
      config = next;
      res.json(publicConfig(config, options.editable));
    } catch {
      res.status(500).json({ error: "配置未保存，请检查本地目录权限" });
    }
  });
  async function respondWithModel(
    req: Request,
    res: ExpressResponse,
    messages: ModelMessage[],
    parse: (content: string) => Record<string, unknown>,
    maxTokens = 3000,
  ) {
    if (!config.apiKey || !config.baseUrl || !config.model) {
      res.status(503).json({
        code: "AI_NOT_CONFIGURED",
        error: "牌已经为你留下。连接 AI 后，就可以解读这次抽牌。",
      });
      return;
    }
    calls = calls.filter((time) => Date.now() - time < 600000);
    if (active >= 2 || calls.length >= 20) {
      res.status(429).json({ error: "解读请求有些密集，请稍后再试" });
      return;
    }
    calls.push(Date.now());
    active++;
    const abort = new AbortController();
    const closed = () => {
      if (!res.writableEnded) abort.abort();
    };
    res.on("close", closed);
    const current = { ...config };
    try {
      const response = await (options.fetchImpl ?? fetch)(
        current.baseUrl.replace(/\/+$/, "") + "/chat/completions",
        {
          method: "POST",
          redirect: "error",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${current.apiKey}`,
          },
          signal: AbortSignal.any([abort.signal, AbortSignal.timeout(90000)]),
          body: JSON.stringify({
            model: current.model,
            messages,
            response_format: { type: "json_object" },
            max_tokens: maxTokens,
            stream: false,
          }),
        },
      );
      if (!response.ok) {
        await response.body?.cancel();
        const messages: Record<number, string> = {
          401: "API Key 未通过验证，请检查 AI 设置",
          403: "当前密钥没有调用该模型的权限",
          404: "没有找到接口或模型，请检查服务地址与模型名",
          429: "AI 服务暂时繁忙或额度不足，请稍后重试",
        };
        res.status(502).json({
          error: messages[response.status] ?? "AI 服务暂时没有回应，请稍后重试",
        });
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("empty");
      const chunks: Uint8Array[] = [];
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 262144) {
          await reader.cancel();
          throw new Error("large");
        }
        chunks.push(value);
      }
      const raw = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const choice = raw.choices?.[0];
      if (choice?.finish_reason === "length") {
        res.status(502).json({ error: "这次解读没有完整生成，请再试一次" });
        return;
      }
      const output = parse(choice?.message?.content);
      res.json({ ...output, model: current.model });
    } catch (error) {
      if (abort.signal.aborted) return;
      const timeout =
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError");
      res.status(502).json({
        error: timeout
          ? "解读等待时间有些久，请稍后再试"
          : "AI 暂未返回完整、有效的解读，请重试或检查模型是否支持 JSON 输出",
      });
    } finally {
      active--;
      res.off("close", closed);
    }
  }
  router.post("/readings", async (req, res) => {
    const parsed = inputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "抽牌信息不完整，请重新检查问题和牌阵" });
      return;
    }
    await respondWithModel(
      req,
      res,
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(parsed.data) },
      ],
      (content) => ({
        result: parseReading(
          content,
          parsed.data.cards.map((card) => card.id),
        ),
      }),
    );
  });
  router.post("/readings/follow-up", async (req, res) => {
    const parsed = followUpInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "追问内容或原始解读不完整，请检查后重试" });
      return;
    }
    await respondWithModel(
      req,
      res,
      buildFollowUpMessages(parsed.data),
      (content) => followUpAnswerSchema.parse(JSON.parse(content)),
      1400,
    );
  });
  router.use((_req, res) => {
    res.status(404).json({ error: "接口不存在" });
  });
  return router;
}

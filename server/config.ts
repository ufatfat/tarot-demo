import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
export const configSchema = z
  .object({
    baseUrl: z
      .string()
      .trim()
      .max(500)
      .url()
      .refine((value) => {
        try {
          const url = new URL(value);
          return (
            url.protocol === "https:" &&
            !url.username &&
            !url.password &&
            !url.search &&
            !url.hash &&
            !/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|\[)/.test(
              url.hostname,
            ) &&
            !url.hostname.endsWith(".local") &&
            !url.hostname.endsWith(".localhost")
          );
        } catch {
          return false;
        }
      }, "请填写 HTTPS 服务地址"),
    model: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[\w./:@+-]+$/, "模型名包含不支持的字符"),
    apiKey: z.string().trim().max(4096).optional(),
  })
  .strict();
export type AIConfig = { baseUrl: string; model: string; apiKey: string };
const path = resolve(".local/ai-config.json");
export async function loadConfig(): Promise<AIConfig> {
  let saved: Partial<AIConfig> = {};
  try {
    const parsed = configSchema.safeParse(
      JSON.parse(await readFile(path, "utf8")),
    );
    if (parsed.success) saved = parsed.data;
  } catch {}
  return {
    baseUrl: process.env.AI_BASE_URL || saved.baseUrl || "",
    model: process.env.AI_MODEL || saved.model || "",
    apiKey: process.env.AI_API_KEY || saved.apiKey || "",
  };
}
export async function saveConfig(config: AIConfig) {
  await mkdir(resolve(".local"), { recursive: true, mode: 0o700 });
  await writeFile(path + ".tmp", JSON.stringify(config), { mode: 0o600 });
  await rename(path + ".tmp", path);
}
export const publicConfig = (config: AIConfig, editable: boolean) => ({
  configured: Boolean(config.apiKey && config.baseUrl && config.model),
  baseUrl: config.baseUrl,
  model: config.model,
  editable,
});

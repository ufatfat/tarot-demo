import { useState } from "react";
import {
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  ArrowUpRight,
  LoaderCircle,
} from "lucide-react";
import { Modal } from "./Modal";
import { audio } from "../audio";
export interface Config {
  configured: boolean;
  baseUrl: string;
  model: string;
  editable: boolean;
}
export function Settings({
  config,
  onClose,
  onSave,
}: {
  config: Config;
  onClose: () => void;
  onSave: (config: Config) => void;
}) {
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [model, setModel] = useState(config.model);
  const [apiKey, setApiKey] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    void audio.play("send");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl, model, apiKey }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onSave(data);
      setApiKey("");
      setSaved(true);
      void audio.play("success");
    } catch (error) {
      void audio.play("error");
      setError(error instanceof Error ? error.message : "暂时无法保存设置");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="AI 设置" onClose={onClose}>
      <div className="settings-intro">
        <span className="round-icon">
          <Spark />
        </span>
        <h2>让牌面的故事，有了回应。</h2>
        <p>连接你喜欢的 AI，获得属于这次抽牌的解读。</p>
      </div>
      <form onSubmit={save} className="settings-form">
        <label>
          服务地址
          <input
            type="url"
            required
            placeholder="https://your-provider.com/v1"
            value={baseUrl}
            onChange={(e) => {
              setBaseUrl(e.target.value);
              setSaved(false);
            }}
            disabled={!config.editable}
            autoComplete="off"
          />
        </label>
        <label>
          模型名称
          <input
            required
            placeholder="填写服务商提供的模型 ID"
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              setSaved(false);
            }}
            disabled={!config.editable}
            autoComplete="off"
          />
        </label>
        <label>
          API Key
          <div className="password-input">
            <input
              type={show ? "text" : "password"}
              required={!config.configured}
              placeholder={
                config.configured
                  ? "已保存，留空则保留原密钥"
                  : "填写你的 API Key"
              }
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setSaved(false);
              }}
              disabled={!config.editable}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              aria-label={show ? "隐藏密钥" : "显示密钥"}
            >
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </label>
        <p className="setting-note">
          <LockKeyhole size={14} />
          密钥仅保存在本机服务端，支持 OpenAI 兼容接口。
        </p>
        {!config.editable && (
          <p className="inline-note">当前服务通过环境变量管理配置。</p>
        )}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        {saved ? (
          <div className="saved-notice" role="status">
            <Check size={17} />
            配置已保存，解牌时会调用你选择的模型。
            <button type="button" data-sound="close" onClick={onClose}>
              继续抽牌 <ArrowUpRight size={15} />
            </button>
          </div>
        ) : (
          <button
            className="primary-button full"
            type="submit"
            data-sound="none"
            disabled={busy || !config.editable}
          >
            {busy ? <LoaderCircle className="spin" size={16} /> : null}
            {busy ? "正在保存" : "保存设置"}
            <ArrowUpRight size={17} />
          </button>
        )}
      </form>
    </Modal>
  );
}
function Spark() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
    >
      <path d="M14 2c0 8-4 12-12 12 8 0 12 4 12 12 0-8 4-12 12-12-8 0-12-4-12-12Z" />
    </svg>
  );
}

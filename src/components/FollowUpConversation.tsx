import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, MessageCircle, Moon, Send, Square } from "lucide-react";
import {
  MAX_FOLLOW_UP_TURNS,
  type SavedReading,
  type FollowUpInput,
} from "../../shared/tarot";
import { followUpResponseSchema } from "../../shared/validation";
import { audio } from "../audio";

export function FollowUpConversation({
  record,
  onUpdate,
  onConfigureAI,
}: {
  record: SavedReading;
  onUpdate: (record: SavedReading) => void;
  onConfigureAI: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [error, setError] = useState("");
  const [needsConfig, setNeedsConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const turns = record.conversation ?? [];
  const atLimit = turns.length >= MAX_FOLLOW_UP_TURNS;
  useEffect(
    () => () => {
      requestRef.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (turns.length || pendingQuestion)
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns.length, pendingQuestion]);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const question = draft.trim();
    if (!question || loading || atLimit || requestRef.current) return;
    void audio.play("send");
    const controller = new AbortController();
    requestRef.current = controller;
    setPendingQuestion(question);
    setLoading(true);
    setError("");
    setNeedsConfig(false);
    const payload: FollowUpInput = {
      input: record.input,
      interpretation: record.result,
      conversation: turns.map(({ question, answer }) => ({ question, answer })),
      question,
    };
    try {
      const response = await fetch("/api/readings/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) {
        setNeedsConfig(data.code === "AI_NOT_CONFIGURED");
        throw new Error(data.error || "这次回答没有完成，请再试一次");
      }
      const parsed = followUpResponseSchema.safeParse(data);
      if (!parsed.success) throw new Error("AI 没有返回完整的回答，请再试一次");
      if (controller.signal.aborted) return;
      onUpdate({
        ...record,
        conversation: [
          ...turns,
          {
            id: crypto.randomUUID(),
            question,
            answer: parsed.data.answer,
            createdAt: new Date().toISOString(),
            model: parsed.data.model,
          },
        ],
      });
      setDraft("");
      void audio.play("answer");
    } catch (reason) {
      if (!controller.signal.aborted) {
        void audio.play("error");
        setError(
          reason instanceof Error ? reason.message : "暂时无法连接，请稍后重试",
        );
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
        setPendingQuestion("");
      }
    }
  }
  function cancel() {
    void audio.play("cancel");
    requestRef.current?.abort();
  }
  return (
    <section className="follow-up-section" aria-label="继续追问">
      <div className="follow-up-heading">
        <span className="follow-up-icon">
          <MessageCircle size={20} strokeWidth={1.3} />
        </span>
        <h3>{turns.length ? "继续这场对话" : "还有想问的吗？"}</h3>
      </div>
      <div
        className="conversation-messages"
        role="log"
        aria-label="本次解读的追问记录"
        aria-live="polite"
        aria-relevant="additions"
      >
        {turns.map((turn) => (
          <div className="conversation-turn" key={turn.id}>
            <div className="follow-up-user" aria-label="你的追问">
              <p>{turn.question}</p>
            </div>
            <div className="follow-up-assistant" aria-label="月见的回答">
              <span className="assistant-avatar">
                <Moon size={16} strokeWidth={1.3} />
              </span>
              <p>{turn.answer}</p>
            </div>
          </div>
        ))}
        {pendingQuestion && (
          <div className="conversation-turn pending-turn">
            <div className="follow-up-user" aria-label="正在发送的追问">
              <p>{pendingQuestion}</p>
            </div>
            <div className="follow-up-assistant pending-answer" role="status">
              <span className="assistant-avatar">
                <Moon size={16} strokeWidth={1.3} />
              </span>
              <span className="thinking-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span>正在接着你的问题想一想…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      {!turns.length && !loading && (
        <div className="follow-up-suggestions">
          {["我可以先做哪一步？", "哪张牌最值得我留意？"].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setDraft(suggestion);
                textareaRef.current?.focus();
              }}
            >
              {suggestion}
              <ArrowUpRight size={12} />
            </button>
          ))}
        </div>
      )}
      {atLimit ? (
        <p className="follow-up-limit">
          这次对话已达到追问上限，所有回答都已保留。你可以开启新的占卜，探索下一个问题。
        </p>
      ) : (
        <form className="follow-up-form" onSubmit={send}>
          <div className="follow-up-input">
            <textarea
              ref={textareaRef}
              aria-label="输入追问"
              placeholder="关于这次解读，你还想了解什么？"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={500}
              rows={3}
              disabled={loading}
            />
            <div className="follow-up-input-footer">
              <span>{draft.length} / 500</span>
              {loading ? (
                <button
                  type="button"
                  className="text-button cancel-follow-up"
                  onClick={cancel}
                  data-sound="none"
                >
                  <Square size={11} />
                  停止回答
                </button>
              ) : (
                <button
                  type="submit"
                  data-sound="none"
                  className="primary-button follow-up-send"
                  disabled={!draft.trim()}
                >
                  <Send size={14} />
                  {error ? "重新发送" : "继续问"}
                  <ArrowUpRight size={14} />
                </button>
              )}
            </div>
          </div>
          {error && (
            <div className="follow-up-error" role="alert">
              <p>{error}</p>
              {needsConfig && (
                <button
                  className="text-button"
                  type="button"
                  onClick={onConfigureAI}
                  data-sound="open"
                >
                  打开 AI 设置 <ArrowUpRight size={13} />
                </button>
              )}
            </div>
          )}
        </form>
      )}
    </section>
  );
}

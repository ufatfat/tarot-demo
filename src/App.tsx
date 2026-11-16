import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Compass,
  Heart,
  History,
  Layers3,
  LoaderCircle,
  Moon,
  RotateCcw,
  Search,
  Settings2,
  Shuffle,
  Sparkles,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import {
  DECK,
  SPREADS,
  shuffledDeck,
  type DrawnCard,
  type ReadingInput,
  type SavedReading,
  type SpreadId,
  type TarotCard,
} from "../shared/tarot";
import { CardArt } from "./components/CardArt";
import { Modal } from "./components/Modal";
import { FollowUpConversation } from "./components/FollowUpConversation";
import { Settings, type Config } from "./components/Settings";
import { loadHistory, loadSession, persist } from "./storage";
import { resultSchema } from "../shared/validation";
import { AudioControls } from "./components/AudioControls";
import { audio, installAudioInteractions } from "./audio";
type Page = "ritual" | "library" | "journal";
type Phase = "intention" | "draw" | "reveal" | "result";
const cardById = (id: string) => DECK.find((card) => card.id === id)!;
const focuses = [
  { name: "综合指引", icon: Sparkles },
  { name: "感情关系", icon: Heart },
  { name: "事业成长", icon: Sun },
  { name: "自我探索", icon: Compass },
] as const;
const suggestions: Record<string, string[]> = {
  综合指引: ["最近的我，需要听见什么？", "如何走出当下的迷茫？"],
  感情关系: ["我该如何更好地理解这段关系？", "我可以怎样表达自己的需要？"],
  事业成长: ["下一步，我该把精力放在哪里？", "如何面对工作中的新变化？"],
  自我探索: ["什么正在阻碍我向前走？", "我忽略了自己怎样的需要？"],
};
function Brand() {
  return (
    <>
      <span className="brand-icon">
        <svg viewBox="0 0 38 38" fill="none">
          <circle
            cx="19"
            cy="19"
            r="15"
            stroke="currentColor"
            strokeWidth=".7"
          />
          <path
            d="M22 7a12 12 0 1 0 8 20A13 13 0 0 1 22 7Z"
            fill="currentColor"
            fillOpacity=".8"
          />
          <path
            d="m29 8 1.5 4.5L35 14l-4.5 1.5L29 20l-1.5-4.5L23 14l4.5-1.5Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span className="brand-name">
        月见<span>MOONLIT</span>
      </span>
    </>
  );
}
function SpreadGlyph({ id }: { id: SpreadId }) {
  return (
    <span className={`spread-glyph ${id}`}>
      {(id === "daily" ? [0] : [0, 1, 2]).map((i) => (
        <i key={i}>
          <span>✦</span>
        </i>
      ))}
    </span>
  );
}
function Ornament() {
  return (
    <span className="ornament">
      <i />✦<i />
    </span>
  );
}
function App() {
  useEffect(installAudioInteractions, []);
  const [restored] = useState(loadSession);
  const [page, setPage] = useState<Page>("ritual");
  const [phase, setPhase] = useState<Phase>(
    restored?.record ? "result" : restored ? "reveal" : "intention",
  );
  const [spread, setSpread] = useState<SpreadId>(
    restored?.spread ?? "timeline",
  );
  const [focus, setFocus] = useState(restored?.focus ?? "综合指引");
  const [question, setQuestion] = useState(restored?.question ?? "");
  const [deck, setDeck] = useState<DrawnCard[]>([]);
  const [selected, setSelected] = useState<DrawnCard[]>(restored?.cards ?? []);
  const [revealed, setRevealed] = useState<number[]>(restored?.revealed ?? []);
  const [deckPage, setDeckPage] = useState(0);
  const [shuffling, setShuffling] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const [reading, setReading] = useState<SavedReading | null>(
    restored?.record ?? null,
  );
  const [error, setError] = useState("");
  const [history, setHistory] = useState<SavedReading[]>(loadHistory);
  const [historySaved, setHistorySaved] = useState(true);
  const [config, setConfig] = useState<Config>({
    configured: false,
    baseUrl: "",
    model: "",
    editable: true,
  });
  const [configError, setConfigError] = useState(false);
  const [settings, setSettings] = useState(false);
  const [help, setHelp] = useState(false);
  const [toast, setToast] = useState("");
  const [resetConfirm, setResetConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [filter, setFilter] = useState("全部");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<TarotCard | null>(null);
  const [journalDetail, setJournalDetail] = useState<SavedReading | null>(null);
  const ritualRef = useRef<HTMLElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const count = SPREADS[spread].positions.length;
  const allRevealed = revealed.length === count;
  const activeSpread = SPREADS[spread];
  useEffect(() => {
    deckRef.current?.scrollTo({ left: 0 });
  }, [deckPage, phase]);
  useEffect(() => {
    fetch("/api/config")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setConfig)
      .catch(() => setConfigError(true));
    return () => {
      controller.current?.abort();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    if (!loading) return;
    setLoadingSeconds(0);
    const id = setInterval(() => setLoadingSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [loading]);
  useEffect(() => {
    if (selected.length === count && (phase === "reveal" || phase === "result"))
      persist("moonlit-session", {
        input: {
          question: question.trim() || activeSpread.question,
          focus,
          spread,
          cards: selected,
        },
        revealed,
        recordId: reading?.id,
      });
  }, [
    selected,
    phase,
    count,
    question,
    focus,
    spread,
    activeSpread.question,
    revealed,
    reading?.id,
  ]);
  function scrollRitual() {
    if (page !== "ritual") setPage("ritual");
    requestAnimationFrame(() =>
      ritualRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }
  function navigate(next: Page) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function start() {
    setDeck(shuffledDeck());
    setSelected([]);
    setRevealed([]);
    setDeckPage(0);
    setError("");
    setPhase("draw");
    setShuffling(true);
    timer.current = setTimeout(() => setShuffling(false), 700);
    requestAnimationFrame(() =>
      ritualRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }
  function shuffle() {
    if (shuffling) return;
    setShuffling(true);
    setSelected([]);
    setDeckPage(0);
    timer.current = setTimeout(() => {
      setDeck(shuffledDeck());
      setShuffling(false);
    }, 650);
  }
  function selectCard(drawn: DrawnCard) {
    if (shuffling) return;
    if (selected.some((c) => c.id === drawn.id)) {
      setSelected(selected.filter((c) => c.id !== drawn.id));
      return;
    }
    if (selected.length < count) setSelected([...selected, drawn]);
  }
  function reset() {
    controller.current?.abort();
    setLoading(false);
    setPhase("intention");
    setSelected([]);
    setRevealed([]);
    setReading(null);
    setError("");
    setResetConfirm(false);
    try {
      localStorage.removeItem("moonlit-session");
    } catch {}
    scrollRitual();
  }
  async function requestReading() {
    if (loading) return;
    if (!config.configured) {
      void audio.play("error");
      setSettings(true);
      setError("你的牌已留下。完成 AI 设置后，可以继续这次解读。");
      return;
    }
    setLoading(true);
    setError("");
    void audio.play("send");
    const input: ReadingInput = {
      question: question.trim() || activeSpread.question,
      focus,
      spread,
      cards: selected,
    };
    const requestController = new AbortController();
    controller.current = requestController;
    try {
      const response = await fetch("/api/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: requestController.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "解读暂时没有完成，请再试一次");
      const result = resultSchema.parse(data.result);
      const record: SavedReading = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        input,
        result,
        model: data.model,
      };
      const next = [record, ...history].slice(0, 50);
      setHistory(next);
      const saved = persist("moonlit-history", next);
      setHistorySaved(saved);
      if (!saved) setToast("浏览器存储空间不足，本次解读未能保存");
      setReading(record);
      setPhase("result");
      void audio.play("ready");
      setTimeout(
        () =>
          document
            .getElementById("reading-result")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        80,
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      void audio.play("error");
      setError(
        error instanceof Error ? error.message : "解读暂时没有完成，请再试一次",
      );
    } finally {
      if (controller.current === requestController) setLoading(false);
    }
  }
  function updateConversation(updated: SavedReading) {
    const next = history.some((entry) => entry.id === updated.id)
      ? history.map((entry) => (entry.id === updated.id ? updated : entry))
      : [updated, ...history].slice(0, 50);
    const saved = persist("moonlit-history", next);
    setHistory(next);
    setHistorySaved(saved);
    setReading((current) => (current?.id === updated.id ? updated : current));
    setJournalDetail((current) =>
      current?.id === updated.id ? updated : current,
    );
    if (!saved) setToast("本次回答已显示，但浏览器空间不足，暂未保存");
  }
  function removeRecord(id: string) {
    const next = history.filter((r) => r.id !== id);
    if (!persist("moonlit-history", next)) {
      void audio.play("error");
      setToast("浏览器暂时无法更新记录，请稍后再试");
      return;
    }
    setHistory(next);
    setDeleteTarget(null);
    setJournalDetail(null);
    setToast("这段记录已删除");
    void audio.play("erase");
  }
  const filteredCards = DECK.filter(
    (card) =>
      (filter === "全部" ||
        (filter === "大阿尔卡那" && card.arcana === "major") ||
        card.suit === filter) &&
      (!query ||
        `${card.name} ${card.english} ${card.keywords.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  return (
    <div className="app-shell">
      <div className="ambient-sky" aria-hidden="true" />
      <header className="header">
        <button
          className="brand"
          onClick={() => navigate("ritual")}
          aria-label="月见首页"
        >
          <Brand />
        </button>
        <nav aria-label="主导航">
          {(
            [
              { id: "ritual", label: "占卜仪式", icon: Sparkles },
              { id: "library", label: "塔罗图鉴", icon: BookOpen },
              { id: "journal", label: "我的记录", icon: History },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              className={page === item.id ? "active" : ""}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={15} />
              {item.label}
              {item.id === "journal" && history.length > 0 && (
                <span className="nav-count">{history.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <AudioControls />
          <button className="settings-button" data-sound="open" onClick={() => setSettings(true)}>
            <span
              className={`status-dot ${config.configured ? "connected" : ""}`}
            />
            <span>AI 设置</span>
            <Settings2 size={14} />
          </button>
        </div>
      </header>
      {page === "ritual" && (
        <main>
          <section className="hero">
            <div className="hero-copy">
              <p className="eyebrow">
                <span /> A LITTLE MAGIC, A LITTLE CLARITY
              </p>
              <h1>
                让直觉，
                <br />
                照见<span>答案。</span>
                <svg className="heading-star" viewBox="0 0 32 32" fill="none">
                  <path
                    d="M16 1c0 10-5 15-15 15 10 0 15 5 15 15 0-10 5-15 15-15-10 0-15-5-15-15Z"
                    stroke="currentColor"
                  />
                </svg>
              </h1>
              <p className="hero-description">
                有些答案，早已藏在心里。
                <br />
                在牌面的光影之间，与真实的自己相遇。
              </p>
              <button
                className="primary-button hero-button"
                onClick={scrollRitual}
              >
                开启我的占卜 <ArrowUpRight size={18} />
              </button>
              <div className="hero-footnote">
                <span className="tiny-stars">✧ ✦ ✧</span>{" "}
                给自己片刻，听见内心的声音
              </div>
            </div>
            <div className="hero-art" aria-label="星星、月亮与太阳塔罗牌">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="orbit orbit-three" />
              <span className="orbit-star star-one">✦</span>
              <span className="orbit-star star-two">✧</span>
              <span className="orbit-star star-three">✦</span>
              <span className="orbit-star star-four">✧</span>
              <span className="orbit-label label-left">AS ABOVE</span>
              <span className="orbit-label label-right">SO BELOW</span>
              <div className="hero-card hero-card-left">
                <CardArt card={DECK[17]} />
              </div>
              <div className="hero-card hero-card-right">
                <CardArt card={DECK[19]} />
              </div>
              <div className="hero-card hero-card-center">
                <CardArt card={DECK[18]} />
              </div>
              <div className="hero-art-caption">
                <i /> THE ANSWER IS WITHIN <i />
              </div>
            </div>
          </section>
          <section className="ritual-section" ref={ritualRef} id="ritual">
            <div className="section-kicker">
              <span>YOUR QUIET MOMENT</span>
              <Ornament />
            </div>
            <div className="ritual-heading">
              <div>
                <h2>
                  {phase === "intention"
                    ? "此刻，你想问些什么？"
                    : phase === "draw"
                      ? "跟随直觉，选择你的牌。"
                      : phase === "reveal"
                        ? "答案，正在慢慢展开。"
                        : "把这份启示，带回生活。"}
                </h2>
                <p>
                  {phase === "intention"
                    ? "不必急着寻找答案。深呼吸，让心里的问题慢慢浮现。"
                    : phase === "draw"
                      ? `静下心来，选出与你呼应的 ${count} 张牌。`
                      : phase === "reveal"
                        ? "轻触牌面，看看此刻有什么想对你说。"
                        : "牌是一面镜子，走向哪里，依然由你决定。"}
                </p>
              </div>
              <div className="steps" aria-label="占卜进度">
                {["问心", "抽牌", "解读"].map((label, i) => {
                  const current =
                    phase === "intention" ? 0 : phase === "draw" ? 1 : 2;
                  return (
                    <span
                      className={
                        i === current
                          ? "current"
                          : i < current
                            ? "complete"
                            : ""
                      }
                      key={label}
                    >
                      <b>{i < current ? <Check size={12} /> : i + 1}</b>
                      <em>{label}</em>
                      {i < 2 && <i />}
                    </span>
                  );
                })}
              </div>
            </div>
            {phase === "intention" ? (
              <>
                <div
                  className="spread-picker"
                  role="group"
                  aria-label="选择牌阵"
                >
                  {(
                    Object.entries(SPREADS) as [
                      SpreadId,
                      (typeof SPREADS)[SpreadId],
                    ][]
                  ).map(([id, sp]) => (
                    <button
                      className={`spread-option ${spread === id ? "selected" : ""}`}
                      key={id}
                      onClick={() => setSpread(id)}
                      aria-pressed={spread === id}
                    >
                      <SpreadGlyph id={id} />
                      <div>
                        <span className="spread-title">
                          {sp.name}
                          <small>{sp.positions.length} 张牌</small>
                        </span>
                        <p>{sp.description}</p>
                      </div>
                      <span className="radio-mark">
                        {spread === id && <Check size={10} />}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="intention-panel">
                  <div className="question-side">
                    <div className="field-heading">
                      <span>
                        <span className="field-index">01</span> 选择想探索的方向
                      </span>
                      <span className="optional-label">跟随此刻的心情</span>
                    </div>
                    <div className="focus-picker">
                      {focuses.map(({ name, icon: Icon }) => (
                        <button
                          className={focus === name ? "selected" : ""}
                          key={name}
                          onClick={() => setFocus(name)}
                          aria-pressed={focus === name}
                        >
                          <Icon size={15} />
                          {name}
                        </button>
                      ))}
                    </div>
                    <div className="field-heading question-label">
                      <label htmlFor="question">
                        <span className="field-index">02</span>{" "}
                        把问题，轻轻放在这里
                      </label>
                      <span className="optional-label">也可以留白</span>
                    </div>
                    <div className="textarea-wrap">
                      <textarea
                        id="question"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        maxLength={500}
                        placeholder={activeSpread.question}
                        rows={3}
                      />
                      <span className="character-count">
                        {question.length} / 500
                      </span>
                    </div>
                    <div className="suggestions">
                      <span>试着问</span>
                      {suggestions[focus].map((q) => (
                        <button onClick={() => setQuestion(q)} key={q}>
                          {q}
                          <ArrowUpRight size={11} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <aside className="intention-aside">
                    <span className="aside-moon">
                      <Moon size={28} strokeWidth={1} />
                      <i>✧</i>
                    </span>
                    <h3>让心静下来</h3>
                    <p>
                      想一件真正关心的事。
                      <br />
                      不需要标准的问题，
                      <br />
                      只需要此刻真实的你。
                    </p>
                    <div className="aside-divider" />
                    <span className="aside-caption">
                      TAKE A BREATH. TRUST YOURSELF.
                    </span>
                  </aside>
                </div>
                <div className="ritual-action">
                  <p>
                    <Moon size={14} /> 78 张完整塔罗 · 正逆位解读 · 属于你的片刻
                  </p>
                  <button className="primary-button" data-sound="shuffle" onClick={start}>
                    <Shuffle size={17} /> 洗牌，开始我的旅程{" "}
                    <ArrowRight size={17} />
                  </button>
                </div>
              </>
            ) : (
              <div
                className={`reading-table ${phase === "draw" ? "choosing" : ""}`}
              >
                <div className="table-topline">
                  <button
                    className="text-button"
                    onClick={() => setResetConfirm(true)}
                    data-sound="open"
                    disabled={loading}
                  >
                    <ArrowLeft size={14} />
                    {phase === "draw" ? "重新问心" : "开启新的占卜"}
                  </button>
                  <span>
                    {activeSpread.name}
                    <i /> {focus}
                  </span>
                  <button
                    className="icon-button"
                    onClick={() => setHelp(true)}
                    data-sound="open"
                    aria-label="查看抽牌说明"
                  >
                    <CircleHelp size={16} />
                  </button>
                </div>
                <p className="table-question">
                  “{question.trim() || activeSpread.question}”
                </p>
                <div
                  className={`drawn-cards ${count === 1 ? "single-card" : ""}`}
                >
                  {activeSpread.positions.map((position, i) => {
                    const drawn = selected[i];
                    const card = drawn ? cardById(drawn.id) : undefined;
                    const isRevealed =
                      phase === "result" || revealed.includes(i);
                    return (
                      <div className="drawn-slot" key={i}>
                        <span className="position-label">
                          <i>{String(i + 1).padStart(2, "0")}</i>
                          {position}
                        </span>
                        {drawn ? (
                          <button
                            className={`flip-card ${isRevealed ? "is-flipped" : ""} ${phase === "draw" ? "small" : ""}`}
                            data-sound={phase === "draw" ? "deselect" : "flip"}
                            onClick={() => {
                              if (phase === "reveal" && !isRevealed)
                                setRevealed([...revealed, i]);
                              if (phase === "draw")
                                setSelected(selected.filter((_, n) => n !== i));
                            }}
                            disabled={
                              phase === "result" || loading || isRevealed
                            }
                            aria-label={
                              phase === "draw"
                                ? `取消第 ${i + 1} 张牌`
                                : isRevealed
                                  ? `${card?.name} ${drawn.reversed ? "逆位" : "正位"}`
                                  : `翻开第 ${i + 1} 张牌`
                            }
                          >
                            <span className="flip-inner">
                              <span
                                className="flip-back"
                                aria-hidden={isRevealed}
                              >
                                <CardArt back />
                                <span className="flip-hint">
                                  {phase === "draw" ? "轻触重选" : "轻触揭晓"}
                                </span>
                              </span>
                              <span
                                className="flip-front"
                                aria-hidden={!isRevealed}
                              >
                                <span
                                  className={
                                    drawn.reversed ? "reversed-art" : ""
                                  }
                                >
                                  <CardArt card={card} />
                                </span>
                              </span>
                            </span>
                          </button>
                        ) : (
                          <div className="empty-card">
                            <span>✦</span>
                            <small>等待你的选择</small>
                          </div>
                        )}
                        {isRevealed && card ? (
                          <div className="card-reveal-label">
                            <h3>
                              {card.name}
                              <span
                                className={
                                  drawn.reversed ? "reversed-badge" : ""
                                }
                              >
                                {drawn.reversed ? "逆位" : "正位"}
                              </span>
                            </h3>
                            <p>{card.keywords.join(" · ")}</p>
                          </div>
                        ) : (
                          <div className="card-reveal-label placeholder-label" />
                        )}
                      </div>
                    );
                  })}
                </div>
                {phase === "draw" ? (
                  <>
                    <div className="deck-heading">
                      <span>
                        <b>{selected.length}</b> / {count} 张已选
                      </span>
                      <p>
                        {selected.length === count
                          ? "你的牌已就位，准备好与它们相见了吗？"
                          : "第一眼的吸引，也是一种答案。"}
                      </p>
                      <button
                        className="text-button"
                        onClick={shuffle}
                        data-sound="shuffle"
                        disabled={shuffling}
                      >
                        <Shuffle size={14} />
                        {shuffling ? "正在洗牌" : "重新洗牌"}
                      </button>
                    </div>
                    <div
                      ref={deckRef}
                      className={`deck-fan ${shuffling ? "shuffling" : ""}`}
                      aria-label="待选塔罗牌"
                    >
                      {deck
                        .slice(deckPage * 13, deckPage * 13 + 13)
                        .map((drawn, i) => {
                          const index = selected.findIndex(
                            (c) => c.id === drawn.id,
                          );
                          return (
                            <button
                              key={drawn.id}
                              className={`fan-card ${index >= 0 ? "picked" : ""}`}
                              style={
                                {
                                  "--fan-index": i - 6,
                                  "--deal-index": i,
                                } as React.CSSProperties
                              }
                              onClick={() => selectCard(drawn)}
                              data-sound={index >= 0 ? "deselect" : "select"}
                              disabled={
                                shuffling ||
                                (selected.length >= count && index < 0)
                              }
                              aria-label={`选择第 ${deckPage * 13 + i + 1} 张牌`}
                              aria-pressed={index >= 0}
                            >
                              <CardArt back />
                              {index >= 0 && (
                                <span className="picked-number">
                                  {index + 1}
                                </span>
                              )}
                            </button>
                          );
                        })}
                    </div>
                    <div className="deck-bottom">
                      <div className="deck-pages">
                        <button
                          className="icon-button"
                          onClick={() => setDeckPage((deckPage + 5) % 6)}
                          disabled={shuffling}
                          aria-label="上一组牌"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span>
                          {deckPage * 13 + 1}—{deckPage * 13 + 13} <i>/ 78</i>
                        </span>
                        <button
                          className="icon-button"
                          onClick={() => setDeckPage((deckPage + 1) % 6)}
                          disabled={shuffling}
                          aria-label="下一组牌"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                      <button
                        className="primary-button"
                        disabled={selected.length !== count || shuffling}
                        data-sound="deal"
                        onClick={() => {
                          setPhase("reveal");
                          setRevealed([]);
                          scrollRitual();
                        }}
                      >
                        与我的牌相见 <ArrowRight size={17} />
                      </button>
                    </div>
                  </>
                ) : phase === "reveal" ? (
                  <div className="reveal-action">
                    {!allRevealed ? (
                      <button
                        className="primary-button"
                        onClick={() => setRevealed(selected.map((_, i) => i))}
                        data-sound={count === 1 ? "flip" : "reveal-all"}
                      >
                        <Sparkles size={16} />
                        翻开{count === 1 ? "这张牌" : "全部牌面"}
                      </button>
                    ) : (
                      <>
                        <Ornament />
                        <p className="reveal-description">
                          每一张牌，都是看见自己的另一个角度。
                        </p>
                        <button
                          className="primary-button reading-button"
                          onClick={requestReading}
                          data-sound="none"
                          disabled={loading}
                        >
                          {loading ? (
                            <LoaderCircle className="spin" size={17} />
                          ) : (
                            <Sparkles size={17} />
                          )}{" "}
                          {loading ? "正在倾听牌的故事…" : "聆听牌的回应"}
                          {!loading && <ArrowUpRight size={17} />}
                        </button>
                        {loading ? (
                          <p className="loading-note" role="status">
                            {loadingSeconds < 12
                              ? "AI 正在将你的问题与牌面串联起来"
                              : loadingSeconds < 35
                                ? "一份细致的解读值得片刻等待"
                                : "仍在等待 AI 服务回应，你的牌面会保留"}{" "}
                            <span>{loadingSeconds}s</span>
                            <button
                              data-sound="cancel"
                              onClick={() => {
                                controller.current?.abort();
                                setLoading(false);
                              }}
                            >
                              取消
                            </button>
                          </p>
                        ) : (
                          <p className="ai-caption">
                            <span
                              className={`status-dot ${config.configured ? "connected" : ""}`}
                            />
                            {config.configured
                              ? "由你选择的 AI 为本次抽牌生成解读"
                              : "连接 AI，获得这次抽牌的专属解读"}
                          </p>
                        )}
                      </>
                    )}
                    {error && (
                      <div className="reading-error" role="alert">
                        <p>{error}</p>
                        {!config.configured && (
                          <button
                            className="text-button"
                            onClick={() => setSettings(true)}
                            data-sound="open"
                          >
                            打开 AI 设置 <ArrowUpRight size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  reading && (
                    <ReadingView
                      record={reading}
                      onUpdate={updateConversation}
                      onConfigureAI={() => setSettings(true)}
                      saved={
                        historySaved &&
                        history.some((entry) => entry.id === reading.id)
                      }
                      onNew={() => setResetConfirm(true)}
                    />
                  )
                )}
              </div>
            )}
          </section>
          <section className="closing-note">
            <span>✧</span>
            <p>
              塔罗不替你决定未来，
              <br className="mobile-break" />
              它只是陪你，看清此刻。
            </p>
            <span className="closing-english">A MIRROR, NOT A MAP.</span>
          </section>
        </main>
      )}
      {page === "library" && (
        <main className="subpage">
          <div className="subpage-heading">
            <p className="eyebrow">THE LANGUAGE OF SYMBOLS</p>
            <h1>
              每一张牌，<span>都有回声。</span>
            </h1>
            <p>
              78 种象征，78 个看见自己的角度。慢慢认识它们，也慢慢认识自己。
            </p>
          </div>
          <div className="library-toolbar">
            <div className="library-tabs" role="group" aria-label="按牌组筛选">
              {["全部", "大阿尔卡那", "权杖", "圣杯", "宝剑", "星币"].map(
                (name) => (
                  <button
                    className={filter === name ? "selected" : ""}
                    key={name}
                    onClick={() => setFilter(name)}
                    aria-pressed={filter === name}
                  >
                    {name}
                  </button>
                ),
              )}
            </div>
            <label className="search-input">
              <Search size={16} />
              <input
                placeholder="寻找一张牌…"
                aria-label="搜索塔罗牌"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button onClick={() => setQuery("")} aria-label="清除搜索">
                  <X size={14} />
                </button>
              )}
            </label>
          </div>
          <div className="library-count">
            {filteredCards.length} 张牌 <span>点击牌面，读懂它的故事</span>
          </div>
          {filteredCards.length ? (
            <div className="library-grid">
              {filteredCards.map((card) => (
                <button
                  className="library-card"
                  key={card.id}
                  aria-label={`查看${card.name}`}
                  data-sound="open"
                  onClick={() => setDetail(card)}
                >
                  <CardArt card={card} />
                  <div>
                    <h3>
                      {card.name}
                      <ArrowUpRight size={14} />
                    </h3>
                    <p>{card.keywords.join(" · ")}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Search size={32} strokeWidth={1} />
              <h2>这张牌，暂时没有找到</h2>
              <p>试试牌名、英文名称，或换一个关键词。</p>
              <button
                className="text-button"
                onClick={() => {
                  setQuery("");
                  setFilter("全部");
                }}
              >
                查看全部牌面 <ArrowRight size={15} />
              </button>
            </div>
          )}
        </main>
      )}
      {page === "journal" && (
        <main className="subpage journal-page">
          <div className="subpage-heading">
            <p className="eyebrow">LET THE MOMENTS STAY</p>
            <h1>
              留住此刻，<span>再回望。</span>
            </h1>
            <p>答案会随时间生长。记下的每一段对话，都是靠近自己的一小步。</p>
          </div>
          {history.length ? (
            <>
              <div className="journal-meta">
                <span>{history.length} 段与自己的对话</span>
                <span>仅保存在当前浏览器</span>
              </div>
              <div className="journal-grid">
                {history.map((record) => (
                  <button
                    className="journal-card"
                    key={record.id}
                    onClick={() => setJournalDetail(record)}
                    data-sound="open"
                  >
                    <div className="journal-card-top">
                      <span>{formatDate(record.createdAt)}</span>
                      <span>{SPREADS[record.input.spread].name}</span>
                    </div>
                    <div className="journal-thumbs">
                      {record.input.cards.map((c) => (
                        <span
                          key={c.id}
                          className={c.reversed ? "reversed-art" : ""}
                        >
                          <CardArt card={cardById(c.id)} />
                        </span>
                      ))}
                    </div>
                    <h2>{record.result.title}</h2>
                    <p>{record.input.question}</p>
                    <span className="journal-open">
                      再次读一读 <ArrowUpRight size={15} />
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state journal-empty">
              <div className="empty-journal-art">
                <CardArt back />
                <span>✧</span>
              </div>
              <h2>你的故事，等待第一笔。</h2>
              <p>
                完成一次 AI 解读后，它会被好好收藏在这里。
                <br />
                未来的某天，或许会读出不一样的答案。
              </p>
              <button
                className="primary-button"
                onClick={() => {
                  navigate("ritual");
                  scrollRitual();
                }}
              >
                开始一段对话 <ArrowUpRight size={17} />
              </button>
            </div>
          )}
        </main>
      )}
      <footer className="footer">
        <button
          className="brand footer-brand"
          onClick={() => navigate("ritual")}
        >
          <Brand />
        </button>
        <p>为自我探索而生 · 仅供娱乐与思考</p>
        <button className="text-button" data-sound="open" onClick={() => setHelp(true)}>
          关于月见 <ArrowUpRight size={13} />
        </button>
      </footer>
      {settings && (
        <Settings
          config={config}
          onClose={() => setSettings(false)}
          onSave={(value) => {
            setConfig(value);
            setConfigError(false);
            setError("");
          }}
        />
      )}
      {help && (
        <Modal title="关于月见" onClose={() => setHelp(false)}>
          <div className="about-content">
            <Ornament />
            <h2>一点仪式，一点看见。</h2>
            <p>
              月见是一款帮助你放慢脚步、整理思绪的塔罗游戏。所有 78
              张牌都有机会被抽到，洗牌与正逆位由随机数决定。
            </p>
            <ol>
              <li>
                <b>问心</b>
                <span>选择一个牌阵，写下当下真正关心的事。</span>
              </li>
              <li>
                <b>抽牌</b>
                <span>在六组牌中自由浏览，选好后亲手翻开。</span>
              </li>
              <li>
                <b>解读</b>
                <span>AI 将问题、牌义与牌位串联，提供思考角度和小行动。</span>
              </li>
            </ol>
            <p>塔罗不是事实预测，也不替你做决定。解读仅供娱乐与自我探索。</p>
            <p className="privacy-note">
              解读和追问时，你的问题、牌面及本次对话会发送至你配置的 AI
              服务。成功的解读仅保存在当前浏览器，最多保留最近 50
              次，可随时删除。
            </p>
          </div>
        </Modal>
      )}
      {detail && (
        <Modal title="牌面的故事" onClose={() => setDetail(null)} wide>
          <div className="card-detail">
            <CardArt card={detail} />
            <div>
              <p className="eyebrow">{detail.english.toUpperCase()}</p>
              <h2>{detail.name}</h2>
              <p className="detail-keywords">{detail.keywords.join(" · ")}</p>
              <div className="meaning">
                <span>
                  <Sun size={15} />
                  正位
                </span>
                <p>{detail.upright}。</p>
              </div>
              <div className="meaning">
                <span>
                  <Moon size={15} />
                  逆位
                </span>
                <p>{detail.reversed}。</p>
              </div>
            </div>
          </div>
        </Modal>
      )}
      {journalDetail && (
        <Modal title="重读这次对话" onClose={() => setJournalDetail(null)} wide>
          <div className="journal-detail">
            <p className="record-date">
              {formatDate(journalDetail.createdAt)} ·{" "}
              {SPREADS[journalDetail.input.spread].name}
            </p>
            <p className="record-question">“{journalDetail.input.question}”</p>
            <div className="journal-detail-cards">
              {journalDetail.input.cards.map((c) => (
                <div key={c.id}>
                  <div className={c.reversed ? "reversed-art" : ""}>
                    <CardArt card={cardById(c.id)} />
                  </div>
                  <span>
                    {cardById(c.id).name} · {c.reversed ? "逆位" : "正位"}
                  </span>
                </div>
              ))}
            </div>
            <ReadingView
              record={journalDetail}
              onUpdate={updateConversation}
              onConfigureAI={() => setSettings(true)}
              saved={historySaved}
            />
            <button
              className="text-button delete-button"
              onClick={() => setDeleteTarget(journalDetail.id)}
              data-sound="open"
            >
              <Trash2 size={14} />
              删除这段记录
            </button>
          </div>
        </Modal>
      )}
      {resetConfirm && (
        <Modal title="开启新的占卜" onClose={() => setResetConfirm(false)}>
          <div className="confirm-content">
            <Moon size={30} strokeWidth={1} />
            <h2>带着新的问题，再出发。</h2>
            <p>
              {phase === "result"
                ? "这次解读已经留在「我的记录」里。"
                : "当前抽出的牌将被重新放回牌组。"}
            </p>
            <div className="confirm-actions">
              <button
                className="secondary-button"
                onClick={() => setResetConfirm(false)}
                data-sound="close"
              >
                留在此刻
              </button>
              <button className="primary-button" data-sound="reset" onClick={reset}>
                开始新占卜 <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </Modal>
      )}
      {deleteTarget && (
        <Modal title="删除记录" onClose={() => setDeleteTarget(null)}>
          <div className="confirm-content">
            <Trash2 size={28} strokeWidth={1} />
            <h2>与这段记录告别？</h2>
            <p>删除后无法恢复。</p>
            <div className="confirm-actions">
              <button
                className="secondary-button"
                onClick={() => setDeleteTarget(null)}
                data-sound="close"
              >
                保留记录
              </button>
              <button
                className="primary-button"
                onClick={() => removeRecord(deleteTarget)}
                data-sound="none"
              >
                确认删除
              </button>
            </div>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
      {configError && (
        <div className="service-notice" role="status">
          暂时无法读取 AI 配置，抽牌功能可继续使用。
        </div>
      )}
    </div>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}
function ReadingView({
  record,
  onNew,
  onUpdate,
  onConfigureAI,
  saved = true,
}: {
  record: SavedReading;
  onNew?: () => void;
  onUpdate: (record: SavedReading) => void;
  onConfigureAI: () => void;
  saved?: boolean;
}) {
  const result = record.result;
  return (
    <article
      className="reading-result"
      id={onNew ? "reading-result" : undefined}
    >
      <div className="result-heading">
        <p className="eyebrow">
          <Sparkles size={13} /> A MOMENT OF CLARITY
        </p>
        <h2>{result.title}</h2>
        <section
          className="answer-panel"
          aria-label={result.answer ? "给你的答案" : "此前的整体观察"}
        >
          <p className="answer-question">“{record.input.question}”</p>
          {!result.answer && (
            <p className="legacy-reading-note">此前解读 · 整体观察</p>
          )}
          <p className="reading-answer">{result.answer ?? result.overview}</p>
        </section>
      </div>
      <div className="interpretations">
        {result.cards.map((item, i) => {
          const drawn = record.input.cards[i];
          return (
            <section key={item.id}>
              <span className="interpretation-index">0{i + 1}</span>
              <div>
                <div className="interpretation-heading">
                  <h3>
                    {cardById(item.id).name}
                    <span>{drawn.reversed ? "逆位" : "正位"}</span>
                  </h3>
                  <span>{SPREADS[record.input.spread].positions[i]}</span>
                </div>
                <p>{item.interpretation}</p>
              </div>
            </section>
          );
        })}
      </div>
      <div className="synthesis">
        <h3>
          <Layers3 size={17} />
          {result.answer ? "这些牌为什么给出这个答案" : "把牌连成一段故事"}
        </h3>
        <p>{result.synthesis}</p>
      </div>
      <div className="advice">
        <h3>把启示，变成一件小事。</h3>
        {result.advice.map((text, i) => (
          <p key={i}>
            <span>0{i + 1}</span>
            {text}
          </p>
        ))}
      </div>
      <div className="reflection">
        <Moon size={20} strokeWidth={1} />
        <span>留给自己的一个问题</span>
        <p>{result.reflection}</p>
      </div>
      <div className="result-footer">
        <span>
          {saved && <Check size={14} />}{" "}
          {saved ? "已收藏在我的记录" : "当前解读尚未保存"} <i /> AI ·{" "}
          {record.model}
        </span>
        {onNew && (
          <button className="text-button" data-sound="open" onClick={onNew}>
            新的问题，新的开始 <RotateCcw size={14} />
          </button>
        )}
      </div>
      <FollowUpConversation
        key={record.id}
        record={record}
        onUpdate={onUpdate}
        onConfigureAI={onConfigureAI}
      />
    </article>
  );
}
export default App;

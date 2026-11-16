export interface TarotCard {
  id: string;
  number: string;
  name: string;
  english: string;
  arcana: "major" | "minor";
  suit?: string;
  motif: string;
  keywords: string[];
  upright: string;
  reversed: string;
}
const majors: [string, string, string, string, string, string][] = [
  [
    "愚者",
    "The Fool",
    "fool",
    "启程 · 自由 · 可能",
    "带着开放的心尝试新事物，保留探索的空间",
    "冲动、缺少准备或因担心未知而迟迟不行动",
  ],
  [
    "魔术师",
    "The Magician",
    "magician",
    "创造 · 专注 · 行动",
    "整合已有资源，将想法变成行动",
    "分散精力、低估自身资源，或说得多做得少",
  ],
  [
    "女祭司",
    "The High Priestess",
    "priestess",
    "直觉 · 静心 · 内在",
    "暂缓判断，观察尚未被表达的信息和内在感受",
    "忽略直觉、信息不完整，或过度猜测",
  ],
  [
    "皇后",
    "The Empress",
    "empress",
    "滋养 · 丰盛 · 生长",
    "给关系与创意耐心的照料，也关注身体和日常需要",
    "过度付出、忽视自我照顾或创造力受阻",
  ],
  [
    "皇帝",
    "The Emperor",
    "emperor",
    "秩序 · 边界 · 稳定",
    "建立清晰的结构、边界与承担责任的方式",
    "控制欲过强、规则僵化或缺乏稳定基础",
  ],
  [
    "教皇",
    "The Hierophant",
    "hierophant",
    "传承 · 信念 · 学习",
    "借助可靠经验、共同价值与系统学习",
    "重新审视惯例，寻找适合自己的价值判断",
  ],
  [
    "恋人",
    "The Lovers",
    "lovers",
    "连结 · 选择 · 真诚",
    "理解彼此的价值，做与内心一致的选择",
    "价值冲突、沟通不充分或选择时犹疑",
  ],
  [
    "战车",
    "The Chariot",
    "chariot",
    "意志 · 方向 · 前进",
    "将相反力量协调起来，明确方向后稳步推进",
    "失去方向、用力过猛或需要重新掌握节奏",
  ],
  [
    "力量",
    "Strength",
    "strength",
    "勇气 · 温柔 · 韧性",
    "以耐心、同理心和温柔的坚定面对困难",
    "自我怀疑、情绪耗竭或过度压抑感受",
  ],
  [
    "隐者",
    "The Hermit",
    "hermit",
    "独处 · 探索 · 明灯",
    "留出独处空间，辨认自己真正重视的事",
    "过度孤立，或需要从思考中回到现实连接",
  ],
  [
    "命运之轮",
    "Wheel of Fortune",
    "wheel",
    "转机 · 周期 · 流动",
    "识别周期和变化，区分可控与不可控因素",
    "抗拒变化、重复旧模式或需要耐心调整",
  ],
  [
    "正义",
    "Justice",
    "justice",
    "平衡 · 诚实 · 因果",
    "核实事实，以公平标准对选择负责",
    "判断偏差、回避责任或忽略关键事实",
  ],
  [
    "倒吊人",
    "The Hanged Man",
    "hanged",
    "停顿 · 换位 · 放下",
    "主动暂停，换一个视角，放下无效的执着",
    "陷入拖延，或为了牺牲而牺牲而缺乏边界",
  ],
  [
    "死神",
    "Death",
    "death",
    "告别 · 更新 · 转化",
    "某种模式的结束为新阶段留出空间，不代表实际死亡",
    "害怕告别旧模式，转变需要更多时间",
  ],
  [
    "节制",
    "Temperance",
    "temperance",
    "调和 · 耐心 · 节奏",
    "以小步调整整合不同需求，寻找可持续的节奏",
    "生活失衡、急于求成或需要重新安排精力",
  ],
  [
    "恶魔",
    "The Devil",
    "devil",
    "依附 · 欲望 · 觉察",
    "看见限制自己的依附与习惯，重新认识选择权",
    "开始松开束缚，或仍在反复中学习建立边界",
  ],
  [
    "高塔",
    "The Tower",
    "tower",
    "醒悟 · 松动 · 重建",
    "旧有假设受到挑战，优先寻找可靠的现实支点",
    "推迟必要的改变，或正在逐步消化一次冲击",
  ],
  [
    "星星",
    "The Star",
    "star",
    "希望 · 疗愈 · 灵感",
    "在恢复中重建信任，用微小行动靠近长期愿望",
    "信心暂时减弱，需要休息和可见的小进展",
  ],
  [
    "月亮",
    "The Moon",
    "moon",
    "感受 · 潜意识 · 迷雾",
    "接纳不确定的感受，分清直觉、恐惧和事实",
    "迷雾渐散，或仍需要认真核实猜测",
  ],
  [
    "太阳",
    "The Sun",
    "sun",
    "喜悦 · 清晰 · 活力",
    "珍惜清晰和积极连接，将热情投入具体行动",
    "活力暂时不足、期待过高或忽略简单的满足",
  ],
  [
    "审判",
    "Judgement",
    "judgement",
    "觉醒 · 回望 · 回应",
    "回顾经历、回应内在呼唤，做新的选择",
    "苛责自己、回避反思或迟迟不回应改变的需要",
  ],
  [
    "世界",
    "The World",
    "world",
    "完成 · 整合 · 新章",
    "看见阶段性成果，整合经验并为下一步留白",
    "尚有收尾事项，或急于完成而忽略过程",
  ],
];
const romans = [
  "0",
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
  "XIII",
  "XIV",
  "XV",
  "XVI",
  "XVII",
  "XVIII",
  "XIX",
  "XX",
  "XXI",
];
const suits = [
  {
    id: "wands",
    name: "权杖",
    english: "Wands",
    domain: "热情、创造与行动",
    motif: "wands",
  },
  {
    id: "cups",
    name: "圣杯",
    english: "Cups",
    domain: "感受、关系与连接",
    motif: "cups",
  },
  {
    id: "swords",
    name: "宝剑",
    english: "Swords",
    domain: "思考、沟通与判断",
    motif: "swords",
  },
  {
    id: "pentacles",
    name: "星币",
    english: "Pentacles",
    domain: "日常、资源与积累",
    motif: "pentacles",
  },
];
const ranks = [
  ["一", "Ace", "新的契机", "新起点与潜力", "潜力尚待释放或准备不足"],
  [
    "二",
    "Two",
    "平衡与选择",
    "协调双重需求，审视选择",
    "摇摆、失衡或难以作出决定",
  ],
  [
    "三",
    "Three",
    "合作与成长",
    "通过合作与表达获得成长",
    "协作不畅、期待不一致",
  ],
  [
    "四",
    "Four",
    "稳定与停顿",
    "建立稳定，也给自己休整空间",
    "停滞或不愿离开熟悉的模式",
  ],
  [
    "五",
    "Five",
    "摩擦与变化",
    "面对摩擦，看见尚可利用的支持",
    "从冲突中恢复，或暂时难以放下",
  ],
  [
    "六",
    "Six",
    "回应与修复",
    "接受支持，调整到更平和的状态",
    "付出失衡或过于依赖过去",
  ],
  [
    "七",
    "Seven",
    "审视与坚持",
    "审视方向，为真正重视的事坚持",
    "分散精力、怀疑成果或需要调整策略",
  ],
  [
    "八",
    "Eight",
    "投入与推进",
    "练习、行动、让事情逐步向前",
    "匆忙、拖延或投入失去方向",
  ],
  [
    "九",
    "Nine",
    "积累与独立",
    "看见长期积累，也留意自己的需要",
    "耗竭、自我怀疑或过度防备",
  ],
  [
    "十",
    "Ten",
    "阶段与责任",
    "一个阶段的积累带来成果或责任",
    "负担过重，或需要重新分配责任",
  ],
  [
    "侍从",
    "Page",
    "好奇与学习",
    "以初学者的心态探索新的可能",
    "缺少经验、注意力分散或畏惧尝试",
  ],
  [
    "骑士",
    "Knight",
    "追寻与行动",
    "追随目标，带着热情行动",
    "行动过快或执着于单一方向",
  ],
  [
    "王后",
    "Queen",
    "理解与照料",
    "以成熟的理解滋养自己与他人",
    "忽略自身需求或付出缺少边界",
  ],
  [
    "国王",
    "King",
    "成熟与掌握",
    "整合经验，负责任地运用能力",
    "控制过度或不愿承担责任",
  ],
];
const special: Record<string, [string, string]> = {
  "cups-2": [
    "相互理解、坦诚表达与平等的情感交流",
    "沟通错位、期待不一致，或需要重建平等的关系",
  ],
  "cups-3": [
    "友情、庆祝与来自群体的支持",
    "社交耗竭、群体排斥或需要回归自己的节奏",
  ],
  "cups-4": [
    "暂时抽离，重新辨认内心需要与眼前机会",
    "重新参与生活，或因犹豫错过可尝试的机会",
  ],
  "cups-5": [
    "承认失落，也看见仍然存在的支持与可能",
    "逐步接受失落，或暂时困在后悔之中",
  ],
  "cups-6": [
    "温柔的回忆、熟悉的连接与善意",
    "理想化过去，或开始从旧有依恋中成长",
  ],
  "cups-7": [
    "面对多种可能，需要分清想象与现实",
    "缩小选择范围，或依然难以落地",
  ],
  "cups-8": [
    "离开已不再满足内在需求的模式",
    "害怕离开，或需要确认是否真的已经准备好",
  ],
  "cups-9": [
    "感受到阶段性满足，珍惜具体的幸福",
    "外在满足未能回应内心，重新确认真正的需求",
  ],
  "cups-10": [
    "情感归属、共同价值与稳定的连接",
    "表面和谐之下的期待差异，需要真诚沟通",
  ],
  "swords-3": [
    "承认痛苦、误解或分歧，给情绪留出空间",
    "开始修复伤口，或仍在压抑没有处理的情绪",
  ],
  "swords-4": [
    "暂停争论与过度思考，以休息恢复判断力",
    "需要重新回到行动，或尚未获得充分休整",
  ],
  "swords-5": [
    "留意争胜的代价，重新评估冲突的意义",
    "尝试和解，或仍然难以放下冲突",
  ],
  "swords-6": [
    "从困境中逐步过渡，接受必要的帮助",
    "过渡受阻，或有未处理的问题需要面对",
  ],
  "swords-7": [
    "审视策略、信息透明与自己的真实动机",
    "回到坦诚沟通，或重新评估不可靠的策略",
  ],
  "swords-8": [
    "识别限制性想法，寻找仍然存在的选择",
    "逐渐看见出路，或自我限制尚待松动",
  ],
  "swords-9": [
    "焦虑与反复思考放大压力，需要现实支持",
    "开始缓解焦虑，或需要向可信的人寻求支持",
  ],
  "swords-10": [
    "一个困难模式走到尽头，优先恢复与重建",
    "渐渐走出低谷，或仍难接受阶段的结束",
  ],
  "wands-5": [
    "不同立场之间的摩擦，需要协调目标",
    "避免必要讨论，或正在从争执中找到合作方式",
  ],
  "wands-6": [
    "努力获得认可，看见阶段性的进展",
    "过于依赖认可，或自己的进展暂未被看见",
  ],
  "wands-8": [
    "节奏加快、消息流动，适合清晰及时地行动",
    "沟通延误、节奏过快或需要耐心协调",
  ],
  "wands-9": [
    "经历考验后仍有韧性，也需要健康的边界",
    "精疲力竭或过度防御，考虑接受帮助",
  ],
  "wands-10": [
    "承担太多任务，需要重新分配责任",
    "开始放下负担，或已经超出可持续的承受范围",
  ],
  "pentacles-5": [
    "留意资源匮乏带来的压力，主动寻找可用支持",
    "逐渐找到支持，或仍不愿接受帮助",
  ],
  "pentacles-6": [
    "资源的给予与接受，关注关系中的公平",
    "付出与回报失衡，重新建立清晰边界",
  ],
  "pentacles-7": [
    "评估长期投入的进展，耐心调整方法",
    "对进度失去耐心，或投入方式需要改变",
  ],
  "pentacles-8": [
    "通过专注练习和细节打磨积累能力",
    "重复却缺少进步，或忽略了练习的质量",
  ],
  "pentacles-9": [
    "珍惜独立与积累的成果，享受可持续的生活",
    "过度依赖外在评价，或生活与工作失衡",
  ],
  "pentacles-10": [
    "长期积累、共同资源与稳定基础",
    "长期目标不一致，或需要重新讨论共同责任",
  ],
};
export const DECK: TarotCard[] = [
  ...majors.map(([name, english, motif, keys, upright, reversed], i) => ({
    id: `major-${i}`,
    number: romans[i],
    name,
    english,
    arcana: "major" as const,
    motif,
    keywords: keys.split(" · "),
    upright,
    reversed,
  })),
  ...suits.flatMap((suit) =>
    ranks.map(([rank, english, keyword, upright, reversed], i) => ({
      id: `${suit.id}-${i + 1}`,
      number:
        i < 10 ? romans[i + 1] : ["PAGE", "KNIGHT", "QUEEN", "KING"][i - 10],
      name: suit.name + rank,
      english: `${english} of ${suit.english}`,
      arcana: "minor" as const,
      suit: suit.name,
      motif: suit.motif,
      keywords: [keyword, suit.domain.split("、")[0]],
      upright:
        special[`${suit.id}-${i + 1}`]?.[0] ?? `${suit.domain}方面：${upright}`,
      reversed:
        special[`${suit.id}-${i + 1}`]?.[1] ??
        `${suit.domain}方面：${reversed}`,
    })),
  ),
];
export const SPREADS = {
  daily: {
    name: "每日一签",
    english: "DAILY WHISPER",
    description: "一张牌，听见此刻的提醒",
    positions: ["此刻的指引"],
    question: "今天有什么值得我留意的事？",
  },
  timeline: {
    name: "时间之流",
    english: "FLOW OF TIME",
    description: "回望过去，读懂现在，望向未来",
    positions: ["过去的回响", "当下的能量", "未来的可能"],
    question: "对于我正在经历的事，有什么值得看见的？",
  },
  relationship: {
    name: "关系之镜",
    english: "MIRROR OF LOVE",
    description: "看见自己、对方与彼此的连结",
    positions: ["我的感受", "关系中的互动", "连接的方向"],
    question: "我该如何更好地理解这段关系？",
  },
  choice: {
    name: "选择之门",
    english: "CROSSROADS",
    description: "拨开犹豫，找到适合自己的方向",
    positions: ["选择 A 的启示", "选择 B 的启示", "值得考量的事"],
    question: "面对眼前的选择，我需要考虑什么？",
  },
} as const;
export type SpreadId = keyof typeof SPREADS;
export interface DrawnCard {
  id: string;
  reversed: boolean;
}
export interface ReadingInput {
  question: string;
  focus: string;
  spread: SpreadId;
  cards: DrawnCard[];
}
export interface ReadingResult {
  title: string;
  answer: string;
  overview?: never;
  cards: { id: string; interpretation: string }[];
  synthesis: string;
  advice: string[];
  reflection: string;
}
export type LegacyReadingResult = Omit<ReadingResult, "answer" | "overview"> & {
  answer?: never;
  overview: string;
};
export const MAX_FOLLOW_UP_TURNS = 24;
export interface FollowUpTurn {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
  model: string;
}
export interface FollowUpInput {
  input: ReadingInput;
  interpretation: ReadingResult | LegacyReadingResult;
  conversation: Pick<FollowUpTurn, "question" | "answer">[];
  question: string;
}
export interface SavedReading {
  id: string;
  createdAt: string;
  input: ReadingInput;
  result: ReadingResult | LegacyReadingResult;
  model: string;
  conversation?: FollowUpTurn[];
}
export function randomInt(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const array = new Uint32Array(1);
  do {
    crypto.getRandomValues(array);
  } while (array[0] >= limit);
  return array[0] % max;
}
export function shuffledDeck(): DrawnCard[] {
  const deck = DECK.map((card) => ({
    id: card.id,
    reversed: randomInt(2) === 1,
  }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

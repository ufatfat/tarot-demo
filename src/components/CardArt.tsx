import { useId, useState } from "react";
import { ILLUSTRATED_CARD_IDS, illustrationSource } from "../illustrations";
import type { TarotCard } from "../../shared/tarot";
const Star = ({ x, y, size = 8 }: { x: number; y: number; size?: number }) => (
  <path
    d={`M ${x} ${y - size} Q ${x + 1} ${y - 1} ${x + size} ${y} Q ${x + 1} ${y + 1} ${x} ${y + size} Q ${x - 1} ${y + 1} ${x - size} ${y} Q ${x - 1} ${y - 1} ${x} ${y - size}Z`}
    fill="currentColor"
    stroke="none"
  />
);
function Sun({
  x = 100,
  y = 125,
  r = 30,
}: {
  x?: number;
  y?: number;
  r?: number;
}) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} />
      <circle cx={x} cy={y} r={r - 5} opacity=".4" />
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i * Math.PI) / 8;
        return (
          <path
            key={i}
            d={`M${x + Math.cos(a) * (r + 6)} ${y + Math.sin(a) * (r + 6)} L${x + Math.cos(a) * (r + 15)} ${y + Math.sin(a) * (r + 15)}`}
          />
        );
      })}
      <path
        d={`M${x - 12} ${y - 1}q4 -4 8 0m8 0q4 -4 8 0M${x} ${y - 2}v10h-3m-5 6q8 5 16 0`}
        strokeWidth=".8"
      />
    </g>
  );
}
function Moon({
  x = 100,
  y = 120,
  r = 35,
}: {
  x?: number;
  y?: number;
  r?: number;
}) {
  return (
    <path
      d={`M${x + r * 0.35} ${y - r}A${r} ${r} 0 1 0 ${x + r * 0.35} ${y + r}C${x - r * 0.65} ${y + r * 0.55} ${x - r * 0.65} ${y - r * 0.55} ${x + r * 0.35} ${y - r}Z`}
      fill="currentColor"
      fillOpacity=".14"
    />
  );
}
function Motif({ motif }: { motif: string }) {
  switch (motif) {
    case "moon":
      return (
        <>
          <circle cx="100" cy="119" r="47" opacity=".25" />
          <Moon />
          <Star x={143} y={105} size={7} />
          <path d="M38 224 62 178 83 221M118 221 141 178 164 224M43 222q28 -12 57 0t57 0M39 236q31 -12 61 0t61 0" />
          <path d="M90 220q-15-26 10-44q25 18 10 44M100 181v43" opacity=".6" />
        </>
      );
    case "sun":
      return (
        <>
          <Sun />
          <path d="M42 213q28 -40 57 0 30-40 60 0M38 230q32-14 62 0t62 0" />
          <path d="M64 200v-27m-8 7 8 4 9-8M138 199v-26m-8 3 8 8 7-4" />
          <Star x={47} y={68} />
          <Star x={157} y={73} size={5} />
        </>
      );
    case "star":
      return (
        <>
          <path
            d="m100 75 8 31 31 8-31 8-8 31-8-31-31-8 31-8Z"
            fill="currentColor"
            fillOpacity=".2"
          />
          <path d="m100 66 9 38 35 10-35 10-9 39-9-39-35-10 35-10Z" />
          <Star x={51} y={84} size={6} />
          <Star x={149} y={84} size={6} />
          <Star x={52} y={145} size={5} />
          <Star x={150} y={147} size={5} />
          <path d="M39 214q30-13 61 0t61 0M35 226q33-13 65 0t65 0M43 238q29-13 57 0t57 0M78 199l22-27 22 27" />
          <path d="m100 163 0 37" opacity=".5" />
        </>
      );
    case "lovers":
      return (
        <>
          <circle cx="75" cy="121" r="31" />
          <circle cx="125" cy="121" r="31" />
          <path
            d="M100 75v-9m-15 13-8-9m38 9 8-9M100 181c-46-22-43-52-22-53 12 0 22 13 22 13s10-13 22-13c21 1 24 31-22 53Z"
            fill="currentColor"
            fillOpacity=".14"
          />
          <path d="M64 224q36-42 72 0M100 182v37" />
          <Star x={100} y={57} size={5} />
        </>
      );
    case "world":
      return (
        <>
          <ellipse cx="100" cy="143" rx="52" ry="75" />
          <ellipse cx="100" cy="143" rx="46" ry="69" opacity=".4" />
          <path d="M100 106v69m-25-41 25 15 25-15m-25 41-19 27m19-27 19 27" />
          <circle cx="100" cy="96" r="9" />
          <Star x={47} y={69} />
          <Star x={153} y={69} />
          <Star x={47} y={218} />
          <Star x={153} y={218} />
        </>
      );
    case "wheel":
      return (
        <>
          <circle cx="100" cy="143" r="57" />
          <circle cx="100" cy="143" r="47" />
          <circle cx="100" cy="143" r="16" />
          {Array.from({ length: 8 }, (_, i) => (
            <path
              key={i}
              d="M100 96v31m-4-28 4-6 4 6"
              transform={`rotate(${i * 45} 100 143)`}
            />
          ))}
          <Star x={100} y={143} />
          <Star x={46} y={75} />
          <Star x={154} y={216} />
        </>
      );
    case "hermit":
      return (
        <>
          <path
            d="m100 78-32 58 10 13-16 68h77l-16-68 10-13Z"
            fill="currentColor"
            fillOpacity=".08"
          />
          <path d="M99 101 83 136h34ZM101 154v57M145 133v91M126 148l19-7M42 98h26v35H42Zm0 0 13-12 13 12" />
          <Star x={55} y={115} size={7} />
          <circle cx="55" cy="115" r="31" opacity=".2" />
        </>
      );
    case "tower":
      return (
        <>
          <path d="M73 222 80 129h40l7 93ZM77 128l-8-21 17 6 14-18 14 18 17-6-8 21M91 155v19h18v-19ZM91 199v23h18v-23" />
          <path d="m130 61-29 35 15-3-25 30" strokeWidth="2" />
          <path d="M47 167l8 10-5 11m101-30-8 10 6 13" />
          <Star x={61} y={74} />
        </>
      );
    case "justice":
      return (
        <>
          <path d="M100 78v142M64 110h72M70 110 48 155h44ZM130 110l-22 45h44ZM78 222h44" />
          <circle cx="100" cy="86" r="9" />
          <path d="M48 155q22 26 44 0M108 155q22 26 44 0" />
          <Star x={100} y={60} />
        </>
      );
    case "hanged":
      return (
        <>
          <path d="M53 88h94M65 88v136M137 88v136M100 88v42l22 21-22 14v30m0-65-18 30m18 12-22 17m22-17 22 17" />
          <circle cx="100" cy="205" r="9" />
          <circle cx="100" cy="205" r="20" opacity=".4" />
        </>
      );
    case "swords":
      return (
        <>
          <path d="m100 65-10 25 4 99h12l4-99ZM100 76v111M76 189h48l-5 6h-38ZM96 195v27h8v-27" />
          <circle cx="100" cy="226" r="5" />
          <path d="M64 171q-27-34-10-56m82 56q27-34 10-56" />
          <Star x={55} y={91} size={6} />
          <Star x={145} y={91} size={6} />
        </>
      );
    case "cups":
      return (
        <>
          <path d="M68 107h64v26q0 33-32 35-32-2-32-35ZM100 168v42M79 222q21-23 42 0ZM68 115H54q-11 39 26 34m52-34h14q11 39-26 34" />
          <path
            d="M84 98q-9-12 0-24m16 24q-9-12 0-24m16 24q-9-12 0-24"
            opacity=".6"
          />
          <Star x={100} y={55} size={6} />
        </>
      );
    case "wands":
      return (
        <>
          <path d="M94 224 103 74l9 2-9 148ZM105 105q-31 1-28-25 25 0 28 25Zm-3 39q31-1 32-28-26 1-32 28Zm-3 38q-31 0-29-27 25 1 29 27Z" />
          <circle cx="100" cy="143" r="65" opacity=".2" />
          <Star x={145} y={77} size={6} />
          <Star x={55} y={215} size={5} />
        </>
      );
    case "pentacles":
      return (
        <>
          <circle cx="100" cy="143" r="54" />
          <circle cx="100" cy="143" r="46" />
          <path d="m100 102 25 76-65-47h80l-65 47Z" />
          <path d="M50 210q50 30 100 0M50 77q50-30 100 0" opacity=".5" />
          <Star x={100} y={62} size={5} />
          <Star x={100} y={226} size={5} />
        </>
      );
    case "death":
      return (
        <>
          <path d="M100 99c-50-20-49 38 0 43 49-5 50-63 0-43Zm0 0c-25-49-65-10-33 16m33-16c25-49 65-10 33 16M100 144v79m0-35q-32-28-38-4 15 18 38 13m0-28q32-28 38-4-15 18-38 13" />
          <circle cx="100" cy="120" r="9" />
          <path d="M67 232h66" />
          <Star x={148} y={77} />
        </>
      );
    case "temperance":
      return (
        <>
          <path d="M60 96h30l-3 25H63ZM110 169h30l-3 25h-24ZM75 121v18m-12 0h24M125 194v18m-12 0h24M84 121q30 15 31 46M90 121q30 15 31 46" />
          <path d="M58 197q-25-47 0-80m84 38q24-41 0-71" />
          <Star x={117} y={94} size={15} />
          <circle cx="100" cy="149" r="77" opacity=".15" />
        </>
      );
    case "magician":
      return (
        <>
          <path d="M66 87c-24-25 8-40 34-8 26-32 58-17 34 8-10 11-24 0-34-8-10 8-24 19-34 8ZM100 121v63m-30-50 30 14 32-38m-32 78-22 33m22-33 22 33M51 173h98" />
          <circle cx="100" cy="112" r="9" />
          <path d="m130 110 6-23" />
          <Star x={137} y={79} size={5} />
        </>
      );
    case "priestess":
      return (
        <>
          <path d="M54 90v135h12V90ZM134 90v135h12V90ZM48 88h24m56 0h24M77 222l10-65h26l10 65Z" />
          <circle cx="100" cy="144" r="12" />
          <Moon x={100} y={98} r={23} />
          <path d="M88 172h24v25H88Z" />
        </>
      );
    case "fool":
      return (
        <>
          <circle cx="103" cy="108" r="10" />
          <path d="m97 119-12 43 24 17-8 38m-16-55-15 23 12 29m10-82 27 12 21-19m-49 8-27-11m-17 2 84-28M126 96l13 6-7 21-16-8ZM43 230h73l12-17 31 17" />
          <Sun x={149} y={67} r={12} />
          <path d="M51 211q-6-12-11-3l3 8 13 2 5-7" />
        </>
      );
    case "strength":
      return (
        <>
          <circle cx="100" cy="145" r="48" />
          <path d="M74 130q-5-30 13-19m39 19q5-30-13-19M75 137q25-30 50 0l-7 34-18 14-18-14Z" />
          <path d="M83 145h8m18 0h8m-24 12 7 5 7-5m-7 5v9m-10 0q10 8 20 0" />
          <path d="M77 76c-18-17 4-30 23-7 19-23 41-10 23 7-9 8-17-1-23-7-6 6-14 15-23 7Z" />
          <Star x={100} y={221} />
        </>
      );
    case "devil":
      return (
        <>
          <circle cx="100" cy="135" r="39" />
          <path d="M77 112 66 85l28 14m29 13 11-27-28 14M80 135l12 5m28-5-12 5M90 157h20M82 170l-17 35m53-35 17 35M66 198c-20-4-20 28-3 28 14 0 18-16 11-21m52 0c-7 5-3 21 11 21 17 0 17-32-3-28" />
          <Star x={100} y={73} />
        </>
      );
    case "chariot":
      return (
        <>
          <path d="M60 117h80v77H60ZM52 117l48-41 48 41M75 97v20m50-20v20" />
          <circle cx="72" cy="202" r="14" />
          <circle cx="128" cy="202" r="14" />
          <Star x={100} y={153} size={18} />
          <path d="M64 220h72" />
        </>
      );
    case "judgement":
      return (
        <>
          <path d="M72 107h48l22-14v52l-22-14H72ZM87 132v30l-13 13M49 211l18-25h66l18 25Z" />
          <path d="m146 103 11-6m-11 22h14m-14 16 11 6M100 183v-27m-7 9 7-9 7 9" />
          <Star x={100} y={66} />
        </>
      );
    default:
      return (
        <>
          <path d="M66 133h68v74H66ZM57 132l10-44 20 17 13-28 13 28 20-17 10 44Z" />
          <circle cx="100" cy="171" r="21" />
          <Star x={100} y={171} size={12} />
          <path d="M55 220h90M78 133v-14m44 14v-14" />
          <Star x={52} y={68} />
          <Star x={148} y={68} />
        </>
      );
  }
}
function LineCardArt({
  card,
  back = false,
  className = "",
}: {
  card?: TarotCard;
  back?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg
      className={`card-art ${className}`}
      viewBox="0 0 200 320"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={back ? "月见塔罗牌背" : card?.name}
    >
      <defs>
        <linearGradient id={`bg${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={back ? "#252a42" : "#242b3b"} />
          <stop offset="1" stopColor={back ? "#151a2b" : "#151a29"} />
        </linearGradient>
        <linearGradient id={`gold${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#e3cca0" />
          <stop offset=".5" stopColor="#b69663" />
          <stop offset="1" stopColor="#d6bd8b" />
        </linearGradient>
        <pattern
          id={`dots${uid}`}
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1" cy="1" r=".45" fill="#c8ad7d" opacity=".15" />
        </pattern>
      </defs>
      <rect
        x="1"
        y="1"
        width="198"
        height="318"
        rx="9"
        fill={`url(#bg${uid})`}
        stroke="#a68d61"
        strokeWidth="1"
      />
      <rect
        x="8"
        y="8"
        width="184"
        height="304"
        rx="5"
        fill={`url(#dots${uid})`}
        stroke="#b99c67"
        strokeOpacity=".65"
        strokeWidth=".7"
      />
      <g
        color="#cdb580"
        stroke={`url(#gold${uid})`}
        strokeWidth="1.15"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 42V16h27M158 16h27v26M15 278v26h27m116 0h27v-26" />
        <path
          d="m17 28 10-10m146 0 10 10M17 292l10 10m146 0 10-10"
          opacity=".5"
        />
        {back ? (
          <>
            <rect
              x="22"
              y="22"
              width="156"
              height="276"
              rx="76"
              strokeOpacity=".45"
            />
            <path d="m100 40 65 120-65 120-65-120Z" strokeOpacity=".4" />
            <circle cx="100" cy="160" r="53" />
            <circle cx="100" cy="160" r="45" strokeOpacity=".35" />
            {Array.from({ length: 24 }, (_, i) => (
              <path
                key={i}
                d="M100 100v-7"
                transform={`rotate(${i * 15} 100 160)`}
                strokeOpacity=".6"
              />
            ))}
            <path d="M65 160q35-31 70 0-35 31-70 0Z" />
            <Moon x={100} y={160} r={16} />
            <Star x={100} y={67} size={10} />
            <Star x={100} y={253} size={10} />
            <Star x={40} y={71} size={4} />
            <Star x={160} y={71} size={4} />
            <Star x={40} y={249} size={4} />
            <Star x={160} y={249} size={4} />
            <circle cx="100" cy="90" r="2" />
            <circle cx="100" cy="230" r="2" />
          </>
        ) : (
          <>
            <path d="M26 250V79a74 74 0 0 1 148 0v171" strokeOpacity=".4" />
            <text
              x="100"
              y="32"
              textAnchor="middle"
              fill="currentColor"
              stroke="none"
              fontFamily="Georgia,serif"
              fontSize="12"
              letterSpacing="2"
            >
              {card?.number}
            </text>
            <Motif motif={card?.motif ?? "moon"} />
            <path d="M30 254h140" strokeOpacity=".5" />
            <text
              x="100"
              y="277"
              textAnchor="middle"
              fill="currentColor"
              stroke="none"
              fontFamily="Georgia,serif"
              fontSize={(card?.english.length ?? 0) > 17 ? "9" : "11"}
              letterSpacing="1.7"
            >
              {card?.english.toUpperCase()}
            </text>
            <text
              x="100"
              y="296"
              textAnchor="middle"
              fill="currentColor"
              stroke="none"
              fontFamily="serif"
              fontSize="11"
              letterSpacing="3"
            >
              {card?.name}
            </text>
          </>
        )}
      </g>
    </svg>
  );
}

export function CardArt(props: {
  card?: TarotCard;
  back?: boolean;
  className?: string;
}) {
  if (props.back || !props.card || !ILLUSTRATED_CARD_IDS.has(props.card.id))
    return <LineCardArt {...props} />;
  return (
    <IllustratedCard
      key={props.card.id}
      card={props.card}
      className={props.className ?? ""}
    />
  );
}
function IllustratedCard({
  card,
  className,
}: {
  card: TarotCard;
  className: string;
}) {
  const [failed, setFailed] = useState(false);
  const uid = useId().replace(/:/g, "");
  if (failed) return <LineCardArt card={card} className={className} />;
  return (
    <span
      className={`card-art illustrated-card ${className}`}
      role="img"
      aria-label={card.name}
    >
      <img
        src={illustrationSource(card.id)}
        alt=""
        loading="lazy"
        decoding="async"
        width={1024}
        height={1536}
        onError={() => setFailed(true)}
      />
      <svg
        className="illustration-frame"
        viewBox="0 0 200 320"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`shade${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0b101e" stopOpacity=".7" />
            <stop offset=".16" stopColor="#0b101e" stopOpacity="0" />
            <stop offset=".72" stopColor="#0b101e" stopOpacity="0" />
            <stop offset=".86" stopColor="#0b101e" stopOpacity=".9" />
            <stop offset="1" stopColor="#0b101e" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="200" height="320" fill={`url(#shade${uid})`} />
        <rect
          x="1"
          y="1"
          width="198"
          height="318"
          rx="8"
          fill="none"
          stroke="#c7a66a"
          strokeWidth="1.3"
        />
        <rect
          x="7"
          y="7"
          width="186"
          height="306"
          rx="4"
          fill="none"
          stroke="#d3b980"
          strokeOpacity=".7"
          strokeWidth=".65"
        />
        <path
          d="M14 32V14h18m136 0h18v18M14 288v18h18m136 0h18v-18"
          stroke="#ddc38b"
          strokeWidth=".8"
          fill="none"
        />
        <text
          x="100"
          y="27"
          fill="#e9d4a8"
          textAnchor="middle"
          fontFamily="Georgia,serif"
          fontSize="10"
          letterSpacing="2"
        >
          {card.number}
        </text>
        <path
          d="M64 267h72"
          stroke="#bfa26d"
          strokeWidth=".6"
          strokeOpacity=".7"
        />
        <text
          x="100"
          y="285"
          fill="#e3cda6"
          textAnchor="middle"
          fontFamily="Georgia,serif"
          fontSize={card.english.length > 17 ? "8" : "10"}
          letterSpacing="1.2"
        >
          {card.english.toUpperCase()}
        </text>
        <text
          x="100"
          y="303"
          fill="#ddc99f"
          textAnchor="middle"
          fontFamily="serif"
          fontSize="10"
          letterSpacing="3"
        >
          {card.name}
        </text>
      </svg>
    </span>
  );
}

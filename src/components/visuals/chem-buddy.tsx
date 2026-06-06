import type { ReactNode } from "react";
import type { BaseVisualProps } from "./shared";
import { getAriaLabel, resolveVisualSize } from "./shared";

export type ChemBuddyState = "idle" | "correct" | "wrong" | "review" | "goal" | "streak";

interface ChemBuddyProps extends BaseVisualProps {
  state?: ChemBuddyState;
}

interface BuddyTheme {
  accent: string;
  blush: string;
  bubble: string;
  label: string;
  primary: string;
  ring: string;
  symbol: string;
}

const buddyThemes: Record<ChemBuddyState, BuddyTheme> = {
  idle: {
    accent: "#F2994A",
    blush: "#FFE2C0",
    bubble: "#E8F4F2",
    label: "Chem Buddy 准备陪你开始诊断",
    primary: "#4A9D90",
    ring: "#B9DED8",
    symbol: "H"
  },
  correct: {
    accent: "#34A853",
    blush: "#D8F4DF",
    bubble: "#EAF8EF",
    label: "这一步很稳，继续保持",
    primary: "#4A9D90",
    ring: "#9CD6AF",
    symbol: "OK"
  },
  wrong: {
    accent: "#F2C94C",
    blush: "#FFF1C2",
    bubble: "#F7F9FB",
    label: "先补一小步，再挑战回来",
    primary: "#6B8FA3",
    ring: "#C9D8E1",
    symbol: "UP"
  },
  review: {
    accent: "#7B61FF",
    blush: "#E4DEFF",
    bubble: "#F0EDFF",
    label: "复盘完成后，思路会更清楚",
    primary: "#4A9D90",
    ring: "#C8BEFF",
    symbol: "RE"
  },
  goal: {
    accent: "#F2994A",
    blush: "#FFE2C0",
    bubble: "#FFF4E8",
    label: "核心素养目标正在点亮",
    primary: "#2F857A",
    ring: "#F5C58F",
    symbol: "GO"
  },
  streak: {
    accent: "#F2994A",
    blush: "#FFE2C0",
    bubble: "#E8F4F2",
    label: "连续学习让进步更稳定",
    primary: "#4A9D90",
    ring: "#F4B66B",
    symbol: "7D"
  }
};

function BuddyMouth({ state }: { state: ChemBuddyState }) {
  if (state === "correct" || state === "goal" || state === "streak") {
    return <path d="M66 91c8 12 27 12 36 0" fill="none" stroke="#2F4F4B" strokeLinecap="round" strokeWidth="5" />;
  }

  if (state === "wrong") {
    return <path d="M69 94c8 5 22 5 30 0" fill="none" stroke="#2F4F4B" strokeLinecap="round" strokeWidth="4" />;
  }

  return <path d="M70 92c7 8 22 8 29 0" fill="none" stroke="#2F4F4B" strokeLinecap="round" strokeWidth="4" />;
}

function BuddySparkles({ theme, state }: { state: ChemBuddyState; theme: BuddyTheme }) {
  if (state === "idle" || state === "wrong") {
    return null;
  }

  return (
    <g opacity="0.95">
      <path d="M36 36l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" fill={theme.accent}>
        <animate attributeName="opacity" dur="1.8s" repeatCount="indefinite" values="0.45;1;0.45" />
      </path>
      <path d="M128 41l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill={theme.ring}>
        <animate attributeName="opacity" begin="0.35s" dur="1.8s" repeatCount="indefinite" values="0.45;1;0.45" />
      </path>
      <circle cx="128" cy="118" fill={theme.accent} r="4">
        <animate attributeName="r" dur="1.7s" repeatCount="indefinite" values="3;5;3" />
      </circle>
    </g>
  );
}

function BuddyMotion({ animated, children }: { animated: boolean; children: ReactNode }) {
  return (
    <g>
      {animated ? (
        <animateTransform
          additive="sum"
          attributeName="transform"
          dur="3.2s"
          repeatCount="indefinite"
          type="translate"
          values="0 0; 0 -3; 0 0"
        />
      ) : null}
      {children}
    </g>
  );
}

export function ChemBuddy({ animated = true, className, size = "lg", state = "idle", title, ...svgProps }: ChemBuddyProps) {
  const dimension = resolveVisualSize(size);
  const theme = buddyThemes[state];
  const ariaLabel = getAriaLabel({ ...svgProps, title }, theme.label);

  return (
    <svg
      aria-label={ariaLabel}
      className={className}
      fill="none"
      height={dimension}
      role="img"
      viewBox="0 0 160 160"
      width={dimension}
      xmlns="http://www.w3.org/2000/svg"
      {...svgProps}
    >
      <title>{title ?? theme.label}</title>
      <ellipse cx="80" cy="139" fill="#DCE7E5" opacity="0.72" rx="46" ry="10" />
      <BuddySparkles state={state} theme={theme} />
      <BuddyMotion animated={animated}>
        <path
          d="M66 17h28v29c0 7 3 13 8 18 14 13 23 31 23 49 0 24-19 36-45 36s-45-12-45-36c0-18 9-36 23-49 5-5 8-11 8-18z"
          fill={theme.bubble}
          stroke={theme.primary}
          strokeLinejoin="round"
          strokeWidth="6"
        />
        <path d="M65 17h30" stroke={theme.primary} strokeLinecap="round" strokeWidth="9" />
        <path d="M55 82c10-11 40-14 57 2 4 10 6 20 5 31-2 18-18 26-37 26s-35-8-37-26c-1-12 3-24 12-33z" fill="#FFFFFF" />
        <path d="M51 107c16 9 40 10 61 0 1 20-14 33-32 33s-31-12-29-33z" fill={theme.ring} opacity="0.58" />
        <circle cx="60" cy="82" fill="#2F4F4B" r="5" />
        <circle cx="100" cy="82" fill="#2F4F4B" r="5" />
        <circle cx="51" cy="94" fill={theme.blush} r="8" />
        <circle cx="109" cy="94" fill={theme.blush} r="8" />
        <BuddyMouth state={state} />
        <circle cx="113" cy="47" fill="#FFFFFF" r="20" stroke={theme.ring} strokeWidth="5" />
        <text fill={theme.primary} fontFamily="Inter, Arial, sans-serif" fontSize={theme.symbol.length > 1 ? "13" : "16"} fontWeight="700" textAnchor="middle" x="113" y="53">
          {theme.symbol}
        </text>
        <path d="M45 67c-12 2-21 10-25 23" stroke={theme.primary} strokeLinecap="round" strokeWidth="7" />
        <path d="M115 68c11 4 19 13 22 26" stroke={theme.primary} strokeLinecap="round" strokeWidth="7" />
      </BuddyMotion>
    </svg>
  );
}

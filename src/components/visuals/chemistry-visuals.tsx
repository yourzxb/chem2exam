import type { BaseVisualProps } from "./shared";
import { clamp01, getAriaLabel, resolveVisualSize } from "./shared";

export type VisualTone = "teal" | "orange" | "green" | "purple" | "neutral";
export type RewardBadgeVariant = "streak" | "review" | "goal" | "mastery";
export type EmptyStateVariant = "questions" | "reviews" | "reports" | "admin";

const toneColors: Record<VisualTone, { accent: string; fill: string; soft: string }> = {
  green: { accent: "#34A853", fill: "#EAF8EF", soft: "#BCE8C9" },
  neutral: { accent: "#6B7280", fill: "#F5F7FA", soft: "#D9DEE7" },
  orange: { accent: "#F2994A", fill: "#FFF4E8", soft: "#FFD9AA" },
  purple: { accent: "#7B61FF", fill: "#F0EDFF", soft: "#C8BEFF" },
  teal: { accent: "#4A9D90", fill: "#E8F4F2", soft: "#B9DED8" }
};

const badgeSymbols: Record<RewardBadgeVariant, string> = {
  goal: "GO",
  mastery: "A+",
  review: "RE",
  streak: "7D"
};

const moleculePoints = [
  { x: 25, y: 84, r: 9 },
  { x: 49, y: 55, r: 13 },
  { x: 80, y: 74, r: 10 },
  { x: 106, y: 45, r: 14 },
  { x: 129, y: 82, r: 11 },
  { x: 96, y: 110, r: 9 }
];

interface MoleculePathProps extends BaseVisualProps {
  activeIndex?: number;
  nodeCount?: number;
  tone?: VisualTone;
}

interface BeakerIconProps extends BaseVisualProps {
  level?: number;
  tone?: VisualTone;
}

interface RewardBadgeProps extends BaseVisualProps {
  label?: string;
  unlocked?: boolean;
  variant?: RewardBadgeVariant;
}

interface KnowledgePathIllustrationProps extends BaseVisualProps {
  activeStep?: 0 | 1 | 2;
  tone?: VisualTone;
}

interface EmptyStateIllustrationProps extends BaseVisualProps {
  variant?: EmptyStateVariant;
}

export function MoleculePath({ activeIndex = 2, animated = true, className, nodeCount = 6, size = "md", title, tone = "teal", ...svgProps }: MoleculePathProps) {
  const dimension = resolveVisualSize(size);
  const colors = toneColors[tone];
  const nodes = moleculePoints.slice(0, Math.min(Math.max(nodeCount, 2), moleculePoints.length));
  const ariaLabel = getAriaLabel({ ...svgProps, title }, "化学分子路径视觉");

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
      <title>{title ?? "化学分子路径视觉"}</title>
      <rect fill={colors.fill} height="126" rx="28" width="126" x="17" y="17" />
      {nodes.slice(0, -1).map((point, index) => {
        const next = nodes[index + 1];
        return <path d={`M${point.x} ${point.y}L${next.x} ${next.y}`} key={`${point.x}-${next.x}`} stroke={colors.soft} strokeLinecap="round" strokeWidth="6" />;
      })}
      {nodes.map((point, index) => {
        const isActive = index === activeIndex;
        return (
          <g key={`${point.x}-${point.y}`}>
            <circle cx={point.x} cy={point.y} fill="#FFFFFF" r={point.r + 6} />
            <circle cx={point.x} cy={point.y} fill={isActive ? colors.accent : colors.soft} r={point.r}>
              {animated && isActive ? <animate attributeName="r" dur="1.8s" repeatCount="indefinite" values={`${point.r};${point.r + 3};${point.r}`} /> : null}
            </circle>
          </g>
        );
      })}
      <circle cx="123" cy="118" fill={colors.accent} opacity="0.14" r="18" />
    </svg>
  );
}

export function BeakerIcon({ animated = true, className, level = 0.62, size = "md", title, tone = "teal", ...svgProps }: BeakerIconProps) {
  const dimension = resolveVisualSize(size);
  const colors = toneColors[tone];
  const fluidHeight = 34 * clamp01(level);
  const fluidTop = 118 - fluidHeight;
  const ariaLabel = getAriaLabel({ ...svgProps, title }, "化学实验烧杯视觉");

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
      <title>{title ?? "化学实验烧杯视觉"}</title>
      <path d="M48 28h64" stroke="#334155" strokeLinecap="round" strokeWidth="8" />
      <path d="M59 31v37l-23 51c-5 11 3 23 15 23h58c12 0 20-12 15-23L101 68V31" fill="#FFFFFF" stroke="#4A5568" strokeLinejoin="round" strokeWidth="6" />
      <path d={`M48 ${fluidTop}c14 5 46-5 64 0l12 28H36z`} fill={colors.soft} opacity="0.78">
        {animated ? <animate attributeName="d" dur="3s" repeatCount="indefinite" values={`M48 ${fluidTop}c14 5 46-5 64 0l12 28H36z;M48 ${fluidTop + 2}c18-5 44 5 64 0l12 26H36z;M48 ${fluidTop}c14 5 46-5 64 0l12 28H36z`} /> : null}
      </path>
      <circle cx="60" cy="82" fill={colors.accent} opacity="0.55" r="5" />
      <circle cx="99" cy="99" fill={colors.accent} opacity="0.45" r="7" />
      <circle cx="85" cy="65" fill={colors.accent} opacity="0.35" r="4" />
      <path d="M60 52h40" stroke="#CBD5E1" strokeLinecap="round" strokeWidth="4" />
    </svg>
  );
}

export function RewardBadge({ animated = true, className, label, size = "md", title, unlocked = true, variant = "goal", ...svgProps }: RewardBadgeProps) {
  const dimension = resolveVisualSize(size);
  const tone: VisualTone = variant === "review" ? "purple" : variant === "mastery" ? "green" : "orange";
  const colors = toneColors[tone];
  const symbol = label ?? badgeSymbols[variant];
  const ariaLabel = getAriaLabel({ ...svgProps, title }, unlocked ? "成长奖励徽章" : "待点亮成长徽章");

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
      <title>{title ?? ariaLabel}</title>
      <circle cx="80" cy="80" fill={unlocked ? colors.fill : "#F5F7FA"} r="60" stroke={unlocked ? colors.soft : "#D9DEE7"} strokeWidth="8" />
      <path d="M80 32l14 29 32 5-23 23 5 32-28-15-28 15 5-32-23-23 32-5z" fill={unlocked ? colors.accent : "#C7CDD7"} />
      {animated && unlocked ? (
        <circle cx="80" cy="80" fill="none" opacity="0.48" r="66" stroke={colors.accent} strokeWidth="3">
          <animate attributeName="r" dur="2.2s" repeatCount="indefinite" values="58;70;58" />
          <animate attributeName="opacity" dur="2.2s" repeatCount="indefinite" values="0.35;0;0.35" />
        </circle>
      ) : null}
      <text fill="#FFFFFF" fontFamily="Inter, Arial, sans-serif" fontSize={symbol.length > 2 ? "19" : "24"} fontWeight="800" textAnchor="middle" x="80" y="87">
        {symbol}
      </text>
    </svg>
  );
}

export function KnowledgePathIllustration({ activeStep = 1, animated = true, className, size = "lg", title, tone = "teal", ...svgProps }: KnowledgePathIllustrationProps) {
  const dimension = resolveVisualSize(size);
  const colors = toneColors[tone];
  const steps = [
    { x: 36, y: 106, r: 13 },
    { x: 80, y: 72, r: 17 },
    { x: 124, y: 48, r: 13 }
  ];
  const ariaLabel = getAriaLabel({ ...svgProps, title }, "知识图谱补救路径视觉");

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
      <title>{title ?? "知识图谱补救路径视觉"}</title>
      <rect fill={colors.fill} height="122" rx="26" width="132" x="14" y="20" />
      <path d="M36 106C48 88 60 76 80 72c19-4 30-15 44-24" stroke={colors.soft} strokeLinecap="round" strokeWidth="9" />
      <path d="M36 106C48 88 60 76 80 72" stroke={colors.accent} strokeLinecap="round" strokeWidth="9" />
      {steps.map((step, index) => {
        const reached = index <= activeStep;
        return (
          <g key={`${step.x}-${step.y}`}>
            <circle cx={step.x} cy={step.y} fill="#FFFFFF" r={step.r + 8} />
            <circle cx={step.x} cy={step.y} fill={reached ? colors.accent : "#CBD5E1"} r={step.r}>
              {animated && index === activeStep ? <animate attributeName="r" dur="1.9s" repeatCount="indefinite" values={`${step.r};${step.r + 3};${step.r}`} /> : null}
            </circle>
          </g>
        );
      })}
      <path d="M117 47l13-4-2 14" stroke={colors.accent} strokeLinecap="round" strokeLinejoin="round" strokeWidth="6" />
    </svg>
  );
}

export function EmptyStateIllustration({ animated = true, className, size = "lg", title, variant = "questions", ...svgProps }: EmptyStateIllustrationProps) {
  const dimension = resolveVisualSize(size);
  const colors = variant === "admin" ? toneColors.purple : variant === "reports" ? toneColors.green : variant === "reviews" ? toneColors.orange : toneColors.teal;
  const ariaLabel = getAriaLabel({ ...svgProps, title }, "暂无内容的化学学习插画");

  return (
    <svg
      aria-label={ariaLabel}
      className={className}
      fill="none"
      height={dimension}
      role="img"
      viewBox="0 0 180 150"
      width={dimension}
      xmlns="http://www.w3.org/2000/svg"
      {...svgProps}
    >
      <title>{title ?? "暂无内容的化学学习插画"}</title>
      <rect fill="#F5F7FA" height="112" rx="24" width="142" x="19" y="20" />
      <path d="M59 43h62v66H59z" fill="#FFFFFF" stroke="#D9DEE7" strokeWidth="5" />
      <path d="M72 61h36M72 76h28M72 91h21" stroke="#CBD5E1" strokeLinecap="round" strokeWidth="5" />
      <circle cx="132" cy="91" fill={colors.fill} r="24" stroke={colors.soft} strokeWidth="5" />
      <path d="M125 82h14M132 75v14" stroke={colors.accent} strokeLinecap="round" strokeWidth="5" />
      <circle cx="44" cy="109" fill={colors.soft} r="9">
        {animated ? <animate attributeName="cy" dur="2.4s" repeatCount="indefinite" values="109;104;109" /> : null}
      </circle>
      <circle cx="145" cy="46" fill={colors.accent} opacity="0.25" r="7" />
    </svg>
  );
}

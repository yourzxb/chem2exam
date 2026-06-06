import type { BaseVisualProps } from "./shared";
import { getAriaLabel, resolveVisualSize } from "./shared";

export type RewardBurstTone = "success" | "goal" | "review" | "streak";

export interface RewardParticle {
  color: string;
  delay: string;
  radius: number;
  x: number;
  y: number;
}

const tonePalette: Record<RewardBurstTone, { accent: string; label: string; particle: string; soft: string }> = {
  goal: { accent: "#F2994A", label: "GO", particle: "#FFD9AA", soft: "#FFF4E8" },
  review: { accent: "#7B61FF", label: "RE", particle: "#C8BEFF", soft: "#F0EDFF" },
  streak: { accent: "#F2994A", label: "7D", particle: "#F2C94C", soft: "#FFF4E8" },
  success: { accent: "#34A853", label: "XP", particle: "#BCE8C9", soft: "#EAF8EF" }
};

export const rewardBurstParticles: RewardParticle[] = [
  { color: "#F2994A", delay: "0s", radius: 5, x: 32, y: 39 },
  { color: "#4A9D90", delay: "0.12s", radius: 4, x: 118, y: 32 },
  { color: "#F2C94C", delay: "0.24s", radius: 5, x: 136, y: 82 },
  { color: "#7B61FF", delay: "0.18s", radius: 4, x: 105, y: 128 },
  { color: "#34A853", delay: "0.08s", radius: 4, x: 42, y: 120 },
  { color: "#6B8FA3", delay: "0.3s", radius: 3, x: 22, y: 76 }
];

interface RewardBurstProps extends BaseVisualProps {
  label?: string;
  tone?: RewardBurstTone;
}

export function RewardBurst({ animated = true, className, label, size = "md", title, tone = "success", ...svgProps }: RewardBurstProps) {
  const dimension = resolveVisualSize(size);
  const colors = tonePalette[tone];
  const ariaLabel = getAriaLabel({ ...svgProps, title }, "成长奖励反馈");

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
      <title>{title ?? "成长奖励反馈"}</title>
      {rewardBurstParticles.map((particle) => (
        <circle fill={particle.color === "#F2994A" ? colors.accent : particle.color} key={`${particle.x}-${particle.y}`} r={particle.radius} cx={particle.x} cy={particle.y}>
          {animated ? (
            <>
              <animate attributeName="opacity" begin={particle.delay} dur="1.35s" repeatCount="indefinite" values="0;1;0" />
              <animate attributeName="r" begin={particle.delay} dur="1.35s" repeatCount="indefinite" values={`${particle.radius - 1};${particle.radius + 3};${particle.radius - 1}`} />
            </>
          ) : null}
        </circle>
      ))}
      <circle cx="80" cy="80" fill={colors.soft} r="46" stroke={colors.particle} strokeWidth="6" />
      <circle cx="80" cy="80" fill="#FFFFFF" r="31" />
      <text fill={colors.accent} fontFamily="Inter, Arial, sans-serif" fontSize={(label ?? colors.label).length > 2 ? "20" : "25"} fontWeight="800" textAnchor="middle" x="80" y="88">
        {label ?? colors.label}
      </text>
      {animated ? (
        <circle cx="80" cy="80" fill="none" opacity="0.42" r="55" stroke={colors.accent} strokeWidth="4">
          <animate attributeName="r" dur="1.7s" repeatCount="indefinite" values="48;62;48" />
          <animate attributeName="opacity" dur="1.7s" repeatCount="indefinite" values="0.38;0;0.38" />
        </circle>
      ) : null}
    </svg>
  );
}

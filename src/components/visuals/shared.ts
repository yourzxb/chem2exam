import type { SVGProps } from "react";

export type VisualSize = "sm" | "md" | "lg" | "xl" | number;

export interface BaseVisualProps extends Omit<SVGProps<SVGSVGElement>, "children" | "height" | "width"> {
  animated?: boolean;
  size?: VisualSize;
  title?: string;
}

export const visualSizeMap: Record<Exclude<VisualSize, number>, number> = {
  sm: 56,
  md: 104,
  lg: 152,
  xl: 216
};

export function resolveVisualSize(size: VisualSize = "md") {
  return typeof size === "number" ? size : visualSizeMap[size];
}

export function getAriaLabel(props: Pick<BaseVisualProps, "aria-label" | "title">, fallback: string) {
  return props["aria-label"] ?? props.title ?? fallback;
}

export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}
